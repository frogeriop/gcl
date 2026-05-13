import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Buscar perfil do usuário com tenant
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, tenants(name)')
    .eq('id', user.id)
    .single()

  const tenantName = (profile as any)?.tenants?.name || 'Minha Empresa'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar
        tenantName={tenantName}
        userEmail={user.email}
        userRole={profile?.role}
      />
      {/* Main content area - offset by sidebar */}
      <div style={{
        marginLeft: '240px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 0.3s ease',
        minWidth: 0
      }}>
        {children}
      </div>
    </div>
  )
}
