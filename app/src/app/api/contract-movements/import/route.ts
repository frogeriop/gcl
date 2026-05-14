import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { createHash } from 'crypto'

// ── Mapeamento de headers ──────────────────────────────────────────────────────
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
  'buyer': 'buyer',
  'industry': 'industry',
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

// Campos que participam do cálculo do hash (todos os campos de negócio)
const HASH_FIELDS = [
  'order_id', 'sales_order_id', 'status', 'creation_date', 'creation_time',
  'contract_start_date', 'contract_duration', 'customer_id', 'customer_name',
  'customer_country', 'partner_id', 'partner_name', 'partner_country',
  'buyer', 'industry', 'contract_id', 'solution', 'order_type', 'product_name',
  'quantity', 'price_type', 'net_amount', 'currency',
  'deal_specific_discount', 'promo_discount', 'promo_code_used', 'partner_discount',
]

const DATE_FIELDS    = new Set(['creation_date', 'contract_start_date'])
const NUMERIC_FIELDS = new Set(['quantity', 'net_amount', 'deal_specific_discount', 'promo_discount', 'partner_discount'])

// ── Utilitários ───────────────────────────────────────────────────────────────
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseExcelDate(val: any): string | null {
  if (!val && val !== 0) return null
  const s = String(val).trim()
  if (!s) return null
  // DD.MM.YYYY ou DD/MM/YYYY ou DD/MM/YY
  const dotMatch = s.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/)
  if (dotMatch) {
    const year = dotMatch[3].length === 2 ? `20${dotMatch[3]}` : dotMatch[3]
    return `${year}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
  const num = Number(s)
  if (!isNaN(num) && num > 1000) {
    const d = XLSX.SSF.parse_date_code(num)
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  return null
}

function parseNumeric(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = parseFloat(String(val).replace(',', '.'))
  return isNaN(n) ? null : n
}

/** Detecta a linha de headers escaneando as primeiras 15 linhas */
function detectHeaderRow(rawRows: any[][]): { headerRowIdx: number; colIndexMap: Record<number, string> } {
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
  for (let i = 0; i < headerRow.length; i++) {
    const dbField = COL_MAP[normalizeHeader(String(headerRow[i] ?? ''))]
    if (dbField) colIndexMap[i] = dbField
  }
  return { headerRowIdx, colIndexMap }
}

/**
 * Computa SHA-256 de todos os campos de negócio + tenant_id.
 * Linhas com conteúdo idêntico terão o mesmo hash → sem duplicatas.
 */
function computeRowHash(rec: Record<string, any>, tenantId: string): string {
  const str = HASH_FIELDS.map(f => String(rec[f] ?? '')).join('\x00') + '\x00' + tenantId
  return createHash('sha256').update(str).digest('hex')
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── POST /api/contract-movements/import ───────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Autenticação
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const service = getServiceClient()
    const { data: profile } = await service
      .from('user_profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

    // Arquivo
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext || ''))
      return NextResponse.json({ error: 'Use .xlsx, .xls ou .csv' }, { status: 400 })

    // Parse → array de arrays para detectar header row
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    if (rawRows.length === 0) return NextResponse.json({ error: 'Planilha vazia' }, { status: 400 })

    // Detectar linha de headers
    const { headerRowIdx, colIndexMap } = detectHeaderRow(rawRows)

    // Verificar que ao menos alguma coluna foi mapeada
    if (Object.keys(colIndexMap).length === 0) {
      return NextResponse.json({
        error: `Nenhuma coluna reconhecida. Verifique os cabeçalhos. ` +
               `Linha ${headerRowIdx + 1} contém: ${rawRows[headerRowIdx].filter(Boolean).join(', ')}`
      }, { status: 400 })
    }

    const now = new Date().toISOString()
    const dataRows = rawRows.slice(headerRowIdx + 1).filter(row =>
      row.some((v: any) => String(v ?? '').trim() !== '')
    )

    // Montar registros — SEM filtro de campos obrigatórios
    // Qualquer linha com ao menos um campo preenchido é importada
    const records: Record<string, any>[] = []

    for (const row of dataRows) {
      // Verificar se a linha tem ao menos algum dado
      const hasAnyValue = Object.keys(colIndexMap).some(
        idxStr => String(row[Number(idxStr)] ?? '').trim() !== ''
      )
      if (!hasAnyValue) continue

      const rec: Record<string, any> = {
        tenant_id: profile.tenant_id,
        imported_at: now,
      }

      for (const [idxStr, dbField] of Object.entries(colIndexMap)) {
        const raw = row[Number(idxStr)]
        if (DATE_FIELDS.has(dbField)) {
          const d = parseExcelDate(raw)
          if (d) rec[dbField] = d
        } else if (NUMERIC_FIELDS.has(dbField)) {
          const n = parseNumeric(raw)
          if (n !== null) rec[dbField] = n
        } else {
          const v = String(raw ?? '').trim()
          if (v) rec[dbField] = v
        }
      }

      // Hash de todos os campos de negócio para evitar duplicatas exatas
      rec.row_hash = computeRowHash(rec, profile.tenant_id)
      records.push(rec)
    }

    // Deduplicar por hash dentro do mesmo lote (mesmo arquivo)
    const dedupMap = new Map<string, Record<string, any>>()
    for (const r of records) dedupMap.set(r.row_hash, r)
    const unique = Array.from(dedupMap.values())
    const duplicatesInFile = records.length - unique.length

    if (unique.length === 0)
      return NextResponse.json({ error: 'Nenhuma linha com dados encontrada na planilha' }, { status: 400 })

    // Upsert em lotes de 200 — rastreia resultado por lote
    const BATCH = 200

    interface BatchResult {
      batchNum: number
      rowsInBatch: number
      success: boolean
      error?: string
    }

    const batchResults: BatchResult[] = []
    let rowsOk    = 0   // linhas em lotes com sucesso
    let rowsFailed = 0  // linhas em lotes com erro

    for (let i = 0; i < unique.length; i += BATCH) {
      const batch = unique.slice(i, i + BATCH)
      const batchNum = Math.floor(i / BATCH) + 1

      const { error } = await service
        .from('contract_movements')
        .upsert(batch, {
          onConflict: 'row_hash,tenant_id',
          ignoreDuplicates: false,
        })

      if (error) {
        batchResults.push({ batchNum, rowsInBatch: batch.length, success: false, error: error.message })
        rowsFailed += batch.length
        console.error(`[import] Lote ${batchNum} falhou:`, error.message)
      } else {
        batchResults.push({ batchNum, rowsInBatch: batch.length, success: true })
        rowsOk += batch.length
      }
    }

    // Contagem real no banco após o upsert
    const { count: dbCount } = await service
      .from('contract_movements')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)

    const failedBatches  = batchResults.filter(b => !b.success)
    const successBatches = batchResults.filter(b => b.success)

    return NextResponse.json({
      success: rowsFailed === 0,
      // Contadores
      totalInFile:      dataRows.length,
      uniqueInFile:     unique.length,
      duplicatesInFile,
      rowsOk,
      rowsFailed,
      dbTotal:          dbCount ?? null,
      // Detalhes por lote
      totalBatches:     batchResults.length,
      successBatches:   successBatches.length,
      failedBatches:    failedBatches.length,
      batchErrors:      failedBatches.map(b => ({
        batchNum:    b.batchNum,
        rowsInBatch: b.rowsInBatch,
        error:       b.error,
      })),
      // Metadados do arquivo
      fileName: file.name,
      mappedColumns: Object.keys(colIndexMap).length,
      headerRowDetected: headerRowIdx + 1,
    })


  } catch (err: any) {
    console.error('[import-contract-movements]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
