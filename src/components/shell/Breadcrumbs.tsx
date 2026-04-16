'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CaretRight } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

const LABELS: Record<string, string> = {
  'camps':          'Camps',
  'rooms':          'Rooms',
  'contracts':      'Contracts',
  'maintenance':    'Maintenance',
  'complaints':     'Complaints',
  'payments':       'Payments',
  'reports':        'Reports',
  'admin':          'Admin',
  'property-types': 'Property Types',
  'users':          'Users & Roles',
  'teams':          'Teams',
  'settings':       'Settings',
  'map':            'Map',
}

export function Breadcrumbs() {
  const path = usePathname() || '/'
  const parts = path.split('/').filter(Boolean)

  if (parts.length === 0) {
    return <h1 className="display-md">Dashboard</h1>
  }

  const crumbs = parts.map((p, i) => ({
    label: LABELS[p] || p,
    href:  '/' + parts.slice(0, i + 1).join('/'),
    isLast: i === parts.length - 1,
  }))

  return (
    <nav className="flex items-center gap-2 text-[13px] font-body min-w-0">
      <Link href="/" className="text-espresso-subtle hover:text-espresso transition-colors shrink-0">Dashboard</Link>
      {crumbs.map(c => (
        <span key={c.href} className="flex items-center gap-2 min-w-0">
          <Icon icon={CaretRight} size={12} className="text-espresso-subtle shrink-0" />
          {c.isLast ? (
            <span className="text-espresso font-medium truncate">{c.label}</span>
          ) : (
            <Link href={c.href} className="text-espresso-subtle hover:text-espresso transition-colors truncate">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  )
}
