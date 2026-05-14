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

// GET — list all users
export async function GET() {
  const admin = await assertSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = serviceClient()
  const { data: users, error } = await service
    .from('user_profiles')
    .select('*, tenants(id, name, slug)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users })
}

// PATCH — update user profile
export async function PATCH(req: Request) {
  const admin = await assertSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  const body = await req.json()
  const service = serviceClient()

  const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
  if (body.full_name !== undefined) updatePayload.full_name = body.full_name
  if (body.role !== undefined) updatePayload.role = body.role
  if (body.tenant_id !== undefined) updatePayload.tenant_id = body.tenant_id
  if (body.is_active !== undefined) updatePayload.is_active = body.is_active
  if (body.must_change_password !== undefined) updatePayload.must_change_password = body.must_change_password

  const { data, error } = await service
    .from('user_profiles')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, user: data })
}

// DELETE — remove user profile + auth user
export async function DELETE(req: Request) {
  const admin = await assertSuperAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  if (id === admin.id) {
    return NextResponse.json({ error: 'Você não pode excluir seu próprio usuário.' }, { status: 400 })
  }

  const service = serviceClient()

  // Delete profile first, then auth user
  await service.from('user_profiles').delete().eq('id', id)
  const { error } = await service.auth.admin.deleteUser(id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
