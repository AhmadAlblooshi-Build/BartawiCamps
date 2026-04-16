'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatRelative } from '@/lib/utils'
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Warning, FileText, Wrench, CreditCard } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'

const TYPE_MAP: Record<string, { icon: any; color: string; bg: string }> = {
  checkin:     { icon: ArrowDownLeft, color: 'text-teal',      bg: 'bg-teal-pale' },
  checkout:    { icon: ArrowUpRight,  color: 'text-rust',      bg: 'bg-rust-pale' },
  payment:     { icon: CreditCard,    color: 'text-teal',      bg: 'bg-teal-pale' },
  renewal:     { icon: FileText,      color: 'text-amber-600', bg: 'bg-amber-50' },
  maintenance: { icon: Wrench,        color: 'text-ochre',     bg: 'bg-ochre-pale' },
  resolved:    { icon: CheckCircle,   color: 'text-teal',      bg: 'bg-teal-pale' },
  alert:       { icon: Warning,       color: 'text-rust',      bg: 'bg-rust-pale' },
}

export function ActivityFeed() {
  const { data } = useQuery({ queryKey: ['activity-feed'], queryFn: () => endpoints.notifications() })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bezel p-6"
    >
      <div className="eyebrow mb-1.5">Recent</div>
      <h3 className="display-sm mb-5">Activity</h3>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 skeleton-shimmer rounded-lg" />)}
        </div>
      ) : data.data.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-espresso-muted">No recent activity.</div>
      ) : (
        <div className="space-y-1">
          {data.data.slice(0, 10).map((n: any) => {
            const tk = inferType(n.type)
            const t = TYPE_MAP[tk] || TYPE_MAP.alert
            return (
              <div key={n.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-sand-100 transition-colors">
                <div className={`w-7 h-7 rounded-lg grid place-items-center shrink-0 ${t.bg}`}>
                  <Icon icon={t.icon} size={12} className={t.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-espresso leading-snug">{n.title}</div>
                  <div className="text-[10px] text-espresso-subtle mt-0.5">{formatRelative(n.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function inferType(type: string): string {
  if (type?.includes('expir')) return 'renewal'
  if (type?.includes('payment')) return 'payment'
  if (type?.includes('maintenance')) return 'maintenance'
  if (type?.includes('resolved')) return 'resolved'
  return 'alert'
}
