import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Parseia "N years" / "N year" / "N months" → número de meses ──────────────
function parseDurationMonths(duration: string | null): number | null {
  if (!duration) return null
  const s = duration.trim().toLowerCase()
  const yearsMatch  = s.match(/^(\d+)\s*years?$/)
  const monthsMatch = s.match(/^(\d+)\s*months?$/)
  if (yearsMatch)  return parseInt(yearsMatch[1], 10) * 12
  if (monthsMatch) return parseInt(monthsMatch[1], 10)
  const num = parseInt(s, 10)
  return isNaN(num) ? null : num   // fallback: trata como meses
}

// ── Calcula data final: start_date + N meses ──────────────────────────────────
function calcEndDate(startDate: string | null, durationMonths: number | null): string | null {
  if (!startDate || durationMonths === null) return null
  try {
    const d = new Date(startDate)
    if (isNaN(d.getTime())) return null
    d.setMonth(d.getMonth() + durationMonths)
    return d.toISOString().substring(0, 10)   // YYYY-MM-DD
  } catch { return null }
}

// ── Data de cancelamento: end_date - 31 dias ──────────────────────────────────
function calcLastCancellationDate(endDate: string | null): string | null {
  if (!endDate) return null
  try {
    const d = new Date(endDate)
    if (isNaN(d.getTime())) return null
    d.setDate(d.getDate() - 31)
    return d.toISOString().substring(0, 10)
  } catch { return null }
}

// POST /api/contracts/generate
export async function POST(_req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const service = svc()
    const { data: profile } = await service
      .from('user_profiles').select('tenant_id').eq('id', user.id).single()
    if (!profile?.tenant_id) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

    const tenantId = profile.tenant_id

    // ── 1. Ler TODOS os movimentos (todas as páginas) ─────────────────────────
    // Precisamos de todos para: calcular valores agregados + identificar INITIALs
    const PAGE = 1000
    let allMovements: Record<string, any>[] = []
    let from = 0

    while (true) {
      const { data, error } = await service
        .from('contract_movements')
        .select([
          'contract_id', 'order_type', 'status',
          'customer_id', 'customer_name', 'customer_country',
          'partner_id', 'partner_name', 'solution', 'currency',
          'contract_start_date', 'contract_duration', 'creation_date',
          'net_amount',
          'deal_specific_discount', 'promo_discount', 'promo_code_used', 'partner_discount',
        ].join(','))
        .eq('tenant_id', tenantId)
        .range(from, from + PAGE - 1)

      if (error) throw new Error(`Leitura movimentos: ${error.message}`)
      if (!data || data.length === 0) break
      allMovements.push(...data)
      if (data.length < PAGE) break
      from += PAGE
    }

    const totalMovementsRead = allMovements.length

    // ── 2. Filtrar INITIALs com contract_id preenchido (case-insensitive) ─────
    const allInitial = allMovements.filter(r =>
      r.order_type?.toLowerCase() === 'initial' &&
      r.contract_id != null &&
      String(r.contract_id).trim() !== ''
    )

    if (allInitial.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhum movimento do tipo INITIAL com contract_id encontrado.',
        totalMovementsRead,
        generated: 0,
      })
    }

    // ── 3. Calcular valor total por contract_id (Initial + Addition + Upgrade) ─
    const valueByContract = new Map<string, number>()
    for (const m of allMovements) {
      if (!m.contract_id) continue
      const ot = m.order_type?.toLowerCase() ?? ''
      if (!['initial', 'addition', 'upgrade'].includes(ot)) continue
      const cur = valueByContract.get(m.contract_id) || 0
      valueByContract.set(m.contract_id, cur + Number(m.net_amount || 0))
    }

    // ── 4. Consolidar 1 cabeçalho por contract_id ─────────────────────────────
    // Múltiplas linhas INITIAL por contrato (vários produtos) → 1 registro
    // Desconto: média ponderada das linhas INITIAL com desconto preenchido
    const contractMap = new Map<string, Record<string, any>>()
    const discountAccum = new Map<string, { deal: number; promo: number; partner: number; count: number }>()

    for (const row of allInitial) {
      const cid = row.contract_id

      // Primeira linha como cabeçalho
      if (!contractMap.has(cid)) {
        contractMap.set(cid, { ...row })
        discountAccum.set(cid, { deal: 0, promo: 0, partner: 0, count: 0 })
      }

      // Acumular descontos para média
      const acc = discountAccum.get(cid)!
      if (row.deal_specific_discount != null || row.promo_discount != null || row.partner_discount != null) {
        acc.deal    += Number(row.deal_specific_discount  || 0)
        acc.promo   += Number(row.promo_discount          || 0)
        acc.partner += Number(row.partner_discount        || 0)
        acc.count   += 1
      }
    }

    // ── 5. Determinar status de cada contrato ─────────────────────────────────
    // Regra: se QUALQUER linha INITIAL daquele contract_id tiver status
    // CANCELLED ou TERMINATION RECEIVED → contrato inativo
    const INACTIVE_STATUSES = new Set(['CANCELLED', 'TERMINATION RECEIVED'])
    const inactiveSet = new Set(
      allInitial
        .filter(r => INACTIVE_STATUSES.has(r.status?.toUpperCase() ?? ''))
        .map(r => r.contract_id)
    )

    // ── 6. Montar registros finais ────────────────────────────────────────────
    const now = new Date().toISOString()
    const records: Record<string, any>[] = []

    for (const [contractId, row] of contractMap.entries()) {
      const isActive   = !inactiveSet.has(contractId)
      const totalValue = valueByContract.get(contractId) || 0
      const acc        = discountAccum.get(contractId)!

      // Desconto médio (apenas se houve ao menos 1 linha com desconto)
      const avgDeal    = acc.count > 0 ? acc.deal    / acc.count : null
      const avgPromo   = acc.count > 0 ? acc.promo   / acc.count : null
      const avgPartner = acc.count > 0 ? acc.partner / acc.count : null

      // Datas calculadas
      const durationMonths      = parseDurationMonths(row.contract_duration)
      const contractEndDate     = calcEndDate(row.contract_start_date, durationMonths)
      const lastCancellationDate = calcLastCancellationDate(contractEndDate)

      records.push({
        contract_id:            contractId,
        tenant_id:              tenantId,
        customer_id:            row.customer_id            || null,
        customer_name:          row.customer_name          || null,
        customer_country:       row.customer_country       || null,
        partner_id:             row.partner_id             || null,
        partner_name:           row.partner_name           || null,
        solution:               row.solution               || null,
        currency:               row.currency               || 'BRL',
        contract_start_date:    row.contract_start_date    || null,
        contract_duration:      row.contract_duration      || null,
        contract_end_date:      contractEndDate,
        last_cancellation_date: lastCancellationDate,
        creation_date:          row.creation_date          || null,
        // Descontos (média das linhas INITIAL)
        deal_specific_discount: avgDeal    !== null ? parseFloat(avgDeal.toFixed(4))    : null,
        promo_discount:         avgPromo   !== null ? parseFloat(avgPromo.toFixed(4))   : null,
        partner_discount:       avgPartner !== null ? parseFloat(avgPartner.toFixed(4)) : null,
        promo_code_used:        row.promo_code_used        || null,
        // Valores
        total_value:            parseFloat(totalValue.toFixed(4)),
        net_amount:             parseFloat(totalValue.toFixed(4)),   // compat
        // Status
        status:                 isActive ? 'COMPLETED' : 'CANCELLED',
        order_type:             'Initial',
        is_active:              isActive,
        // Controle
        generated_at:           now,
        updated_at:             now,
      })
    }

    // ── 7. TRUNCATE + INSERT em lotes ─────────────────────────────────────────
    // Apaga todos os registros do tenant e regrava do zero
    const { error: truncErr } = await service
      .from('contracts')
      .delete()
      .eq('tenant_id', tenantId)

    if (truncErr) throw new Error(`Falha ao limpar tabela: ${truncErr.message}`)

    const BATCH = 200
    let inserted    = 0
    const batchErrors: { batch: number; error: string }[] = []

    for (let i = 0; i < records.length; i += BATCH) {
      const batch    = records.slice(i, i + BATCH)
      const batchNum = Math.floor(i / BATCH) + 1

      const { error } = await service.from('contracts').insert(batch)

      if (error) {
        batchErrors.push({ batch: batchNum, error: error.message })
        console.error(`[contracts/generate] Lote ${batchNum}:`, error.message)
      } else {
        inserted += batch.length
      }
    }

    // ── 8. Contagens finais ───────────────────────────────────────────────────
    const { count: dbTotal } = await service
      .from('contracts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId)

    const { count: activeCount } = await service
      .from('contracts').select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).eq('is_active', true)

    return NextResponse.json({
      success:           batchErrors.length === 0,
      totalMovementsRead,
      initialWithContractId: allInitial.length,
      contractsFound:    contractMap.size,
      generated:         inserted,
      failed:            records.length - inserted,
      dbTotal:           dbTotal ?? null,
      activeContracts:   activeCount ?? null,
      inactiveContracts: (dbTotal ?? 0) - (activeCount ?? 0),
      batchErrors,
    })

  } catch (err: any) {
    console.error('[contracts/generate]', err)
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}
