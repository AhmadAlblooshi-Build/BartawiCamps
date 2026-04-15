'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, BedDouble,
  MessageSquareWarning, CreditCard, Settings,
  FileText, BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Dashboard',  href: '/dashboard',   icon: LayoutDashboard },
  { label: 'Camps',      href: '/camps',        icon: Building2 },
  { label: 'Rooms',      href: '/rooms',        icon: BedDouble },
  { label: 'Contracts',  href: '/contracts',    icon: FileText },
  { label: 'Complaints', href: '/complaints',   icon: MessageSquareWarning },
  { label: 'Payments',   href: '/payments',     icon: CreditCard },
  { label: 'Reports',    href: '/reports',      icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-bg-card border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-glow border border-accent-cyan/30 flex items-center justify-center">
            <span className="text-accent-cyan font-heading font-bold text-sm">B</span>
          </div>
          <div>
            <p className="font-heading font-bold text-text-primary text-sm leading-none">BARTAWI</p>
            <p className="text-text-muted text-[10px] mt-0.5 font-body">Camp Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-150',
                active
                  ? 'bg-accent-glow border border-accent-cyan/20 text-accent-cyan'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-cyan" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <div className="mt-3 px-3">
          <p className="text-text-dim text-[10px] font-body">Bartawi LLC © 2026</p>
          <p className="text-text-dim text-[10px] font-body">Dubai, UAE</p>
        </div>
      </div>
    </aside>
  )
}
