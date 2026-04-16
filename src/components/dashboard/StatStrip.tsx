'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAEDShort, formatPct, cn } from '@/lib/utils'
import { Users, CurrencyDollar, Warning, House } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'

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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      <StatCard eyebrow="Occupancy"       value={formatPct(t.occupancy_rate)}     sub={`${t.occupied}/${t.leasable} leasable`}                icon={House}           delay={0}    tone="neutral" />
      <StatCard eyebrow="Collection rate" value={formatPct(t.collection_rate)}    sub={`${formatAEDShort(t.total_paid)} of ${formatAEDShort(t.total_rent)}`} icon={CurrencyDollar} delay={0.08} tone={t.collection_rate >= 95 ? 'teal' : t.collection_rate >= 85 ? 'ochre' : 'rust'} />
      <StatCard eyebrow="Outstanding"     value={formatAEDShort(t.total_balance)} sub={t.total_balance > 0 ? 'needs collection' : 'nothing owed'} icon={Warning}         delay={0.16} tone={t.total_balance > 0 ? 'rust' : 'neutral'} />
      <StatCard eyebrow="Active tenants"  value={String(t.people_count)}          sub="across both camps"                                      icon={Users}           delay={0.24} tone="neutral" />
    </div>
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

function StatCard({ eyebrow, value, sub, icon, delay, tone }: {
  eyebrow: string; value: string; sub: string; icon: any; delay: number
  tone: 'neutral' | 'teal' | 'rust' | 'ochre'
}) {
  const toneColors = { neutral: 'text-espresso', teal: 'text-teal', rust: 'text-rust', ochre: 'text-ochre' }
  const iconTones  = { neutral: 'bg-sand-100 text-espresso-muted', teal: 'bg-teal-pale text-teal', rust: 'bg-rust-pale text-rust', ochre: 'bg-ochre-pale text-ochre' }
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0)' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
      className="bezel p-5 relative overflow-hidden"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="eyebrow">{eyebrow}</div>
        <div className={cn('w-8 h-8 rounded-lg grid place-items-center', iconTones[tone])}>
          <Icon icon={icon} size={15} />
        </div>
      </div>
      <div className={cn('display-md tabular font-mono mb-1', toneColors[tone])}>{value}</div>
      <div className="text-[12px] text-espresso-muted tabular">{sub}</div>
    </motion.div>
  )
}
