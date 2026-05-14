'use client'

const navSections = [
  { id: 'company', label: 'Empresa', color: '#3b82f6' },
  { id: 'profile', label: 'Meu Perfil', color: '#10b981' },
  { id: 'roles',   label: 'Roles de Acesso', color: '#8b5cf6' },
  { id: 'sap',     label: 'SAP B1 Service Layer', color: '#60a5fa' },
  { id: 'plan',    label: 'Plano & Assinatura', color: '#f59e0b' },
]

export function SettingsNav() {
  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {navSections.map(s => (
        <a
          key={s.id}
          href={`#${s.id}`}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '8px', textDecoration: 'none',
            color: '#9ca3af', fontSize: '0.8125rem', fontWeight: '500',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(31, 41, 55, 0.8)'
            ;(e.currentTarget as HTMLElement).style.color = '#e5e7eb'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'none'
            ;(e.currentTarget as HTMLElement).style.color = '#9ca3af'
          }}
        >
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%', background: s.color, flexShrink: 0
          }} />
          {s.label}
        </a>
      ))}
    </nav>
  )
}
