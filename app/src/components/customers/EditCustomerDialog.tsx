'use client'

import { useState } from 'react'
import { X, Save, Loader2, CheckCircle2, AlertCircle, User2, Mail, Phone, Building2, MapPin, Briefcase, ToggleLeft, ToggleRight } from 'lucide-react'

interface Customer {
  customer_id: string
  cnpj: string | null
  customer_name: string
  city: string | null
  estate: string | null
  country: string | null
  zip_cod: string | null
  industry: string | null
  contact_name: string | null
  email: string | null
  position: string | null
  phone: string | null
  is_active: boolean
}

interface Props {
  customer: Customer | null
  open: boolean
  onClose: () => void
  onSaved: (updated: Customer) => void
}

const FIELD_GROUPS = [
  {
    title: 'Identificação', icon: <Building2 size={14} />,
    fields: [
      { key: 'customer_name', label: 'Razão Social', required: true, span: 2 },
      { key: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
      { key: 'industry', label: 'Segmento / Indústria', placeholder: 'Ex: Technology' },
    ]
  },
  {
    title: 'Endereço', icon: <MapPin size={14} />,
    fields: [
      { key: 'city', label: 'Cidade' },
      { key: 'estate', label: 'UF', placeholder: 'SP' },
      { key: 'country', label: 'País', placeholder: 'BRA' },
      { key: 'zip_cod', label: 'CEP', placeholder: '00000-000' },
    ]
  },
  {
    title: 'Contato', icon: <User2 size={14} />,
    fields: [
      { key: 'contact_name', label: 'Nome do Contato', span: 2 },
      { key: 'position', label: 'Cargo' },
      { key: 'email', label: 'E-mail', type: 'email' },
      { key: 'phone', label: 'Telefone', placeholder: '+55 11 9...' },
    ]
  },
]

export function EditCustomerDialog({ customer, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Partial<Customer>>({})
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [initialized, setInitialized] = useState<string | null>(null)

  if (!open || !customer) return null

  // Inicializa o form quando o customer muda
  if (initialized !== customer.customer_id) {
    setForm({ ...customer })
    setStatus('idle')
    setErrorMsg('')
    setInitialized(customer.customer_id)
  }

  function set(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setStatus('saving')
    setErrorMsg('')
    try {
      const res = await fetch('/api/customers/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customer!.customer_id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error || 'Erro ao salvar'); setStatus('error'); return }
      setStatus('success')
      setTimeout(() => {
        onSaved(data.customer)
        onClose()
        setStatus('idle')
      }, 800)
    } catch (err: any) {
      setErrorMsg(err.message); setStatus('error')
    }
  }

  const isActive = form.is_active !== false

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '720px', background: '#0f172a',
        border: '1px solid rgba(55,65,81,0.5)', borderRadius: '20px',
        boxShadow: '0 30px 70px rgba(0,0,0,0.6)', display: 'flex',
        flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(55,65,81,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#60a5fa', background: 'rgba(37,99,235,0.12)', padding: '2px 8px', borderRadius: '5px', fontWeight: '700' }}>
                {customer.customer_id}
              </span>
              {/* Toggle Ativo/Inativo */}
              <button
                onClick={() => set('is_active', !isActive)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {isActive
                  ? <ToggleRight size={16} style={{ color: '#10b981' }} />
                  : <ToggleLeft size={16} style={{ color: '#ef4444' }} />
                }
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isActive ? '#10b981' : '#ef4444' }}>
                  {isActive ? 'Ativo' : 'Inativo'}
                </span>
              </button>
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#f9fafb', marginTop: '6px' }}>
              {customer.customer_name}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {FIELD_GROUPS.map(group => (
            <div key={group.title} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
                <span style={{ color: '#6b7280' }}>{group.icon}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{group.title}</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(55,65,81,0.4)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {group.fields.map((f: any) => (
                  <div key={f.key} style={{ gridColumn: f.span === 2 ? '1 / -1' : undefined }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#6b7280', marginBottom: '5px', letterSpacing: '0.05em' }}>
                      {f.label.toUpperCase()}{f.required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
                    </label>
                    <input
                      type={f.type || 'text'}
                      value={(form as any)[f.key] || ''}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder={f.placeholder || ''}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: '9px',
                        background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(55,65,81,0.5)',
                        color: '#f9fafb', fontSize: '0.85rem', outline: 'none',
                        boxSizing: 'border-box', transition: 'border-color 0.15s',
                        fontFamily: ['cnpj','zip_cod','estate'].includes(f.key) ? 'monospace' : 'inherit'
                      }}
                      onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(37,99,235,0.6)'}
                      onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(55,65,81,0.5)'}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Error */}
          {status === 'error' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginTop: '8px' }}>
              <AlertCircle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', color: '#f87171' }}>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(55,65,81,0.4)', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: '8px', background: 'none', border: '1px solid rgba(55,65,81,0.5)', cursor: 'pointer', color: '#9ca3af', fontSize: '0.82rem' }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={status === 'saving' || status === 'success'}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 22px', borderRadius: '8px', background: status === 'success' ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '0.85rem', fontWeight: '700', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', opacity: status === 'saving' ? 0.7 : 1 }}
          >
            {status === 'saving' && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            {status === 'success' && <CheckCircle2 size={15} />}
            {status === 'saving' ? 'Salvando...' : status === 'success' ? 'Salvo!' : <><Save size={15} /> Salvar Alterações</>}
          </button>
        </div>
      </div>
    </div>
  )
}
