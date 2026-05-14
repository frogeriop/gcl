'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type ValueFormatterParams,
  themeQuartz,
} from 'ag-grid-community'
import { Upload, RefreshCw, Filter, Search, TrendingUp, FileText, DollarSign, Clock } from 'lucide-react'
import { ImportMovementsDialog } from './ImportMovementsDialog'

ModuleRegistry.registerModules([AllCommunityModule])

const darkTheme = themeQuartz.withParams({
  backgroundColor: 'transparent',
  foregroundColor: '#d1d5db',
  headerBackgroundColor: 'rgba(10,15,30,0.95)',
  headerTextColor: '#6b7280',
  headerFontSize: 11,
  headerFontWeight: 700,
  rowHoverColor: 'rgba(31,41,55,0.5)',
  borderColor: 'rgba(55,65,81,0.35)',
  oddRowBackgroundColor: 'rgba(15,23,42,0.3)',
  selectedRowBackgroundColor: 'rgba(37,99,235,0.12)',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 10,
  rowHeight: 44,
  headerHeight: 42,
})

export interface ContractMovement {
  order_id: string
  customer_id: string
  contract_id: string
  product_name: string
  sales_order_id: string | null
  status: string | null
  creation_date: string | null
  creation_time: string | null
  contract_start_date: string | null
  contract_duration: string | null
  customer_name: string | null
  customer_country: string | null
  partner_id: string | null
  partner_name: string | null
  partner_country: string | null
  buyer: string | null
  industry: string | null
  solution: string | null
  order_type: string | null
  quantity: number | null
  price_type: string | null
  net_amount: number | null
  currency: string | null
  deal_specific_discount: number | null
  promo_discount: number | null
  promo_code_used: string | null
  partner_discount: number | null
  imported_at: string | null
}

interface Props {
  initialData: ContractMovement[]
}

// ── Status badge renderer ──────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  COMPLETED:  { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
  ACTIVE:     { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  CANCELLED:  { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
  PENDING:    { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
  SUSPENDED:  { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa' },
}

function StatusRenderer({ value }: { value: string }) {
  const style = STATUS_COLORS[value?.toUpperCase()] || { bg: 'rgba(75,85,99,0.3)', color: '#9ca3af' }
  return value ? (
    <span style={{
      padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
      letterSpacing: '0.04em', textTransform: 'uppercase',
      fontFamily: 'Inter, system-ui, sans-serif',
      background: style.bg, color: style.color,
    }}>
      {value}
    </span>
  ) : <span style={{ color: '#4b5563', fontSize: '10px' }}>—</span>
}

function AmountRenderer({ value, data }: { value: number | null; data: ContractMovement }) {
  if (value === null || value === undefined) return <span style={{ color: '#4b5563', fontSize: '10px' }}>—</span>
  const cur = data?.currency || 'BRL'
  return (
    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#34d399', fontWeight: '600' }}>
      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(value)}
    </span>
  )
}

function DiscountRenderer({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span style={{ color: '#4b5563', fontSize: '10px' }}>—</span>
  return (
    <span style={{ color: value > 0 ? '#fbbf24' : '#6b7280', fontFamily: 'monospace', fontSize: '10px' }}>
      {value.toFixed(1)}%
    </span>
  )
}

function DateRenderer({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: '#4b5563', fontSize: '10px' }}>—</span>
  const d = new Date(value)
  if (isNaN(d.getTime())) return <span style={{ color: '#9ca3af', fontSize: '10px' }}>{value}</span>
  return <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '10px' }}>
    {d.toLocaleDateString('pt-BR')}
  </span>
}

function OrderTypeRenderer({ value }: { value: string | null }) {
  if (!value) return <span style={{ color: '#4b5563', fontSize: '10px' }}>—</span>
  const colors: Record<string, string> = {
    Addition: '#60a5fa', Renewal: '#34d399', Termination: '#f87171',
    Conversion: '#a78bfa', Suspension: '#fbbf24',
  }
  const c = colors[value] || '#9ca3af'
  return <span style={{ color: c, fontWeight: '600', fontSize: '10px', fontFamily: 'Inter, system-ui, sans-serif' }}>{value}</span>
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string
}) {
  return (
    <div style={{
      flex: 1, padding: '14px 18px', borderRadius: '12px',
      background: 'rgba(31,41,55,0.4)', border: `1px solid ${color}22`,
      display: 'flex', alignItems: 'center', gap: '12px'
    }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={17} style={{ color }} />
      </div>
      <div>
        <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f9fafb', marginTop: '2px' }}>{value}</div>
      </div>
    </div>
  )
}

export function ContractMovementsTable({ initialData }: Props) {
  const gridRef = useRef<AgGridReact<ContractMovement>>(null)
  const [movements, setMovements] = useState<ContractMovement[]>(initialData)
  const [importOpen, setImportOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [quickFilter, setQuickFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // KPIs
  const totalNetAmount = useMemo(() =>
    movements.reduce((s, m) => s + (m.net_amount || 0), 0), [movements])
  const completedCount = useMemo(() =>
    movements.filter(m => m.status?.toUpperCase() === 'COMPLETED').length, [movements])
  const uniqueContracts = useMemo(() =>
    new Set(movements.map(m => m.contract_id)).size, [movements])
  const avgDiscount = useMemo(() => {
    const valid = movements.filter(m => m.deal_specific_discount !== null)
    return valid.length > 0
      ? valid.reduce((s, m) => s + (m.deal_specific_discount || 0), 0) / valid.length
      : 0
  }, [movements])

  // Filtered data
  const filteredData = useMemo(() => {
    let data = movements
    if (statusFilter) data = data.filter(m => m.status?.toUpperCase() === statusFilter.toUpperCase())
    return data
  }, [movements, statusFilter])

  // Column Definitions
  const colDefs = useMemo<ColDef<ContractMovement>[]>(() => [
    {
      field: 'order_id', headerName: 'Order ID', width: 130,
      pinned: 'left', filter: true, sortable: true,
      cellStyle: () => ({ fontFamily: 'monospace', fontSize: '10px', color: '#60a5fa', fontWeight: '600' }),
    },
    {
      field: 'status', headerName: 'Status', width: 130,
      cellRenderer: StatusRenderer, filter: true, sortable: true, pinned: 'left',
    },
    {
      field: 'customer_name', headerName: 'Cliente', flex: 2, minWidth: 200,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#f9fafb', fontWeight: '500' }),
    },
    {
      field: 'customer_id', headerName: 'Customer ID', width: 130,
      filter: true, sortable: true,
      cellStyle: () => ({ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }),
    },
    {
      field: 'contract_id', headerName: 'Contract ID', width: 130,
      filter: true, sortable: true,
      cellStyle: () => ({ fontFamily: 'monospace', fontSize: '10px', color: '#a78bfa' }),
    },
    {
      field: 'sales_order_id', headerName: 'Sales Order ID', width: 130,
      filter: true, sortable: true,
      cellStyle: () => ({ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }),
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
    },
    {
      field: 'creation_date', headerName: 'Criação', width: 110,
      cellRenderer: DateRenderer, sortable: true, filter: true,
    },
    {
      field: 'contract_start_date', headerName: 'Início Contrato', width: 120,
      cellRenderer: DateRenderer, sortable: true, filter: true,
    },
    {
      field: 'contract_duration', headerName: 'Duração', width: 100,
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
      cellStyle: () => ({ color: '#9ca3af' }),
    },
    {
      field: 'order_type', headerName: 'Tipo', width: 115,
      cellRenderer: OrderTypeRenderer, filter: true, sortable: true,
    },
    {
      field: 'product_name', headerName: 'Produto', flex: 2, minWidth: 200,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#e5e7eb', fontSize: '10px' }),
    },
    {
      field: 'solution', headerName: 'Solução', flex: 1, minWidth: 160,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#9ca3af', fontSize: '10px' }),
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
    },
    {
      field: 'quantity', headerName: 'Qtd', width: 80,
      sortable: true, filter: 'agNumberColumnFilter',
      valueFormatter: (p: ValueFormatterParams) => p.value !== null ? p.value : '—',
      cellStyle: () => ({ textAlign: 'right', fontFamily: 'monospace', color: '#e5e7eb' }),
    },
    {
      field: 'price_type', headerName: 'Periodicidade', width: 115,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#9ca3af' }),
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
    },
    {
      field: 'net_amount', headerName: 'Valor Líq.', width: 140,
      cellRenderer: AmountRenderer, sortable: true, filter: 'agNumberColumnFilter',
    },
    {
      field: 'currency', headerName: 'Moeda', width: 80,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#9ca3af', textAlign: 'center' }),
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
    },
    {
      field: 'deal_specific_discount', headerName: 'Desc. Deal %', width: 115,
      cellRenderer: DiscountRenderer, sortable: true, filter: 'agNumberColumnFilter',
    },
    {
      field: 'promo_discount', headerName: 'Desc. Promo %', width: 115,
      cellRenderer: DiscountRenderer, sortable: true, filter: 'agNumberColumnFilter',
    },
    {
      field: 'partner_discount', headerName: 'Desc. Partner %', width: 120,
      cellRenderer: DiscountRenderer, sortable: true, filter: 'agNumberColumnFilter',
    },
    {
      field: 'promo_code_used', headerName: 'Cód. Promo', width: 120,
      filter: true,
      cellStyle: () => ({ fontFamily: 'monospace', fontSize: '10px', color: '#fbbf24' }),
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
    },
    {
      field: 'partner_name', headerName: 'Parceiro', flex: 1, minWidth: 160,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#9ca3af', fontSize: '10px' }),
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
    },
    {
      field: 'partner_id', headerName: 'Partner ID', width: 120,
      filter: true,
      cellStyle: () => ({ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af' }),
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
    },
    {
      field: 'buyer', headerName: 'Comprador', width: 140,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#9ca3af' }),
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
    },
    {
      field: 'industry', headerName: 'Segmento', width: 140,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#9ca3af' }),
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
    },
    {
      field: 'customer_country', headerName: 'País Cliente', width: 110,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#9ca3af' }),
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
    },
    {
      field: 'partner_country', headerName: 'País Parceiro', width: 115,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#9ca3af' }),
      valueFormatter: (p: ValueFormatterParams) => p.value || '—',
    },
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true, suppressMovable: false,
  }), [])

  async function reload() {
    setLoading(true)
    try {
      const res = await fetch('/api/contract-movements/list')
      if (res.ok) {
        const { movements: fresh } = await res.json()
        setMovements(fresh)
      }
    } finally { setLoading(false) }
  }

  const statuses = useMemo(() =>
    Array.from(new Set(movements.map(m => m.status).filter(Boolean))) as string[]
  , [movements])

  return (
    <>
      <ImportMovementsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => { setImportOpen(false); reload() }}
      />

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <KpiCard icon={FileText}   label="Total de Registros"  value={movements.length.toLocaleString('pt-BR')} color="#60a5fa" />
          <KpiCard icon={TrendingUp} label="Contratos Únicos"    value={uniqueContracts.toLocaleString('pt-BR')} color="#34d399" />
          <KpiCard icon={DollarSign} label="Valor Líquido Total" color="#a78bfa"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalNetAmount)} />
          <KpiCard icon={Clock}      label="Desc. Médio Deal"    value={`${avgDiscount.toFixed(1)}%`} color="#fbbf24" />
        </div>

        {/* Grid card */}
        <div className="section-card" style={{ overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid rgba(55,65,81,0.4)',
            display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
              <input
                type="text"
                placeholder="Buscar por Order ID, Cliente, Contrato, Produto..."
                value={quickFilter}
                onChange={e => {
                  setQuickFilter(e.target.value)
                  gridRef.current?.api?.setGridOption('quickFilterText', e.target.value)
                }}
                className="input-field"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '0.8125rem', width: '100%' }}
              />
            </div>

            {/* Status filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={13} style={{ color: '#4b5563' }} />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="input-field"
                style={{ height: '36px', fontSize: '0.8125rem', minWidth: '160px' }}
              >
                <option value="">Todos os status</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Counter */}
            <div style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
              {filteredData.length.toLocaleString('pt-BR')} registros
            </div>

            <button onClick={reload} disabled={loading} className="btn-secondary"
              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Atualizar
            </button>

            <button onClick={() => setImportOpen(true)} className="btn-primary"
              style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={14} />
              Importar Excel
            </button>
          </div>

          {/* AG Grid */}
          <div style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}>
            <AgGridReact<ContractMovement>
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
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
