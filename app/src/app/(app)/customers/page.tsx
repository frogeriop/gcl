import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { CustomersTable } from '@/components/customers/CustomersTable'
import { Building2, Users, Globe2, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) redirect('/login')

  // Buscar clientes com paginação inicial (50 primeiros para SSR)
  const { data: customers, count: totalCount } = await supabase
    .from('licensed_customers')
    .select('*', { count: 'exact' })
    .eq('tenant_id', profile.tenant_id)
    .order('customer_name', { ascending: true })
    .limit(50)

  // Métricas
  const industries = [...new Set((customers || []).map(c => c.industry).filter(Boolean))]
  const countries  = [...new Set((customers || []).map(c => c.country).filter(Boolean))]

  const kpis = [
    {
      label: 'Total de Clientes',
      value: totalCount ?? 0,
      icon: <Building2 size={20} />,
      color: '#3b82f6',
      bg: 'rgba(37, 99, 235, 0.12)',
    },
    {
      label: 'Segmentos',
      value: industries.length,
      icon: <TrendingUp size={20} />,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      label: 'Países',
      value: countries.length,
      icon: <Globe2 size={20} />,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
    },
    {
      label: 'Contatos Cadastrados',
      value: (customers || []).filter(c => c.contact_name).length,
      icon: <Users size={20} />,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
    },
  ]

  return (
    <div style={{ flex: 1 }}>
      <Topbar
        title="Clientes Licenciados"
        subtitle="Gestão de clientes ALFA com licenciamento SAP ativo"
      />

      <div style={{ padding: '28px' }}>
        {/* KPIs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {kpis.map((kpi, i) => (
            <div key={i} className="section-card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500' }}>{kpi.label}</div>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: kpi.color
                }}>
                  {kpi.icon}
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f9fafb', lineHeight: 1 }}>
                {kpi.value.toLocaleString('pt-BR')}
              </div>
            </div>
          ))}
        </div>

        {/* Tabela de clientes (client component para interatividade) */}
        <CustomersTable
          initialData={customers || []}
          totalCount={totalCount || 0}
          tenantId={profile.tenant_id}
          userRole={profile.role}
        />
      </div>
    </div>
  )
}
