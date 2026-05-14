'use client'

import { useState, useTransition } from 'react'
import { Building2, Search, Plus, Edit2, Trash2, CheckCircle, XCircle, Users, Calendar, Package, X } from 'lucide-react'

type Plan = { id: string; name: string; slug: string }
type Tenant = {
  id: string
  name: string
  slug: string
  cnpj: string | null
  status: string
  plan_id: string | null
  subscription_start: string | null
  subscription_end: string | null
  created_at: string
  user_count: number
  plan_name: string
}

const statusColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  active:    { bg: 'rgba(16, 185, 129, 0.12)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)', label: 'Ativo' },
  suspended: { bg: 'rgba(245, 158, 11, 0.12)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)', label: 'Suspenso' },
  cancelled: { bg: 'rgba(239, 68, 68, 0.12)',  text: '#f87171', border: 'rgba(239, 68, 68, 0.3)',  label: 'Cancelado' },
}

function StatusBadge({ status }: { status: string }) {
  const s = statusColors[status] || statusColors.active
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem',
      fontWeight: '600', background: s.bg, color: s.text, border: `1px solid ${s.border}`
    }}>
      {status === 'active' ? <CheckCircle size={10} /> : <XCircle size={10} />}
      {s.label}
    </span>
  )
}

function CreateTenantModal({ plans, onClose, onSuccess }: {
  plans: Plan[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    const body = {
      name: fd.get('name'),
      slug: (fd.get('name') as string).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      cnpj: fd.get('cnpj') || null,
      plan_id: fd.get('plan_id') || null,
      status: 'active',
      subscription_start: fd.get('subscription_start') || null,
      subscription_end: fd.get('subscription_end') || null,
    }
    startTransition(async () => {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        padding: '32px', width: '520px', boxShadow: '0 32px 64px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#f9fafb' }}>Novo Tenant</h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '3px' }}>Adicionar novo workspace à plataforma</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Nome do Tenant *</label>
            <input name="name" required className="input-field" placeholder="Ex: Empresa XYZ" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>CNPJ</label>
            <input name="cnpj" className="input-field" placeholder="00.000.000/0001-00" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Plano</label>
            <select name="plan_id" className="input-field">
              <option value="">Sem plano</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Início da Assinatura</label>
              <input name="subscription_start" type="date" className="input-field" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Fim da Assinatura</label>
              <input name="subscription_end" type="date" className="input-field" />
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '0.8rem', color: '#f87171' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" disabled={pending} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              {pending ? 'Criando...' : 'Criar Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditTenantModal({ tenant, plans, onClose, onSuccess }: {
  tenant: Tenant
  plans: Plan[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    const body = {
      name: fd.get('name'),
      cnpj: fd.get('cnpj') || null,
      plan_id: fd.get('plan_id') || null,
      status: fd.get('status'),
      subscription_start: fd.get('subscription_start') || null,
      subscription_end: fd.get('subscription_end') || null,
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/tenants?id=${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        padding: '32px', width: '520px', boxShadow: '0 32px 64px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#f9fafb' }}>Editar Tenant</h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '3px' }}>{tenant.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Nome *</label>
            <input name="name" required defaultValue={tenant.name} className="input-field" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>CNPJ</label>
            <input name="cnpj" defaultValue={tenant.cnpj || ''} className="input-field" placeholder="00.000.000/0001-00" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Plano</label>
              <select name="plan_id" defaultValue={tenant.plan_id || ''} className="input-field">
                <option value="">Sem plano</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Status</label>
              <select name="status" defaultValue={tenant.status} className="input-field">
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Início da Assinatura</label>
              <input name="subscription_start" type="date" defaultValue={tenant.subscription_start?.split('T')[0] || ''} className="input-field" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '7px' }}>Fim da Assinatura</label>
              <input name="subscription_end" type="date" defaultValue={tenant.subscription_end?.split('T')[0] || ''} className="input-field" />
            </div>
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

export function TenantsManager({ tenants: initial, plans }: { tenants: Tenant[]; plans: Plan[] }) {
  const [tenants, setTenants] = useState(initial)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)

  const filtered = search.trim()
    ? tenants.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.cnpj || '').includes(search) ||
        t.status.includes(search.toLowerCase())
      )
    : tenants

  async function reload() {
    const res = await fetch('/api/admin/tenants')
    const data = await res.json()
    if (data.tenants) setTenants(data.tenants)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir tenant "${name}"? Todos os dados associados serão removidos.`)) return
    const res = await fetch(`/api/admin/tenants?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    setTenants(t => t.filter(x => x.id !== id))
  }

  return (
    <div style={{ padding: '28px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {/* KPI pills */}
          {[
            { label: 'Total', value: tenants.length, color: '#60a5fa' },
            { label: 'Ativos', value: tenants.filter(t => t.status === 'active').length, color: '#34d399' },
            { label: 'Suspensos', value: tenants.filter(t => t.status === 'suspended').length, color: '#fbbf24' },
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

        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
            <input
              type="text"
              placeholder="Buscar tenant..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '34px', width: '220px', height: '38px', fontSize: '0.8125rem' }}
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 18px', height: '38px' }}
          >
            <Plus size={16} />
            Novo Tenant
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="section-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.4)', background: 'rgba(17, 24, 39, 0.5)' }}>
                {['Tenant', 'CNPJ', 'Plano', 'Usuários', 'Status', 'Criado em', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: '0.72rem', fontWeight: '600', color: '#6b7280',
                    textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(55, 65, 81, 0.25)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(31, 41, 55, 0.4)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                        background: 'linear-gradient(135deg, #1f2937, #374151)',
                        border: '1px solid rgba(75, 85, 99, 0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Building2 size={14} style={{ color: '#9ca3af' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#f9fafb' }}>{t.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#4b5563', fontFamily: 'monospace' }}>{t.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#9ca3af', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {t.cnpj || '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem',
                      background: 'rgba(37, 99, 235, 0.1)', color: '#60a5fa',
                      border: '1px solid rgba(37, 99, 235, 0.2)', fontWeight: '500'
                    }}>
                      <Package size={10} />
                      {t.plan_name}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e5e7eb' }}>
                      <Users size={13} style={{ color: '#6b7280' }} />
                      {t.user_count}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={t.status} /></td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={12} />
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(t.created_at))}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setEditingTenant(t)}
                        style={{
                          padding: '6px 10px', borderRadius: '7px', border: '1px solid rgba(55, 65, 81, 0.5)',
                          background: 'rgba(31, 41, 55, 0.6)', color: '#9ca3af', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem'
                        }}
                        title="Editar"
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        style={{
                          padding: '6px 10px', borderRadius: '7px', border: '1px solid rgba(239, 68, 68, 0.25)',
                          background: 'rgba(239, 68, 68, 0.08)', color: '#f87171', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem'
                        }}
                        title="Excluir"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                    <Building2 size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p style={{ fontWeight: '600', color: '#9ca3af' }}>
                      {search ? 'Nenhum tenant encontrado para esta busca.' : 'Nenhum tenant cadastrado.'}
                    </p>
                    {!search && (
                      <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Clique em "Novo Tenant" para adicionar.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateTenantModal
          plans={plans}
          onClose={() => setShowCreate(false)}
          onSuccess={reload}
        />
      )}
      {editingTenant && (
        <EditTenantModal
          tenant={editingTenant}
          plans={plans}
          onClose={() => setEditingTenant(null)}
          onSuccess={reload}
        />
      )}
    </div>
  )
}
