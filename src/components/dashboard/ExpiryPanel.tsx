'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { endpoints } from '@/lib/api'
import { formatDate, daysUntil, cn } from '@/lib/utils'
import { ArrowRight } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'
import { staggerContainer, staggerItem } from '@/lib/motion'

export function ExpiryPanel() {
  const { data } = useQuery({
    queryKey: ['contracts-expiring'],
    queryFn: () => endpoints.contracts({ status: 'active', limit: 30 }),
  })

  const urgent = (data?.data ?? [])
    .map((c: any) => ({ ...c, days: daysUntil(c.end_date) }))
    .filter((c: any) => c.days !== null && c.days <= 90)
    .sort((a: any, b: any) => (a.days ?? Infinity) - (b.days ?? Infinity))
    .slice(0, 12)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="bezel p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h3 className="display-sm">Expiring Contracts</h3>
          <span className="px-2.5 py-0.5 bg-amber/10 text-amber text-[11px] font-semibold rounded-full">
            {urgent.length}
          </span>
        </div>
      </div>

      {!data ? (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="min-w-[200px] h-32 skeleton-shimmer rounded-lg" />
          ))}
        </div>
      ) : urgent.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-espresso-muted">No contracts expiring soon.</div>
      ) : (
        <div className="relative">
          {/* Shadow fade indicators on edges when scrollable */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-sand-50 to-transparent pointer-events-none z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-sand-50 to-transparent pointer-events-none z-10" />

          <motion.div
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {urgent.map((c: any, i: number) => (
              <motion.div
                key={c.id}
                variants={staggerItem}
                className="min-w-[200px]"
              >
                <ExpiryCard contract={c} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}

function ExpiryCard({ contract }: { contract: any }) {
  const days = contract.days ?? 0

  // Color strip based on spec: ≤30=rust, 31-60=ochre, 61-90=amber
  const getStripColor = () => {
    if (days <= 30) return 'bg-rust'
    if (days <= 60) return 'bg-ochre'
    return 'bg-amber'
  }

  const getTextColor = () => {
    if (days <= 30) return 'text-rust'
    if (days <= 60) return 'text-ochre'
    return 'text-amber'
  }

  return (
    <Link
      href={`/contracts?open=${contract.id}`}
      className="block elevation-1 elevation-hover bg-sand-50 rounded-lg overflow-hidden"
    >
      {/* Color strip at top */}
      <div className={cn("h-1", getStripColor())} />

      <div className="p-4">
        {/* Company name */}
        <div className="text-[14px] font-bold text-espresso mb-1 truncate">
          {contract.companies?.name}
        </div>

        {/* Room number */}
        <div className="overline mb-3">
          Room {contract.rooms?.room_number}
        </div>

        {/* Days remaining */}
        <div className={cn("data-md", getTextColor())}>
          {days < 0 ? `${Math.abs(days)} days ago` : `${days} days`}
        </div>
      </div>
    </Link>
  )
}
