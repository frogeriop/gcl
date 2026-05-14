import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GCL | Gestão de Contratos de Licenciamentos',
  description: 'Plataforma SaaS para gestão de contratos de licenciamentos SAP. Controle clientes, contratos e relatórios de licenciamento.',
  keywords: 'SAP, licenciamento, contratos, gestão, compliance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
