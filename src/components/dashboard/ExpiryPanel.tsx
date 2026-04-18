'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { endpoints } from '@/lib/api'
import { formatDate, daysUntil, cn, formatAED } from '@/lib/utils'
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
    .slice(0, 8)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="bezel p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="eyebrow mb-1.5">Next 90 days</div>
          <h3 className="display-sm">Contract expiries</h3>
        </div>
        <Link href="/contracts" className="group flex items-center gap-1.5 text-[11px] font-medium text-espresso-muted hover:text-espresso transition-colors">
          View all
          <span className="group-hover:translate-x-0.5 transition-transform">
            <Icon icon={ArrowRight} size={11} />
          </span>
        </Link>
      </div>

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 skeleton-shimmer rounded-lg" />)}
        </div>
      ) : urgent.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-espresso-muted">No contracts expiring soon.</div>
      ) : (
        <motion.div
          className="space-y-0.5"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {urgent.map((c: any, i: number) => (
            <motion.div key={c.id} variants={i < 8 ? staggerItem : undefined}>
              <ExpiryRow contract={c} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

function ExpiryRow({ contract }: { contract: any }) {
  const days = contract.days ?? 0
  const isCritical = days >= 0 && days <= 7

  // Color coding based on spec: ≤30=rust, 31-60=ochre, 61-90=sand-200
  const tone = days < 0 ? 'expired' : days <= 30 ? 'critical' : days <= 60 ? 'warning' : 'notice'
  const styles = {
    expired:  { bg: 'bg-rust-pale',   pill: 'bg-rust-pale text-rust' },
    critical: { bg: 'bg-rust-pale',   pill: 'bg-rust-pale text-rust' },
    warning:  { bg: 'bg-ochre-pale',  pill: 'bg-ochre-pale text-ochre' },
    notice:   { bg: 'bg-sand-200',    pill: 'bg-sand-200 text-espresso-muted' },
  }
  const s = styles[tone]

  return (
    <Link
      href={`/contracts?open=${contract.id}`}
      className={cn(
        "flex items-stretch gap-3 p-2.5 rounded-lg hover:bg-sand-100 transition-colors",
        s.bg
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            "text-[13px] font-medium text-espresso truncate",
            isCritical && "font-bold"
          )}>
            {contract.companies?.name}
          </span>
          <span className={cn(
            "font-mono text-[10px] text-espresso-subtle tabular",
            isCritical && "font-bold"
          )}>
            · {contract.rooms?.room_number}
          </span>
        </div>
        <div className="text-[11px] text-espresso-muted">
          {contract.end_date ? formatDate(contract.end_date) : '—'} · {formatAED(contract.monthly_rent)}/mo
        </div>
      </div>
      <div className={cn(
        'px-2 py-1 rounded-md text-[10px] self-center shrink-0 whitespace-nowrap',
        isCritical ? 'font-bold' : 'font-medium',
        s.pill
      )}>
        {days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}
      </div>
    </Link>
  )
}
