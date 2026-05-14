'use client'

import { useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  AllCommunityModule, ModuleRegistry,
  type ColDef, type ValueFormatterParams, themeQuartz,
} from 'ag-grid-community'
import {
  Search, Filter, RefreshCw, Wand2,
  FileText, DollarSign, CheckCircle2,
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
  fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, rowHeight: 44, headerHeight: 42,
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
  if (!value) return <span style={{ color: '#4b5563', fontSize: '13px' }}>—</span>
  const d = new Date(value)
  return <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '13px' }}>
    {isNaN(d.getTime()) ? value : d.toLocaleDateString('pt-BR')}
  </span>
}

function AmountRenderer({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span style={{ color: '#4b5563', fontSize: '13px' }}>—</span>
  return <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#34d399', fontWeight: '600' }}>
    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value)}
  </span>
}

function DiscountRenderer({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span style={{ color: '#4b5563', fontSize: '13px' }}>—</span>
  return <span style={{ color: value > 0 ? '#fbbf24' : '#6b7280', fontFamily: 'monospace', fontSize: '13px' }}>
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

// ── Main Component ────────────────────────────────────────────────────────────
export function ContractsTable({ initialData }: Props) {
  const gridRef = useRef<AgGridReact<Contract>>(null)
  const [contracts, setContracts] = useState<Contract[]>(initialData)
  const [loading, setLoading]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [quickFilter, setQuickFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null)

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalValue      = useMemo(() => contracts.reduce((s, c) => s + (c.total_value || c.net_amount || 0), 0), [contracts])
  const activeCount     = useMemo(() => contracts.filter(c => c.is_active !== false).length, [contracts])
  const inactiveCount   = useMemo(() => contracts.filter(c => c.is_active === false).length, [contracts])
  const activeValue     = useMemo(() => contracts.filter(c => c.is_active !== false).reduce((s, c) => s + (c.total_value || c.net_amount || 0), 0), [contracts])
  const inactiveValue   = useMemo(() => contracts.filter(c => c.is_active === false).reduce((s, c) => s + (c.total_value || c.net_amount || 0), 0), [contracts])
  const uniqueCustomers = useMemo(() => new Set(contracts.map(c => c.customer_id).filter(Boolean)).size, [contracts])

  // ── Pie Chart data ────────────────────────────────────────────────────────
  const pieData = useMemo(() => [
    { name: 'Ativos',   value: activeCount,   color: '#34d399' },
    { name: 'Inativos', value: inactiveCount, color: '#f87171' },
  ], [activeCount, inactiveCount])

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!statusFilter) return contracts
    if (statusFilter === 'active')   return contracts.filter(c => c.is_active !== false)
    if (statusFilter === 'inactive') return contracts.filter(c => c.is_active === false)
    return contracts
  }, [contracts, statusFilter])

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
    { field: 'is_active',              headerName: 'Status',              width: 130, pinned: 'left', sortable: true, cellRenderer: StatusRenderer },
    { field: 'contract_id',            headerName: 'Contract ID',         width: 140, pinned: 'left', filter: true, sortable: true, cellStyle: () => ({ fontFamily: 'monospace', fontSize: '13px', color: '#a78bfa', fontWeight: '600' }) },
    { field: 'customer_id',            headerName: 'Customer ID',         width: 130, filter: true, sortable: true, cellStyle: () => ({ fontFamily: 'monospace', fontSize: '13px', color: '#60a5fa' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'customer_name',          headerName: 'Cliente',             flex: 2, minWidth: 180, filter: true, sortable: true, cellStyle: () => ({ fontSize: '13px', color: '#f9fafb', fontWeight: '500' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'total_value',            headerName: 'Valor Total',         width: 155, sortable: true, filter: 'agNumberColumnFilter', cellRenderer: AmountRenderer },
    { field: 'creation_date',          headerName: 'Data Criação',        width: 120, cellRenderer: DateRenderer, sortable: true },
    { field: 'contract_duration',      headerName: 'Duração',             width: 110, filter: true, cellStyle: () => ({ fontSize: '13px', color: '#9ca3af' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'contract_start_date',    headerName: 'Data Inicial',        width: 120, cellRenderer: DateRenderer, sortable: true },
    { field: 'contract_end_date',      headerName: 'Data Final',          width: 120, cellRenderer: DateRenderer, sortable: true },
    { field: 'last_cancellation_date', headerName: 'Last Cancellation',   width: 145, cellRenderer: DateRenderer, sortable: true },
    { field: 'deal_specific_discount', headerName: '% Desc. Deal',        width: 120, cellRenderer: DiscountRenderer, sortable: true },
    { field: 'partner_discount',       headerName: '% Desc. Parceiro',    width: 135, cellRenderer: DiscountRenderer, sortable: true },
    { field: 'promo_discount',         headerName: '% Desc. Promo',       width: 125, cellRenderer: DiscountRenderer, sortable: true },
    { field: 'solution',               headerName: 'Solução',             flex: 2, minWidth: 180, filter: true, sortable: true, cellStyle: () => ({ fontSize: '13px', color: '#d1d5db' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
    { field: 'currency',               headerName: 'Moeda',               width: 90,  filter: true, cellStyle: () => ({ fontFamily: 'monospace', fontSize: '13px', color: '#9ca3af' }), valueFormatter: (p: ValueFormatterParams) => p.value || 'BRL' },
    { field: 'partner_name',           headerName: 'Parceiro',            width: 180, filter: true, sortable: true, cellStyle: () => ({ fontSize: '13px', color: '#d1d5db' }), valueFormatter: (p: ValueFormatterParams) => p.value || '—' },
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({ resizable: true, suppressMovable: false }), [])

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)

  return (
    <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header: KPIs + Pie Chart */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left: KPI grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: '1 1 360px' }}>
          {/* Row 1 */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <KpiCard icon={FileText}    label="Total de Contratos"   value={contracts.length.toLocaleString('pt-BR')} color="#60a5fa" />
            <KpiCard icon={DollarSign}  label="Valor Total Acumulado" value={fmtCurrency(totalValue)} color="#a78bfa" />
          </div>
          {/* Row 2: Ativos */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <KpiCard
              icon={ToggleRight}
              label="Contratos Ativos"
              value={activeCount.toLocaleString('pt-BR')}
              sub={`${contracts.length > 0 ? ((activeCount / contracts.length) * 100).toFixed(0) : 0}% do total`}
              color="#34d399"
            />
            <KpiCard
              icon={DollarSign}
              label="Valor Ativos"
              value={fmtCurrency(activeValue)}
              color="#34d399"
            />
          </div>
          {/* Row 3: Inativos */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <KpiCard
              icon={ToggleLeft}
              label="Contratos Inativos"
              value={inactiveCount.toLocaleString('pt-BR')}
              sub={`${contracts.length > 0 ? ((inactiveCount / contracts.length) * 100).toFixed(0) : 0}% do total`}
              color="#f87171"
            />
            <KpiCard
              icon={DollarSign}
              label="Valor Inativos"
              value={fmtCurrency(inactiveValue)}
              color="#f87171"
            />
          </div>
        </div>

        {/* Right: Pie Chart */}
        <div style={{
          flex: '0 0 260px', height: '220px',
          background: 'rgba(31,41,55,0.4)', border: '1px solid rgba(55,65,81,0.35)',
          borderRadius: '14px', padding: '12px 8px 8px',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', marginBottom: '4px' }}>
            Ativos × Inativos
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={52} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid rgba(55,65,81,0.5)', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value, name) => [Number(value ?? 0).toLocaleString('pt-BR'), name]}
              />
              <Legend
                iconType="circle" iconSize={8}
                formatter={(value) => <span style={{ color: '#9ca3af', fontSize: '11px' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
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
          />
        </div>
      </div>

      {/* Generate result dialog */}
      {generateResult && (
        <GenerateDialog result={generateResult} onClose={() => setGenerateResult(null)} />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
