import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // Use service role to bypass recursive RLS on user_profiles
  const svc = serviceClient()
  const { data: profile } = await svc
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'super_admin' ? user : null
}

// GET — list all tenants with user counts
export async function GET() {
  const admin = await assertSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = serviceClient()

  const [{ data: tenants }, { data: userCounts }, { data: plans }] = await Promise.all([
    service.from('tenants').select('*, plans(name, slug)').order('created_at', { ascending: false }),
    service.from('user_profiles').select('tenant_id'),
    service.from('plans').select('id, name, slug').eq('is_active', true).order('name'),
  ])

  const countMap: Record<string, number> = {}
  userCounts?.forEach((u: any) => {
    countMap[u.tenant_id] = (countMap[u.tenant_id] || 0) + 1
  })

  const tenantsWithCounts = (tenants || []).map((t: any) => ({
    ...t,
    user_count: countMap[t.id] || 0,
    plan_name: t.plans?.name || 'Sem plano',
  }))

  return NextResponse.json({ tenants: tenantsWithCounts, plans })
}

// POST — create new tenant
export async function POST(req: Request) {
  const admin = await assertSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nome do tenant é obrigatório.' }, { status: 400 })
  }

  const service = serviceClient()

  // Garantir slug único
  let slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  const { data: existing } = await service.from('tenants').select('id').eq('slug', slug).maybeSingle()
  if (existing) slug = `${slug}-${Date.now()}`

  const { data, error } = await service.from('tenants').insert({
    name: body.name.trim(),
    slug,
    cnpj: body.cnpj || null,
    plan_id: body.plan_id || null,
    status: body.status || 'active',
    subscription_start: body.subscription_start || null,
    subscription_end: body.subscription_end || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, tenant: data })
}

// PATCH — update tenant
export async function PATCH(req: Request) {
  const admin = await assertSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  const body = await req.json()
  const service = serviceClient()

  const { data, error } = await service
    .from('tenants')
    .update({
      name: body.name,
      cnpj: body.cnpj || null,
      plan_id: body.plan_id || null,
      status: body.status,
      subscription_start: body.subscription_start || null,
      subscription_end: body.subscription_end || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, tenant: data })
}

// DELETE — remove tenant (cascades via FK)
export async function DELETE(req: Request) {
  const admin = await assertSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  const service = serviceClient()
  const { error } = await service.from('tenants').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
