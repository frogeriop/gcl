import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, companyDB, userName, password, languageCode } = await req.json()

  if (!url || !companyDB || !userName || !password) {
    return NextResponse.json({ success: false, message: 'Preencha todos os campos obrigatórios.' })
  }

  try {
    const loginUrl = `${url.replace(/\/$/, '')}/Login`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        CompanyDB: companyDB,
        UserName: userName,
        Password: password,
        Language: Number(languageCode) || 29,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    if (response.ok || response.status === 200) {
      return NextResponse.json({ success: true, message: 'Conexão com SAP B1 Service Layer bem-sucedida!' })
    }

    const body = await response.json().catch(() => ({}))
    return NextResponse.json({
      success: false,
      message: body?.error?.message || `Falha na autenticação (HTTP ${response.status})`
    })
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json({ success: false, message: 'Timeout: SAP Service Layer não respondeu em 8 segundos.' })
    }
    return NextResponse.json({ success: false, message: err.message || 'Erro de rede ao conectar à Service Layer.' })
  }
}
