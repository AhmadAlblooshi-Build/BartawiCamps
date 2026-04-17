'use client'
import { useState } from 'react'
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
          <div className="divide-y divide-[color:var(--color-border-subtle)]">
            {data.data.map((n: any) => <NotificationItem key={n.id} notif={n} />)}
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
    <div className={cn('px-5 py-3', !notif.is_read && 'bg-amber-50/30')}>
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
            {href && (
              <Link href={href} className="px-2 py-1 rounded text-[10px] font-medium bg-sand-100 text-espresso hover:bg-sand-200 transition-colors">
                Open
              </Link>
            )}
            {notif.resource_type === 'contract' && (
              <button onClick={() => ackAlert.mutate()} disabled={ackAlert.isPending}
                className="px-2 py-1 rounded text-[10px] font-medium bg-teal-pale text-teal hover:bg-teal hover:text-white transition-colors flex items-center gap-1">
                <Icon icon={CheckCircle} size={10} /> Acknowledge
              </button>
            )}
            <div className="flex items-center gap-0.5">
              <select value={snoozeDays} onChange={e => setSnoozeDays(Number(e.target.value))}
                className="px-1.5 py-1 rounded text-[10px] font-medium bg-sand-100 text-espresso-muted cursor-pointer outline-none border-0 tabular font-mono">
                {[1, 3, 7, 14, 30].map(d => <option key={d} value={d}>{d}d</option>)}
              </select>
              <button onClick={() => snooze.mutate(snoozeDays)} disabled={snooze.isPending}
                className="px-2 py-1 rounded text-[10px] font-medium bg-sand-100 text-espresso-muted hover:bg-sand-200 transition-colors flex items-center gap-1">
                <Icon icon={Clock} size={10} /> Snooze
              </button>
            </div>
            {!notif.is_read && (
              <button onClick={() => markRead.mutate()} className="px-2 py-1 rounded text-[10px] font-medium text-espresso-subtle hover:text-espresso transition-colors">
                Mark read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
