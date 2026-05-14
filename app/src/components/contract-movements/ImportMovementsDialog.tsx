'use client'

import { useRef, useState } from 'react'
import {
  Upload, X, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Loader2, ArrowLeft, Eye, Table2, Hash, Layers,
  CheckCheck, XCircle, Database, FileText, Info
} from 'lucide-react'

interface PreviewResult {
  headerRowIdx: number
  detectedExcelHeaders: string[]
  mappedFields: string[]
  totalDataRows: number
  validCount: number
  duplicatesInFile: number
  previewRows: Record<string, any>[]
  fileName: string
  fileSize: number
}

interface BatchError {
  batchNum: number
  rowsInBatch: number
  error: string
}

interface ImportResult {
  success: boolean
  totalInFile: number
  uniqueInFile: number
  duplicatesInFile: number
  rowsOk: number
  rowsFailed: number
  dbTotal: number | null
  totalBatches: number
  successBatches: number
  failedBatches: number
  batchErrors: BatchError[]
  fileName: string
  mappedColumns: number
  headerRowDetected: number
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type Stage = 'idle' | 'previewing' | 'preview' | 'importing' | 'done' | 'error'

const FIELD_LABELS: Record<string, string> = {
  order_id: 'Order ID', customer_id: 'Customer ID', contract_id: 'Contract ID',
  product_name: 'Produto', sales_order_id: 'Sales Order ID', status: 'Status',
  creation_date: 'Data Criação', contract_start_date: 'Início Contrato',
  customer_name: 'Cliente', partner_name: 'Parceiro', solution: 'Solução',
  order_type: 'Tipo', quantity: 'Qtd', price_type: 'Periodicidade',
  net_amount: 'Valor Líq.', currency: 'Moeda',
  deal_specific_discount: 'Desc. Deal %', promo_discount: 'Desc. Promo %',
  partner_discount: 'Desc. Partner %', promo_code_used: 'Cód. Promo',
  buyer: 'Comprador', industry: 'Segmento',
  customer_country: 'País Cliente', partner_id: 'Partner ID',
  partner_country: 'País Parceiro', contract_duration: 'Duração',
  creation_time: 'Hora Criação',
}

const PREVIEW_COLS = ['order_id', 'customer_id', 'contract_id', 'status', 'customer_name', 'product_name', 'net_amount', 'currency', 'order_type']

// ── Stat row inside summary ────────────────────────────────────────────────────
function SummaryRow({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(55,65,81,0.25)' }}>
      <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '700', color }}>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</span>
        {sub && <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>{sub}</div>}
      </div>
    </div>
  )
}

export function ImportMovementsDialog({ open, onClose, onSuccess }: Props) {
  const [file, setFile]       = useState<File | null>(null)
  const [stage, setStage]     = useState<Stage>('idle')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [result, setResult]   = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const isWide = stage === 'preview' || stage === 'done'

  function reset() { setFile(null); setStage('idle'); setPreview(null); setResult(null); setErrorMsg('') }
  function handleClose() { reset(); onClose() }

  function handleFile(f: File) {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) { setErrorMsg('Formato não suportado. Use .xlsx, .xls ou .csv'); return }
    setFile(f); setErrorMsg(''); setStage('idle'); setPreview(null); setResult(null)
  }

  async function handlePreview() {
    if (!file) return
    setStage('previewing'); setErrorMsg('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res  = await fetch('/api/contract-movements/preview', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || data.error) { setErrorMsg(data.error || 'Erro ao analisar'); setStage('error') }
      else { setPreview(data); setStage('preview') }
    } catch (err: any) { setErrorMsg(err.message || 'Erro de rede'); setStage('error') }
  }

  async function handleImport() {
    if (!file) return
    setStage('importing')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res  = await fetch('/api/contract-movements/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.rowsOk !== undefined) {
        setResult(data); setStage('done')
        if (data.success) setTimeout(onSuccess, 1500)
      } else {
        setErrorMsg(data.error || 'Erro desconhecido'); setStage('error')
      }
    } catch (err: any) { setErrorMsg(err.message || 'Erro de rede'); setStage('error') }
  }

  const previewCols = preview ? PREVIEW_COLS.filter(c => preview.mappedFields.includes(c)) : []

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div style={{
        background: '#111827', border: '1px solid rgba(55,65,81,0.6)', borderRadius: '20px', padding: '28px',
        width: isWide ? '920px' : '520px', maxWidth: '96vw', maxHeight: '92vh', overflow: 'auto',
        boxShadow: '0 40px 80px rgba(0,0,0,0.7)', transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0, background: stage === 'done' && result && !result.success ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)', border: stage === 'done' && result && !result.success ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stage === 'done' && result
                ? result.success ? <CheckCheck size={19} style={{ color: '#34d399' }} /> : <AlertTriangle size={19} style={{ color: '#fbbf24' }} />
                : stage === 'preview' ? <Table2 size={19} style={{ color: '#34d399' }} />
                : <FileSpreadsheet size={19} style={{ color: '#34d399' }} />}
            </div>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f9fafb' }}>
                {stage === 'preview' ? 'Pré-visualização' : stage === 'done' ? 'Resumo da Importação' : 'Importar Movimentações'}
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
                {stage === 'preview' ? `${preview?.totalDataRows.toLocaleString('pt-BR')} linhas detectadas`
                  : stage === 'done' ? `Arquivo: ${result?.fileName}`
                  : '.xlsx · .xls · .csv'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}><X size={17} /></button>
        </div>

        {/* ── SELEÇÃO ── */}
        {(stage === 'idle' || stage === 'previewing' || stage === 'error') && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onClick={() => inputRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? '#34d399' : file ? 'rgba(16,185,129,0.4)' : 'rgba(55,65,81,0.5)'}`, borderRadius: '14px', padding: '26px', background: dragOver ? 'rgba(16,185,129,0.05)' : file ? 'rgba(16,185,129,0.04)' : 'rgba(31,41,55,0.25)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', marginBottom: '14px' }}
            >
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {file ? (
                <><FileSpreadsheet size={28} style={{ color: '#34d399', margin: '0 auto 10px' }} /><p style={{ color: '#34d399', fontWeight: '600', fontSize: '0.9rem' }}>{file.name}</p><p style={{ color: '#6b7280', fontSize: '0.73rem', marginTop: '4px' }}>{(file.size / 1024).toFixed(1)} KB — clique para trocar</p></>
              ) : (
                <><Upload size={28} style={{ color: '#4b5563', margin: '0 auto 10px' }} /><p style={{ color: '#9ca3af', fontSize: '0.9rem', fontWeight: '500' }}>Arraste ou clique para selecionar</p><p style={{ color: '#4b5563', fontSize: '0.73rem', marginTop: '5px' }}>Excel (.xlsx/.xls) ou CSV</p></>
              )}
            </div>
            <div style={{ background: 'rgba(31,41,55,0.35)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <Hash size={14} style={{ color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.76rem', color: '#9ca3af', lineHeight: '1.5' }}><strong style={{ color: '#d1d5db' }}>Todos os registros são importados.</strong> Hash de todos os campos como chave — linhas idênticas não são duplicadas; novas ou modificadas são inseridas/atualizadas.</div>
            </div>
            {errorMsg && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', display: 'flex', gap: '8px', color: '#f87171', fontSize: '0.79rem', marginBottom: '12px' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} /><span>{errorMsg}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handlePreview} disabled={!file || stage === 'previewing'} className="btn-primary" style={{ flex: 2, justifyContent: 'center', gap: '8px', opacity: (!file || stage === 'previewing') ? 0.6 : 1 }}>
                {stage === 'previewing' ? <><Loader2 size={14} className="animate-spin" /> Analisando...</> : <><Eye size={14} /> Pré-visualizar</>}
              </button>
            </div>
          </>
        )}

        {/* ── PREVIEW ── */}
        {stage === 'preview' && preview && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                { label: 'Total de linhas',       value: preview.totalDataRows.toLocaleString('pt-BR'), color: '#60a5fa', icon: Layers },
                { label: 'Serão importadas',      value: preview.validCount.toLocaleString('pt-BR'),    color: '#34d399', icon: Upload },
                { label: 'Duplicatas no arquivo', value: preview.duplicatesInFile.toLocaleString('pt-BR'), color: '#fbbf24', icon: Hash },
                { label: 'Colunas mapeadas',      value: `${preview.mappedFields.length} / 27`,         color: '#a78bfa', icon: Table2 },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, minWidth: '130px', padding: '10px 14px', borderRadius: '10px', background: `${s.color}12`, border: `1px solid ${s.color}30` }}>
                  <div style={{ fontSize: '0.67rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '3px' }}>{s.label}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(31,41,55,0.4)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Colunas detectadas ({preview.mappedFields.length})</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {preview.mappedFields.map(f => <span key={f} style={{ padding: '2px 8px', borderRadius: '5px', fontSize: '0.68rem', background: 'rgba(52,211,153,0.08)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.2)' }}>{FIELD_LABELS[f] || f}</span>)}
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Amostra — primeiras {preview.previewRows.length} linhas</p>
              <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(55,65,81,0.4)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem' }}>
                  <thead><tr style={{ background: 'rgba(10,15,30,0.8)' }}><th style={thS}>#</th>{previewCols.map(c => <th key={c} style={{ ...thS, color: '#6b7280' }}>{FIELD_LABELS[c] || c}</th>)}</tr></thead>
                  <tbody>{preview.previewRows.map((row, i) => <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(15,23,42,0.3)' : 'transparent' }}><td style={{ ...tdS, color: '#4b5563', textAlign: 'center' }}>{i + 1}</td>{previewCols.map(c => <td key={c} style={{ ...tdS, color: row[c] ? '#e5e7eb' : '#374151' }}>{row[c] ?? <span style={{ color: '#374151', fontSize: '0.62rem' }}>—</span>}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStage('idle')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeft size={14} /> Voltar</button>
              <button onClick={handleImport} disabled={preview.validCount === 0} className="btn-primary" style={{ flex: 1, justifyContent: 'center', gap: '8px', opacity: preview.validCount === 0 ? 0.5 : 1 }}>
                <Upload size={14} />Importar {preview.validCount.toLocaleString('pt-BR')} registros
              </button>
            </div>
          </>
        )}

        {/* ── IMPORTANDO ── */}
        {stage === 'importing' && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 18px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 size={28} style={{ color: '#34d399', animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ color: '#f9fafb', fontWeight: '700', fontSize: '1rem' }}>Importando movimentações...</p>
            <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '6px' }}>Processando {preview?.validCount?.toLocaleString('pt-BR')} registros em lotes de 200</p>
          </div>
        )}

        {/* ── RESUMO FINAL ── */}
        {stage === 'done' && result && (
          <>
            {/* Status banner */}
            <div style={{
              padding: '14px 18px', borderRadius: '12px', marginBottom: '18px',
              background: result.success ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${result.success ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              {result.success
                ? <CheckCheck size={22} style={{ color: '#34d399', flexShrink: 0 }} />
                : <AlertTriangle size={22} style={{ color: '#fbbf24', flexShrink: 0 }} />}
              <div>
                <div style={{ fontWeight: '700', color: '#f9fafb', fontSize: '0.9rem' }}>
                  {result.success ? 'Importação concluída com sucesso' : `Importação concluída com ${result.failedBatches} lote(s) com erro`}
                </div>
                <div style={{ fontSize: '0.73rem', color: '#6b7280', marginTop: '2px' }}>
                  {result.rowsOk.toLocaleString('pt-BR')} linhas gravadas · {result.totalBatches} lotes processados
                </div>
              </div>
            </div>

            {/* Two columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>

              {/* Arquivo */}
              <div style={{ background: 'rgba(31,41,55,0.4)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <FileText size={14} style={{ color: '#60a5fa' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Arquivo</span>
                </div>
                <SummaryRow label="Linhas no arquivo"       value={result.totalInFile}      color="#f9fafb" />
                <SummaryRow label="Linhas únicas (hash)"   value={result.uniqueInFile}     color="#f9fafb" />
                <SummaryRow label="Duplicatas ignoradas"   value={result.duplicatesInFile} color={result.duplicatesInFile > 0 ? '#fbbf24' : '#6b7280'} sub="linhas idênticas no mesmo arquivo" />
                <SummaryRow label="Colunas mapeadas"       value={`${result.mappedColumns} / 27`} color="#a78bfa" />
                <SummaryRow label="Header detectado"       value={`Linha ${result.headerRowDetected}`} color="#9ca3af" />
              </div>

              {/* Banco */}
              <div style={{ background: 'rgba(31,41,55,0.4)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Database size={14} style={{ color: '#34d399' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Banco de Dados</span>
                </div>
                <SummaryRow label="Linhas gravadas (OK)"   value={result.rowsOk}       color="#34d399" />
                <SummaryRow label="Linhas com erro"        value={result.rowsFailed}    color={result.rowsFailed > 0 ? '#f87171' : '#6b7280'} />
                <SummaryRow label="Lotes processados"      value={result.totalBatches}  color="#9ca3af" sub="200 linhas por lote" />
                <SummaryRow label="Lotes com sucesso"      value={result.successBatches} color="#34d399" />
                <SummaryRow label="Lotes com erro"         value={result.failedBatches}  color={result.failedBatches > 0 ? '#f87171' : '#6b7280'} />
                {result.dbTotal !== null && (
                  <SummaryRow label="Total no banco agora"  value={result.dbTotal}       color="#60a5fa" sub="total acumulado" />
                )}
              </div>
            </div>

            {/* Erros por lote */}
            {result.batchErrors.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <XCircle size={14} style={{ color: '#f87171' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalhes dos Erros</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.batchErrors.map((be, i) => (
                    <div key={i} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#f87171' }}>Lote {be.batchNum}</span>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>{be.rowsInBatch} linhas afetadas</span>
                      </div>
                      <div style={{ fontSize: '0.73rem', color: '#fca5a5', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: '1.4' }}>{be.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info hash */}
            <div style={{ background: 'rgba(31,41,55,0.3)', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <Info size={12} style={{ color: '#4b5563', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.7rem', color: '#4b5563', lineHeight: '1.4' }}>
                Registros com hash idêntico a entradas existentes foram atualizados (upsert). Novos registros foram inseridos. Importe o arquivo novamente a qualquer momento sem risco de duplicação.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { reset() }} className="btn-secondary" style={{ flex: 1 }}>Nova Importação</button>
              <button onClick={handleClose} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                <CheckCircle2 size={14} /> Fechar
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}

const thS: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontWeight: '700',
  fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid rgba(55,65,81,0.4)', whiteSpace: 'nowrap', color: '#6b7280',
}
const tdS: React.CSSProperties = {
  padding: '7px 12px', borderBottom: '1px solid rgba(55,65,81,0.2)',
  whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis',
}
