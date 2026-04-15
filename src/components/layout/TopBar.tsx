'use client'
import { format } from 'date-fns'
import { User } from 'lucide-react'
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown'

interface Props { title?: string }

export function TopBar({ title }: Props) {
  const today = format(new Date(), 'EEEE, d MMMM yyyy')

  return (
    <header className="h-14 border-b border-border bg-bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div>
        {title && (
          <h1 className="font-heading font-semibold text-text-primary text-base">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-text-muted text-xs font-body hidden md:block">{today}</span>
        <NotificationsDropdown />
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-7 h-7 rounded-full bg-accent-glow border border-accent-cyan/30 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-accent-cyan" />
          </div>
          <span className="text-text-secondary text-sm font-body hidden md:block">Admin</span>
        </div>
      </div>
    </header>
  )
}
