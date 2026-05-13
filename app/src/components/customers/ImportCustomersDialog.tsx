'use client'

import { useRef, useState } from 'react'
import {
  Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet,
  Loader2, Download, ChevronRight
} from 'lucide-react'

interface ImportResult {
  success: boolean
  total: number
  processed: number
  errors?: string[]
  message: string
}

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportCustomersDialog({ open, onClose, onSuccess }: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)

  if (!open) return null

  function handleFileChange(f: File | null) {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      setStatus('error')
      setResult({ success: false, total: 0, processed: 0, message: 'Use .xlsx, .xls ou .csv' })
      return
    }
    setFile(f)
    setStatus('idle')
    setResult(null)
  }

  async function handleImport() {
    if (!file) return
    setStatus('loading')
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/customers/import', { method: 'POST', body: fd })
      const data: ImportResult = await res.json()
      if (!res.ok) {
        setStatus('error')
        setResult({ success: false, total: 0, processed: 0, message: data.message || (data as any).error || 'Erro na importação' })
      } else {
        setStatus('success')
        setResult(data)
        onSuccess()
      }
    } catch (err: any) {
      setStatus('error')
      setResult({ success: false, total: 0, processed: 0, message: err.message || 'Erro inesperado' })
    }
  }

  function handleClose() {
    setFile(null)
    setStatus('idle')
    setResult(null)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        width: '100%', maxWidth: '560px',
        background: '#0f172a',
        border: '1px solid rgba(55, 65, 81, 0.5)',
        borderRadius: '20px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid rgba(55, 65, 81, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <FileSpreadsheet size={20} style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', color: '#f9fafb' }}>
                Importar Clientes
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                Excel (.xlsx, .xls) ou CSV — Customer ID como chave única
              </p>
            </div>
          </div>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280',
            padding: '4px', borderRadius: '6px'
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* Template hint */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(37, 99, 235, 0.06)',
            border: '1px solid rgba(37, 99, 235, 0.18)',
            marginBottom: '20px'
          }}>
            <p style={{ fontSize: '0.78rem', color: '#93c5fd' }}>
              Colunas: Customer ID · CNPJ · Customer Name · City · Estate · Country · ZipCod · Industry · Contact Name · E-mail · Position · Phone
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFileChange(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#3b82f6' : file ? 'rgba(16, 185, 129, 0.4)' : 'rgba(55, 65, 81, 0.5)'}`,
              borderRadius: '14px',
              padding: '32px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(37, 99, 235, 0.07)' : file ? 'rgba(16, 185, 129, 0.05)' : 'rgba(15, 23, 42, 0.4)',
              transition: 'all 0.2s',
              marginBottom: '20px'
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={e => handleFileChange(e.target.files?.[0] || null)}
            />
            {file ? (
              <>
                <FileSpreadsheet size={36} style={{ color: '#10b981', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: '600', color: '#34d399' }}>{file.name}</p>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '4px' }}>
                  {(file.size / 1024).toFixed(1)} KB — Clique para trocar
                </p>
              </>
            ) : (
              <>
                <Upload size={36} style={{ color: '#374151', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: '600', color: '#9ca3af' }}>
                  Arraste o arquivo aqui ou clique para selecionar
                </p>
                <p style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '4px' }}>
                  .xlsx · .xls · .csv
                </p>
              </>
            )}
          </div>

          {/* Resultado */}
          {result && (
            <div style={{
              padding: '14px 16px', borderRadius: '12px', marginBottom: '20px',
              background: result.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${result.success ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                {result.success
                  ? <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '1px' }} />
                  : <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
                }
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '600', color: result.success ? '#34d399' : '#f87171' }}>
                    {result.message}
                  </p>
                  {result.success && (
                    <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                        <strong style={{ color: '#e5e7eb' }}>{result.total}</strong> linhas lidas
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                        <strong style={{ color: '#10b981' }}>{result.processed}</strong> importados/atualizados
                      </span>
                    </div>
                  )}
                  {result.errors?.map((e, i) => (
                    <p key={i} style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '4px' }}>• {e}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button onClick={handleClose} className="btn-secondary">
              {status === 'success' ? 'Fechar' : 'Cancelar'}
            </button>
            {status !== 'success' && (
              <button
                onClick={handleImport}
                disabled={!file || status === 'loading'}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: !file ? 0.5 : 1 }}
              >
                {status === 'loading' ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Importando...</>
                ) : (
                  <><Upload size={16} /> Iniciar Importação</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
