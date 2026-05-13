import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import {
  Settings2, Mail, Shield, Bell, Database, Activity,
  Server, Key, AlertTriangle, CheckCircle2, Users, Building2
} from 'lucide-react'
import { EmailTestForm } from '@/components/settings/EmailTestForm'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

const DEMO_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'
const SUPER_ADMIN_TENANT = 'b0000000-0000-0000-0000-000000000001'

async function savePlatformSettingsAction(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const payload = {
    platform_name: formData.get('platform_name') as string,
    support_email: formData.get('support_email') as string,
    default_user_limit: Number(formData.get('default_user_limit')) || 10,
    trial_period_days: Number(formData.get('trial_period_days')) || 14,
    smtp_host: formData.get('smtp_host') as string,
    smtp_port: Number(formData.get('smtp_port')) || 587,
    smtp_user: formData.get('smtp_user') as string,
    smtp_pass: formData.get('smtp_pass') as string,
    smtp_from_name: formData.get('smtp_from_name') as string,
    smtp_from_address: formData.get('smtp_from_address') as string,
    smtp_secure: formData.get('smtp_secure') === 'on',
    allow_public_signup: formData.get('allow_public_signup') === 'on',
    dashboard_refresh_interval: Number(formData.get('dashboard_refresh_interval')) || 30,
    max_import_file_size_mb: Number(formData.get('max_import_file_size_mb')) || 50,
    updated_at: new Date().toISOString(),
  }

  await supabase.from('platform_settings').upsert({ id: 'singleton', ...payload })
  revalidatePath('/admin/settings')
}

export default async function PlatformSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar se é super_admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = profile?.role === 'super_admin'
  if (!isSuperAdmin) redirect('/dashboard')

  // Carregar configurações da plataforma
  const { data: cfg } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 'singleton')
    .single()

  const s = cfg || {
    platform_name: 'LicenseAudit SAP',
    support_email: 'suporte@alfaerp.com.br',
    default_user_limit: 10,
    trial_period_days: 14,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from_name: 'LicenseAudit SAP',
    smtp_from_address: 'noreply@alfaerp.com.br',
    smtp_secure: true,
    allow_public_signup: false,
    maintenance_mode: false,
    dashboard_refresh_interval: 30,
    max_import_file_size_mb: 50,
  }

  // Métricas globais
  const { count: totalTenants } = await supabase
    .from('tenants').select('*', { count: 'exact', head: true })
  const { count: totalUsers } = await supabase
    .from('user_profiles').select('*', { count: 'exact', head: true })

  const navItems = [
    { href: '#identity', icon: <Building2 size={16} />, label: 'Identidade da Plataforma' },
    { href: '#email', icon: <Mail size={16} />, label: 'Servidor de E-mail (SMTP)' },
    { href: '#security', icon: <Shield size={16} />, label: 'Segurança e Acesso' },
    { href: '#provisioning', icon: <Users size={16} />, label: 'Provisionamento de Tenants' },
    { href: '#system', icon: <Server size={16} />, label: 'Sistema e Performance' },
    { href: '#danger', icon: <AlertTriangle size={16} />, label: 'Zona de Risco' },
  ]

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Configurações Gerais da Plataforma" subtitle="Controle global de infraestrutura, e-mail, segurança e operação" />

      <form action={savePlatformSettingsAction} style={{ padding: '28px', maxWidth: '1280px', margin: '0 auto' }}>
        {/* Super-admin badge */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '28px'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 16px', borderRadius: '10px',
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            fontSize: '0.8rem', fontWeight: '600', color: '#a78bfa'
          }}>
            <Key size={14} />
            Acesso Super Administrador — Configurações Globais
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ padding: '8px 16px', background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(55, 65, 81, 0.4)', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#60a5fa' }}>{totalTenants || 0}</span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Tenants</span>
            </div>
            <div style={{ padding: '8px 16px', background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(55, 65, 81, 0.4)', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: '#10b981' }}>{totalUsers || 0}</span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Usuários</span>
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>
              Salvar Configurações
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Nav lateral */}
          <div className="section-card" style={{ padding: '8px', position: 'sticky', top: '24px' }}>
            {navItems.map((item, i) => (
              <a key={i} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '8px',
                color: '#9ca3af', fontSize: '0.8125rem', fontWeight: '500',
                textDecoration: 'none', transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(31, 41, 55, 0.8)'
                ;(e.currentTarget as HTMLElement).style.color = '#e5e7eb'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'none'
                ;(e.currentTarget as HTMLElement).style.color = '#9ca3af'
              }}>
                <span style={{ color: '#4b5563' }}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>

          {/* Conteúdo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── IDENTIDADE ── */}
            <div className="section-card" id="identity">
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building2 size={18} style={{ color: '#60a5fa' }} />
                  <span className="section-title">Identidade da Plataforma</span>
                </div>
              </div>
              <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Nome da Plataforma</label>
                  <input name="platform_name" defaultValue={s.platform_name} className="input-field" placeholder="LicenseAudit SAP" />
                </div>
                <div>
                  <label className="form-label">E-mail de Suporte</label>
                  <input name="support_email" defaultValue={s.support_email} className="input-field" placeholder="suporte@alfaerp.com.br" />
                </div>
              </div>
            </div>

            {/* ── SMTP ── */}
            <div className="section-card" id="email">
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Mail size={18} style={{ color: '#60a5fa' }} />
                  <span className="section-title">Servidor de E-mail (SMTP)</span>
                </div>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>
                  Configure o servidor SMTP utilizado para convites, notificações e alertas de auditoria.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                  <div>
                    <label className="form-label">Host SMTP</label>
                    <input id="smtp-host" name="smtp_host" defaultValue={s.smtp_host} className="input-field" placeholder="smtp.mailgun.org" />
                  </div>
                  <div style={{ width: '120px' }}>
                    <label className="form-label">Porta</label>
                    <input id="smtp-port" name="smtp_port" defaultValue={s.smtp_port} type="number" className="input-field" placeholder="587" />
                  </div>
                </div>
                <div>
                  <label className="form-label">Usuário SMTP</label>
                  <input id="smtp-user" name="smtp_user" defaultValue={s.smtp_user} className="input-field" placeholder="postmaster@seudominio.com.br" />
                </div>
                <div>
                  <label className="form-label">Senha / API Key</label>
                  <input id="smtp-pass" name="smtp_pass" defaultValue={s.smtp_pass} type="password" className="input-field" placeholder="•••••••••••••••" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: '1px solid rgba(55, 65, 81, 0.3)' }}>
                  <div>
                    <label className="form-label">Nome do Remetente</label>
                    <input id="smtp-from-name" name="smtp_from_name" defaultValue={s.smtp_from_name} className="input-field" placeholder="LicenseAudit SAP" />
                  </div>
                  <div>
                    <label className="form-label">E-mail do Remetente</label>
                    <input id="smtp-from-address" name="smtp_from_address" defaultValue={s.smtp_from_address} className="input-field" placeholder="noreply@alfaerp.com.br" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px' }}>
                  <input type="checkbox" id="smtp_secure" name="smtp_secure" defaultChecked={s.smtp_secure}
                    style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }} />
                  <label htmlFor="smtp_secure" style={{ fontSize: '0.875rem', color: '#d1d5db', cursor: 'pointer' }}>
                    Usar SSL/TLS (recomendado)
                  </label>
                </div>
                <EmailTestForm />
              </div>
            </div>

            {/* ── SEGURANÇA ── */}
            <div className="section-card" id="security">
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Shield size={18} style={{ color: '#60a5fa' }} />
                  <span className="section-title">Segurança e Acesso</span>
                </div>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  {
                    key: 'allow_public_signup',
                    title: 'Permitir Registro Público',
                    desc: 'Permite que novos tenants se cadastrem autonomamente via /cadastro',
                    defaultChecked: s.allow_public_signup,
                    editable: true,
                  },
                  {
                    key: 'rls',
                    title: 'Isolamento Multi-Tenant (RLS)',
                    desc: 'Segurança em nível de linha PostgreSQL. Sempre ativo.',
                    defaultChecked: true,
                    editable: false,
                  },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 0',
                    borderBottom: i === 0 ? '1px solid rgba(55, 65, 81, 0.3)' : 'none'
                  }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f9fafb' }}>{item.title}</p>
                      <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '3px' }}>{item.desc}</p>
                    </div>
                    <div style={{
                      position: 'relative', width: '44px', height: '24px',
                      borderRadius: '12px', cursor: item.editable ? 'pointer' : 'not-allowed',
                      background: item.defaultChecked ? '#2563eb' : 'rgba(75, 85, 99, 0.5)',
                      border: `1px solid ${item.defaultChecked ? '#3b82f6' : 'rgba(107, 114, 128, 0.4)'}`,
                      opacity: item.editable ? 1 : 0.5,
                      transition: 'all 0.2s',
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '3px',
                        left: item.defaultChecked ? '22px' : '3px',
                        width: '16px', height: '16px',
                        borderRadius: '50%', background: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        transition: 'left 0.2s',
                      }} />
                      {item.editable && (
                        <input type="checkbox" name={item.key} defaultChecked={item.defaultChecked}
                          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', margin: 0 }} />
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: '600' }}>RLS ativo em todas as tabelas transacionais</span>
                </div>
              </div>
            </div>

            {/* ── PROVISIONAMENTO ── */}
            <div className="section-card" id="provisioning">
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={18} style={{ color: '#60a5fa' }} />
                  <span className="section-title">Provisionamento de Tenants</span>
                </div>
              </div>
              <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Limite padrão de usuários</label>
                  <input name="default_user_limit" type="number" defaultValue={s.default_user_limit} className="input-field" min="1" />
                  <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '5px' }}>Usuários por tenant no plano base</p>
                </div>
                <div>
                  <label className="form-label">Período trial (dias)</label>
                  <input name="trial_period_days" type="number" defaultValue={s.trial_period_days} className="input-field" min="0" />
                  <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '5px' }}>0 = sem período de trial</p>
                </div>
                <div>
                  <label className="form-label">Tamanho máx. de importação (MB)</label>
                  <input name="max_import_file_size_mb" type="number" defaultValue={s.max_import_file_size_mb} className="input-field" min="1" max="500" />
                  <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '5px' }}>Para arquivos CSV/Excel de usuários SAP</p>
                </div>
              </div>
            </div>

            {/* ── SISTEMA ── */}
            <div className="section-card" id="system">
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Activity size={18} style={{ color: '#60a5fa' }} />
                  <span className="section-title">Sistema e Performance</span>
                </div>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="form-label">Intervalo de atualização do dashboard (segundos)</label>
                  <input
                    name="dashboard_refresh_interval"
                    type="number"
                    defaultValue={s.dashboard_refresh_interval}
                    className="input-field"
                    min="10"
                    max="300"
                    style={{ maxWidth: '200px' }}
                  />
                  <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '5px' }}>Mínimo: 10s · Máximo: 300s (5 min)</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[10, 15, 30, 60, 120, 180, 300].map(v => (
                    <label key={v} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '8px',
                      border: '1px solid rgba(55, 65, 81, 0.5)',
                      fontSize: '0.8rem', color: '#9ca3af',
                      cursor: 'pointer',
                      background: 'rgba(31, 41, 55, 0.4)'
                    }}>
                      <input
                        type="radio"
                        name="dashboard_refresh_interval"
                        value={v}
                        defaultChecked={(s.dashboard_refresh_interval ?? 30) === v}
                        style={{ accentColor: '#3b82f6' }}
                      />
                      {v < 60 ? `${v}s` : `${v / 60}min`}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── DANGER ZONE ── */}
            <div id="danger" style={{
              padding: '24px',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#f87171' }}>Zona de Risco</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '16px' }}>
                Operações aplicadas à infraestrutura multi-tenant global. Use com extremo cuidado.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button type="button" className="btn-secondary" style={{
                  color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)',
                  fontSize: '0.875rem'
                }}>
                  Purgar Dados Temporários
                </button>
                <button type="button" style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171', fontSize: '0.875rem', fontWeight: '600'
                }}>
                  <AlertTriangle size={14} />
                  Ativar Modo Manutenção
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

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
