import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { createHash } from 'crypto'

const COL_MAP: Record<string, string> = {
  'order id': 'order_id', 'orderid': 'order_id',
  'sales order id': 'sales_order_id', 'salesorderid': 'sales_order_id',
  'status': 'status',
  'creation date': 'creation_date', 'creationdate': 'creation_date',
  'creation time': 'creation_time', 'creationtime': 'creation_time',
  'contract start date': 'contract_start_date', 'contractstartdate': 'contract_start_date',
  'contract duration': 'contract_duration', 'contractduration': 'contract_duration',
  'customer id': 'customer_id', 'customerid': 'customer_id',
  'customer name': 'customer_name', 'customername': 'customer_name',
  'customer country': 'customer_country', 'customercountry': 'customer_country',
  'partner id': 'partner_id', 'partnerid': 'partner_id',
  'partner name': 'partner_name', 'partnername': 'partner_name',
  'partner country': 'partner_country', 'partnercountry': 'partner_country',
  'buyer': 'buyer', 'industry': 'industry',
  'contract id': 'contract_id', 'contractid': 'contract_id',
  'solution': 'solution',
  'order type': 'order_type', 'ordertype': 'order_type',
  'product name': 'product_name', 'productname': 'product_name',
  'quantity': 'quantity', 'qtd': 'quantity',
  'price type': 'price_type', 'pricetype': 'price_type',
  'net amount': 'net_amount', 'netamount': 'net_amount', 'valor': 'net_amount',
  'currency': 'currency', 'moeda': 'currency',
  'deal specific discount %': 'deal_specific_discount',
  'deal specific discount': 'deal_specific_discount',
  'dealspecificdiscount': 'deal_specific_discount',
  'promo discount %': 'promo_discount', 'promo discount': 'promo_discount',
  'promodiscount': 'promo_discount',
  'promo code used': 'promo_code_used', 'promocodeused': 'promo_code_used',
  'partner discount %': 'partner_discount', 'partner discount': 'partner_discount',
  'partnerdiscount': 'partner_discount',
}

const HASH_FIELDS = [
  'order_id', 'sales_order_id', 'status', 'creation_date', 'creation_time',
  'contract_start_date', 'contract_duration', 'customer_id', 'customer_name',
  'customer_country', 'partner_id', 'partner_name', 'partner_country',
  'buyer', 'industry', 'contract_id', 'solution', 'order_type', 'product_name',
  'quantity', 'price_type', 'net_amount', 'currency',
  'deal_specific_discount', 'promo_discount', 'promo_code_used', 'partner_discount',
]

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ')
}

function detectHeaderRow(rawRows: any[][]): { headerRowIdx: number; colIndexMap: Record<number, string>; detectedExcelHeaders: string[] } {
  let headerRowIdx = 0
  let maxMatches = 0

  for (let i = 0; i < Math.min(15, rawRows.length); i++) {
    const matches = rawRows[i].filter((v: any) =>
      COL_MAP[normalizeHeader(String(v ?? ''))]
    ).length
    if (matches > maxMatches) { maxMatches = matches; headerRowIdx = i }
  }

  const headerRow = rawRows[headerRowIdx]
  const colIndexMap: Record<number, string> = {}
  const detectedExcelHeaders: string[] = []

  for (let i = 0; i < headerRow.length; i++) {
    const raw = String(headerRow[i] ?? '').trim()
    const dbField = COL_MAP[normalizeHeader(raw)]
    if (dbField) { colIndexMap[i] = dbField; detectedExcelHeaders.push(raw) }
  }

  return { headerRowIdx, colIndexMap, detectedExcelHeaders }
}

function computeRowHash(rec: Record<string, any>, tenantId: string): string {
  const str = HASH_FIELDS.map(f => String(rec[f] ?? '')).join('\x00') + '\x00' + tenantId
  return createHash('sha256').update(str).digest('hex')
}

// ── POST /api/contract-movements/preview ─────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: profile } = await svc.from('user_profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    const { headerRowIdx, colIndexMap, detectedExcelHeaders } = detectHeaderRow(rawRows)
    const mappedFields = Object.values(colIndexMap)

    const dataRows = rawRows.slice(headerRowIdx + 1).filter(row =>
      row.some((v: any) => String(v ?? '').trim() !== '')
    )

    // Contar registros únicos por hash (sem filtro de campos obrigatórios)
    const hashes = new Set<string>()
    let duplicatesInFile = 0

    for (const row of dataRows) {
      const rec: Record<string, any> = {}
      for (const [idxStr, dbField] of Object.entries(colIndexMap)) {
        const v = String(row[Number(idxStr)] ?? '').trim()
        if (v) rec[dbField] = v
      }
      const h = computeRowHash(rec, profile.tenant_id)
      if (hashes.has(h)) duplicatesInFile++
      else hashes.add(h)
    }

    const validCount  = hashes.size          // únicos que serão importados
    const totalRows   = dataRows.length       // total de linhas com dados

    // Preview: primeiras 10 linhas como objetos mapeados
    const previewRows = dataRows.slice(0, 10).map(row => {
      const mapped: Record<string, any> = {}
      for (const [idxStr, dbField] of Object.entries(colIndexMap)) {
        mapped[dbField] = String(row[Number(idxStr)] ?? '').trim() || null
      }
      return mapped
    })

    return NextResponse.json({
      success: true,
      headerRowIdx,
      detectedExcelHeaders,
      mappedFields,
      missingRequired: [],         // sem campos obrigatórios — importa tudo
      totalDataRows: totalRows,
      validCount,
      invalidCount: 0,             // não há mais "inválidos", apenas duplicatas
      duplicatesInFile,
      previewRows,
      fileName: file.name,
      fileSize: file.size,
    })
  } catch (err: any) {
    console.error('[preview-contract-movements]', err)
    return NextResponse.json({ error: err.message || 'Erro ao analisar arquivo' }, { status: 500 })
  }
}
