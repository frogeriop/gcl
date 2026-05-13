import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LicenseAudit SAP | Controle de Licenciamento SAP',
  description: 'Plataforma SaaS para auditoria e controle inteligente de licenciamento SAP. Identifique desperdícios, otimize custos e garanta conformidade.',
  keywords: 'SAP, licenciamento, auditoria, compliance, otimização',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
