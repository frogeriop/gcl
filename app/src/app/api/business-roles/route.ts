import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function getUserContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()
  return profile ? { supabase, user, profile } : null
}

// GET — list roles for current tenant
export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await ctx.supabase
    .from('business_roles')
    .select('*')
    .eq('tenant_id', ctx.profile.tenant_id)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ roles: data })
}

// POST — create role
export async function POST(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['admin', 'super_admin'].includes(ctx.profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

  const slug = body.name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

  const { data, error } = await ctx.supabase
    .from('business_roles')
    .insert({
      tenant_id: ctx.profile.tenant_id,
      name: body.name.trim(),
      slug,
      description: body.description || null,
      color: body.color || '#6b7280',
      permissions: body.permissions || {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, role: data })
}

// PATCH — update role
export async function PATCH(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['admin', 'super_admin'].includes(ctx.profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  const body = await req.json()
  const { data, error } = await ctx.supabase
    .from('business_roles')
    .update({
      name: body.name,
      description: body.description || null,
      color: body.color,
      permissions: body.permissions,
      is_active: body.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', ctx.profile.tenant_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, role: data })
}

// DELETE — remove role
export async function DELETE(req: Request) {
  const ctx = await getUserContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['admin', 'super_admin'].includes(ctx.profile.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  const { error } = await ctx.supabase
    .from('business_roles')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.profile.tenant_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
