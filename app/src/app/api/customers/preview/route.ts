import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

const COL_MAP: Record<string, string> = {
  'customer id': 'customer_id',
  'customerid': 'customer_id',
  'cnpj': 'cnpj',
  'customer name': 'customer_name',
  'customername': 'customer_name',
  'nome': 'customer_name',
  'razao social': 'customer_name',
  'razão social': 'customer_name',
  'city': 'city',
  'cidade': 'city',
  'estate': 'estate',
  'estado': 'estate',
  'uf': 'estate',
  'country': 'country',
  'pais': 'country',
  'país': 'country',
  'zipcode': 'zip_cod',
  'zip cod': 'zip_cod',
  'zip_cod': 'zip_cod',
  'cep': 'zip_cod',
  'industry': 'industry',
  'segmento': 'industry',
  'setor': 'industry',
  'contact name': 'contact_name',
  'contactname': 'contact_name',
  'contato': 'contact_name',
  'nome do contato': 'contact_name',
  'e-mail': 'email',
  'email': 'email',
  'position': 'position',
  'cargo': 'position',
  'phone': 'phone',
  'telefone': 'phone',
  'fone': 'phone',
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return NextResponse.json({ error: 'Use .xlsx, .xls ou .csv' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Planilha vazia' }, { status: 400 })
    }

    // Mapear headers
    const firstRow = rows[0]
    const headerMap: Record<string, string> = {}
    for (const key of Object.keys(firstRow)) {
      const norm = normalizeHeader(key)
      if (COL_MAP[norm]) headerMap[key] = COL_MAP[norm]
    }

    if (!Object.values(headerMap).includes('customer_id')) {
      return NextResponse.json({
        error: `Coluna "Customer ID" não encontrada. Detectadas: ${Object.keys(firstRow).slice(0, 8).join(', ')}`
      }, { status: 400 })
    }

    // Montar registros mapeados
    const allRecords = rows
      .map(row => {
        const r: Record<string, string> = {}
        for (const [col, field] of Object.entries(headerMap)) {
          r[field] = (row[col] || '').toString().trim()
        }
        return r
      })
      .filter(r => r.customer_id)

    // Deduplicar
    const dedupMap = new Map<string, Record<string, string>>()
    for (const r of allRecords) dedupMap.set(r.customer_id, r)
    const uniqueRecords = Array.from(dedupMap.values())

    return NextResponse.json({
      total: allRecords.length,
      unique: uniqueRecords.length,
      duplicates: allRecords.length - uniqueRecords.length,
      // Retorna todos os registros (máx 500 no preview para não travar)
      preview: uniqueRecords.slice(0, 500),
      hasMore: uniqueRecords.length > 500,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
