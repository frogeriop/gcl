import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { Settings, Building2, Bell, Shield, Users, Key } from 'lucide-react'

const DEMO_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, tenants(*, plans(name, max_users, max_systems))')
    .eq('id', user.id)
    .single()

  const tenant = (profile as any)?.tenants
  const plan = (tenant as any)?.plans

  const sections = [
    {
      id: 'company',
      icon: <Building2 size={18} />,
      title: 'Informações da Empresa',
      color: '#3b82f6',
    },
    {
      id: 'security',
      icon: <Shield size={18} />,
      title: 'Segurança e Acesso',
      color: '#8b5cf6',
    },
    {
      id: 'users',
      icon: <Users size={18} />,
      title: 'Usuários da Plataforma',
      color: '#10b981',
    },
    {
      id: 'notifications',
      icon: <Bell size={18} />,
      title: 'Notificações',
      color: '#f59e0b',
    },
    {
      id: 'api',
      icon: <Key size={18} />,
      title: 'Integrações e API',
      color: '#ec4899',
    },
  ]

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Configurações" subtitle="Gerenciar preferências da conta e da organização" />

      <main style={{ padding: '28px', display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>

        {/* Settings nav */}
        <div className="section-card" style={{ height: 'fit-content', padding: '8px' }}>
          {sections.map(s => (
            <button key={s.id} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 14px', borderRadius: '10px',
              background: s.id === 'company' ? 'rgba(59, 130, 246, 0.1)' : 'none',
              border: s.id === 'company' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent',
              cursor: 'pointer',
              color: s.id === 'company' ? '#60a5fa' : '#9ca3af',
              fontSize: '0.875rem', fontWeight: s.id === 'company' ? '600' : '500',
              textAlign: 'left',
              transition: 'all 0.2s'
            }}>
              <span style={{ color: s.id === 'company' ? s.color : '#4b5563' }}>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Plan info */}
          {plan && (
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(139, 92, 246, 0.1))',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>PLANO ATUAL</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f9fafb' }}>{plan.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: '4px' }}>
                  Até {plan.max_users === 9999 ? '∞' : plan.max_users} usuários · {plan.max_systems === 9999 ? '∞' : plan.max_systems} sistemas
                </div>
              </div>
              <button className="btn-secondary" style={{ fontSize: '0.8rem' }}>
                Fazer upgrade
              </button>
            </div>
          )}

          {/* Company info form */}
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Informações da Empresa</span>
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                Salvar alterações
              </button>
            </div>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {[
                { label: 'Nome da Empresa', value: tenant?.name || '', placeholder: 'ACME Indústria S.A.' },
                { label: 'CNPJ', value: tenant?.cnpj || '', placeholder: '00.000.000/0001-00' },
                { label: 'Slug / Identificador', value: tenant?.slug || '', placeholder: 'acme' },
                { label: 'Status', value: tenant?.status || 'active', placeholder: '' },
              ].map((field, i) => (
                <div key={i}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '8px' }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    defaultValue={field.value}
                    placeholder={field.placeholder}
                    className="input-field"
                    disabled={field.label === 'Slug / Identificador' || field.label === 'Status'}
                    style={{ opacity: (field.label === 'Slug / Identificador' || field.label === 'Status') ? 0.5 : 1 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* User profile */}
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Meu Perfil</span>
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                Atualizar
              </button>
            </div>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {[
                { label: 'Nome completo', value: profile?.full_name || '', placeholder: 'Seu Nome' },
                { label: 'E-mail', value: user.email || '', placeholder: '' },
                { label: 'Função', value: profile?.role || 'viewer', placeholder: '' },
              ].map((field, i) => (
                <div key={i}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '8px' }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    defaultValue={field.value}
                    placeholder={field.placeholder}
                    className="input-field"
                    disabled={field.label === 'E-mail' || field.label === 'Função'}
                    style={{ opacity: (field.label === 'E-mail' || field.label === 'Função') ? 0.5 : 1 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Subscription details */}
          {tenant && (
            <div className="section-card">
              <div className="section-header">
                <span className="section-title">Detalhes da Assinatura</span>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Status da Assinatura', value: tenant.status === 'active' ? 'Ativa' : tenant.status },
                  { label: 'Início da Assinatura', value: tenant.subscription_start ? new Date(tenant.subscription_start).toLocaleDateString('pt-BR') : '—' },
                  { label: 'Válida até', value: tenant.subscription_end ? new Date(tenant.subscription_end).toLocaleDateString('pt-BR') : '—' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(31, 41, 55, 0.4)',
                    borderRadius: '8px',
                    border: '1px solid rgba(55, 65, 81, 0.3)'
                  }}>
                    <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{item.label}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e5e7eb' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
