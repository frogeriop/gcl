import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

// Mapeamento de colunas do Excel → campos do banco
// Suporta variações de nome de header
const COL_MAP: Record<string, string> = {
  'customer id': 'customer_id',
  'customerid': 'customer_id',
  'cnpj': 'cnpj',
  'customer name': 'customer_name',
  'customername': 'customer_name',
  'nome': 'customer_name',
  'razao social': 'customer_name',
  'city': 'city',
  'cidade': 'city',
  'estate': 'estate',
  'estado': 'estate',
  'uf': 'estate',
  'country': 'country',
  'pais': 'country',
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar tenant_id do usuário logado
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Verificar extensão
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return NextResponse.json({
        error: 'Formato não suportado. Use .xlsx, .xls ou .csv'
      }, { status: 400 })
    }

    // Ler arquivo como ArrayBuffer
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })

    // Usar primeira planilha
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    // Converter para JSON com header da primeira linha
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: '',
    })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Planilha vazia' }, { status: 400 })
    }

    // Mapear headers da planilha para campos do banco
    const firstRow = rows[0]
    const headerMap: Record<string, string> = {}
    for (const key of Object.keys(firstRow)) {
      const normalized = normalizeHeader(key)
      if (COL_MAP[normalized]) {
        headerMap[key] = COL_MAP[normalized]
      }
    }

    if (!Object.values(headerMap).includes('customer_id')) {
      return NextResponse.json({
        error: 'Coluna obrigatória "Customer ID" não encontrada na planilha'
      }, { status: 400 })
    }

    // Montar registros para upsert
    const now = new Date().toISOString()
    const records = rows
      .map(row => {
        const record: Record<string, any> = {
          tenant_id: profile.tenant_id,
          imported_at: now,
          country: 'BRA', // default
        }
        for (const [excelCol, dbField] of Object.entries(headerMap)) {
          const val = (row[excelCol] || '').toString().trim()
          if (val) record[dbField] = val
        }
        return record
      })
      .filter(r => r.customer_id) // ignorar linhas sem customer_id

    if (records.length === 0) {
      return NextResponse.json({
        error: 'Nenhum registro válido encontrado (customer_id ausente em todas as linhas)'
      }, { status: 400 })
    }

    // Upsert em lotes de 200
    const BATCH_SIZE = 200
    let inserted = 0
    let updated = 0
    let errors: string[] = []

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE)

      const { data, error } = await supabase
        .from('licensed_customers')
        .upsert(batch, {
          onConflict: 'customer_id,tenant_id',
          ignoreDuplicates: false,
        })
        .select('customer_id')

      if (error) {
        errors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        inserted += data?.length || 0
      }
    }

    // Contar quantos já existiam (simples: total - inserted = updated)
    const totalProcessed = records.length - errors.length
    
    return NextResponse.json({
      success: true,
      total: records.length,
      processed: totalProcessed,
      errors: errors.length > 0 ? errors : undefined,
      message: `${totalProcessed} clientes importados/atualizados com sucesso`,
    })

  } catch (err: any) {
    console.error('[import-customers]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
