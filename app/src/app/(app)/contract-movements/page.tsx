import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { ContractMovementsTable } from '@/components/contract-movements/ContractMovementsTable'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function ContractMovementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = svc()
  const { data: profile } = await service
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) redirect('/dashboard')

  // Busca paginada — contorna o limite de 1000 linhas do PostgREST
  const allMovements: any[] = []
  let from = 0
  const MAX = 100000

  while (from < MAX) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await service
      .from('contract_movements')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('creation_date', { ascending: false, nullsFirst: false })
      .range(from, to)

    if (error || !data || data.length === 0) break
    allMovements.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return (
    <div style={{ flex: 1 }}>
      <Topbar
        title="Movimentações de Contrato"
        subtitle={`Histórico de pedidos, licenças e contratos SAP · ${allMovements.length.toLocaleString('pt-BR')} registros`}
      />
      <ContractMovementsTable initialData={allMovements} />
    </div>
  )
}
