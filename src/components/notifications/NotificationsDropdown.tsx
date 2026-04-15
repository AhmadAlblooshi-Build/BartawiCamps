'use client'
import { useState, useRef, useEffect } from 'react'
import { Bell, RefreshCw, Clock, Check, CheckCheck, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useNotifications, useMarkNotificationRead, useSnoozeNotification } from '@/lib/queries'
import { notificationsApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'
import type { AppNotification } from '@/lib/types'

const TYPE_BADGE: Record<string, { dot: string; bg: string; border: string }> = {
  expired:      { dot: 'bg-status-vacant',  bg: 'bg-status-vacant-dim',  border: 'border-l-2 border-status-vacant/40' },
  expiring_30d: { dot: 'bg-status-legal',   bg: 'bg-status-legal-dim',   border: 'border-l-2 border-status-legal/40' },
  expiring_60d: { dot: 'bg-orange-400',     bg: 'bg-orange-500/5',       border: 'border-l-2 border-orange-500/30' },
  expiring_90d: { dot: 'bg-yellow-400',     bg: 'bg-yellow-500/5',       border: 'border-l-2 border-yellow-500/20' },
  default:      { dot: 'bg-accent-cyan',    bg: 'bg-accent-glow',        border: '' },
}

export function NotificationsDropdown() {
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)
  const router            = useRouter()
  const qc                = useQueryClient()
  const { data }          = useNotifications()
  const { mutate: markRead } = useMarkNotificationRead()
  const { mutate: snooze }   = useSnoozeNotification()

  const notifications: AppNotification[] = data?.data ?? []
  const unreadCount: number              = data?.unread_count ?? 0

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead()
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const handleClick = (n: AppNotification) => {
    if (!n.is_read) markRead(n.id)
    if (n.resource_type === 'contract') {
      router.push('/contracts')
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 rounded-full bg-status-vacant text-white text-[9px] font-bold flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[400px] bg-bg-card border border-border rounded-2xl shadow-2xl z-50 animate-fade-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div>
              <h3 className="font-heading font-semibold text-text-primary text-sm">Notifications</h3>
              <p className="text-text-dim text-xs mt-0.5">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 text-text-muted text-xs hover:text-accent-cyan transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-text-dim hover:text-text-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center px-4">
                <div className="w-12 h-12 rounded-full bg-status-occupied-dim border border-status-occupied/20 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-5 h-5 text-status-occupied" />
                </div>
                <p className="text-text-secondary text-sm font-body font-medium">All clear</p>
                <p className="text-text-dim text-xs mt-1">
                  No contract alerts at this time.{' '}
                  <br />
                  The cron job checks daily at 6 AM Dubai time.
                </p>
              </div>
            ) : (
              notifications.map(n => {
                const style = TYPE_BADGE[n.type] || TYPE_BADGE.default
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'px-5 py-3.5 border-b border-border/50 last:border-0 cursor-pointer hover:bg-bg-elevated/50 transition-colors',
                      !n.is_read ? style.bg : '',
                      style.border
                    )}
                    onClick={() => handleClick(n)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 flex-shrink-0">
                        <span className={cn('w-2 h-2 rounded-full block', !n.is_read ? style.dot : 'bg-text-dim')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-body leading-snug',
                          !n.is_read ? 'font-semibold text-text-primary' : 'text-text-secondary'
                        )}>
                          {n.title}
                        </p>
                        <p className="text-text-muted text-xs mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                        <p className="text-text-dim text-[10px] mt-1.5">{formatDate(n.created_at)}</p>
                      </div>
                      <div
                        className="flex flex-col gap-1.5 flex-shrink-0 ml-2"
                        onClick={e => e.stopPropagation()}
                      >
                        {n.resource_type === 'contract' && (
                          <button
                            onClick={() => { router.push('/contracts'); setOpen(false) }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-accent-glow border border-accent-cyan/20 rounded-lg text-accent-cyan text-[10px] font-body font-semibold hover:bg-accent-cyan/15 transition-colors whitespace-nowrap"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Renew
                          </button>
                        )}
                        <button
                          onClick={() => snooze(n.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-bg-elevated border border-border rounded-lg text-text-muted text-[10px] font-body hover:text-text-secondary transition-colors whitespace-nowrap"
                        >
                          <Clock className="w-3 h-3" />
                          Snooze 7d
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-border text-center">
              <button
                onClick={() => { router.push('/contracts'); setOpen(false) }}
                className="text-accent-cyan text-xs font-body hover:underline"
              >
                View all contracts →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
