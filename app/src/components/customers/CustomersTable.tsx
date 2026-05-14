'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AgGridReact } from 'ag-grid-react'
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type ICellRendererParams,
  themeQuartz,
} from 'ag-grid-community'
import { Upload, Pencil, ToggleLeft, ToggleRight, Building2 } from 'lucide-react'
import { ImportCustomersDialog } from './ImportCustomersDialog'
import { EditCustomerDialog } from './EditCustomerDialog'

ModuleRegistry.registerModules([AllCommunityModule])

// ─── Dark theme matching app palette ──────────────────────────────────────────
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
  fontSize: 13,
  rowHeight: 44,
  headerHeight: 42,
})

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Customer {
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
  imported_at: string | null
  created_at: string
  updated_at: string
}

interface Props {
  initialData: Customer[]
  totalCount: number
  tenantId: string
  userRole: string
}

// ─── Industry color map ────────────────────────────────────────────────────────
const IND_COLORS: Record<string, string> = {
  'Consumer Products': '#3b82f6',
  'Professional Services': '#8b5cf6',
  'Technology': '#06b6d4',
  'Manufacturing': '#f59e0b',
  'Healthcare': '#10b981',
  'Financial Services': '#f97316',
  'Retail': '#ec4899',
  'Engineering, Construction and Operation': '#84cc16',
  'Wholesale Distribution': '#a78bfa',
}
function indColor(v: string | null) { return v ? (IND_COLORS[v] || '#6b7280') : '#6b7280' }

// ─── Cell Renderers ───────────────────────────────────────────────────────────
function CustomerIdRenderer({ value }: ICellRendererParams) {
  return (
    <span style={{
      fontFamily: 'monospace', fontSize: '13px', fontWeight: '700',
      color: '#60a5fa', background: 'rgba(37,99,235,0.12)',
      padding: '2px 8px', borderRadius: '5px', display: 'inline-block'
    }}>{value}</span>
  )
}

function NameRenderer({ value, data }: ICellRendererParams) {
  return (
    <div style={{ lineHeight: 1.3 }}>
      <div style={{ fontWeight: '600', color: '#f9fafb', fontSize: '13px', fontFamily: 'Inter, system-ui, sans-serif' }}>{value}</div>
      {data?.cnpj && <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>{data.cnpj}</div>}
    </div>
  )
}

function StateRenderer({ value }: ICellRendererParams) {
  if (!value) return <span style={{ color: '#374151', fontSize: '13px' }}>—</span>
  return (
    <span style={{
      fontFamily: 'monospace', fontSize: '13px', fontWeight: '700',
      color: '#a78bfa', background: 'rgba(139,92,246,0.12)',
      padding: '2px 7px', borderRadius: '5px'
    }}>{value}</span>
  )
}

function IndustryRenderer({ value }: ICellRendererParams) {
  if (!value) return <span style={{ color: '#374151', fontSize: '13px' }}>—</span>
  const color = indColor(value)
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '6px',
      background: `${color}18`, border: `1px solid ${color}35`,
      fontSize: '13px', fontWeight: '600', color, whiteSpace: 'nowrap',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>{value}</span>
  )
}

function EmailRenderer({ value }: ICellRendererParams) {
  if (!value) return <span style={{ color: '#374151', fontSize: '13px' }}>—</span>
  return (
    <a href={`mailto:${value}`} style={{ color: '#60a5fa', fontSize: '13px', textDecoration: 'none', fontFamily: 'Inter, system-ui, sans-serif' }}
      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
      {value}
    </a>
  )
}

function StatusRenderer({ value, data, context }: ICellRendererParams) {
  const active = value !== false
  return (
    <button
      onClick={() => context?.onToggleStatus?.(data)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 10px', borderRadius: '8px', cursor: 'pointer', border: 'none',
        background: active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
        transition: 'all 0.2s'
      }}
    >
      {active
        ? <ToggleRight size={14} style={{ color: '#10b981' }} />
        : <ToggleLeft size={14} style={{ color: '#ef4444' }} />
      }
      <span style={{ fontSize: '13px', fontWeight: '700', color: active ? '#10b981' : '#ef4444', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {active ? 'Ativo' : 'Inativo'}
      </span>
    </button>
  )
}

function ActionsRenderer({ data, context }: ICellRendererParams) {
  return (
    <button
      onClick={() => context?.onEdit?.(data)}
      title="Editar cliente"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '4px 10px', borderRadius: '7px', cursor: 'pointer',
        background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
        color: '#60a5fa', fontSize: '13px', fontWeight: '600', transition: 'all 0.15s',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.2)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.1)' }}
    >
      <Pencil size={12} /> Editar
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function CustomersTable({ initialData, totalCount, tenantId, userRole }: Props) {
  const router = useRouter()
  const gridRef = useRef<AgGridReact<Customer>>(null)
  const [customers, setCustomers] = useState<Customer[]>(initialData)
  const [importOpen, setImportOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [quickFilter, setQuickFilter] = useState('')

  // ── Column definitions ──────────────────────────────────────────────────────
  const colDefs = useMemo<ColDef<Customer>[]>(() => [
    {
      field: 'customer_id', headerName: 'Customer ID', width: 130,
      cellRenderer: CustomerIdRenderer, pinned: 'left',
      filter: true, sortable: true,
    },
    {
      field: 'customer_name', headerName: 'Razão Social', flex: 2, minWidth: 200,
      cellRenderer: NameRenderer, filter: true, sortable: true,
    },
    {
      field: 'city', headerName: 'Cidade', width: 130,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#d1d5db' }),
      valueFormatter: p => p.value || '—',
    },
    {
      field: 'estate', headerName: 'UF', width: 80,
      cellRenderer: StateRenderer, sortable: true, filter: true,
    },
    {
      field: 'country', headerName: 'País', width: 80,
      sortable: true, filter: true,
      cellStyle: () => ({ color: '#9ca3af', fontSize: '0.78rem' }),
      valueFormatter: p => p.value || '—',
    },
    {
      field: 'zip_cod', headerName: 'CEP', width: 100,
      cellStyle: () => ({ fontFamily: 'monospace', fontSize: '0.76rem', color: '#9ca3af' }),
      valueFormatter: p => p.value || '—',
    },
    {
      field: 'industry', headerName: 'Segmento', width: 220,
      cellRenderer: IndustryRenderer, filter: true, sortable: true,
    },
    {
      field: 'contact_name', headerName: 'Contato', width: 160,
      filter: true, sortable: true,
      cellStyle: () => ({ color: '#e5e7eb', fontWeight: '500' }),
      valueFormatter: p => p.value || '—',
    },
    {
      field: 'position', headerName: 'Cargo', width: 150,
      cellStyle: () => ({ color: '#9ca3af', fontSize: '0.78rem' }),
      valueFormatter: p => p.value || '—',
    },
    {
      field: 'email', headerName: 'E-mail', width: 220,
      cellRenderer: EmailRenderer, filter: true,
    },
    {
      field: 'phone', headerName: 'Telefone', width: 140,
      cellStyle: () => ({ fontFamily: 'monospace', fontSize: '0.76rem', color: '#9ca3af' }),
      valueFormatter: p => p.value || '—',
    },
    {
      field: 'is_active', headerName: 'Status', width: 110,
      cellRenderer: StatusRenderer, pinned: 'right',
      filter: true, sortable: true,
    },
    {
      headerName: 'Ações', width: 95, sortable: false,
      cellRenderer: ActionsRenderer, pinned: 'right',
    },
  ], [])

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true, suppressMovable: false,
  }), [])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onToggleStatus = useCallback(async (customer: Customer) => {
    const newStatus = !customer.is_active
    // Optimistic update
    setCustomers(prev => prev.map(c => c.customer_id === customer.customer_id ? { ...c, is_active: newStatus } : c))
    try {
      await fetch('/api/customers/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customer.customer_id, is_active: newStatus }),
      })
    } catch {
      // Revert on error
      setCustomers(prev => prev.map(c => c.customer_id === customer.customer_id ? { ...c, is_active: customer.is_active } : c))
    }
  }, [])

  const onEdit = useCallback((customer: Customer) => {
    setEditCustomer(customer)
  }, [])

  const context = useMemo(() => ({ onToggleStatus, onEdit }), [onToggleStatus, onEdit])

  async function handleImportSuccess() {
    setImportOpen(false)
    setLoading(true)
    try {
      const res = await fetch('/api/customers/list')
      if (res.ok) {
        const { customers: fresh } = await res.json()
        setCustomers(fresh)
      } else {
        router.refresh()
      }
    } catch { router.refresh() }
    finally { setLoading(false) }
  }

  function handleSaved(updated: Partial<Customer> & { customer_id: string }) {
    setCustomers(prev => prev.map(c => c.customer_id === updated.customer_id ? { ...c, ...updated } : c))
  }

  const activeCount = customers.filter(c => c.is_active !== false).length
  const inactiveCount = customers.length - activeCount

  return (
    <>
      <ImportCustomersDialog open={importOpen} onClose={() => setImportOpen(false)} onSuccess={handleImportSuccess} />
      <EditCustomerDialog customer={editCustomer} open={!!editCustomer} onClose={() => setEditCustomer(null)} onSaved={handleSaved} />

      <div className="section-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(55,65,81,0.4)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Quick filter */}
          <input
            type="text"
            placeholder="Buscar em todos os campos..."
            value={quickFilter}
            onChange={e => setQuickFilter(e.target.value)}
            style={{
              flex: 1, minWidth: '220px', padding: '9px 14px', borderRadius: '10px',
              background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(55,65,81,0.4)',
              color: '#f9fafb', fontSize: '0.85rem', outline: 'none'
            }}
          />

          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
              {customers.length.toLocaleString('pt-BR')} clientes
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#10b981' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              {activeCount} ativos
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#ef4444' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              {inactiveCount} inativos
            </span>
          </div>

          {/* Import button */}
          <button
            onClick={() => setImportOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 18px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: 'none', cursor: 'pointer', color: '#fff',
              fontSize: '0.85rem', fontWeight: '700', whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
            }}
          >
            <Upload size={15} /> Importar Planilha
          </button>
        </div>

        {/* AG Grid */}
        <div style={{ flex: 1, minHeight: '500px' }}>
          {customers.length === 0 && !loading ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Building2 size={28} style={{ color: '#2563eb', opacity: 0.6 }} />
              </div>
              <p style={{ fontSize: '1rem', fontWeight: '700', color: '#e5e7eb', marginBottom: '6px' }}>Nenhum cliente cadastrado</p>
              <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '20px' }}>Importe a planilha Excel para começar</p>
              <button onClick={() => setImportOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 22px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '0.88rem', fontWeight: '700', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}>
                <Upload size={16} /> Importar Planilha Excel
              </button>
            </div>
          ) : (
            <div style={{ height: '620px', width: '100%' }}>
              <AgGridReact<Customer>
                ref={gridRef}
                theme={darkTheme}
                rowData={customers}
                columnDefs={colDefs}
                defaultColDef={defaultColDef}
                context={context}
                quickFilterText={quickFilter}
                pagination={true}
                paginationPageSize={50}
                paginationPageSizeSelector={[25, 50, 100, 200]}
                animateRows={true}
                rowSelection={{ mode: 'multiRow' }}
                suppressRowClickSelection={true}
                enableCellTextSelection={true}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
