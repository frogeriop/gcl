import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

// Mapeamento de colunas do Excel → campos do banco
// Suporta variações de nome de header (PT e EN)
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

// Cliente service-role: ignora RLS, usado apenas server-side após auth verificado
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar sessão do usuário via anon client (cookies)
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // 2. Buscar perfil via service role (bypassa RLS que bloqueia em API routes)
    const service = getServiceClient()
    const { data: profile, error: profileError } = await service
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.tenant_id) {
      console.error('[import] profile error:', profileError?.message, '| user:', user.id)
      return NextResponse.json(
        { error: `Perfil não encontrado para o usuário ${user.id}` },
        { status: 403 }
      )
    }

    // 3. Ler arquivo
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

    // 4. Parsear Excel
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

    // 5. Mapear headers
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
        error: `Coluna obrigatória "Customer ID" não encontrada. Colunas detectadas: ${Object.keys(firstRow).join(', ')}`
      }, { status: 400 })
    }

    // 6. Montar registros
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
    // ignorar linhas sem customer_id
      .filter(r => r.customer_id)

    // Deduplicar por customer_id — manter última ocorrência
    // (evita "ON CONFLICT DO UPDATE command cannot affect row a second time")
    const dedupMap = new Map<string, Record<string, any>>()
    for (const record of records) {
      dedupMap.set(record.customer_id, record)
    }
    const uniqueRecords = Array.from(dedupMap.values())
    const duplicatesRemoved = records.length - uniqueRecords.length

    if (uniqueRecords.length === 0) {
      return NextResponse.json({
        error: 'Nenhum registro válido encontrado (Customer ID ausente em todas as linhas)'
      }, { status: 400 })
    }

    // 7. Upsert em lotes via service role (bypassa RLS para escrita)
    const BATCH_SIZE = 200
    let totalInserted = 0
    const errors: string[] = []

    for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
      const batch = uniqueRecords.slice(i, i + BATCH_SIZE)

      const { data, error } = await service
        .from('licensed_customers')
        .upsert(batch, {
          onConflict: 'customer_id,tenant_id',
          ignoreDuplicates: false,
        })
        .select('customer_id')

      if (error) {
        errors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        console.error('[import] upsert error:', error)
      } else {
        totalInserted += data?.length || batch.length
      }
    }

    const totalProcessed = uniqueRecords.length

    const duplicateNote = duplicatesRemoved > 0
      ? ` (${duplicatesRemoved} linha${duplicatesRemoved > 1 ? 's duplicadas' : ' duplicada'} na planilha ignorada${duplicatesRemoved > 1 ? 's' : ''})`
      : ''

    return NextResponse.json({
      success: true,
      total: records.length,
      processed: totalProcessed,
      duplicatesRemoved,
      errors: errors.length > 0 ? errors : undefined,
      message: `${totalProcessed} clientes importados/atualizados com sucesso${duplicateNote}`,
    })

  } catch (err: any) {
    console.error('[import-customers] unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 })
  }
}
