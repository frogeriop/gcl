'use client'

import { useRef, useState } from 'react'
import { Upload, X, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2, ArrowRight, ArrowLeft, Users } from 'lucide-react'

interface PreviewData {
  total: number
  unique: number
  duplicates: number
  preview: Record<string, string>[]
  hasMore: boolean
}

interface ImportResult {
  success: boolean
  total: number
  processed: number
  duplicatesRemoved?: number
  message: string
  errors?: string[]
}

type Step = 'select' | 'preview' | 'importing' | 'success' | 'error'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const COLS = [
  { key: 'customer_id', label: 'Customer ID', mono: true },
  { key: 'cnpj', label: 'CNPJ', mono: true },
  { key: 'customer_name', label: 'Razão Social' },
  { key: 'city', label: 'Cidade' },
  { key: 'estate', label: 'UF' },
  { key: 'industry', label: 'Segmento' },
  { key: 'contact_name', label: 'Contato' },
]

export function ImportCustomersDialog({ open, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [step, setStep] = useState<Step>('select')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  if (!open) return null

  const isWide = step === 'preview' || step === 'importing' || step === 'success'

  function reset() {
    setFile(null); setStep('select'); setPreview(null); setResult(null); setErrorMsg('')
  }

  function handleClose() { reset(); onClose() }

  function handleDrop(f: File) {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      setErrorMsg('Use .xlsx, .xls ou .csv'); setStep('error'); return
    }
    setFile(f); setErrorMsg(''); setStep('select')
  }

  async function handlePreview() {
    if (!file) return
    setStep('preview')
    setPreview(null)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/customers/preview', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { setErrorMsg(data.error || 'Erro ao processar arquivo'); setStep('error'); return }
    setPreview(data)
  }

  async function handleImport() {
    if (!file) return
    setStep('importing')
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/customers/import', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) {
      setErrorMsg(data.error || 'Erro na importação'); setStep('error'); return
    }
    setResult(data); setStep('success'); onSuccess()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: isWide ? '900px' : '540px',
        background: '#0f172a', border: '1px solid rgba(55,65,81,0.5)',
        borderRadius: '20px', boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
        overflow: 'hidden', transition: 'max-width 0.3s ease',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(55,65,81,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileSpreadsheet size={18} style={{ color: '#60a5fa' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f9fafb' }}>Importar Clientes Licenciados</h2>
              <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {step === 'select' && 'Selecione a planilha Excel para importar'}
                {step === 'preview' && (preview ? `${preview.unique} registros únicos encontrados` : 'Processando arquivo...')}
                {step === 'importing' && 'Gravando no banco de dados...'}
                {step === 'success' && 'Importação concluída com sucesso'}
                {step === 'error' && 'Erro ao processar arquivo'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Steps indicator */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(55,65,81,0.3)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {[{ id: 'select', label: '1. Arquivo' }, { id: 'preview', label: '2. Pré-visualização' }, { id: 'success', label: '3. Concluído' }].map((s, i) => {
            const active = step === s.id || (step === 'importing' && s.id === 'preview') || (step === 'error' && s.id === 'select')
            const done = (s.id === 'select' && ['preview', 'importing', 'success'].includes(step)) ||
                         (s.id === 'preview' && ['importing', 'success'].includes(step))
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: '700',
                  background: done ? '#10b981' : active ? '#2563eb' : 'rgba(55,65,81,0.4)',
                  color: done || active ? '#fff' : '#6b7280'
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '0.75rem', color: done ? '#10b981' : active ? '#60a5fa' : '#6b7280', fontWeight: active ? '600' : '400' }}>{s.label}</span>
                {i < 2 && <div style={{ width: '20px', height: '1px', background: 'rgba(55,65,81,0.4)', margin: '0 2px' }} />}
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* STEP: SELECT */}
          {step === 'select' && (
            <>
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)', marginBottom: '16px' }}>
                <p style={{ fontSize: '0.75rem', color: '#93c5fd', lineHeight: 1.5 }}>
                  <strong>Colunas esperadas:</strong> Customer ID · CNPJ · Customer Name · City · Estate · Country · ZipCod · Industry · Contact Name · E-mail · Position · Phone
                </p>
              </div>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleDrop(e.dataTransfer.files[0]) }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? '#3b82f6' : file ? 'rgba(16,185,129,0.5)' : 'rgba(55,65,81,0.5)'}`,
                  borderRadius: '14px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                  background: dragging ? 'rgba(37,99,235,0.07)' : file ? 'rgba(16,185,129,0.05)' : 'rgba(15,23,42,0.4)',
                  transition: 'all 0.2s'
                }}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleDrop(f) }} />
                {file ? (
                  <>
                    <FileSpreadsheet size={40} style={{ color: '#10b981', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '0.95rem', fontWeight: '700', color: '#34d399' }}>{file.name}</p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>{(file.size / 1024).toFixed(1)} KB — Clique para trocar</p>
                  </>
                ) : (
                  <>
                    <Upload size={40} style={{ color: '#374151', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#9ca3af' }}>Arraste o arquivo aqui ou clique para selecionar</p>
                    <p style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '4px' }}>.xlsx · .xls · .csv</p>
                  </>
                )}
              </div>
            </>
          )}

          {/* STEP: PREVIEW loading */}
          {step === 'preview' && !preview && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Loader2 size={36} style={{ color: '#3b82f6', margin: '0 auto 14px', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Processando planilha...</p>
            </div>
          )}

          {/* STEP: PREVIEW table */}
          {step === 'preview' && preview && (
            <>
              {/* Summary chips */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', fontSize: '0.8rem' }}>
                  <strong style={{ color: '#60a5fa' }}>{preview.total}</strong> <span style={{ color: '#6b7280' }}>linhas lidas</span>
                </div>
                <div style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.8rem' }}>
                  <strong style={{ color: '#34d399' }}>{preview.unique}</strong> <span style={{ color: '#6b7280' }}>registros únicos</span>
                </div>
                {preview.duplicates > 0 && (
                  <div style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.8rem' }}>
                    <strong style={{ color: '#fbbf24' }}>{preview.duplicates}</strong> <span style={{ color: '#6b7280' }}>duplicatas removidas</span>
                  </div>
                )}
                {preview.hasMore && (
                  <div style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.2)', fontSize: '0.8rem', color: '#6b7280' }}>
                    Exibindo primeiros 500
                  </div>
                )}
              </div>

              {/* Table */}
              <div style={{ border: '1px solid rgba(55,65,81,0.4)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '380px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                      <tr style={{ background: '#0a0f1e', borderBottom: '1px solid rgba(55,65,81,0.5)' }}>
                        <th style={{ padding: '10px 12px', color: '#6b7280', fontWeight: '600', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.7rem', letterSpacing: '0.05em' }}>#</th>
                        {COLS.map(c => (
                          <th key={c.key} style={{ padding: '10px 12px', color: '#6b7280', fontWeight: '600', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                            {c.label.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(55,65,81,0.2)', background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.4)' }}>
                          <td style={{ padding: '8px 12px', color: '#4b5563', fontSize: '0.7rem' }}>{i + 1}</td>
                          {COLS.map(c => (
                            <td key={c.key} style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: c.mono ? '#60a5fa' : '#d1d5db', fontFamily: c.mono ? 'monospace' : 'inherit' }}>
                              {row[c.key] || <span style={{ color: '#374151' }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* STEP: IMPORTING */}
          {step === 'importing' && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 20px' }}>
                <Loader2 size={60} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
              </div>
              <p style={{ fontSize: '1rem', fontWeight: '700', color: '#f9fafb', marginBottom: '6px' }}>Importando clientes...</p>
              <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Gravando {preview?.unique} registros no banco de dados</p>
            </div>
          )}

          {/* STEP: SUCCESS */}
          {step === 'success' && result && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle2 size={32} style={{ color: '#10b981' }} />
              </div>
              <p style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f9fafb', marginBottom: '6px' }}>Importação concluída!</p>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '24px' }}>{result.message}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ padding: '12px 20px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', textAlign: 'center', minWidth: '100px' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#60a5fa' }}>{result.total}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>linhas lidas</div>
                </div>
                <div style={{ padding: '12px 20px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center', minWidth: '100px' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#34d399' }}>{result.processed}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>importados</div>
                </div>
                {(result.duplicatesRemoved ?? 0) > 0 && (
                  <div style={{ padding: '12px 20px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center', minWidth: '100px' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fbbf24' }}>{result.duplicatesRemoved}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>duplicatas</div>
                  </div>
                )}
              </div>
              {result.errors?.map((e, i) => <p key={i} style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '8px' }}>⚠ {e}</p>)}
            </div>
          )}

          {/* STEP: ERROR */}
          {step === 'error' && (
            <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: '700', color: '#f87171', marginBottom: '4px' }}>Erro ao processar arquivo</p>
                <p style={{ fontSize: '0.82rem', color: '#fca5a5' }}>{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(55,65,81,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            {step === 'preview' && (
              <button onClick={() => setStep('select')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid rgba(55,65,81,0.5)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: '#9ca3af', fontSize: '0.82rem' }}>
                <ArrowLeft size={14} /> Voltar
              </button>
            )}
            {step === 'error' && (
              <button onClick={() => { setStep('select'); setErrorMsg('') }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid rgba(55,65,81,0.5)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: '#9ca3af', fontSize: '0.82rem' }}>
                <ArrowLeft size={14} /> Tentar novamente
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleClose} style={{ padding: '9px 18px', borderRadius: '8px', background: 'none', border: '1px solid rgba(55,65,81,0.5)', cursor: 'pointer', color: '#9ca3af', fontSize: '0.82rem' }}>
              {step === 'success' ? 'Fechar' : 'Cancelar'}
            </button>

            {step === 'select' && (
              <button onClick={handlePreview} disabled={!file} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 20px', borderRadius: '8px', background: file ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'rgba(55,65,81,0.3)', border: 'none', cursor: file ? 'pointer' : 'not-allowed', color: '#fff', fontSize: '0.85rem', fontWeight: '700', opacity: file ? 1 : 0.5 }}>
                Pré-visualizar <ArrowRight size={15} />
              </button>
            )}

            {step === 'preview' && preview && (
              <button onClick={handleImport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #059669, #047857)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '0.85rem', fontWeight: '700', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' }}>
                <Upload size={15} /> Confirmar e Importar {preview.unique} registros
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
