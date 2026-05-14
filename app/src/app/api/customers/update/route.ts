import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const service = getService()
    const { data: profile } = await service
      .from('user_profiles').select('tenant_id, role').eq('id', user.id).single()

    if (!profile?.tenant_id) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

    const body = await req.json()
    const { customer_id, ...fields } = body

    if (!customer_id) return NextResponse.json({ error: 'customer_id obrigatório' }, { status: 400 })

    // Campos editáveis permitidos
    const allowed = ['cnpj','customer_name','city','estate','country','zip_cod',
                     'industry','contact_name','email','position','phone','is_active']
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const [k, v] of Object.entries(fields)) {
      if (allowed.includes(k)) updateData[k] = v === '' ? null : v
    }

    const { data, error } = await service
      .from('licensed_customers')
      .update(updateData)
      .eq('customer_id', customer_id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, customer: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
