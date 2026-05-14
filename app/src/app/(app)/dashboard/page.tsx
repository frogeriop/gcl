import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import {
  Users, Shield, TrendingDown, AlertTriangle,
  Server, CheckCircle2, Clock, XCircle,
  ArrowRight, BarChart3, Activity
} from 'lucide-react'
import Link from 'next/link'

const DEMO_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'
const DEMO_SYSTEM_ID = 'b0000000-0000-0000-0000-000000000001'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Buscar dados do perfil e tenant
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = profile?.tenant_id || DEMO_TENANT_ID

  // Buscar dados em paralelo
  const [
    { data: sapUsers },
    { data: audits },
    { data: findings },
    { data: systems },
    { data: contracts },
  ] = await Promise.all([
    supabase.from('sap_users').select('id, is_active, last_login, license_type_id').eq('tenant_id', tenantId),
    supabase.from('audits').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5),
    supabase.from('audit_findings').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(10),
    supabase.from('sap_systems').select('*').eq('tenant_id', tenantId),
    supabase.from('license_contracts').select('*').eq('tenant_id', tenantId),
  ])

  // Calcular estatísticas
  const totalUsers = sapUsers?.length || 0
  const activeUsers = sapUsers?.filter(u => u.is_active).length || 0
  const inactiveUsers = totalUsers - activeUsers
  const neverLoggedIn = sapUsers?.filter(u => !u.last_login).length || 0
  const openFindings = findings?.filter(f => f.status === 'open').length || 0
  const criticalFindings = findings?.filter(f => f.severity === 'critical').length || 0
  const totalSavings = findings?.reduce((sum, f) => sum + (f.estimated_saving || 0), 0) || 0
  const completedAudits = audits?.filter(a => a.status === 'completed').length || 0
  const contractValue = contracts?.reduce((sum, c) => sum + (c.total_value || 0), 0) || 0

  const stats = [
    {
      label: 'Usuários SAP',
      value: totalUsers,
      sub: `${activeUsers} ativos · ${inactiveUsers} inativos`,
      icon: <Users size={20} />,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      accent: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
    },
    {
      label: 'Achados Abertos',
      value: openFindings,
      sub: `${criticalFindings} críticos`,
      icon: <AlertTriangle size={20} />,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      accent: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
    },
    {
      label: 'Economia Potencial',
      value: `R$ ${(totalSavings / 1000).toFixed(0)}k`,
      sub: 'Identificado nas auditorias',
      icon: <TrendingDown size={20} />,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      accent: 'linear-gradient(90deg, #10b981, #34d399)',
    },
    {
      label: 'Sistemas SAP',
      value: systems?.length || 0,
      sub: `${systems?.filter(s => s.sync_status === 'success').length || 0} sincronizados`,
      icon: <Server size={20} />,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
      accent: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
    },
  ]

  const findingTypeLabels: Record<string, string> = {
    inactive_licensed: 'Inativo com Licença',
    wrong_license_type: 'Tipo de Licença Errado',
    duplicate_user: 'Usuário Duplicado',
    expired_validity: 'Validade Expirada',
    over_privileged: 'Superprivilegiado',
    missing_license: 'Sem Licença',
    shared_user: 'Usuário Compartilhado',
    test_user_production: 'Teste em Produção',
    excessive_authorizations: 'Autorizações Excessivas',
  }

  const statusColors: Record<string, string> = {
    completed: 'badge-active',
    in_progress: 'badge-medium',
    draft: 'badge-inactive',
    review: 'badge-high',
    cancelled: 'badge-inactive',
  }

  const statusLabels: Record<string, string> = {
    completed: 'Concluída',
    in_progress: 'Em Progresso',
    draft: 'Rascunho',
    review: 'Em Revisão',
    cancelled: 'Cancelada',
  }

  const riskColors: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626',
  }

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Dashboard" subtitle={`Visão geral do controle de licenciamento SAP`} />

      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {stats.map((stat, i) => (
            <div key={i} className="stat-card" style={{ '--card-accent': stat.accent } as React.CSSProperties}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: stat.bg, border: `1px solid ${stat.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: stat.color
                }}>
                  {stat.icon}
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f9fafb', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af' }}>
                {stat.label}
              </div>
              <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start' }}>

          {/* Recent Audits */}
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Auditorias Recentes</span>
              <Link href="/audit" className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                Ver todas <ArrowRight size={13} />
              </Link>
            </div>
            <div style={{ padding: '8px 0' }}>
              {audits && audits.length > 0 ? audits.map((audit) => (
                <div key={audit.id} className="audit-row-hover" style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid rgba(55, 65, 81, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer'
                }}
                >
                  {/* Risk indicator */}
                  <div style={{
                    width: '4px', height: '48px', borderRadius: '2px',
                    background: riskColors[audit.risk_level] || '#6b7280',
                    flexShrink: 0
                  }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {audit.name}
                      </span>
                      <span className={`badge ${statusColors[audit.status]}`}>
                        {statusLabels[audit.status]}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {new Date(audit.period_start).toLocaleDateString('pt-BR')} – {new Date(audit.period_end).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#10b981' }}>
                      R$ {(audit.potential_savings / 1000).toFixed(0)}k
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>
                      economia potencial
                    </div>
                  </div>
                </div>
              )) : (
                <div className="empty-state">
                  <div className="empty-state-icon"><Shield size={28} /></div>
                  <p className="empty-state-title">Nenhuma auditoria encontrada</p>
                  <p className="empty-state-desc">Crie sua primeira auditoria para começar a identificar oportunidades de otimização.</p>
                  <Link href="/audit" className="btn-primary" style={{ marginTop: '8px' }}>
                    Criar Auditoria
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Open Findings */}
            <div className="section-card">
              <div className="section-header">
                <span className="section-title">Achados Críticos</span>
                <Link href="/audit" className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                  <ArrowRight size={13} />
                </Link>
              </div>
              <div style={{ padding: '8px 0' }}>
                {findings && findings.filter(f => f.status === 'open').slice(0, 4).map((f) => (
                  <div key={f.id} style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(55, 65, 81, 0.2)',
                    display: 'flex', gap: '12px', alignItems: 'flex-start'
                  }}>
                    <span className={`badge badge-${f.severity}`} style={{ marginTop: '2px', flexShrink: 0 }}>
                      {f.severity === 'critical' ? 'CRÍTICO' : f.severity === 'high' ? 'ALTO' : f.severity === 'medium' ? 'MÉDIO' : 'BAIXO'}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: '500', color: '#e5e7eb', lineHeight: '1.4' }}>
                        {f.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '3px' }}>
                        {findingTypeLabels[f.finding_type] || f.finding_type}
                      </div>
                    </div>
                  </div>
                ))}
                {(!findings || findings.filter(f => f.status === 'open').length === 0) && (
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: '600' }}>Sem achados em aberto</p>
                  </div>
                )}
              </div>
            </div>

            {/* Systems status */}
            <div className="section-card">
              <div className="section-header">
                <span className="section-title">Sistemas SAP</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {systems?.map(sys => (
                  <div key={sys.id} style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(55, 65, 81, 0.2)',
                    display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      background: sys.sync_status === 'success' ? '#10b981' : sys.sync_status === 'error' ? '#ef4444' : '#f59e0b',
                      boxShadow: `0 0 6px ${sys.sync_status === 'success' ? '#10b981' : sys.sync_status === 'error' ? '#ef4444' : '#f59e0b'}60`,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#e5e7eb' }}>
                        {sys.system_id} — {sys.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                        {sys.landscape} · Cliente {sys.client_number}
                      </div>
                    </div>
                    <span className={`badge landscape-${sys.landscape}`} style={{
                      background: 'rgba(31, 41, 55, 0.6)',
                      border: '1px solid rgba(55, 65, 81, 0.4)',
                      fontSize: '0.65rem'
                    }}>
                      {sys.system_id}
                    </span>
                  </div>
                ))}
                {(!systems || systems.length === 0) && (
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <Server size={24} color="#4b5563" style={{ margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Nenhum sistema configurado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contract value */}
            {contractValue > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(139, 92, 246, 0.1))',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '16px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <BarChart3 size={18} color="#60a5fa" />
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#93c5fd' }}>
                    Valor Total dos Contratos
                  </span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f9fafb', letterSpacing: '-0.04em' }}>
                  R$ {(contractValue / 1000000).toFixed(2)}M
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                  {contracts?.length || 0} contrato(s) ativo(s)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* License utilization */}
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">Utilização de Licenças por Tipo</span>
            <Link href="/users" className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
              Ver usuários <ArrowRight size={13} />
            </Link>
          </div>
          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {[
              { name: 'Professional User', contracted: 150, used: 127, color: '#3b82f6' },
              { name: 'Limited User', contracted: 80, used: 68, color: '#10b981' },
              { name: 'Developer', contracted: 10, used: 8, color: '#8b5cf6' },
            ].map((lic, i) => {
              const pct = Math.round((lic.used / lic.contracted) * 100)
              return (
                <div key={i} style={{
                  padding: '20px',
                  background: 'rgba(31, 41, 55, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(55, 65, 81, 0.4)'
                }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#e5e7eb', marginBottom: '12px' }}>
                    {lic.name}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f9fafb' }}>{lic.used}</span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>/ {lic.contracted}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${pct}%`,
                      background: pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : lic.color,
                    }} />
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#6b7280' }}>
                    {pct}% utilizado · {lic.contracted - lic.used} disponíveis
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <style>{`
          .audit-row-hover { transition: background 0.15s; }
          .audit-row-hover:hover { background: rgba(59,130,246,0.04); }
        `}</style>
      </main>
    </div>
  )
}
