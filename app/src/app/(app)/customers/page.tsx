import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { CustomersTable } from '@/components/customers/CustomersTable'
import { ActivePieChart } from '@/components/customers/ActivePieChart'
import { Building2, Users, Globe2, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = getService()
  const { data: profile } = await service
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  const tenantId = profile?.tenant_id || ''
  const userRole = profile?.role || 'viewer'

  // Buscar TODOS os clientes para o AG Grid (client-side sort/filter)
  const { data: customers, count: totalCount } = await service
    .from('licensed_customers')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('customer_name', { ascending: true })
    .limit(2000) // limite generoso para AG Grid

  const all = customers || []

  // Métricas
  const industries = [...new Set(all.map(c => c.industry).filter(Boolean))]
  const countries  = [...new Set(all.map(c => c.country).filter(Boolean))]
  const activeCount   = all.filter(c => c.is_active !== false).length
  const inactiveCount = all.length - activeCount

  const kpis = [
    { label: 'Total de Clientes',     value: totalCount ?? 0,                      iconName: 'building',  color: '#3b82f6', bg: 'rgba(37,99,235,0.12)' },
    { label: 'Segmentos',             value: industries.length,                    iconName: 'trending',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Países',                value: countries.length,                     iconName: 'globe',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    { label: 'Contatos Cadastrados',  value: all.filter(c => c.contact_name).length, iconName: 'users',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ]

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Clientes Licenciados" subtitle="Gestão de clientes ALFA com licenciamento SAP ativo" />

      <div style={{ padding: '28px' }}>
        {/* KPIs + Pie Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 220px', gap: '16px', marginBottom: '24px', alignItems: 'stretch' }}>
          {kpis.map((kpi, i) => {
            const iconEl = kpi.iconName === 'building' ? <Building2 size={20} />
              : kpi.iconName === 'trending' ? <TrendingUp size={20} />
              : kpi.iconName === 'globe' ? <Globe2 size={20} />
              : <Users size={20} />
            return (
              <div key={i} className="section-card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: '500' }}>{kpi.label}</div>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                    {iconEl}
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f9fafb', lineHeight: 1 }}>
                  {kpi.value.toLocaleString('pt-BR')}
                </div>
              </div>
            )
          })}

          {/* Pie Chart card */}
          <div className="section-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', letterSpacing: '0.05em', marginBottom: '10px', textTransform: 'uppercase' }}>
              Status
            </div>
            <div style={{ flex: 1 }}>
              <ActivePieChart active={activeCount} inactive={inactiveCount} />
            </div>
          </div>
        </div>

        {/* AG Grid table */}
        <CustomersTable
          initialData={all}
          totalCount={totalCount || 0}
          tenantId={tenantId}
          userRole={userRole}
        />
      </div>
    </div>
  )
}
