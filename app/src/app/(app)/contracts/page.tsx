import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Sidebar'
import { ContractsTable } from '@/components/contracts/ContractsTable'

export const dynamic = 'force-dynamic'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = svc()
  const { data: profile } = await service
    .from('user_profiles').select('tenant_id').eq('id', user.id).single()
  if (!profile?.tenant_id) redirect('/dashboard')

  const { data: contracts } = await service
    .from('contracts')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('contract_start_date', { ascending: false, nullsFirst: false })
    .limit(5000)

  return (
    <div style={{ flex: 1 }}>
      <Topbar
        title="Contratos"
        subtitle="Gestão de contratos de licenciamento SAP"
      />
      <ContractsTable initialData={contracts || []} />
    </div>
  )
}
