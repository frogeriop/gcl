import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { FileText, Plus, Calendar, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react'

const DEMO_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id || DEMO_TENANT_ID

  const { data: contracts } = await supabase
    .from('license_contracts')
    .select('*, sap_systems(name, system_id, landscape)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const totalValue = contracts?.reduce((s, c) => s + (c.total_value || 0), 0) || 0
  const activeContracts = contracts?.filter(c => c.status === 'active').length || 0

  // Contratos próximos do vencimento (90 dias)
  const nearExpiry = contracts?.filter(c => {
    if (!c.end_date || c.status !== 'active') return false
    const daysLeft = Math.floor((new Date(c.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysLeft <= 90 && daysLeft > 0
  }).length || 0

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: 'Ativo', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    expired: { label: 'Expirado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
    cancelled: { label: 'Cancelado', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' },
    pending_renewal: { label: 'Renovação Pendente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  }

  const landscapeColors: Record<string, string> = {
    production: '#ef4444',
    quality: '#f59e0b',
    development: '#3b82f6',
    sandbox: '#8b5cf6',
  }

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Contratos de Licença" subtitle="Gerenciar contratos e acordos de licenciamento SAP" />

      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { label: 'Valor Total', value: `R$ ${(totalValue / 1000000).toFixed(2)}M`, color: '#60a5fa' },
              { label: 'Ativos', value: activeContracts, color: '#10b981' },
              { label: 'Próx. Vencimento', value: nearExpiry, color: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '8px 16px', background: 'rgba(31, 41, 55, 0.6)',
                border: '1px solid rgba(55, 65, 81, 0.4)', borderRadius: '10px',
                display: 'flex', gap: '8px', alignItems: 'center'
              }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: s.color }}>{s.value}</span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary"><Plus size={16} /> Novo Contrato</button>
        </div>

        {/* Contracts */}
        {contracts && contracts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {contracts.map(contract => {
              const status = statusConfig[contract.status] || statusConfig.active
              const sys = (contract as any).sap_systems
              const daysLeft = contract.end_date
                ? Math.floor((new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null
              const licDetails = Array.isArray(contract.license_details) ? contract.license_details : []

              return (
                <div key={contract.id} className="glass-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        {contract.contract_number && (
                          <span style={{
                            fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: '700',
                            color: '#60a5fa',
                            padding: '2px 8px', borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid rgba(59, 130, 246, 0.2)'
                          }}>
                            {contract.contract_number}
                          </span>
                        )}
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px',
                          background: status.bg, color: status.color,
                          fontSize: '0.7rem', fontWeight: '600'
                        }}>
                          {status.label}
                        </span>
                        {daysLeft !== null && daysLeft <= 90 && daysLeft > 0 && (
                          <span style={{
                            padding: '3px 10px', borderRadius: '20px',
                            background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24',
                            fontSize: '0.7rem', fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            <AlertCircle size={11} />
                            Vence em {daysLeft} dias
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#f9fafb' }}>
                        {contract.vendor} — {sys?.name || 'Sistema SAP'}
                      </h3>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f9fafb' }}>
                        {contract.total_value
                          ? `R$ ${(contract.total_value / 1000000).toFixed(2)}M`
                          : '—'
                        }
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>{contract.currency}</div>
                    </div>
                  </div>

                  {/* Info row */}
                  <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Início', value: new Date(contract.start_date).toLocaleDateString('pt-BR') },
                      { label: 'Término', value: contract.end_date ? new Date(contract.end_date).toLocaleDateString('pt-BR') : 'Indeterminado' },
                      { label: 'Renovação automática', value: contract.auto_renewal ? 'Sim' : 'Não' },
                      { label: 'Sistema', value: sys ? `${sys.system_id} — ${sys.name}` : '—' },
                    ].map((info, i) => (
                      <div key={i}>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '2px' }}>{info.label}</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#e5e7eb' }}>{info.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* License breakdown */}
                  {licDetails.length > 0 && (
                    <div style={{
                      padding: '14px',
                      background: 'rgba(31, 41, 55, 0.4)',
                      borderRadius: '10px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Composição das Licenças
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        {licDetails.map((ld: any, i: number) => (
                          <div key={i} style={{
                            padding: '10px 14px',
                            background: 'rgba(17, 24, 39, 0.6)',
                            borderRadius: '8px',
                            border: '1px solid rgba(55, 65, 81, 0.4)'
                          }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#e5e7eb' }}>{ld.type}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                              {ld.quantity} un. × R$ {ld.unit_price}/un.
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#60a5fa', marginTop: '4px' }}>
                              R$ {(ld.quantity * ld.unit_price).toLocaleString('pt-BR')}/ano
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                      Ver Detalhes
                    </button>
                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                      Editar
                    </button>
                    {contract.auto_renewal && (
                      <div style={{
                        marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '0.75rem', color: '#10b981'
                      }}>
                        <CheckCircle2 size={13} /> Renovação automática ativa
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="section-card">
            <div className="empty-state">
              <div className="empty-state-icon"><FileText size={32} /></div>
              <p className="empty-state-title">Nenhum contrato cadastrado</p>
              <p className="empty-state-desc">Cadastre os contratos de licenciamento SAP para controlar datas de vencimento e valores.</p>
              <button className="btn-primary" style={{ marginTop: '8px' }}>
                <Plus size={16} /> Novo Contrato
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
