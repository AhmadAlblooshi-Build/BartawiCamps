'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { endpoints } from '@/lib/api'
import { formatRelative, cn } from '@/lib/utils'
import { ArrowDownLeft, ArrowUpRight, CheckCircle, Warning, FileText, Wrench, CreditCard, Gear, ArrowRight } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/lib/motion'

const TYPE_MAP: Record<string, { icon: any; dotColor: string; ringColor: string }> = {
  checkin:     { icon: ArrowDownLeft, dotColor: 'bg-teal',       ringColor: 'ring-teal/20' },
  checkout:    { icon: ArrowUpRight,  dotColor: 'bg-rust',       ringColor: 'ring-rust/20' },
  payment:     { icon: CreditCard,    dotColor: 'bg-teal',       ringColor: 'ring-teal/20' },
  renewal:     { icon: FileText,      dotColor: 'bg-amber',      ringColor: 'ring-amber/20' },
  legal:       { icon: FileText,      dotColor: 'bg-plum',       ringColor: 'ring-plum/20' },
  maintenance: { icon: Wrench,        dotColor: 'bg-ochre',      ringColor: 'ring-ochre/20' },
  resolved:    { icon: CheckCircle,   dotColor: 'bg-teal',       ringColor: 'ring-teal/20' },
  alert:       { icon: Warning,       dotColor: 'bg-rust',       ringColor: 'ring-rust/20' },
  system:      { icon: Gear,          dotColor: 'bg-sand-300',   ringColor: 'ring-sand-300/20' },
}

export function ActivityFeed() {
  const { data } = useQuery({ queryKey: ['activity-feed'], queryFn: () => endpoints.notifications() })

  const activities = data?.data?.slice(0, 6) ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bezel p-6"
    >
      <h3 className="display-sm mb-5">Recent Activity</h3>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 skeleton-shimmer rounded-lg" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-espresso-muted">No recent activity.</div>
      ) : (
        <>
          <motion.div
            className="space-y-0 relative"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={{
              '--stagger-delay': '40ms'
            } as any}
          >
            {/* Timeline line */}
            <div className="absolute left-[3px] top-3 bottom-3 w-px bg-sand-300" />

            {activities.map((n: any, i: number) => {
              const tk = inferType(n.type)
              const t = TYPE_MAP[tk] || TYPE_MAP.alert
              return (
                <motion.div
                  key={n.id}
                  variants={staggerItem}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-4 py-2.5 relative"
                >
                  {/* Timeline dot with ring */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        t.dotColor
                      )}
                    />
                    <div
                      className={cn(
                        "absolute inset-0 -m-1 rounded-full ring-2",
                        t.ringColor
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                    {/* Event text */}
                    <div className="text-[14px] text-espresso leading-snug">
                      {n.title}
                    </div>

                    {/* Relative time (right-aligned) */}
                    <div className="overline text-right shrink-0">
                      {formatRelative(n.created_at)}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          {/* View all link */}
          {data.data.length > 6 && (
            <div className="mt-4 pt-4 border-t border-sand-200">
              <Link
                href="/activity"
                className="group inline-flex items-center gap-1.5 text-[12px] font-medium text-amber hover:text-amber/80 transition-colors"
              >
                View all
                <span className="group-hover:translate-x-0.5 transition-transform">
                  <Icon icon={ArrowRight} size={12} />
                </span>
              </Link>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}

function inferType(type: string): string {
  if (type?.includes('expir') || type?.includes('contract')) return 'renewal'
  if (type?.includes('payment') || type?.includes('paid')) return 'payment'
  if (type?.includes('maintenance') || type?.includes('repair')) return 'maintenance'
  if (type?.includes('resolved') || type?.includes('completed')) return 'resolved'
  if (type?.includes('legal') || type?.includes('notice')) return 'legal'
  if (type?.includes('system') || type?.includes('config')) return 'system'
  if (type?.includes('alert') || type?.includes('warning')) return 'alert'
  return 'system'
}
