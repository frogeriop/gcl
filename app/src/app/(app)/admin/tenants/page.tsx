import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { TenantsManager } from '@/components/admin/TenantsManager'

export const dynamic = 'force-dynamic'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminTenantsPage() {
  // Auth check via user session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Role check via service role (evita problema de RLS recursivo)
  const svc = service()
  const { data: profile } = await svc
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/dashboard')

  // Dados completos via service role
  const { data: tenants } = await svc
    .from('tenants')
    .select(`*, plans(name, slug)`)
    .order('created_at', { ascending: false })

  const { data: plans } = await svc
    .from('plans')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name')

  const { data: userCounts } = await svc
    .from('user_profiles')
    .select('tenant_id')

  const countMap: Record<string, number> = {}
  userCounts?.forEach(u => {
    countMap[u.tenant_id] = (countMap[u.tenant_id] || 0) + 1
  })

  const tenantsWithCounts = (tenants || []).map(t => ({
    ...t,
    user_count: countMap[t.id] || 0,
    plan_name: (t as any).plans?.name || 'Sem plano',
  }))

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Gestão de Tenants" subtitle="Cadastro e controle dos tenants da plataforma GCL" />
      <TenantsManager tenants={tenantsWithCounts} plans={plans || []} />
    </div>
  )
}
