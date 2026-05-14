import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { BarChart3, Download, FileText, TrendingDown, Users, Shield } from 'lucide-react'

const DEMO_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id || DEMO_TENANT_ID

  const { data: audits } = await supabase
    .from('audits')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')

  const { data: findings } = await supabase
    .from('audit_findings')
    .select('*')
    .eq('tenant_id', tenantId)

  const { data: sapUsers } = await supabase
    .from('sap_users')
    .select('id, is_active, last_login, department, license_type_id')
    .eq('tenant_id', tenantId)

  // Calcular métricas
  const totalSavings = findings?.reduce((s, f) => s + (f.estimated_saving || 0), 0) || 0
  const resolvedFindings = findings?.filter(f => f.status === 'resolved').length || 0
  const openFindings = findings?.filter(f => f.status === 'open').length || 0
  const criticalOpen = findings?.filter(f => f.status === 'open' && f.severity === 'critical').length || 0

  // Por tipo de achado
  const findingsByType: Record<string, number> = {}
  findings?.forEach(f => {
    findingsByType[f.finding_type] = (findingsByType[f.finding_type] || 0) + 1
  })

  const findingTypeLabels: Record<string, string> = {
    inactive_licensed: 'Inativos Licenciados',
    wrong_license_type: 'Tipo de Licença Errado',
    test_user_production: 'Teste em Produção',
    shared_user: 'Usuário Compartilhado',
    duplicate_user: 'Usuário Duplicado',
    missing_license: 'Sem Licença',
    over_privileged: 'Superprivilegiado',
    expired_validity: 'Validade Expirada',
    excessive_authorizations: 'Autorizações Excessivas',
  }

  // Por severidade
  const bySeverity = {
    critical: findings?.filter(f => f.severity === 'critical').length || 0,
    high: findings?.filter(f => f.severity === 'high').length || 0,
    medium: findings?.filter(f => f.severity === 'medium').length || 0,
    low: findings?.filter(f => f.severity === 'low').length || 0,
  }

  const reportTemplates = [
    {
      title: 'Relatório Executivo de Licenciamento',
      desc: 'Visão consolidada para gestores com KPIs e recomendações estratégicas.',
      icon: <BarChart3 size={20} />,
      color: '#3b82f6',
      tags: ['PDF', 'PowerPoint'],
    },
    {
      title: 'Relatório de Achados e Não-Conformidades',
      desc: 'Lista detalhada de todos os achados com severidade, impacto e recomendações.',
      icon: <Shield size={20} />,
      color: '#f59e0b',
      tags: ['PDF', 'Excel'],
    },
    {
      title: 'Análise de Otimização de Custos',
      desc: 'Mapeamento de oportunidades de redução de custos com licenciamento SAP.',
      icon: <TrendingDown size={20} />,
      color: '#10b981',
      tags: ['PDF', 'Excel'],
    },
    {
      title: 'Inventário de Usuários SAP',
      desc: 'Lista completa de usuários com tipo de licença, último acesso e status.',
      icon: <Users size={20} />,
      color: '#8b5cf6',
      tags: ['Excel', 'CSV'],
    },
    {
      title: 'Relatório de Contratos',
      desc: 'Resumo de todos os contratos com datas de vencimento e valores.',
      icon: <FileText size={20} />,
      color: '#ec4899',
      tags: ['PDF', 'Excel'],
    },
  ]

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Relatórios" subtitle="Gere e exporte relatórios de auditoria e licenciamento" />

      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Resumo geral */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { label: 'Economia Total Identificada', value: `R$ ${(totalSavings / 1000).toFixed(0)}k`, color: '#10b981', sub: 'Em todas as auditorias' },
            { label: 'Achados Resolvidos', value: resolvedFindings, color: '#3b82f6', sub: `de ${findings?.length || 0} total` },
            { label: 'Achados Abertos', value: openFindings, color: '#f59e0b', sub: `${criticalOpen} críticos` },
            { label: 'Auditorias Realizadas', value: audits?.length || 0, color: '#8b5cf6', sub: 'Apenas concluídas' },
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{
              '--card-accent': `linear-gradient(90deg, ${s.color}, ${s.color}80)`,
            } as React.CSSProperties}>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: s.color, letterSpacing: '-0.04em' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#9ca3af', marginTop: '6px' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '3px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Achados por tipo */}
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Achados por Tipo</span>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(findingsByType).sort((a, b) => b[1] - a[1]).map(([type, count], i) => {
                const total = findings?.length || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.8125rem', color: '#d1d5db' }}>
                        {findingTypeLabels[type] || type.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#e5e7eb' }}>
                        {count}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }} />
                    </div>
                  </div>
                )
              })}
              {Object.keys(findingsByType).length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280', fontSize: '0.875rem' }}>
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </div>

          {/* Achados por severidade */}
          <div className="section-card">
            <div className="section-header">
              <span className="section-title">Distribuição por Severidade</span>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Crítico', count: bySeverity.critical, color: '#ef4444' },
                { label: 'Alto', count: bySeverity.high, color: '#f59e0b' },
                { label: 'Médio', count: bySeverity.medium, color: '#3b82f6' },
                { label: 'Baixo', count: bySeverity.low, color: '#10b981' },
              ].map((s, i) => {
                const total = findings?.length || 1
                const pct = Math.round((s.count / total) * 100) || 0
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                      background: s.color
                    }} />
                    <span style={{ flex: 1, fontSize: '0.875rem', color: '#d1d5db' }}>{s.label}</span>
                    <div style={{ flex: 2 }}>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: s.color }} />
                      </div>
                    </div>
                    <span style={{
                      width: '32px', textAlign: 'right',
                      fontSize: '0.875rem', fontWeight: '700', color: s.color
                    }}>
                      {s.count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Report templates */}
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">Modelos de Relatório</span>
          </div>
          <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {reportTemplates.map((tmpl, i) => (
              <div key={i} className="report-card-hover" style={{
                padding: '18px',
                background: 'rgba(31, 41, 55, 0.4)',
                border: '1px solid rgba(55, 65, 81, 0.4)',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                '--hover-border': `${tmpl.color}40`,
                '--hover-bg': `${tmpl.color}08`,
              } as React.CSSProperties}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                    background: `${tmpl.color}18`,
                    border: `1px solid ${tmpl.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: tmpl.color
                  }}>
                    {tmpl.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#f9fafb', marginBottom: '4px' }}>
                      {tmpl.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: '1.5' }}>
                      {tmpl.desc}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {tmpl.tags.map((tag, j) => (
                      <span key={j} style={{
                        padding: '2px 8px', borderRadius: '4px',
                        background: 'rgba(31, 41, 55, 0.8)',
                        border: '1px solid rgba(55, 65, 81, 0.5)',
                        fontSize: '0.65rem', fontWeight: '600', color: '#9ca3af'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    background: `${tmpl.color}18`,
                    border: `1px solid ${tmpl.color}30`,
                    borderRadius: '8px', padding: '6px 12px',
                    color: tmpl.color, fontSize: '0.75rem', fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    <Download size={12} /> Gerar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <style>{`
        .report-card-hover { transition: all 0.2s ease; }
        .report-card-hover:hover { background: rgba(59,130,246,0.06) !important; border-color: rgba(59,130,246,0.3) !important; }
      `}</style>
    </div>
  )
}
