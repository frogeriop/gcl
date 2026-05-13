'use client'

import { useState } from 'react'
import { Mail, CheckCircle2, AlertCircle, X, Loader2, RefreshCw } from 'lucide-react'

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  fromName: string
  fromAddress: string
}

export function EmailTestForm({ config }: { config?: Partial<SmtpConfig> }) {
  const [recipient, setRecipient] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSendTest() {
    if (!recipient || !recipient.includes('@')) {
      setStatus('error')
      setErrorMessage('Por favor, insira um e-mail válido para o teste.')
      return
    }

    setStatus('loading')
    try {
      const host = (document.getElementById('smtp-host') as HTMLInputElement)?.value || ''
      const port = Number((document.getElementById('smtp-port') as HTMLInputElement)?.value) || 587
      const user = (document.getElementById('smtp-user') as HTMLInputElement)?.value || ''
      const pass = (document.getElementById('smtp-pass') as HTMLInputElement)?.value || ''
      const fromName = (document.getElementById('smtp-from-name') as HTMLInputElement)?.value || ''
      const fromAddress = (document.getElementById('smtp-from-address') as HTMLInputElement)?.value || ''

      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, pass, fromName, fromAddress, recipient }),
      })
      const result = await res.json()

      if (result.success) {
        setStatus('success')
        setRecipient('')
      } else {
        setStatus('error')
        setErrorMessage(result.error || 'Falha ao enviar e-mail de teste.')
      }
    } catch (err: any) {
      setStatus('error')
      setErrorMessage(err.message || 'Ocorreu um erro inesperado.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {status === 'success' && (
        <div style={{
          padding: '14px 16px', borderRadius: '10px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#34d399', marginBottom: '2px' }}>
                E-mail enviado com sucesso!
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6ee7b7' }}>
                O teste foi disparado. Verifique a caixa de entrada (ou spam).
              </p>
            </div>
          </div>
          <button onClick={() => setStatus('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }}>
            <X size={16} />
          </button>
        </div>
      )}
      {status === 'error' && (
        <div style={{
          padding: '14px 16px', borderRadius: '10px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f87171', marginBottom: '2px' }}>Erro no envio</p>
              <p style={{ fontSize: '0.75rem', color: '#fca5a5' }}>{errorMessage}</p>
            </div>
          </div>
          <button onClick={() => setStatus('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
            <X size={16} />
          </button>
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: '12px',
        paddingTop: '16px', borderTop: '1px solid rgba(55, 65, 81, 0.4)'
      }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#9ca3af', marginBottom: '8px' }}>
            Endereço de teste
          </label>
          <input
            type="email"
            className="input-field"
            placeholder="admin@alfaerp.com.br"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            disabled={status === 'loading'}
          />
        </div>
        <button
          onClick={handleSendTest}
          disabled={status === 'loading'}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '10px', height: '42px',
            background: status === 'loading' ? 'rgba(37, 99, 235, 0.3)' : 'rgba(37, 99, 235, 0.15)',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            color: '#60a5fa', fontSize: '0.875rem', fontWeight: '600',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {status === 'loading'
            ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
            : <><Mail size={14} /> Testar SMTP</>
          }
        </button>
      </div>
    </div>
  )
}
