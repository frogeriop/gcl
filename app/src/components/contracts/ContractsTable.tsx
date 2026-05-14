'use client'

import { useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  AllCommunityModule, ModuleRegistry,
  type ColDef, type ValueFormatterParams, themeQuartz,
} from 'ag-grid-community'
import {
  Search, Filter, RefreshCw, Wand2,
  FileText, CheckCircle2, Calendar, Clock, Eye,
  X, Loader2, AlertTriangle, CheckCheck, Database, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

ModuleRegistry.registerModules([AllCommunityModule])

const darkTheme = themeQuartz.withParams({
  backgroundColor: 'transparent', foregroundColor: '#d1d5db',
  headerBackgroundColor: 'rgba(10,15,30,0.95)', headerTextColor: '#6b7280',
  headerFontSize: 11, headerFontWeight: 700,
  rowHoverColor: 'rgba(31,41,55,0.5)', borderColor: 'rgba(55,65,81,0.35)',
  oddRowBackgroundColor: 'rgba(15,23,42,0.3)', selectedRowBackgroundColor: 'rgba(37,99,235,0.12)',
  fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, rowHeight: 38, headerHeight: 38,
})

export interface Contract {
  contract_id: string
  tenant_id: string
  customer_id: string | null
  customer_name: string | null
  customer_country: string | null
  partner_id: string | null
  partner_name: string | null
  solution: string | null
  currency: string | null
  status: string | null
  order_type: string | null
  creation_date: string | null
  contract_start_date: string | null
  contract_duration: string | null
  contract_end_date: string | null
  last_cancellation_date: string | null
  net_amount: number | null
  total_value: number | null
  is_active: boolean | null
  deal_specific_discount: number | null
  promo_discount: number | null
  promo_code_used: string | null
  partner_discount: number | null
  generated_at: string | null
  created_at: string
  updated_at: string
}

interface Props { initialData: Contract[] }

interface GenerateResult {
  success: boolean
  totalMovementsRead: number
  initialWithContractId: number
  contractsFound: number
  generated: number
  failed: number
  dbTotal: number | null
  activeContracts: number | null
  inactiveContracts: number
  batchErrors: { batch: number; error: string }[]
  error?: string
}

// ── Status config (now based on is_active) ────────────────────────────────────
function StatusRenderer({ value, data }: { value: string | null; data: Contract }) {
  const active = data?.is_active !== false
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? '#34d399' : '#ef4444', flexShrink: 0 }} />
      <span style={{
        padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
        letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif',
        background: active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
        color: active ? '#34d399' : '#f87171',
      }}>{active ? 'Ativo' : 'Inativo'}</span>
    </div>
  )
}

function DateRenderer({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: '#4b5563', fontSize: '10px' }}>—</span>
  const d = new Date(value)
  return <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '10px' }}>
    {isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR')}
  </span>
}

function AmountRenderer({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span style={{ color: '#4b5563', fontSize: '10px' }}>—</span>
  return <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#34d399', fontWeight: '600' }}>
    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value)}
  </span>
}

function DiscountRenderer({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span style={{ color: '#4b5563', fontSize: '10px' }}>—</span>
  return <span style={{ color: value > 0 ? '#fbbf24' : '#6b7280', fontFamily: 'monospace', fontSize: '10px' }}>
    {value.toFixed(1)}%
  </span>
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: string | number; color: string; sub?: string
}) {
  return (
    <div style={{ flex: 1, minWidth: '160px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(31,41,55,0.4)', border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, background: `${color}18`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f9fafb', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        {sub && <div style={{ fontSize: '0.68rem', color: '#4b5563', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Expiry KPI Card (qtde + valor) ────────────────────────────────────────────
function ExpiryKpiCard({ label, count, totalValue, color, urgency }: {
  label: string; count: number; totalValue: number; color: string; urgency?: boolean
}) {
  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 })
  return (
    <div style={{
      flex: '1 1 220px', minWidth: '200px', borderRadius: '12px', overflow: 'hidden',
      background: 'rgba(31,41,55,0.4)', border: `1px solid ${color}30`,
      position: 'relative',
    }}>
      {/* urgency top stripe */}
      <div style={{ height: '3px', background: `linear-gradient(90deg, ${color}00, ${color}, ${color}00)` }} />
      <div style={{ padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, background: `${color}15`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={17} style={{ color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.63rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: '800', color, lineHeight: 1 }}>{count.toLocaleString('pt-BR')}</span>
            <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: '600' }}>contratos</span>
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#d1d5db', marginTop: '2px', fontFamily: 'monospace' }}>
            {fmt.format(totalValue)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── View action cell renderer ──────────────────────────────────────────────────
function ViewActionRenderer({ data, context }: { data: Contract; context: any }) {
  return (
    <button
      onClick={() => context?.onView?.(data)}
      title="Visualizar contrato"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '3px 8px', borderRadius: '6px', cursor: 'pointer',
        background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
        color: '#a78bfa', fontSize: '10px', fontWeight: '700', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.25)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.12)' }}
    >
      <Eye size={11} /> Ver
    </button>
  )
}

// ── Generate Result Dialog ────────────────────────────────────────────────────
function GenerateDialog({ result, onClose }: { result: GenerateResult; onClose: () => void }) {
  const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString('pt-BR')
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: '#111827', border: '1px solid rgba(55,65,81,0.6)', borderRadius: '18px', padding: '26px', width: '500px', maxWidth: '94vw', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: result.success ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', border: `1px solid ${result.success ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {result.success ? <CheckCheck size={17} style={{ color: '#34d399' }} /> : <AlertTriangle size={17} style={{ color: '#fbbf24' }} />}
            </div>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f9fafb' }}>Geração de Cabeçalhos</h3>
              <p style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>{result.success ? 'Concluído com sucesso' : `${result.batchErrors.length} lote(s) com erro`}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={16} /></button>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: 'Total movimentos lidos', value: fmt(result.totalMovementsRead), color: '#60a5fa', icon: FileText },
            { label: 'INITIALs com Contract ID', value: fmt(result.initialWithContractId), color: '#a78bfa', icon: FileText },
            { label: 'Contratos únicos', value: fmt(result.contractsFound), color: '#22d3ee', icon: FileText },
            { label: 'Gerados / atualizados', value: fmt(result.generated), color: '#34d399', icon: CheckCheck },
            { label: 'Com erro', value: fmt(result.failed), color: result.failed > 0 ? '#f87171' : '#6b7280', icon: AlertTriangle },
            { label: 'Total no banco agora', value: fmt(result.dbTotal), color: '#60a5fa', icon: Database },
            { label: 'Ativos / Inativos', value: `${fmt(result.activeContracts)} / ${fmt(result.inactiveContracts)}`, color: '#34d399', icon: ToggleRight },
          ].map(s => (
            <div key={s.label} style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(31,41,55,0.5)', border: `1px solid ${s.color}20` }}>
              <div style={{ fontSize: '0.67rem', color: '#6b7280', marginBottom: '3px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Batch errors */}
        {result.batchErrors.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Erros por Lote</p>
            {result.batchErrors.map((be, i) => (
              <div key={i} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 12px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.73rem', fontWeight: '700', color: '#f87171' }}>Lote {be.batch}: </span>
                <span style={{ fontSize: '0.73px', color: '#fca5a5', fontFamily: 'monospace' }}>{be.error}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          <CheckCircle2 size={14} /> Fechar e Atualizar
        </button>
      </div>
    </div>
  )
}

// ── Contract Detail Dialog ─────────────────────────────────────────────────────
interface Movement {
  order_id: string | null; sales_order_id: string | null; status: string | null
  order_type: string | null; creation_date: string | null; product_name: string | null
  solution: string | null; quantity: number | null; net_amount: number | null
  currency: string | null; deal_specific_discount: number | null
  promo_discount: number | null; promo_code_used: string | null
  partner_discount: number | null; partner_name: string | null; buyer: string | null
}

const movTheme = themeQuartz.withParams({
  backgroundColor: 'transparent', foregroundColor: '#d1d5db',
  headerBackgroundColor: 'rgba(10,15,30,0.95)', headerTextColor: '#6b7280',
  headerFontSize: 10, headerFontWeight: 700,
  rowHoverColor: 'rgba(31,41,55,0.5)', borderColor: 'rgba(55,65,81,0.35)',
  oddRowBackgroundColor: 'rgba(15,23,42,0.2)', selectedRowBackgroundColor: 'rgba(37,99,235,0.12)',
  fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, rowHeight: 32, headerHeight: 32,
})

function ContractDetailDialog({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const [movements, setMovements] = useState<Movement[]>([])
  const [movLoading, setMovLoading] = useState(true)
  const [movError, setMovError] = useState<string | null>(null)

  const fmtDate = (v: string | null) => {
    if (!v) return '—'
    const d = new Date(v)
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('pt-BR')
  }
  const fmtBRL = (v: number | null) =>
    v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const fmtPct = (v: number | null) => v == null ? '—' : `${v.toFixed(1)}%`

  useMemo(() => {
    let cancelled = false
    setMovLoading(true); setMovError(null)
    fetch(`/api/contracts/${contract.contract_id}/movements`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setMovements(d.movements ?? []); setMovLoading(false) } })
      .catch(e => { if (!cancelled) { setMovError(e.message); setMovLoading(false) } })
    return () => { cancelled = true }
  }, [contract.contract_id])

  const headerFields: { label: string; value: string; mono?: boolean; color?: string }[] = [
    { label: 'Contract ID',    value: contract.contract_id,                                  mono: true,  color: '#a78bfa' },
    { label: 'Cliente',        value: contract.customer_name ?? '—',                          color: '#f9fafb' },
    { label: 'Customer ID',    value: contract.customer_id ?? '—',                           mono: true,  color: '#60a5fa' },
    { label: 'Solução',        value: contract.solution ?? '—' },
    { label: 'Status',         value: contract.is_active !== false ? 'ATIVO' : 'INATIVO',    color: contract.is_active !== false ? '#34d399' : '#f87171' },
    { label: 'Valor Total',    value: fmtBRL(contract.total_value),                          mono: true,  color: '#34d399' },
    { label: 'Moeda',          value: contract.currency ?? 'BRL',                            mono: true },
    { label: 'Data Criação',   value: fmtDate(contract.creation_date) },
    { label: 'Duração',        value: contract.contract_duration ?? '—' },
    { label: 'Data Inicial',   value: fmtDate(contract.contract_start_date) },
    { label: 'Data Final',     value: fmtDate(contract.contract_end_date) },
    { label: 'Last Cancel',    value: fmtDate(contract.last_cancellation_date) },
    { label: 'Parceiro',       value: contract.partner_name ?? '—' },
    { label: 'Partner ID',     value: contract.partner_id ?? '—',                            mono: true },
    { label: 'Desc. Deal',     value: fmtPct(contract.deal_specific_discount),               mono: true,  color: contract.deal_specific_discount ? '#fbbf24' : undefined },
    { label: 'Desc. Promo',    value: fmtPct(contract.promo_discount),                       mono: true,  color: contract.promo_discount ? '#fbbf24' : undefined },
    { label: 'Desc. Parceiro', value: fmtPct(contract.partner_discount),                     mono: true,  color: contract.partner_discount ? '#fbbf24' : undefined },
    { label: 'País',           value: contract.customer_country ?? '—' },
  ]

  const movColDefs: ColDef<Movement>[] = [
    { field: 'order_id',               headerName: 'Order ID',    width: 110, cellStyle: () => ({ fontFamily: 'monospace', fontSize: '10px', color: '#60a5fa', fontWeight: '600' }) },
    { field: 'sales_order_id',         headerName: 'Sales Order', width: 110, cellStyle: () => ({ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'status',                 headerName: 'Status',      width: 110,
      cellRenderer: ({ value }: { value: string }) => {
        const MAP: Record<string,{bg:string;color:string}> = {
          COMPLETED:{ bg:'rgba(16,185,129,0.12)',color:'#34d399' }, ACTIVE:{ bg:'rgba(59,130,246,0.12)',color:'#60a5fa' },
          CANCELLED:{ bg:'rgba(239,68,68,0.12)',color:'#f87171'  }, PENDING:{ bg:'rgba(245,158,11,0.12)',color:'#fbbf24' },
        }
        const s = MAP[value?.toUpperCase()] || { bg:'rgba(75,85,99,0.3)', color:'#9ca3af' }
        return value
          ? <span style={{ padding:'1px 6px', borderRadius:'12px', fontSize:'10px', fontWeight:'700', background:s.bg, color:s.color, textTransform:'uppercase' as const }}>{value}</span>
          : <span style={{ color:'#4b5563', fontSize:'10px' }}>—</span>
      }
    },
    { field: 'order_type',            headerName: 'Tipo',        width: 100, cellStyle: () => ({ fontSize:'10px', color:'#a78bfa', fontWeight:'600' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'creation_date',         headerName: 'Criação',     width: 95,  cellStyle: () => ({ fontFamily:'monospace', fontSize:'10px', color:'#9ca3af' }), valueFormatter: (p: ValueFormatterParams) => p.value ? new Date(p.value).toLocaleDateString('pt-BR') : '—' },
    { field: 'product_name',          headerName: 'Produto',     flex: 2, minWidth: 160, cellStyle: () => ({ fontSize:'10px', color:'#e5e7eb' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'solution',              headerName: 'Solução',     flex: 1, minWidth: 130, cellStyle: () => ({ fontSize:'10px', color:'#9ca3af' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'quantity',              headerName: 'Qtd',         width: 70,  cellStyle: () => ({ textAlign:'right' as const, fontFamily:'monospace', fontSize:'10px', color:'#e5e7eb' }), valueFormatter: (p: ValueFormatterParams) => p.value ?? '—' },
    { field: 'net_amount',            headerName: 'Valor Líq.',  width: 130,
      cellRenderer: ({ value, data }: { value: number|null; data: Movement }) =>
        value == null
          ? <span style={{ color:'#4b5563', fontSize:'10px' }}>—</span>
          : <span style={{ fontFamily:'monospace', fontSize:'10px', color:'#34d399', fontWeight:'600' }}>
              {new Intl.NumberFormat('pt-BR',{style:'currency',currency: data?.currency||'BRL'}).format(value)}
            </span>
    },
    { field: 'deal_specific_discount', headerName: '% Deal',     width: 75, cellStyle: () => ({ fontFamily:'monospace', fontSize:'10px', color:'#fbbf24' }), valueFormatter: (p: ValueFormatterParams) => p.value != null ? `${p.value.toFixed(1)}%` : '—' },
    { field: 'promo_discount',         headerName: '% Promo',    width: 75, cellStyle: () => ({ fontFamily:'monospace', fontSize:'10px', color:'#fbbf24' }), valueFormatter: (p: ValueFormatterParams) => p.value != null ? `${p.value.toFixed(1)}%` : '—' },
    { field: 'partner_discount',       headerName: '% Parceiro', width: 85, cellStyle: () => ({ fontFamily:'monospace', fontSize:'10px', color:'#fbbf24' }), valueFormatter: (p: ValueFormatterParams) => p.value != null ? `${p.value.toFixed(1)}%` : '—' },
    { field: 'partner_name',           headerName: 'Parceiro',   width: 140, cellStyle: () => ({ fontSize:'10px', color:'#9ca3af' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'buyer',                  headerName: 'Comprador',  width: 120, cellStyle: () => ({ fontSize:'10px', color:'#9ca3af' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
  ]

  return (
    <div style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(10px)' }}>
      <div style={{ background:'#0f172a', border:'1px solid rgba(55,65,81,0.5)', borderRadius:'20px', width:'min(96vw,1120px)', maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 40px 100px rgba(0,0,0,0.7)' }}>

        {/* Header bar */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid rgba(55,65,81,0.4)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FileText size={15} style={{ color:'#a78bfa' }} />
            </div>
            <div>
              <div style={{ fontSize:'0.85rem', fontWeight:'800', color:'#f9fafb' }}>Contrato {contract.contract_id}</div>
              <div style={{ fontSize:'0.7rem', color:'#6b7280', marginTop:'1px' }}>{contract.customer_name ?? ''}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', padding:'4px' }}><X size={17} /></button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY:'auto', flex:1, padding:'16px 20px', display:'flex', flexDirection:'column', gap:'16px' }}>

          {/* Header fields */}
          <div>
            <div style={{ fontSize:'0.6rem', color:'#6b7280', fontWeight:'700', textTransform:'uppercase' as const, letterSpacing:'0.06em', marginBottom:'8px' }}>Dados do Cabeçalho</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(175px,1fr))', gap:'7px' }}>
              {headerFields.map(f => (
                <div key={f.label} style={{ padding:'7px 11px', borderRadius:'8px', background:'rgba(31,41,55,0.5)', border:'1px solid rgba(55,65,81,0.3)' }}>
                  <div style={{ fontSize:'0.58rem', color:'#6b7280', fontWeight:'700', textTransform:'uppercase' as const, letterSpacing:'0.04em', marginBottom:'2px' }}>{f.label}</div>
                  <div style={{ fontSize:'0.75rem', fontWeight:'700', color: f.color ?? '#d1d5db', fontFamily: f.mono ? 'monospace' : 'Inter, system-ui, sans-serif', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }} title={f.value}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Movements grid */}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'0.6rem', color:'#6b7280', fontWeight:'700', textTransform:'uppercase' as const, letterSpacing:'0.06em', marginBottom:'8px', display:'flex', alignItems:'center', gap:'8px' }}>
              Movimentações vinculadas
              {!movLoading && <span style={{ padding:'1px 6px', borderRadius:'10px', background:'rgba(139,92,246,0.15)', color:'#a78bfa', fontSize:'0.6rem', fontWeight:'800' }}>{movements.length}</span>}
            </div>
            {movLoading ? (
              <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'18px 0', color:'#6b7280', fontSize:'0.78rem' }}>
                <Loader2 size={15} style={{ animation:'spin 1s linear infinite' }} /> Carregando movimentações...
              </div>
            ) : movError ? (
              <div style={{ padding:'12px', borderRadius:'9px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', fontSize:'0.78rem' }}>{movError}</div>
            ) : movements.length === 0 ? (
              <div style={{ padding:'18px', textAlign:'center', color:'#6b7280', fontSize:'0.78rem' }}>Nenhuma movimentação encontrada.</div>
            ) : (
              <div style={{ height:'270px' }}>
                <AgGridReact<Movement>
                  theme={movTheme}
                  rowData={movements}
                  columnDefs={movColDefs}
                  defaultColDef={{ resizable: true, suppressMovable: false }}
                  suppressCellFocus
                  enableCellTextSelection
                  pagination
                  paginationPageSize={50}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'10px 20px', borderTop:'1px solid rgba(55,65,81,0.3)', display:'flex', justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding:'7px 16px', display:'flex', alignItems:'center', gap:'5px', fontSize:'0.8rem' }}>
            <X size={12} /> Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ContractsTable({ initialData }: Props) {
  const gridRef = useRef<AgGridReact<Contract>>(null)
  const [contracts, setContracts] = useState<Contract[]>(initialData)
  const [loading, setLoading]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [quickFilter, setQuickFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expiryFilter, setExpiryFilter] = useState('')
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null)
  const [viewContract, setViewContract] = useState<Contract | null>(null)

  // ── Filter (calculado primeiro — KPIs derivam dele) ──────────────────────
  const filteredData = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    // Limites de prazo de vencimento
    let expiryLimit: Date | null = null
    if (expiryFilter) {
      expiryLimit = new Date(now)
      if (expiryFilter === 'month')    expiryLimit.setMonth(expiryLimit.getMonth() + 1)
      if (expiryFilter === 'quarter')  expiryLimit.setMonth(expiryLimit.getMonth() + 3)
      if (expiryFilter === 'semester') expiryLimit.setMonth(expiryLimit.getMonth() + 6)
      if (expiryFilter === 'year')     expiryLimit.setFullYear(expiryLimit.getFullYear() + 1)
    }

    return contracts.filter(c => {
      // Filtro de status
      if (statusFilter === 'active'   && c.is_active === false) return false
      if (statusFilter === 'inactive' && c.is_active !== false) return false

      // Filtro de prazo de vencimento
      if (expiryLimit && c.contract_end_date) {
        const end = new Date(c.contract_end_date)
        if (isNaN(end.getTime())) return false
        // Vencimentos: entre hoje e o limite (inclui já vencidos só se filtro ativo)
        if (end < now || end > expiryLimit) return false
      } else if (expiryLimit && !c.contract_end_date) {
        return false // sem data de vencimento: exclui quando filtro de prazo ativo
      }

      return true
    })
  }, [contracts, statusFilter, expiryFilter])

  // ── KPIs (todos sobre filteredData) ───────────────────────────────────────
  const activeCount   = useMemo(() => filteredData.filter(c => c.is_active !== false).length, [filteredData])
  const inactiveCount = useMemo(() => filteredData.filter(c => c.is_active === false).length,  [filteredData])

  // ── Expiry KPIs (calculado sobre TODOS os contratos — não segue filtro de status/prazo) ──
  const expiry30 = useMemo(() => {
    const now = new Date(); now.setHours(0,0,0,0)
    const limit = new Date(now); limit.setDate(limit.getDate() + 30)
    const list = contracts.filter(c => {
      if (!c.contract_end_date || c.is_active === false) return false
      const end = new Date(c.contract_end_date)
      return !isNaN(end.getTime()) && end >= now && end <= limit
    })
    return { count: list.length, value: list.reduce((s, c) => s + (c.total_value ?? 0), 0) }
  }, [contracts])

  const expiry90 = useMemo(() => {
    const now = new Date(); now.setHours(0,0,0,0)
    const limit = new Date(now); limit.setDate(limit.getDate() + 90)
    const list = contracts.filter(c => {
      if (!c.contract_end_date || c.is_active === false) return false
      const end = new Date(c.contract_end_date)
      return !isNaN(end.getTime()) && end >= now && end <= limit
    })
    return { count: list.length, value: list.reduce((s, c) => s + (c.total_value ?? 0), 0) }
  }, [contracts])


  // ── Pie Chart data (sobre filteredData) ───────────────────────────────────
  const pieData = useMemo(() => [
    { name: 'Ativos',   value: activeCount,   color: '#34d399' },
    { name: 'Inativos', value: inactiveCount, color: '#f87171' },
  ], [activeCount, inactiveCount])

  async function reload() {
    setLoading(true)
    try {
      const res = await fetch('/api/contracts/list')
      if (res.ok) { const { contracts: fresh } = await res.json(); setContracts(fresh) }
    } finally { setLoading(false) }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res  = await fetch('/api/contracts/generate', { method: 'POST' })
      const data: GenerateResult = await res.json() as GenerateResult
      setGenerateResult(data)
      if (data.success || data.generated > 0) await reload()
    } catch (err: any) {
      setGenerateResult({ success: false, totalMovementsRead: 0, initialWithContractId: 0, contractsFound: 0, generated: 0, failed: 0, dbTotal: null, activeContracts: null, inactiveContracts: 0, batchErrors: [{ batch: 0, error: err.message }] })
    } finally { setGenerating(false) }
  }

  // ── Column Definitions ────────────────────────────────────────────────────
  const colDefs = useMemo<ColDef<Contract>[]>(() => [
    { headerName: '', width: 90, pinned: 'left', sortable: false, cellRenderer: ViewActionRenderer },
    { field: 'is_active',              headerName: 'Status',              width: 120, pinned: 'left', sortable: true, cellRenderer: StatusRenderer },
    { field: 'contract_id',            headerName: 'Contract ID',         width: 140, filter: true, sortable: true, cellStyle: () => ({ fontFamily: 'monospace', fontSize: '10px', color: '#a78bfa', fontWeight: '600' }) },
    { field: 'customer_id',            headerName: 'Customer ID',         width: 130, filter: true, sortable: true, cellStyle: () => ({ fontFamily: 'monospace', fontSize: '10px', color: '#60a5fa' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'customer_name',          headerName: 'Cliente',             flex: 2, minWidth: 180, filter: true, sortable: true, cellStyle: () => ({ fontSize: '10px', color: '#f9fafb', fontWeight: '500' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'total_value',            headerName: 'Valor Total',         width: 155, sortable: true, filter: 'agNumberColumnFilter', cellRenderer: AmountRenderer },
    { field: 'creation_date',          headerName: 'Data Criação',        width: 110, cellRenderer: DateRenderer, sortable: true },
    { field: 'contract_duration',      headerName: 'Duração',             width: 100, filter: true, cellStyle: () => ({ fontSize: '10px', color: '#9ca3af' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'contract_start_date',    headerName: 'Data Inicial',        width: 110, cellRenderer: DateRenderer, sortable: true },
    { field: 'contract_end_date',      headerName: 'Data Final',          width: 110, cellRenderer: DateRenderer, sortable: true },
    { field: 'last_cancellation_date', headerName: 'Last Cancellation',   width: 135, cellRenderer: DateRenderer, sortable: true },
    { field: 'deal_specific_discount', headerName: '% Desc. Deal',        width: 110, cellRenderer: DiscountRenderer, sortable: true },
    { field: 'partner_discount',       headerName: '% Desc. Parceiro',    width: 125, cellRenderer: DiscountRenderer, sortable: true },
    { field: 'promo_discount',         headerName: '% Desc. Promo',       width: 115, cellRenderer: DiscountRenderer, sortable: true },
    { field: 'solution',               headerName: 'Solução',             flex: 2, minWidth: 180, filter: true, sortable: true, cellStyle: () => ({ fontSize: '10px', color: '#d1d5db' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'currency',               headerName: 'Moeda',               width: 80,  filter: true, cellStyle: () => ({ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }), valueFormatter: (p: ValueFormatterParams) => p.value || 'BRL' },
    { field: 'partner_name',           headerName: 'Parceiro',            width: 170, filter: true, sortable: true, cellStyle: () => ({ fontSize: '10px', color: '#d1d5db' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({ resizable: true, suppressMovable: false }), [])
  const context = useMemo(() => ({ onView: (c: Contract) => setViewContract(c) }), [])


  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Indicadores dinâmicos (seguem filtro) ── */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* KPIs compactos */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '0 0 auto' }}>
          <KpiCard
            icon={FileText}
            label="Exibindo"
            value={filteredData.length.toLocaleString('pt-BR')}
            sub={statusFilter ? undefined : 'todos os contratos'}
            color="#60a5fa"
          />
          <KpiCard
            icon={ToggleRight}
            label="Ativos"
            value={activeCount.toLocaleString('pt-BR')}
            sub={filteredData.length > 0 ? `${((activeCount / filteredData.length) * 100).toFixed(0)}% do filtro` : undefined}
            color="#34d399"
          />
          <KpiCard
            icon={ToggleLeft}
            label="Inativos"
            value={inactiveCount.toLocaleString('pt-BR')}
            sub={filteredData.length > 0 ? `${((inactiveCount / filteredData.length) * 100).toFixed(0)}% do filtro` : undefined}
            color="#f87171"
          />
        </div>

        {/* Gráfico pizza */}
        <div style={{
          flex: '0 0 200px', height: '160px',
          background: 'rgba(31,41,55,0.4)', border: '1px solid rgba(55,65,81,0.35)',
          borderRadius: '14px', padding: '8px 6px 4px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ fontSize: '0.63rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', marginBottom: '0px', flexShrink: 0 }}>
            Ativos × Inativos
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={28} outerRadius={44} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.9} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid rgba(55,65,81,0.5)', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(value, name) => [Number(value ?? 0).toLocaleString('pt-BR'), name]}
                />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ paddingTop: '2px' }} formatter={(v) => <span style={{ color: '#9ca3af', fontSize: '10px' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Indicadores de vencimento */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto' }}>
          <ExpiryKpiCard
            label="Vencem em 30 dias"
            count={expiry30.count}
            totalValue={expiry30.value}
            color="#f87171"
            urgency
          />
          <ExpiryKpiCard
            label="Vencem em 90 dias"
            count={expiry90.count}
            totalValue={expiry90.value}
            color="#fbbf24"
          />
        </div>

      </div>

      {/* Grid card */}
      <div className="section-card" style={{ overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(55,65,81,0.4)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
            <input type="text" placeholder="Buscar por contrato, cliente, solução..."
              value={quickFilter}
              onChange={e => { setQuickFilter(e.target.value); gridRef.current?.api?.setGridOption('quickFilterText', e.target.value) }}
              className="input-field" style={{ paddingLeft: '32px', height: '36px', fontSize: '0.8125rem', width: '100%' }} />
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} style={{ color: '#4b5563' }} />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="input-field" style={{ height: '36px', fontSize: '0.8125rem', minWidth: '150px' }}>
              <option value="">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          {/* Expiry filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={13} style={{ color: expiryFilter ? '#fbbf24' : '#4b5563' }} />
            <select value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)}
              className="input-field"
              style={{
                height: '36px', fontSize: '0.8125rem', minWidth: '170px',
                borderColor: expiryFilter ? 'rgba(251,191,36,0.4)' : undefined,
                color: expiryFilter ? '#fbbf24' : undefined,
              }}>
              <option value="">Todos os prazos</option>
              <option value="month">Vence no mês</option>
              <option value="quarter">Vence no trimestre</option>
              <option value="semester">Vence no semestre</option>
              <option value="year">Vence no ano</option>
            </select>
          </div>

          {/* Counter */}
          <span style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
            {filteredData.length.toLocaleString('pt-BR')} contratos
          </span>

          {/* Refresh */}
          <button onClick={reload} disabled={loading} className="btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Atualizar
          </button>

          {/* ★ Generate button */}
          <button onClick={handleGenerate} disabled={generating} className="btn-primary"
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', opacity: generating ? 0.7 : 1 }}>
            {generating
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Gerando...</>
              : <><Wand2 size={14} /> Gerar Cabeçalhos</>}
          </button>
        </div>

        {/* AG Grid */}
        <div style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
          <AgGridReact<Contract>
            ref={gridRef}
            theme={darkTheme}
            rowData={filteredData}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            animateRows
            pagination
            paginationPageSize={100}
            paginationPageSizeSelector={[50, 100, 250, 500]}
            suppressCellFocus
            enableCellTextSelection
            context={context}
          />
        </div>
      </div>

      {/* Generate result dialog */}
      {generateResult && (
        <GenerateDialog result={generateResult} onClose={() => setGenerateResult(null)} />
      )}

      {/* Contract detail dialog */}
      {viewContract && (
        <ContractDetailDialog contract={viewContract} onClose={() => setViewContract(null)} />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
