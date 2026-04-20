'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  House, Buildings, Bed, Files, Wrench, ChatDots, CreditCard,
  ChartBar, UsersThree, Gear, CaretLeft, MapTrifold, ListChecks,
} from '@phosphor-icons/react'
import { FileText } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { spring } from '@/lib/motion'
import { useHasPermission } from '@/lib/auth'
import CreateLeaseWizard from '@/components/leases/CreateLeaseWizard'

const MAIN = [
  { href: '/',            label: 'Dashboard',   icon: House,       perm: null },
  { href: '/camps',       label: 'Camps',       icon: Buildings,   perm: 'rooms.read' },
  { href: '/operations',  label: 'Operations',  icon: ListChecks,  perm: 'rooms.read' },
  { href: '/tenants',     label: 'Tenants',     icon: UsersThree,  perm: 'tenants.read' },
  { href: '/leases',      label: 'Leases',      icon: FileText,    perm: 'contracts.read' },
  { href: '/contracts',   label: 'Contracts',   icon: Files,       perm: 'contracts.read' },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench,      perm: 'maintenance.read' },
  { href: '/complaints',  label: 'Complaints',  icon: ChatDots,    perm: 'complaints.read' },
  { href: '/payments',    label: 'Payments',    icon: CreditCard,  perm: 'payments.read' },
  { href: '/reports',     label: 'Reports',     icon: ChartBar,    perm: 'reports.read' },
]

const ADMIN = [
  { href: '/admin/property-types', label: 'Property Types', icon: MapTrifold,  perm: 'property_types.read' },
  { href: '/admin/users',          label: 'Users & Roles',  icon: UsersThree,  perm: 'users.read' },
  { href: '/admin/teams',          label: 'Teams',          icon: UsersThree,  perm: 'teams.read' },
  { href: '/admin/settings',       label: 'Settings',       icon: Gear,        perm: 'settings.read' },
]

export function Sidebar() {
  const path = usePathname() || '/'
  const [collapsed, setCollapsed] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 264 }}
      transition={spring}
      className="sidebar-gradient relative flex flex-col h-[100dvh] sticky top-0 shrink-0 elevation-1"
      style={{
        background: 'linear-gradient(180deg, var(--color-sand-100) 0%, var(--color-sand-50) 100%)',
        borderRight: '1px solid rgba(214, 207, 197, 0.5)',
        boxShadow: '2px 0 12px rgba(26, 24, 22, 0.03)'
      }}
    >
      <div className="px-5 py-6">
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              <div className="font-display text-[22px] italic tracking-tight" style={{ color: 'var(--color-espresso)' }}>Bartawi</div>
              <div className="eyebrow mt-1 text-[10px]">CAMP MANAGEMENT</div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <div className="font-display text-[24px] italic" style={{ color: 'var(--color-espresso)' }}>B</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="divider-warm mx-4" />

      {!collapsed && (
        <div className="px-4 mb-3">
          <button
            onClick={() => setWizardOpen(true)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#1A1816',
              color: '#F4EFE7',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            + New lease
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <NavSection items={MAIN} path={path} collapsed={collapsed} />
        <div className="divider-warm mx-2 my-4" />
        <div className="mb-2 px-3">
          {!collapsed && <div className="eyebrow text-[10px]">ADMINISTRATION</div>}
        </div>
        <NavSection items={ADMIN} path={path} collapsed={collapsed} isAdmin />
      </nav>

      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute top-16 -right-3 w-6 h-6 rounded-full bg-sand-50 border border-[color:var(--color-border-medium)] grid place-items-center hover:bg-sand-100 transition-colors shadow-raise-1"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={spring}>
          <Icon icon={CaretLeft} size={12} />
        </motion.span>
      </button>

      <CreateLeaseWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </motion.aside>
  )
}

function NavSection({ items, path, collapsed, isAdmin = false }: {
  items: Array<{ href: string; label: string; icon: any; perm: string | null }>
  path: string
  collapsed: boolean
  isAdmin?: boolean
}) {
  return (
    <div className="space-y-[2px]">
      {items.map(item => <NavItem key={item.href} item={item} active={isActive(item.href, path)} collapsed={collapsed} isAdmin={isAdmin} />)}
    </div>
  )
}

function NavItem({ item, active, collapsed, isAdmin = false }: {
  item: { href: string; label: string; icon: any; perm: string | null }
  active: boolean
  collapsed: boolean
  isAdmin?: boolean
}) {
  // Permission gating — hide items the user can't access
  const hasPerm = item.perm ? useHasPermission(item.perm) : true
  if (!hasPerm) return null

  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 py-2 rounded-lg font-body text-[13px] font-medium transition-all duration-200',
        active
          ? 'bg-sand-200'
          : 'hover:bg-[rgba(214,207,197,0.6)]',
        collapsed ? 'justify-center px-2' : 'px-3',
        isAdmin && !collapsed && 'pl-[16px]'
      )}
      style={{
        color: active ? 'var(--color-espresso)' : 'var(--color-espresso-muted)'
      }}
    >
      {active && !collapsed && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber rounded-r-[2px]"
        />
      )}
      <Icon icon={item.icon} size={18} />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="whitespace-nowrap overflow-hidden"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {collapsed && (
        <div
          className="absolute left-full ml-3 px-3 py-2 elevation-2 bg-sand-50 rounded-xl text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50"
          style={{ color: 'var(--color-espresso)' }}
        >
          {item.label}
        </div>
      )}
    </Link>
  )
}

function isActive(href: string, path: string) {
  if (href === '/') return path === '/'
  return path.startsWith(href)
}
