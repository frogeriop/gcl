import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { Server, Plus, RefreshCw, CheckCircle2, AlertCircle, Clock, Wifi, WifiOff } from 'lucide-react'

const DEMO_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'

export default async function SystemsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id || DEMO_TENANT_ID

  const { data: systems } = await supabase
    .from('sap_systems')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at')

  const { data: licenseTypes } = await supabase
    .from('license_types')
    .select('*')
    .eq('tenant_id', tenantId)

  const { data: sapUsers } = await supabase
    .from('sap_users')
    .select('id, sap_system_id, is_active')
    .eq('tenant_id', tenantId)

  const landscapeConfig: Record<string, { label: string; color: string; bg: string }> = {
    production: { label: 'Produção', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
    quality: { label: 'Qualidade', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    development: { label: 'Desenvolvimento', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    sandbox: { label: 'Sandbox', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  }

  const syncConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    success: { label: 'Sincronizado', color: '#10b981', icon: <CheckCircle2 size={14} /> },
    error: { label: 'Erro', color: '#ef4444', icon: <AlertCircle size={14} /> },
    syncing: { label: 'Sincronizando', color: '#3b82f6', icon: <RefreshCw size={14} /> },
    pending: { label: 'Pendente', color: '#6b7280', icon: <Clock size={14} /> },
  }

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Sistemas SAP" subtitle="Gerenciar e monitorar sistemas SAP conectados" />

      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { label: 'Total', value: systems?.length || 0 },
              { label: 'Ativos', value: systems?.filter(s => s.is_active).length || 0 },
              { label: 'Sincronizados', value: systems?.filter(s => s.sync_status === 'success').length || 0 },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '8px 16px', background: 'rgba(31, 41, 55, 0.6)',
                border: '1px solid rgba(55, 65, 81, 0.4)', borderRadius: '10px',
                display: 'flex', gap: '8px', alignItems: 'center'
              }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#60a5fa' }}>{s.value}</span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary"><Plus size={16} /> Adicionar Sistema</button>
        </div>

        {/* Systems grid */}
        {systems && systems.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {systems.map(sys => {
              const landscape = landscapeConfig[sys.landscape] || { label: sys.landscape, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' }
              const sync = syncConfig[sys.sync_status] || syncConfig.pending
              const userCount = sapUsers?.filter(u => u.sap_system_id === sys.id).length || 0
              const activeUsers = sapUsers?.filter(u => u.sap_system_id === sys.id && u.is_active).length || 0
              const sysLicTypes = licenseTypes?.filter(lt => lt.sap_system_id === sys.id) || []
              const totalContracted = sysLicTypes.reduce((s, lt) => s + lt.contracted_quantity, 0)

              return (
                <div key={sys.id} className="glass-card" style={{ padding: '24px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '14px',
                          background: 'linear-gradient(135deg, #1f2937, #374151)',
                          border: '2px solid rgba(75, 85, 99, 0.5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', fontWeight: '800', color: '#60a5fa'
                        }}>
                          {sys.system_id}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#f9fafb' }}>
                            {sys.name}
                          </h3>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            Versão: {sys.version || 'Não informado'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      padding: '4px 10px', borderRadius: '20px',
                      background: landscape.bg, color: landscape.color,
                      fontSize: '0.7rem', fontWeight: '600'
                    }}>
                      {landscape.label}
                    </div>
                  </div>

                  {/* Info grid */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: '10px', marginBottom: '16px'
                  }}>
                    {[
                      { label: 'Mandante', value: sys.client_number || '—' },
                      { label: 'Usuários', value: `${activeUsers}/${userCount}` },
                      { label: 'Licenças', value: totalContracted > 0 ? `${totalContracted} contrat.` : '—' },
                      { label: 'Última Sync', value: sys.last_sync ? new Date(sys.last_sync).toLocaleDateString('pt-BR') : '—' },
                    ].map((info, i) => (
                      <div key={i} style={{
                        padding: '10px 12px',
                        background: 'rgba(31, 41, 55, 0.5)',
                        borderRadius: '8px',
                        border: '1px solid rgba(55, 65, 81, 0.3)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '3px' }}>{info.label}</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#e5e7eb' }}>{info.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Sync status */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: `${sync.color}10`,
                    border: `1px solid ${sync.color}25`,
                    borderRadius: '10px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: sync.color, fontSize: '0.8125rem', fontWeight: '600' }}>
                      {sync.icon}
                      {sync.label}
                    </div>
                    {sys.sync_status !== 'syncing' && (
                      <button style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#6b7280', fontSize: '0.75rem', fontWeight: '500'
                      }}>
                        <RefreshCw size={12} />
                        Sincronizar
                      </button>
                    )}
                  </div>

                  {/* License types */}
                  {sysLicTypes.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Tipos de Licença
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {sysLicTypes.map(lt => (
                          <div key={lt.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '6px 10px',
                            background: 'rgba(31, 41, 55, 0.4)',
                            borderRadius: '6px'
                          }}>
                            <span style={{ fontSize: '0.8rem', color: '#d1d5db' }}>{lt.name}</span>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: '#9ca3af' }}>
                              <span>{lt.contracted_quantity} contratadas</span>
                              {lt.unit_cost && <span style={{ color: '#60a5fa' }}>R$ {lt.unit_cost}/un.</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: '0.8rem' }}>
                      Gerenciar
                    </button>
                    <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                      <Plus size={14} /> Importar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="section-card">
            <div className="empty-state">
              <div className="empty-state-icon"><Server size={32} /></div>
              <p className="empty-state-title">Nenhum sistema SAP cadastrado</p>
              <p className="empty-state-desc">Adicione os sistemas SAP que deseja monitorar e auditar.</p>
              <button className="btn-primary" style={{ marginTop: '8px' }}>
                <Plus size={16} /> Adicionar Sistema
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
