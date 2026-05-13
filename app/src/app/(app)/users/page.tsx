import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { Users, Upload, Download, Search, UserCheck, UserX, Clock } from 'lucide-react'

const DEMO_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id || DEMO_TENANT_ID

  const { data: sapUsers } = await supabase
    .from('sap_users')
    .select('*, sap_systems(name, system_id), license_types(name, unit_cost)')
    .eq('tenant_id', tenantId)
    .order('full_name')

  const { data: systems } = await supabase
    .from('sap_systems')
    .select('id, name, system_id')
    .eq('tenant_id', tenantId)

  const totalUsers = sapUsers?.length || 0
  const activeUsers = sapUsers?.filter(u => u.is_active).length || 0
  const inactiveUsers = totalUsers - activeUsers
  const neverLogged = sapUsers?.filter(u => !u.last_login).length || 0
  const lockedUsers = sapUsers?.filter(u => u.is_locked).length || 0

  function daysSince(dateStr: string | null): number | null {
    if (!dateStr) return null
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  function getUserRiskBadge(u: any): { label: string; class: string } {
    if (!u.is_active) return { label: 'Inativo', class: 'badge-inactive' }
    if (!u.last_login && u.is_active) return { label: 'Nunca logou', class: 'badge-critical' }
    const days = daysSince(u.last_login)
    if (days !== null && days > 90) return { label: `${days}d sem login`, class: 'badge-high' }
    if (days !== null && days > 30) return { label: `${days}d sem login`, class: 'badge-medium' }
    return { label: 'Ativo', class: 'badge-active' }
  }

  return (
    <div style={{ flex: 1 }}>
      <Topbar title="Usuários SAP" subtitle="Gerenciar e analisar usuários dos sistemas SAP" />

      <main style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
          {[
            { label: 'Total', value: totalUsers, icon: <Users size={16} />, color: '#3b82f6' },
            { label: 'Ativos', value: activeUsers, icon: <UserCheck size={16} />, color: '#10b981' },
            { label: 'Inativos', value: inactiveUsers, icon: <UserX size={16} />, color: '#6b7280' },
            { label: 'Nunca logaram', value: neverLogged, icon: <Clock size={16} />, color: '#f59e0b' },
            { label: 'Bloqueados', value: lockedUsers, icon: <UserX size={16} />, color: '#ef4444' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '16px 18px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: `${s.color}18`, border: `1px solid ${s.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: s.color, flexShrink: 0
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f9fafb', lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '3px' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Actions */}
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">Lista de Usuários SAP</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select className="input-field" style={{ width: 'auto', height: '36px', fontSize: '0.8rem', borderRadius: '8px' }}>
                <option value="">Todos os sistemas</option>
                {systems?.map(s => (
                  <option key={s.id} value={s.id}>{s.system_id} — {s.name}</option>
                ))}
              </select>
              <select className="input-field" style={{ width: 'auto', height: '36px', fontSize: '0.8rem', borderRadius: '8px' }}>
                <option value="">Todos os tipos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="never_logged">Nunca logaram</option>
                <option value="old_login">Login +90 dias</option>
              </select>
              <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                <Upload size={14} /> Importar CSV
              </button>
              <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                <Download size={14} /> Exportar
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuário SAP</th>
                  <th>Nome / Departamento</th>
                  <th>Sistema</th>
                  <th>Tipo de Licença</th>
                  <th>Último Login</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sapUsers?.map(u => {
                  const risk = getUserRiskBadge(u)
                  const sys = (u as any).sap_systems
                  const lic = (u as any).license_types
                  const days = daysSince(u.last_login)

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: u.is_active ? 'rgba(59, 130, 246, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                            border: `1px solid ${u.is_active ? 'rgba(59, 130, 246, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: '800',
                            color: u.is_active ? '#60a5fa' : '#9ca3af'
                          }}>
                            {u.sap_username.slice(0, 2)}
                          </div>
                          <span style={{ fontWeight: '700', color: '#e5e7eb', fontFamily: 'monospace' }}>
                            {u.sap_username}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.875rem', color: '#e5e7eb', fontWeight: '500' }}>
                          {u.full_name || '—'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>
                          {u.department || '—'}
                        </div>
                      </td>
                      <td>
                        {sys ? (
                          <span style={{
                            padding: '3px 10px', borderRadius: '6px',
                            background: 'rgba(37, 99, 235, 0.12)',
                            border: '1px solid rgba(37, 99, 235, 0.2)',
                            fontSize: '0.75rem', fontWeight: '700', color: '#60a5fa',
                            fontFamily: 'monospace'
                          }}>
                            {sys.system_id}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: '#d1d5db' }}>
                          {lic?.name || '—'}
                        </div>
                        {lic?.unit_cost && (
                          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                            R$ {lic.unit_cost}/mês
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                          {u.last_login
                            ? new Date(u.last_login).toLocaleDateString('pt-BR')
                            : <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Nunca</span>
                          }
                        </div>
                        {days !== null && (
                          <div style={{ fontSize: '0.7rem', color: days > 90 ? '#f87171' : days > 30 ? '#fbbf24' : '#10b981' }}>
                            {days === 0 ? 'Hoje' : `há ${days} dias`}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${risk.class}`}>
                          {risk.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
                            Detalhes
                          </button>
                          {!u.is_active && (
                            <button className="btn-danger" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
                              Rever
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {(!sapUsers || sapUsers.length === 0) && (
              <div className="empty-state">
                <div className="empty-state-icon"><Users size={32} /></div>
                <p className="empty-state-title">Nenhum usuário SAP importado</p>
                <p className="empty-state-desc">Importe os usuários a partir de um arquivo CSV ou sincronize diretamente com o sistema SAP.</p>
                <button className="btn-primary" style={{ marginTop: '8px' }}>
                  <Upload size={16} /> Importar Usuários
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
