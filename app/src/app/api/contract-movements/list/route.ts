import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const PAGE_SIZE = 1000 // Supabase PostgREST max_rows per request

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const service = getServiceClient()
    const { data: profile } = await service
      .from('user_profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const search  = searchParams.get('search') || ''
    const status  = searchParams.get('status') || ''
    const maxRows = Math.min(parseInt(searchParams.get('limit') || '50000'), 100000)

    // ── Busca paginada para contornar o limite do PostgREST (max 1000/página) ──
    const allRows: any[] = []
    let from = 0

    while (from < maxRows) {
      const to = Math.min(from + PAGE_SIZE - 1, maxRows - 1)

      let query = service
        .from('contract_movements')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('creation_date', { ascending: false, nullsFirst: false })
        .range(from, to)

      if (status) query = query.eq('status', status)
      if (search) query = query.or(
        `order_id.ilike.%${search}%,customer_name.ilike.%${search}%,` +
        `contract_id.ilike.%${search}%,product_name.ilike.%${search}%,customer_id.ilike.%${search}%`
      )

      const { data, error } = await query

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data || data.length === 0) break

      allRows.push(...data)

      // Se retornou menos que PAGE_SIZE, chegamos ao fim
      if (data.length < PAGE_SIZE) break

      from += PAGE_SIZE
    }

    return NextResponse.json({ movements: allRows, total: allRows.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
