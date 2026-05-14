import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const service = svc()
    const { data: profile } = await service
      .from('user_profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const search  = searchParams.get('search') || ''
    const status  = searchParams.get('status') || ''
    const limit   = Math.min(parseInt(searchParams.get('limit') || '5000'), 10000)

    let query = service
      .from('contracts')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('contract_start_date', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (status) query = query.eq('status', status)
    if (search)  query = query.or(
      `contract_id.ilike.%${search}%,customer_id.ilike.%${search}%,status.ilike.%${search}%,order_type.ilike.%${search}%`
    )

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ contracts: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
