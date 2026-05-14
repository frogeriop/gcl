'use client'

import { useState, useTransition } from 'react'
import { Search, UserCheck, UserX, Shield, Edit2, Trash2, Mail, Building2, X, Users } from 'lucide-react'

type Tenant = { id: string; name: string; slug: string }
type UserProfile = {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  tenant_id: string
  must_change_password: boolean
  last_login: string | null
  created_at: string
  tenants: { id: string; name: string; slug: string } | null
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  super_admin: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
  admin:       { bg: 'rgba(37, 99, 235, 0.12)',  text: '#60a5fa', border: 'rgba(37, 99, 235, 0.3)' },
  auditor:     { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
  viewer:      { bg: 'rgba(55, 65, 81, 0.3)',    text: '#9ca3af', border: 'rgba(75, 85, 99, 0.4)' },
}

const roleLabels: Record<string, string> = {
  super_admin: '★ Super Admin',
  admin: 'Admin',
  auditor: 'Auditor',
  viewer: 'Viewer',
}

function RoleBadge({ role }: { role: string }) {
  const c = roleColors[role] || roleColors.viewer
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem',
      fontWeight: '600', background: c.bg, color: c.text, border: `1px solid ${c.border}`
    }}>
      {roleLabels[role] || role}
    </span>
  )
}

function EditUserModal({ user, tenants, onClose, onSuccess }: {
  user: UserProfile
  tenants: Tenant[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fd.get('full_name'),
          role: fd.get('role'),
          tenant_id: fd.get('tenant_id'),
          is_active: fd.get('is_active') === 'true',
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      onSuccess()
      onClose()
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        background: '#111827', border: '1px solid rgba(55, 65, 81, 0.6)', borderRadius: '20px',
        padding: '32px', width: '480px', boxShadow: '0 32px 64px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#f9fafb' }}>Editar Usuário</h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '3px' }}>{user.email}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Nome Completo</label>
            <input name="full_name" defaultValue={user.full_name} className="input-field" placeholder="Nome do usuário" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Função (Role)</label>
            <select name="role" defaultValue={user.role} className="input-field">
              <option value="viewer">Viewer</option>
              <option value="auditor">Auditor</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Tenant</label>
            <select name="tenant_id" defaultValue={user.tenant_id} className="input-field">
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Status</label>
            <select name="is_active" defaultValue={user.is_active ? 'true' : 'false'} className="input-field">
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '0.8rem', color: '#f87171' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              {pending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function UsersManager({ users: initial, tenants, currentUserId }: {
  users: UserProfile[]
  tenants: Tenant[]
  currentUserId: string
}) {
  const [users, setUsers] = useState(initial)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)

  const filtered = users.filter(u => {
    const matchSearch = !search.trim() ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.tenants?.name || '').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  async function reload() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (data.users) setUsers(data.users)
  }

  async function handleToggleActive(u: UserProfile) {
    const res = await fetch(`/api/admin/users?id=${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !u.is_active }),
    })
    const data = await res.json()
    if (!data.error) {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x))
    }
  }

  async function handleDelete(u: UserProfile) {
    if (u.id === currentUserId) { alert('Você não pode excluir seu próprio usuário.'); return }
    if (!confirm(`Excluir usuário "${u.email}"? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/admin/users?id=${u.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    setUsers(prev => prev.filter(x => x.id !== u.id))
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* KPI pills */}
          {[
            { label: 'Total', value: users.length, color: '#60a5fa' },
            { label: 'Ativos', value: users.filter(u => u.is_active).length, color: '#34d399' },
            { label: 'Inativos', value: users.filter(u => !u.is_active).length, color: '#f87171' },
          ].map(k => (
            <div key={k.label} style={{
              padding: '8px 16px', borderRadius: '10px',
              background: 'rgba(31, 41, 55, 0.6)', border: '1px solid rgba(55, 65, 81, 0.4)',
              display: 'flex', gap: '8px', alignItems: 'center'
            }}>
              <span style={{ fontSize: '1rem', fontWeight: '700', color: k.color }}>{k.value}</span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{k.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="input-field"
            style={{ height: '38px', fontSize: '0.8125rem', paddingRight: '32px' }}
          >
            <option value="all">Todas as funções</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="auditor">Auditor</option>
            <option value="viewer">Viewer</option>
          </select>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
            <input
              type="text"
              placeholder="Buscar usuário..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '34px', width: '220px', height: '38px', fontSize: '0.8125rem' }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="section-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.4)', background: 'rgba(17, 24, 39, 0.5)' }}>
                {['Usuário', 'Tenant', 'Função', 'Status', 'Último Login', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: '0.72rem', fontWeight: '600', color: '#6b7280',
                    textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.25)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(31, 41, 55, 0.4)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                        background: 'linear-gradient(135deg, #2563eb22, #1d4ed822)',
                        border: '1px solid rgba(37, 99, 235, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.875rem', fontWeight: '700', color: '#60a5fa'
                      }}>
                        {(u.full_name || u.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#f9fafb' }}>{u.full_name || '(sem nome)'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={10} />
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {u.tenants ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={12} style={{ color: '#6b7280' }} />
                        <span style={{ color: '#e5e7eb', fontSize: '0.875rem' }}>{u.tenants.name}</span>
                      </div>
                    ) : <span style={{ color: '#4b5563', fontSize: '0.8rem' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '600',
                      ...(u.is_active
                        ? { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                        : { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' })
                    }}>
                      {u.is_active ? <UserCheck size={10} /> : <UserX size={10} />}
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '0.8rem' }}>
                    {u.last_login
                      ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(u.last_login))
                      : 'Nunca'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleToggleActive(u)}
                        title={u.is_active ? 'Desativar' : 'Ativar'}
                        style={{
                          padding: '6px 8px', borderRadius: '7px', cursor: 'pointer',
                          border: u.is_active
                            ? '1px solid rgba(239,68,68,0.25)'
                            : '1px solid rgba(16,185,129,0.25)',
                          background: u.is_active
                            ? 'rgba(239,68,68,0.08)'
                            : 'rgba(16,185,129,0.08)',
                          color: u.is_active ? '#f87171' : '#34d399',
                          display: 'flex', alignItems: 'center'
                        }}
                      >
                        {u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                      <button
                        onClick={() => setEditingUser(u)}
                        title="Editar"
                        style={{
                          padding: '6px 10px', borderRadius: '7px', border: '1px solid rgba(55, 65, 81, 0.5)',
                          background: 'rgba(31, 41, 55, 0.6)', color: '#9ca3af', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem'
                        }}
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={u.id === currentUserId}
                        title="Excluir"
                        style={{
                          padding: '6px 8px', borderRadius: '7px',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          background: 'rgba(239, 68, 68, 0.08)', color: '#f87171',
                          cursor: u.id === currentUserId ? 'not-allowed' : 'pointer',
                          opacity: u.id === currentUserId ? 0.4 : 1,
                          display: 'flex', alignItems: 'center'
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                    <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ fontWeight: '600', color: '#9ca3af' }}>
                      {search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          tenants={tenants}
          onClose={() => setEditingUser(null)}
          onSuccess={reload}
        />
      )}
    </div>
  )
}
