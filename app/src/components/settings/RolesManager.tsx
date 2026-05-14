'use client'

import { useState, useTransition } from 'react'
import { Shield, Plus, Edit2, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'

// ── Rotinas disponíveis na aplicação ──────────────────────
const APP_ROUTES = [
  { key: 'dashboard',  label: 'Dashboard',       description: 'Visualizar painel principal' },
  { key: 'customers',  label: 'Clientes',         description: 'Gestão de clientes licenciados' },
  { key: 'contracts',  label: 'Contratos',        description: 'Gestão de contratos de licença' },
  { key: 'reports',    label: 'Relatórios',       description: 'Visualizar e exportar relatórios' },
  { key: 'settings',   label: 'Configurações',    description: 'Acessar configurações do sistema' },
  { key: 'admin',      label: 'Administração',    description: 'Módulo de administração da plataforma' },
]

const PALETTE = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#6b7280'
]

type Permissions = Record<string, boolean>
type BusinessRole = {
  id: string
  name: string
  slug: string
  description: string | null
  color: string
  permissions: Permissions
  is_active: boolean
  created_at: string
}

// ── Modal de criação / edição ──────────────────────────────
function RoleModal({
  role, onClose, onSuccess
}: {
  role: BusinessRole | null
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!role
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [name, setName] = useState(role?.name || '')
  const [description, setDescription] = useState(role?.description || '')
  const [color, setColor] = useState(role?.color || '#3b82f6')
  const [perms, setPerms] = useState<Permissions>(
    role?.permissions || Object.fromEntries(APP_ROUTES.map(r => [r.key, false]))
  )

  function togglePerm(key: string) {
    setPerms(p => ({ ...p, [key]: !p[key] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Nome é obrigatório.'); return }

    const body = { name: name.trim(), description, color, permissions: perms }

    start(async () => {
      const res = isEdit
        ? await fetch(`/api/business-roles?id=${role!.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
          })
        : await fetch('/api/business-roles', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
          })

      const data = await res.json()
      if (data.error) { setError(data.error); return }
      onSuccess()
      onClose()
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)'
    }}>
      <div style={{
        background: '#111827', border: '1px solid rgba(55,65,81,0.6)', borderRadius: '20px',
        padding: '32px', width: '540px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 32px 64px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f9fafb' }}>
              {isEdit ? 'Editar Role' : 'Nova Role'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '3px' }}>
              {isEdit ? `Editando "${role!.name}"` : 'Defina as permissões de acesso'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Nome */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '6px' }}>Nome *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="input-field"
              placeholder="Ex: Vendedor"
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '6px' }}>Descrição</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input-field"
              placeholder="Descreva brevemente o perfil..."
            />
          </div>

          {/* Cor */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '8px' }}>Cor do perfil</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PALETTE.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '28px', height: '28px', borderRadius: '50%', background: c,
                    border: color === c ? '3px solid #fff' : '2px solid transparent',
                    boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Permissões */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '10px' }}>
              Permissões de Acesso
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(55,65,81,0.4)' }}>
              {APP_ROUTES.map((route, i) => {
                const granted = !!perms[route.key]
                return (
                  <div
                    key={route.key}
                    onClick={() => togglePerm(route.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px', cursor: 'pointer',
                      background: granted ? 'rgba(37,99,235,0.08)' : 'rgba(17,24,39,0.5)',
                      borderBottom: i < APP_ROUTES.length - 1 ? '1px solid rgba(55,65,81,0.3)' : 'none',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: granted ? '#93c5fd' : '#9ca3af' }}>
                        {route.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '2px' }}>{route.description}</div>
                    </div>
                    <div style={{
                      width: '40px', height: '22px', borderRadius: '11px',
                      background: granted ? '#2563eb' : 'rgba(75,85,99,0.5)',
                      border: `1px solid ${granted ? '#3b82f6' : 'rgba(107,114,128,0.4)'}`,
                      position: 'relative', transition: 'all 0.2s', flexShrink: 0
                    }}>
                      <div style={{
                        position: 'absolute', top: '2px',
                        left: granted ? '18px' : '2px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        transition: 'left 0.2s'
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '0.8rem', color: '#f87171' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              {pending ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────
export function RolesManager({ roles: initial }: { roles: BusinessRole[] }) {
  const [roles, setRoles] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<BusinessRole | null>(null)

  async function reload() {
    const res = await fetch('/api/business-roles')
    const data = await res.json()
    if (data.roles) setRoles(data.roles)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir a role "${name}"?`)) return
    const res = await fetch(`/api/business-roles?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    setRoles(r => r.filter(x => x.id !== id))
  }

  async function handleToggleActive(role: BusinessRole) {
    const res = await fetch(`/api/business-roles?id=${role.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...role, is_active: !role.is_active }),
    })
    const data = await res.json()
    if (!data.error) {
      setRoles(prev => prev.map(x => x.id === role.id ? { ...x, is_active: !x.is_active } : x))
    }
  }

  const grantedCount = (perms: Permissions) => Object.values(perms).filter(Boolean).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={16} style={{ color: '#60a5fa' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f9fafb' }}>
            Roles de Acesso ({roles.length})
          </span>
        </div>
        <button
          onClick={() => { setEditingRole(null); setShowModal(true) }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '0.8rem' }}
        >
          <Plus size={14} /> Nova Role
        </button>
      </div>

      {/* Grid de roles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
        {roles.map(role => {
          const granted = grantedCount(role.permissions)
          return (
            <div
              key={role.id}
              style={{
                background: 'rgba(17, 24, 39, 0.6)', border: `1px solid rgba(55,65,81,${role.is_active ? '0.5' : '0.2'})`,
                borderRadius: '14px', padding: '16px', opacity: role.is_active ? 1 : 0.55,
                transition: 'all 0.2s'
              }}
            >
              {/* Role header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                    background: `${role.color}20`, border: `2px solid ${role.color}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Shield size={16} style={{ color: role.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f9fafb' }}>{role.name}</div>
                    {role.description && (
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px', lineHeight: 1.3 }}>
                        {role.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Permissions summary */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#4b5563', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Acessos habilitados
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {APP_ROUTES.map(r => {
                    const has = !!role.permissions[r.key]
                    return (
                      <span key={r.key} style={{
                        padding: '2px 7px', borderRadius: '5px', fontSize: '0.68rem', fontWeight: '600',
                        background: has ? `${role.color}18` : 'rgba(55,65,81,0.2)',
                        color: has ? role.color : '#4b5563',
                        border: `1px solid ${has ? role.color + '30' : 'rgba(55,65,81,0.3)'}`,
                        textDecoration: has ? 'none' : 'line-through'
                      }}>
                        {r.label}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Footer actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(55,65,81,0.3)' }}>
                <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                  {granted}/{APP_ROUTES.length} rotinas
                </span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => handleToggleActive(role)}
                    title={role.is_active ? 'Desativar' : 'Ativar'}
                    style={{
                      padding: '5px 7px', borderRadius: '7px', border: 'none',
                      background: role.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                      color: role.is_active ? '#f87171' : '#34d399',
                      cursor: 'pointer', display: 'flex', alignItems: 'center'
                    }}
                  >
                    {role.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button
                    onClick={() => { setEditingRole(role); setShowModal(true) }}
                    style={{
                      padding: '5px 10px', borderRadius: '7px', border: '1px solid rgba(55,65,81,0.4)',
                      background: 'rgba(31,41,55,0.6)', color: '#9ca3af',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem'
                    }}
                  >
                    <Edit2 size={11} /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(role.id, role.name)}
                    style={{
                      padding: '5px 7px', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.25)',
                      background: 'rgba(239,68,68,0.08)', color: '#f87171',
                      cursor: 'pointer', display: 'flex', alignItems: 'center'
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {roles.length === 0 && (
          <div style={{
            gridColumn: '1 / -1', padding: '40px', textAlign: 'center',
            color: '#6b7280', border: '1px dashed rgba(55,65,81,0.4)', borderRadius: '14px'
          }}>
            <Shield size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p>Nenhuma role configurada.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <RoleModal
          role={editingRole}
          onClose={() => { setShowModal(false); setEditingRole(null) }}
          onSuccess={reload}
        />
      )}
    </div>
  )
}
