'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Shield, FileText,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  Building2, Key, Users, ArrowLeftRight
} from 'lucide-react'

interface SidebarProps {
  tenantName?: string
  userEmail?: string
  userRole?: string
}

const navItems = [
  { href: '/dashboard',          label: 'Dashboard',             icon: LayoutDashboard },
  { href: '/customers',          label: 'Clientes',              icon: Building2 },
  { href: '/contract-movements', label: 'Movimentações',          icon: ArrowLeftRight },
  { href: '/contracts',          label: 'Contratos',             icon: FileText },
  { href: '/reports',            label: 'Relatórios',            icon: BarChart3 },
  { href: '/settings',           label: 'Configurações',         icon: Settings },
]

const superAdminItems = [
  { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/admin/users', label: 'Usuários', icon: Users },
  { href: '/admin/settings', label: 'Config. da Plataforma', icon: Key },
]

function RoleLabel({ role }: { role: string }) {
  const isSuperAdmin = role === 'super_admin'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '0.68rem', fontWeight: '700',
      padding: '2px 8px', borderRadius: '6px', marginTop: '3px',
      background: isSuperAdmin ? 'rgba(139, 92, 246, 0.15)' : 'rgba(31, 41, 55, 0.6)',
      border: `1px solid ${isSuperAdmin ? 'rgba(139, 92, 246, 0.3)' : 'rgba(55, 65, 81, 0.4)'}`,
      color: isSuperAdmin ? '#a78bfa' : '#6b7280',
      textTransform: 'uppercase', letterSpacing: '0.06em'
    }}>
      {isSuperAdmin ? '★ Super Admin' : role.replace('_', ' ')}
    </div>
  )
}

export function Sidebar({ tenantName = 'ACME S.A.', userEmail = '', userRole = 'admin' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{
      width: collapsed ? '72px' : '240px',
      minHeight: '100vh',
      background: 'rgba(10, 15, 30, 0.95)',
      borderRight: '1px solid rgba(55, 65, 81, 0.4)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 50,
      backdropFilter: 'blur(20px)'
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid rgba(55, 65, 81, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
        }}>
          <Shield size={20} color="white" />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#f9fafb', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              GCL
            </div>
            <div style={{ fontSize: '0.6rem', color: '#6b7280', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              Gestão de Contratos de Licenciamentos
            </div>
          </div>
        )}
      </div>

      {/* Tenant info */}
      {!collapsed && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(55, 65, 81, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
            background: 'linear-gradient(135deg, #1f2937, #374151)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(75, 85, 99, 0.5)'
          }}>
            <Building2 size={15} color="#9ca3af" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tenantName}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'capitalize' }}>
              Plano Professional
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 10px', overflow: 'hidden auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start', overflow: 'hidden' }}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
            </Link>
          )
        })}

        {/* Super admin area */}
        {userRole === 'super_admin' && (
          <>
            <div style={{
              margin: '8px 4px 4px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(139, 92, 246, 0.2)',
            }}>
              {!collapsed && (
                <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#7c3aed', letterSpacing: '0.08em', marginBottom: '4px', padding: '0 8px' }}>
                  SUPER ADMIN
                </div>
              )}
            </div>
            {superAdminItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start', overflow: 'hidden', color: '#a78bfa' }}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User section */}
      <div style={{
        padding: '12px 10px',
        borderTop: '1px solid rgba(55, 65, 81, 0.4)'
      }}>
        {!collapsed && (
          <div style={{
            padding: '10px 12px',
            marginBottom: '8px',
            background: 'rgba(31, 41, 55, 0.5)',
            borderRadius: '10px',
            border: '1px solid rgba(55, 65, 81, 0.4)'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#e5e7eb', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail || 'admin@empresa.com'}
            </div>
            <RoleLabel role={userRole} />
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: '10px', padding: '10px 12px', borderRadius: '10px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6b7280', fontSize: '0.875rem', fontWeight: '500',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && 'Sair'}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute', top: '50%', right: '-12px',
          width: '24px', height: '24px',
          background: '#1f2937',
          border: '1px solid rgba(55, 65, 81, 0.6)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#9ca3af', zIndex: 10,
          transition: 'all 0.2s'
        }}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </aside>
  )
}

interface TopbarProps {
  title?: string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header style={{
      height: '64px',
      background: 'rgba(10, 15, 30, 0.9)',
      borderBottom: '1px solid rgba(55, 65, 81, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div>
        {title && <h1 style={{ fontSize: '1rem', fontWeight: '600', color: '#f9fafb' }}>{title}</h1>}
        {subtitle && <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1px' }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

      </div>
    </header>
  )
}
