'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Shield, Mail, Lock, Eye, EyeOff, FileText, BarChart3, AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha inválidos. Verifique suas credenciais.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #060d1f 0%, #0a0f1e 50%, #060d1f 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decorations */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'
      }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Left Panel - Branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', position: 'relative', zIndex: 1
      }} className="hidden lg:flex">
        <div style={{ maxWidth: '480px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)'
            }}>
              <Shield size={26} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.375rem', fontWeight: '800', color: '#f9fafb' }}>GCL</div>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', letterSpacing: '0.04em' }}>GESTÃO DE CONTRATOS DE LICENCIAMENTOS</div>
            </div>
          </div>

          <h1 style={{
            fontSize: '2.5rem', fontWeight: '800', lineHeight: '1.2',
            color: '#f9fafb', letterSpacing: '-0.025em', marginBottom: '20px'
          }}>
            Gestão inteligente de<br/>
            <span className="gradient-text">contratos de licenciamentos</span>
          </h1>

          <p style={{ fontSize: '1rem', color: '#9ca3af', lineHeight: '1.7', marginBottom: '48px' }}>
            Controle clientes, contratos e relatórios de licenciamento SAP em uma plataforma centralizada e segura.
          </p>

          {/* Feature highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: <FileText size={18} />, color: '#3b82f6', text: 'Gestão centralizada de contratos SAP' },
              { icon: <AlertTriangle size={18} />, color: '#f59e0b', text: 'Alertas de vencimento e renovação' },
              { icon: <BarChart3 size={18} />, color: '#34d399', text: 'Relatórios executivos e dashboards' },
            ].map((feat, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 18px',
                background: 'rgba(17, 24, 39, 0.6)',
                border: '1px solid rgba(55, 65, 81, 0.5)',
                borderRadius: '12px'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  background: `${feat.color}18`,
                  border: `1px solid ${feat.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: feat.color
                }}>
                  {feat.icon}
                </div>
                <span style={{ fontSize: '0.875rem', color: '#d1d5db', fontWeight: '500' }}>
                  {feat.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div style={{
        width: '100%', maxWidth: '480px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '32px', position: 'relative', zIndex: 1
      }}>
        <div style={{
          width: '100%',
          background: 'rgba(17, 24, 39, 0.9)',
          border: '1px solid rgba(55, 65, 81, 0.6)',
          borderRadius: '24px',
          padding: '48px 40px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 32px 64px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px' }} className="lg:hidden">
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Shield size={22} color="white" />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f9fafb' }}>GCL</div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f9fafb', marginBottom: '8px' }}>
              Bem-vindo de volta
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '8px' }}>
                E-mail corporativo
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                  color: '#4b5563'
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '42px' }}
                  placeholder="seu@email.com.br"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '500', color: '#9ca3af', marginBottom: '8px' }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                  color: '#4b5563'
                }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '42px', paddingRight: '42px' }}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', display: 'flex'
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '10px',
                fontSize: '0.8125rem',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.9375rem', marginTop: '4px' }}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  Entrando...
                </>
              ) : (
                'Entrar na plataforma'
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div style={{
            marginTop: '28px', padding: '14px 16px',
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '10px',
            fontSize: '0.8rem',
            color: '#60a5fa'
          }}>
            <strong>💡 Demo:</strong> Crie um usuário no Supabase Auth e vincule-o ao tenant de demonstração para explorar todas as funcionalidades.
          </div>
        </div>
      </div>
    </div>
  )
}
