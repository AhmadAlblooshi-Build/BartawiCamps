'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAEDShort, formatPct, cn } from '@/lib/utils'
import { Users, CurrencyDollar, Warning, House, TrendUp, TrendDown } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'
import { useCountUp, staggerItem, cardHover } from '@/lib/motion'

interface Props { month: number; year: number }

export function StatStrip({ month, year }: Props) {
  const { data: camps } = useQuery({ queryKey: ['camps'], queryFn: () => endpoints.camps() })

  const { data: summaries } = useQuery({
    queryKey: ['all-summaries', month, year],
    queryFn: async () => {
      if (!camps?.data) return []
      return Promise.all(camps.data.map((c: any) => endpoints.reportSummary(c.id, month, year)))
    },
    enabled: Boolean(camps?.data?.length),
  })

  const t = aggregate(summaries)

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } } }}
    >
      <StatCard eyebrow="TOTAL ROOMS"     numericValue={t.leasable} value={String(t.leasable)} sub={`${t.occupied} occupied`} icon={House} tone="neutral" trend={null} isPrimary />
      <StatCard eyebrow="OCCUPANCY"       numericValue={t.occupancy_rate} isPercent value={formatPct(t.occupancy_rate)} sub={`${t.occupied}/${t.leasable} leasable`} icon={House} tone="neutral" trend={null} />
      <StatCard eyebrow="COLLECTION"      numericValue={t.total_paid} value={formatAEDShort(t.total_paid)} sub={`${formatPct(t.collection_rate)} collected`} icon={CurrencyDollar} tone={t.collection_rate >= 95 ? 'teal' : t.collection_rate >= 85 ? 'ochre' : 'rust'} trend={null} />
      <StatCard eyebrow="OUTSTANDING"     numericValue={t.total_balance} value={formatAEDShort(t.total_balance)} sub={t.total_balance > 0 ? 'needs collection' : 'nothing owed'} icon={Warning} tone={t.total_balance > 0 ? 'rust' : 'neutral'} trend={null} />
    </motion.div>
  )
}

function aggregate(summaries: any[] | undefined) {
  const z = { occupancy_rate: 0, occupied: 0, leasable: 0, collection_rate: 0, total_rent: 0, total_paid: 0, total_balance: 0, people_count: 0 }
  if (!summaries) return z
  const occupied = summaries.reduce((s, r) => s + (r?.occupancy?.occupied || 0), 0)
  const leasable = summaries.reduce((s, r) => s + (r?.occupancy?.leasable_rooms || 0), 0)
  const rent     = summaries.reduce((s, r) => s + (r?.financials?.total_rent || 0), 0)
  const paid     = summaries.reduce((s, r) => s + (r?.financials?.total_paid || 0), 0)
  const balance  = summaries.reduce((s, r) => s + (r?.financials?.total_balance || 0), 0)
  const people   = summaries.reduce((s, r) => s + (r?.people?.total || 0), 0)
  return {
    occupancy_rate: leasable ? (occupied / leasable) * 100 : 0,
    occupied, leasable,
    collection_rate: rent ? (paid / rent) * 100 : 0,
    total_rent: rent, total_paid: paid, total_balance: balance, people_count: people,
  }
}

function StatCard({ eyebrow, numericValue, isPercent, value, sub, icon, tone, trend, isPrimary }: {
  eyebrow: string; numericValue?: number; isPercent?: boolean; value: string; sub: string; icon: any
  tone: 'neutral' | 'teal' | 'rust' | 'ochre'
  trend: { value: number; direction: 'up' | 'down' } | null
  isPrimary?: boolean
}) {
  const animatedValue = useCountUp(numericValue ?? 0, 800)
  const displayValue = numericValue !== undefined
    ? isPercent
      ? `${animatedValue.toFixed(1)}%`
      : numericValue >= 1000
        ? formatAEDShort(animatedValue)
        : String(Math.round(animatedValue))
    : value

  const toneColors = { neutral: 'text-espresso', teal: 'text-teal', rust: 'text-rust', ochre: 'text-ochre' }
  const iconTones  = { neutral: 'bg-sand-100 text-espresso-muted', teal: 'bg-teal-pale text-teal', rust: 'bg-rust-pale text-rust', ochre: 'bg-ochre-pale text-ochre' }

  return (
    <motion.div
      variants={staggerItem}
      whileHover="hover"
      whileTap="tap"
      initial="rest"
      className={cn(
        "bezel elevation-hover p-6 relative overflow-hidden cursor-default",
        isPrimary && "border-l-2 border-l-amber"
      )}
      style={{ boxShadow: cardHover.rest.boxShadow }}
    >
      <div className="eyebrow mb-3">{eyebrow}</div>
      <div className="data-xl mb-2">{displayValue}</div>
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-espresso-muted">{sub}</div>
        {trend && (
          <div className={cn('text-[12px] font-medium flex items-center gap-0.5', trend.direction === 'up' ? 'text-teal' : 'text-rust')}>
            <Icon icon={trend.direction === 'up' ? TrendUp : TrendDown} size={10} />
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
      </div>
    </motion.div>
  )
}
