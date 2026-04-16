'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  House, Buildings, Bed, Files, Wrench, ChatDots, CreditCard,
  ChartBar, UsersThree, Gear, CaretLeft, MapTrifold,
} from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import { spring } from '@/lib/motion'
import { useHasPermission } from '@/lib/auth'

const MAIN = [
  { href: '/dashboard',   label: 'Dashboard',   icon: House,      perm: null },
  { href: '/camps',       label: 'Camps',       icon: Buildings,  perm: 'rooms.read' },
  { href: '/rooms',       label: 'Rooms',       icon: Bed,        perm: 'rooms.read' },
  { href: '/contracts',   label: 'Contracts',   icon: Files,      perm: 'contracts.read' },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench,     perm: 'maintenance.read' },
  { href: '/complaints',  label: 'Complaints',  icon: ChatDots,   perm: 'complaints.read' },
  { href: '/payments',    label: 'Payments',    icon: CreditCard, perm: 'payments.read' },
  { href: '/reports',     label: 'Reports',     icon: ChartBar,   perm: 'reports.read' },
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

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 264 }}
      transition={spring}
      className="relative flex flex-col h-[100dvh] sticky top-0 shrink-0 bg-sand-50 border-r border-[color:var(--color-border-subtle)]"
    >
      <div className="h-16 flex items-center px-5 border-b border-[color:var(--color-border-subtle)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-espresso text-sand-50 grid place-items-center shrink-0">
            <span className="font-display text-lg italic leading-none">B</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col min-w-0"
              >
                <div className="font-display text-[15px] leading-none tracking-tight">Bartawi</div>
                <div className="eyebrow mt-1">Camps</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <NavSection items={MAIN} path={path} collapsed={collapsed} />
        <div className="mt-6 mb-2 px-3 h-4">
          {!collapsed && <div className="eyebrow">Admin</div>}
        </div>
        <NavSection items={ADMIN} path={path} collapsed={collapsed} />
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
    </motion.aside>
  )
}

function NavSection({ items, path, collapsed }: {
  items: Array<{ href: string; label: string; icon: any; perm: string | null }>
  path: string
  collapsed: boolean
}) {
  return (
    <div className="space-y-0.5">
      {items.map(item => <NavItem key={item.href} item={item} active={isActive(item.href, path)} collapsed={collapsed} />)}
    </div>
  )
}

function NavItem({ item, active, collapsed }: {
  item: { href: string; label: string; icon: any; perm: string | null }
  active: boolean
  collapsed: boolean
}) {
  // Permission gating — hide items the user can't access
  const hasPerm = item.perm ? useHasPermission(item.perm) : true
  if (!hasPerm) return null

  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2 rounded-lg font-body text-[13px] font-medium transition-all duration-200',
        active
          ? 'bg-espresso text-sand-50 shadow-raise-1'
          : 'text-espresso-muted hover:text-espresso hover:bg-sand-100',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon icon={item.icon} size={18} emphasis={active} />
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
        <span className="absolute left-full ml-2 px-2 py-1 bg-espresso text-sand-50 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          {item.label}
        </span>
      )}
    </Link>
  )
}

function isActive(href: string, path: string) {
  if (href === '/') return path === '/'
  return path.startsWith(href)
}
