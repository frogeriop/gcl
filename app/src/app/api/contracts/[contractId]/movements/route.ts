import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    // Resolve params and auth client in parallel
    const [{ contractId }, supabase] = await Promise.all([params, createClient()])

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const service = getServiceClient()

    // Fetch user profile and movements in parallel (eliminates one sequential round-trip)
    const [profileRes, movementsRes] = await Promise.all([
      service
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single(),
      service
        .from('contract_movements')
        .select(
          'order_id, sales_order_id, status, order_type, creation_date, creation_time, ' +
          'product_name, solution, quantity, net_amount, currency, ' +
          'deal_specific_discount, promo_discount, promo_code_used, partner_discount, ' +
          'partner_id, partner_name, buyer, industry, customer_country'
        )
        .eq('contract_id', contractId)
        .order('creation_date', { ascending: false, nullsFirst: false })
        .limit(2000),
    ])

    if (!profileRes.data?.tenant_id) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
    }
    if (movementsRes.error) {
      return NextResponse.json({ error: movementsRes.error.message }, { status: 500 })
    }

    return NextResponse.json({
      movements: movementsRes.data ?? [],
      total: movementsRes.data?.length ?? 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
