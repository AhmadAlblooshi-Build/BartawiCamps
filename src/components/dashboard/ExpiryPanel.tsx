'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { endpoints } from '@/lib/api'
import { formatDate, daysUntil, cn, formatAED } from '@/lib/utils'
import { ArrowRight } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'

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
        <div className="space-y-0.5">
          {urgent.map((c: any) => <ExpiryRow key={c.id} contract={c} />)}
        </div>
      )}
    </motion.div>
  )
}

function ExpiryRow({ contract }: { contract: any }) {
  const days = contract.days ?? 0
  const tone = days < 0 ? 'expired' : days <= 30 ? 'critical' : days <= 60 ? 'warning' : 'notice'
  const styles = {
    expired:  { bar: 'bg-rust',      pill: 'bg-rust-pale text-rust' },
    critical: { bar: 'bg-rust/70',   pill: 'bg-rust-pale text-rust' },
    warning:  { bar: 'bg-ochre',     pill: 'bg-ochre-pale text-ochre' },
    notice:   { bar: 'bg-sand-400',  pill: 'bg-sand-100 text-espresso-muted' },
  }
  const s = styles[tone]
  return (
    <Link href={`/contracts?open=${contract.id}`} className="flex items-stretch gap-3 p-2.5 rounded-lg hover:bg-sand-100 transition-colors">
      <div className={cn('w-0.5 rounded-full shrink-0', s.bar)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[13px] font-medium text-espresso truncate">{contract.companies?.name}</span>
          <span className="font-mono text-[10px] text-espresso-subtle tabular">· {contract.rooms?.room_number}</span>
        </div>
        <div className="text-[11px] text-espresso-muted">
          {contract.end_date ? formatDate(contract.end_date) : '—'} · {formatAED(contract.monthly_rent)}/mo
        </div>
      </div>
      <div className={cn('px-2 py-1 rounded-md text-[10px] font-medium self-center shrink-0 whitespace-nowrap', s.pill)}>
        {days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}
      </div>
    </Link>
  )
}
