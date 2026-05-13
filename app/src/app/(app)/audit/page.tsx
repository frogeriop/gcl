import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { Shield, Plus, Calendar, Users, TrendingDown, AlertTriangle, CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const DEMO_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'

export default async function AuditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const tenantId = profile?.tenant_id || DEMO_TENANT_ID

  const { data: audits } = await supabase
    .from('audits')
    .select('*, sap_systems(name, system_id, landscape)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const { data: findings } = await supabase
    .from('audit_findings')
    .select('*')
    .eq('tenant_id', tenantId)

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    completed: { label: 'Concluída', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', icon: <CheckCircle2 size={14} /> },
    in_progress: { label: 'Em Progresso', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', icon: <Clock size={14} /> },
    draft: { label: 'Rascunho', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)', icon: <Clock size={14} /> },
    review: { label: 'Em Revisão', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', icon: <AlertTriangle size={14} /> },
    cancelled: { label: 'Cancelada', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', icon: <AlertTriangle size={14} /> },
  }

  const riskConfig: Record<string, { label: string; color: string }> = {
    low: { label: 'Baixo', color: '#10b981' },
    medium: { label: 'Médio', color: '#f59e0b' },
    high: { label: 'Alto', color: '#ef4444' },
    critical: { label: 'Crítico', color: '#dc2626' },
  }

  const landscapeLabels: Record<string, string> = {
    production: 'Produção',
    quality: 'Qualidade',
    development: 'Desenvolvimento',
    sandbox: 'Sandbox',
  }

  // Stats
  const totalAudits = audits?.length || 0
  const completedAudits = audits?.filter(a => a.status === 'completed').length || 0
  const openFindings = findings?.filter(f => f.status === 'open').length || 0
  const totalSavings = findings?.reduce((s, f) => s + (f.estimated_saving || 0), 0) || 0

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Auditorias" subtitle="Gerencie e acompanhe os ciclos de auditoria de licenciamento" />

      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { label: 'Total', value: totalAudits, color: '#6b7280' },
              { label: 'Concluídas', value: completedAudits, color: '#10b981' },
              { label: 'Achados Abertos', value: openFindings, color: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '8px 16px',
                background: 'rgba(31, 41, 55, 0.6)',
                border: '1px solid rgba(55, 65, 81, 0.4)',
                borderRadius: '10px',
                display: 'flex', gap: '8px', alignItems: 'center'
              }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: s.color }}>{s.value}</span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary">
            <Plus size={16} />
            Nova Auditoria
          </button>
        </div>

        {/* Audit cards grid */}
        {audits && audits.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
            {audits.map(audit => {
              const status = statusConfig[audit.status] || statusConfig.draft
              const risk = riskConfig[audit.risk_level] || riskConfig.low
              const sys = (audit as any).sap_systems
              const auditFindings = findings?.filter(f => (f as any).audit_id === audit.id) || []
              const openCount = auditFindings.filter(f => f.status === 'open').length

              return (
                <div key={audit.id} className="glass-card" style={{ padding: '24px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '3px 10px', borderRadius: '20px',
                          background: status.bg, color: status.color,
                          fontSize: '0.7rem', fontWeight: '600'
                        }}>
                          {status.icon}
                          {status.label}
                        </div>
                        {/* Risk */}
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: risk.color
                        }} />
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Risco {risk.label}</span>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#f9fafb', marginBottom: '4px' }}>
                        {audit.name}
                      </h3>
                      {audit.description && (
                        <p style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: '1.5' }}>
                          {audit.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* System info */}
                  {sys && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
                      padding: '8px 12px',
                      background: 'rgba(31, 41, 55, 0.5)',
                      borderRadius: '8px',
                      border: '1px solid rgba(55, 65, 81, 0.4)'
                    }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#60a5fa' }}>
                        {sys.system_id}
                      </span>
                      <span style={{ color: '#374151' }}>·</span>
                      <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>{sys.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#6b7280', textTransform: 'capitalize' }}>
                        {landscapeLabels[sys.landscape] || sys.landscape}
                      </span>
                    </div>
                  )}

                  {/* Period */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', color: '#6b7280' }}>
                    <Calendar size={13} />
                    <span style={{ fontSize: '0.8rem' }}>
                      {new Date(audit.period_start).toLocaleDateString('pt-BR')} até {new Date(audit.period_end).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px', marginBottom: '16px',
                    padding: '14px',
                    background: 'rgba(31, 41, 55, 0.4)',
                    borderRadius: '12px'
                  }}>
                    {[
                      { label: 'Usuários', value: audit.total_users },
                      { label: 'Ativos', value: audit.active_users },
                      { label: 'Achados', value: openCount, highlight: openCount > 0 },
                      { label: 'Economia', value: `R$ ${(audit.potential_savings / 1000).toFixed(0)}k`, highlight: true },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: '1.1rem', fontWeight: '700',
                          color: s.highlight && (s.value !== 0 && s.value !== 'R$ 0k') ? '#10b981' : '#f9fafb'
                        }}>
                          {s.value}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.8rem' }}>
                      Ver Detalhes <ArrowRight size={13} />
                    </button>
                    {audit.status === 'completed' && (
                      <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                        Exportar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="section-card">
            <div className="empty-state">
              <div className="empty-state-icon"><Shield size={32} /></div>
              <p className="empty-state-title">Nenhuma auditoria criada</p>
              <p className="empty-state-desc">
                Crie sua primeira auditoria para analisar o licenciamento SAP e identificar oportunidades de otimização.
              </p>
              <button className="btn-primary" style={{ marginTop: '8px' }}>
                <Plus size={16} /> Criar Primeira Auditoria
              </button>
            </div>
          </div>
        )}

        {/* Findings table */}
        {findings && findings.length > 0 && (
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Todos os Achados</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="input-field" style={{ width: 'auto', height: '36px', fontSize: '0.8rem', borderRadius: '8px' }}>
                  <option value="">Todos os status</option>
                  <option value="open">Abertos</option>
                  <option value="acknowledged">Reconhecidos</option>
                  <option value="resolved">Resolvidos</option>
                </select>
                <select className="input-field" style={{ width: 'auto', height: '36px', fontSize: '0.8rem', borderRadius: '8px' }}>
                  <option value="">Todas as severidades</option>
                  <option value="critical">Crítico</option>
                  <option value="high">Alto</option>
                  <option value="medium">Médio</option>
                  <option value="low">Baixo</option>
                </select>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Severidade</th>
                    <th>Tipo</th>
                    <th>Título</th>
                    <th>Status</th>
                    <th>Economia Est.</th>
                    <th>Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map(f => (
                    <tr key={f.id}>
                      <td>
                        <span className={`badge badge-${f.severity}`}>
                          {f.severity === 'critical' ? 'Crítico' : f.severity === 'high' ? 'Alto' : f.severity === 'medium' ? 'Médio' : 'Baixo'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        {f.finding_type.replace(/_/g, ' ')}
                      </td>
                      <td style={{ color: '#e5e7eb', fontWeight: '500', maxWidth: '300px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.title}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${f.status}`}>
                          {f.status === 'open' ? 'Aberto' : f.status === 'acknowledged' ? 'Reconhecido' : f.status === 'resolved' ? 'Resolvido' : 'Risco Aceito'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600', color: '#10b981' }}>
                        {f.estimated_saving > 0 ? `R$ ${f.estimated_saving.toLocaleString('pt-BR')}` : '—'}
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                        {new Date(f.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
