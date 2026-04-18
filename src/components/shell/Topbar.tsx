'use client'
import { Breadcrumbs } from './Breadcrumbs'
import { GlobalSearch } from './GlobalSearch'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { NotificationsButton } from '@/components/notifications/NotificationsButton'

export function Topbar() {
  return (
    <header className="h-16 sticky top-0 z-30 flex items-center gap-4 px-8 bg-sand-50/80 backdrop-blur-xl border-b border-[color:var(--color-border-subtle)]">
      <div className="flex-1 min-w-0">
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-2">
        <GlobalSearch />
        <ThemeToggle />
        <NotificationsButton />
        <UserMenu />
      </div>
    </header>
  )
}
