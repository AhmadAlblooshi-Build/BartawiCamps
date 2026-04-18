'use client'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatRelative, cn } from '@/lib/utils'
import { CheckCircle, Clock, FileText, Warning, Wrench, CreditCard } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { toast } from 'sonner'
import Link from 'next/link'

type Tab = 'unread' | 'all'

const TYPE_STYLES: Record<string, { icon: any; color: string; bg: string }> = {
  contract_expiring:  { icon: FileText,  color: 'text-ochre',     bg: 'bg-ochre-pale' },
  contract_expired:   { icon: Warning,   color: 'text-rust',      bg: 'bg-rust-pale' },
  payment_overdue:    { icon: Warning,   color: 'text-rust',      bg: 'bg-rust-pale' },
  maintenance_assigned: { icon: Wrench,  color: 'text-amber-600', bg: 'bg-amber-50' },
  payment_received:   { icon: CreditCard,color: 'text-teal',      bg: 'bg-teal-pale' },
  default:            { icon: Warning,   color: 'text-espresso-muted', bg: 'bg-sand-100' },
}

function getDateGroup(dateStr: string): 'today' | 'yesterday' | 'this_week' | 'older' {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return 'this_week'
  return 'older'
}

const DATE_GROUP_LABELS = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  older: 'Older',
}

export function NotificationsPanel() {
  const [tab, setTab] = useState<Tab>('unread')
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications', tab],
    queryFn: () => endpoints.notifications(tab === 'unread'),
  })

  const markAllRead = useMutation({
    mutationFn: () => endpoints.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Group notifications by date
  const grouped = useMemo(() => {
    if (!data?.data) return {}
    const groups: Record<string, any[]> = {
      today: [],
      yesterday: [],
      this_week: [],
      older: [],
    }
    data.data.forEach((n: any) => {
      const group = getDateGroup(n.created_at)
      groups[group].push(n)
    })
    return groups
  }, [data])

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[color:var(--color-border-subtle)]">
        <div>
          <div className="display-xs">Notifications</div>
          <div className="text-[11px] text-espresso-muted mt-0.5">{data?.unread_count ?? 0} unread</div>
        </div>
        <div className="flex p-0.5 rounded-lg bg-sand-100 text-[11px] font-medium">
          {(['unread', 'all'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-2.5 py-1 rounded-md transition-all capitalize',
                tab === t ? 'bg-white text-espresso shadow-raise-1' : 'text-espresso-muted')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!data ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 skeleton-shimmer rounded-lg" />)}
          </div>
        ) : data.data.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-[13px] font-medium text-espresso">All caught up</div>
            <div className="text-[11px] text-espresso-muted mt-1">No unread notifications.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {(['today', 'yesterday', 'this_week', 'older'] as const).map(group => {
              if (!grouped[group] || grouped[group].length === 0) return null
              return (
                <div key={group}>
                  <div className="px-5 py-2 bg-sand-50 sticky top-0 z-10">
                    <div className="eyebrow text-espresso-muted">{DATE_GROUP_LABELS[group]}</div>
                  </div>
                  <div className="divide-y divide-[color:var(--color-border-subtle)]">
                    {grouped[group].map((n: any) => <NotificationItem key={n.id} notif={n} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {(data?.data?.length ?? 0) > 0 && data?.unread_count ? (
        <div className="px-5 py-3 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end">
          <button onClick={() => markAllRead.mutate()}
            className="text-[11px] font-medium text-espresso-muted hover:text-espresso transition-colors">
            Mark all as read
          </button>
        </div>
      ) : null}
    </div>
  )
}

function NotificationItem({ notif }: { notif: any }) {
  const [snoozeDays, setSnoozeDays] = useState(7)
  const [showSnoozePicker, setShowSnoozePicker] = useState(false)
  const qc = useQueryClient()
  const style = TYPE_STYLES[notif.type] || TYPE_STYLES.default

  const markRead = useMutation({
    mutationFn: () => endpoints.markRead(notif.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const snooze = useMutation({
    mutationFn: (days: number) => endpoints.snooze(notif.id, days),
    onSuccess: () => {
      toast.success(`Snoozed for ${snoozeDays} days`)
      setShowSnoozePicker(false)
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const ackAlert = useMutation({
    mutationFn: () => endpoints.ackAlert(notif.resource_id),
    onSuccess: () => {
      toast.success('Alert acknowledged')
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['contracts'] })
    },
  })

  const href = notif.resource_type === 'contract' ? `/contracts?open=${notif.resource_id}`
    : notif.resource_type === 'maintenance_request' ? `/maintenance?open=${notif.resource_id}`
    : notif.resource_type === 'room' ? `/rooms?open=${notif.resource_id}`
    : null

  return (
    <div className={cn('px-5 py-3 transition-colors', !notif.is_read ? 'bg-sand-100' : 'bg-transparent')}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${style.bg}`}>
          <Icon icon={style.icon} size={13} className={style.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[12px] font-medium text-espresso truncate">{notif.title}</div>
            {!notif.is_read && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />}
          </div>
          <div className="text-[11px] text-espresso-muted mt-0.5">{notif.message}</div>
          <div className="text-[10px] text-espresso-subtle mt-1">{formatRelative(notif.created_at)}</div>
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {!notif.is_read && (
              <button onClick={() => markRead.mutate()} className="px-2 py-1 rounded text-[10px] font-medium bg-teal-pale text-teal hover:bg-teal hover:text-white transition-colors flex items-center gap-1">
                <Icon icon={CheckCircle} size={10} /> Mark read
              </button>
            )}
            {showSnoozePicker ? (
              <div className="flex items-center gap-0.5 bg-sand-50 rounded p-0.5">
                {[1, 3, 7, 14, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => {
                      setSnoozeDays(d)
                      snooze.mutate(d)
                    }}
                    disabled={snooze.isPending}
                    className="px-2 py-1 rounded text-[10px] font-medium bg-white text-espresso hover:bg-amber-50 hover:text-amber-600 transition-colors font-mono tabular"
                  >
                    {d}d
                  </button>
                ))}
                <button
                  onClick={() => setShowSnoozePicker(false)}
                  className="px-2 py-1 rounded text-[10px] font-medium text-espresso-subtle hover:text-espresso transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSnoozePicker(true)}
                className="px-2 py-1 rounded text-[10px] font-medium bg-sand-100 text-espresso-muted hover:bg-sand-200 transition-colors flex items-center gap-1"
              >
                <Icon icon={Clock} size={10} /> Snooze
              </button>
            )}
            {href && (
              <Link href={href} className="px-2 py-1 rounded text-[10px] font-medium bg-sand-100 text-espresso hover:bg-sand-200 transition-colors">
                Open
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
