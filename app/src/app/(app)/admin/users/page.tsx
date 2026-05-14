import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { UsersManager } from '@/components/admin/UsersManager'

export const dynamic = 'force-dynamic'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const svc = service()
  const { data: profile } = await svc
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const { data: users } = await svc
    .from('user_profiles')
    .select('*, tenants(id, name, slug)')
    .order('created_at', { ascending: false })

  const { data: tenants } = await svc
    .from('tenants')
    .select('id, name, slug')
    .eq('status', 'active')
    .order('name')

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Gestão de Usuários" subtitle="Controle de acesso e identidade dos usuários da plataforma" />
      <UsersManager
        users={users || []}
        tenants={tenants || []}
        currentUserId={user.id}
      />
    </div>
  )
}
