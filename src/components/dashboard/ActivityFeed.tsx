'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatRelative, cn } from '@/lib/utils'
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Warning, FileText, Wrench, CreditCard } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/lib/motion'

const TYPE_MAP: Record<string, { icon: any; dotColor: string }> = {
  checkin:     { icon: ArrowDownLeft, dotColor: 'bg-teal' },
  checkout:    { icon: ArrowUpRight,  dotColor: 'bg-rust' },
  payment:     { icon: CreditCard,    dotColor: 'bg-teal' },
  renewal:     { icon: FileText,      dotColor: 'bg-amber' },
  maintenance: { icon: Wrench,        dotColor: 'bg-ochre' },
  resolved:    { icon: CheckCircle,   dotColor: 'bg-teal' },
  alert:       { icon: Warning,       dotColor: 'bg-rust' },
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
        <motion.div
          className="space-y-1 relative pl-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-sand-200" />

          {data.data.slice(0, 10).map((n: any, i: number) => {
            const tk = inferType(n.type)
            const t = TYPE_MAP[tk] || TYPE_MAP.alert
            return (
              <motion.div
                key={n.id}
                variants={i < 8 ? staggerItem : undefined}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-sand-100 transition-colors relative"
              >
                {/* Timeline dot */}
                <div className={cn("absolute left-[-9px] top-[14px] w-3.5 h-3.5 rounded-full border-2 border-sand-50", t.dotColor)} />

                <div className="flex-1 min-w-0 ml-4">
                  <div className="text-[12px] text-espresso leading-snug">{n.title}</div>
                  <div className="text-[10px] text-espresso-subtle mt-0.5">{formatRelative(n.created_at)}</div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
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
