import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { Building2, Shield, Users, Key, Server } from 'lucide-react'
import { SapB1ConfigForm } from '@/components/settings/SapB1ConfigForm'
import { SettingsNav } from '@/components/settings/SettingsNav'
import { RolesManager } from '@/components/settings/RolesManager'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function saveSettingsAction(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // SAP B1 config
  await supabase.from('platform_settings').upsert({
    id: 'singleton',
    sap_service_layer_url: formData.get('sap_service_layer_url') as string || '',
    sap_company_db:        formData.get('sap_company_db') as string || '',
    sap_user_name:         formData.get('sap_user_name') as string || '',
    sap_password:          formData.get('sap_password') as string || '',
    sap_language_code:     formData.get('sap_language_code') as string || '29',
    sap_verify_ssl:        formData.get('sap_verify_ssl') === 'on',
    updated_at: new Date().toISOString(),
  })

  revalidatePath('/settings')
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Usar service role para evitar RLS recursivo no user_profiles
  const svc = serviceClient()
  const { data: profile } = await svc
    .from('user_profiles')
    .select('*, tenants(*, plans(name, max_users, max_systems))')
    .eq('id', user.id)
    .single()

  const tenant = (profile as any)?.tenants
  const plan = (tenant as any)?.plans

  // SAP B1 config (plataforma) — service role pois RLS pode bloquear
  const { data: cfg } = await svc
    .from('platform_settings')
    .select('sap_service_layer_url, sap_company_db, sap_user_name, sap_password, sap_language_code, sap_verify_ssl')
    .eq('id', 'singleton')
    .single()

  const sapConfig = {
    sap_service_layer_url: cfg?.sap_service_layer_url || '',
    sap_company_db: cfg?.sap_company_db || '',
    sap_user_name: cfg?.sap_user_name || '',
    sap_password: cfg?.sap_password || '',
    sap_language_code: cfg?.sap_language_code || '29',
    sap_verify_ssl: cfg?.sap_verify_ssl ?? false,
  }

  // Business Roles do tenant
  const tenantId = profile?.tenant_id
  const { data: roles } = tenantId
    ? await svc.from('business_roles').select('*').eq('tenant_id', tenantId).order('name')
    : { data: [] }

  const isAdmin = ['admin', 'super_admin'].includes(profile?.role || '')

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Configurações" subtitle="Preferências da conta, integrações e controle de acesso" />

      <main style={{ padding: '28px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* Nav lateral */}
        <div className="section-card" style={{ padding: '8px', position: 'sticky', top: '24px' }}>
          <SettingsNav />
        </div>

        {/* Conteúdo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Plano banner ── */}
          {plan && (
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(139,92,246,0.1))',
              border: '1px solid rgba(59,130,246,0.25)', borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plano Atual</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f9fafb' }}>{plan.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: '4px' }}>
                  Até {plan.max_users === 9999 ? '∞' : plan.max_users} usuários · {plan.max_systems === 9999 ? '∞' : plan.max_systems} sistemas
                </div>
              </div>
              <button className="btn-secondary" style={{ fontSize: '0.8rem' }}>Fazer upgrade</button>
            </div>
          )}

          {/* ── Empresa ── */}
          <div className="section-card" id="company">
            <div className="section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} style={{ color: '#3b82f6' }} />
                <span className="section-title">Informações da Empresa</span>
              </div>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Nome da Empresa',      value: tenant?.name  || '', disabled: false },
                { label: 'CNPJ',                 value: tenant?.cnpj  || '', disabled: false },
                { label: 'Slug / Identificador', value: tenant?.slug  || '', disabled: true  },
                { label: 'Status',               value: tenant?.status|| 'active', disabled: true },
              ].map((f, i) => (
                <div key={i}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>{f.label}</label>
                  <input
                    type="text" defaultValue={f.value} disabled={f.disabled}
                    className="input-field"
                    style={{ opacity: f.disabled ? 0.5 : 1 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Perfil ── */}
          <div className="section-card" id="profile">
            <div className="section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} style={{ color: '#10b981' }} />
                <span className="section-title">Meu Perfil</span>
              </div>
            </div>
            <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Nome completo', value: profile?.full_name || '', disabled: false },
                { label: 'E-mail',        value: user.email || '',          disabled: true  },
                { label: 'Função (Role)', value: profile?.role || 'viewer', disabled: true  },
              ].map((f, i) => (
                <div key={i}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>{f.label}</label>
                  <input
                    type="text" defaultValue={f.value} disabled={f.disabled}
                    className="input-field"
                    style={{ opacity: f.disabled ? 0.5 : 1 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Roles de Acesso ── */}
          <div className="section-card" id="roles">
            <div className="section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} style={{ color: '#8b5cf6' }} />
                <span className="section-title">Roles de Acesso</span>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {isAdmin ? (
                <RolesManager roles={roles || []} />
              ) : (
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Apenas administradores podem gerenciar roles de acesso.
                </p>
              )}
            </div>
          </div>

          {/* ── SAP B1 Service Layer ── */}
          <form action={saveSettingsAction}>
            <div className="section-card" id="sap">
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server size={16} style={{ color: '#60a5fa' }} />
                  <span className="section-title">SAP Business One — Service Layer</span>
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                  Salvar Configuração SAP
                </button>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <SapB1ConfigForm initial={sapConfig} />
              </div>
            </div>
          </form>

          {/* ── Plano & Assinatura ── */}
          {tenant && (
            <div className="section-card" id="plan">
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={16} style={{ color: '#f59e0b' }} />
                  <span className="section-title">Plano & Assinatura</span>
                </div>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Status', value: tenant.status === 'active' ? '✓ Ativa' : tenant.status },
                  { label: 'Início', value: tenant.subscription_start ? new Date(tenant.subscription_start).toLocaleDateString('pt-BR') : '—' },
                  { label: 'Válida até', value: tenant.subscription_end ? new Date(tenant.subscription_end).toLocaleDateString('pt-BR') : '—' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '12px 16px', background: 'rgba(31,41,55,0.4)',
                    borderRadius: '8px', border: '1px solid rgba(55,65,81,0.3)'
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

      <style>{`
        .form-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #9ca3af;
          margin-bottom: 7px;
        }
      `}</style>
    </div>
  )
}
