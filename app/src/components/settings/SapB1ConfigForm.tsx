'use client'

import { useState } from 'react'
import { Server, CheckCircle2, AlertTriangle, Loader2, Wifi } from 'lucide-react'

type SapConfig = {
  sap_service_layer_url: string
  sap_company_db: string
  sap_user_name: string
  sap_password: string
  sap_language_code: string
  sap_verify_ssl: boolean
}

export function SapB1ConfigForm({ initial }: { initial: SapConfig }) {
  const [cfg, setCfg] = useState(initial)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target
    setCfg(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setTestResult(null)
  }

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/settings/sap-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cfg.sap_service_layer_url,
          companyDB: cfg.sap_company_db,
          userName: cfg.sap_user_name,
          password: cfg.sap_password,
          languageCode: cfg.sap_language_code,
        }),
      })
      const data = await res.json()
      setTestResult({ success: data.success, message: data.message })
    } catch {
      setTestResult({ success: false, message: 'Erro ao comunicar com o servidor.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5 }}>
        Configure a conexão com a <strong style={{ color: '#93c5fd' }}>SAP Business One Service Layer</strong> para integração e sincronização de dados de licenciamento.
      </p>

      {/* Service Layer URL */}
      <div>
        <label className="form-label">Service Layer URL *</label>
        <input
          name="sap_service_layer_url"
          value={cfg.sap_service_layer_url}
          onChange={handleChange}
          className="input-field"
          placeholder="https://192.168.1.100:50000/b1s/v1"
        />
        <p style={{ fontSize: '0.7rem', color: '#4b5563', marginTop: '4px' }}>
          URL base da Service Layer. Ex: https://servidor:50000/b1s/v1
        </p>
      </div>

      {/* Company DB */}
      <div>
        <label className="form-label">Banco de Dados da Empresa (Company DB) *</label>
        <input
          name="sap_company_db"
          value={cfg.sap_company_db}
          onChange={handleChange}
          className="input-field"
          placeholder="SBO_EMPRESA_PRD"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Username */}
        <div>
          <label className="form-label">Usuário SAP B1 *</label>
          <input
            name="sap_user_name"
            value={cfg.sap_user_name}
            onChange={handleChange}
            className="input-field"
            placeholder="manager"
          />
        </div>
        {/* Language */}
        <div>
          <label className="form-label">Código de Idioma</label>
          <input
            name="sap_language_code"
            value={cfg.sap_language_code}
            onChange={handleChange}
            className="input-field"
            placeholder="29"
          />
          <p style={{ fontSize: '0.7rem', color: '#4b5563', marginTop: '4px' }}>29 = Português (Brasil)</p>
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="form-label">Senha *</label>
        <input
          name="sap_password"
          type="password"
          value={cfg.sap_password}
          onChange={handleChange}
          className="input-field"
          placeholder="••••••••"
        />
      </div>

      {/* SSL */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="checkbox"
          id="sap_verify_ssl"
          name="sap_verify_ssl"
          checked={cfg.sap_verify_ssl}
          onChange={handleChange}
          style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
        />
        <label htmlFor="sap_verify_ssl" style={{ fontSize: '0.875rem', color: '#d1d5db', cursor: 'pointer' }}>
          Verificar certificado SSL (desative para ambientes com certificado autoassinado)
        </label>
      </div>

      {/* Test Connection */}
      <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(55,65,81,0.3)' }}>
        <button
          type="button"
          onClick={testConnection}
          disabled={testing || !cfg.sap_service_layer_url}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 18px', borderRadius: '10px', cursor: 'pointer',
            background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.3)',
            color: '#60a5fa', fontSize: '0.875rem', fontWeight: '600',
            opacity: testing || !cfg.sap_service_layer_url ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
        >
          {testing ? <Loader2 size={15} className="animate-spin" /> : <Wifi size={15} />}
          {testing ? 'Testando conexão...' : 'Testar Conexão SAP B1'}
        </button>

        {testResult && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '8px',
            background: testResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${testResult.success ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: testResult.success ? '#34d399' : '#f87171',
            fontSize: '0.875rem', fontWeight: '500'
          }}>
            {testResult.success
              ? <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              : <AlertTriangle size={16} style={{ flexShrink: 0 }} />}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="sap_service_layer_url" value={cfg.sap_service_layer_url} />
      <input type="hidden" name="sap_company_db" value={cfg.sap_company_db} />
      <input type="hidden" name="sap_user_name" value={cfg.sap_user_name} />
      <input type="hidden" name="sap_password" value={cfg.sap_password} />
      <input type="hidden" name="sap_language_code" value={cfg.sap_language_code} />
      <input type="hidden" name="sap_verify_ssl" value={cfg.sap_verify_ssl ? 'on' : ''} />
    </div>
  )
}
