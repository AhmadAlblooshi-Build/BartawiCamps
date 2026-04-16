'use client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '@/lib/api'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts'
import { formatAED, formatPct, getCurrentMonthYear, MONTHS, cn } from '@/lib/utils'
import { motion } from 'motion/react'

type Mode = 'rate' | 'amount'

export function CollectionTrend() {
  const [mode, setMode] = useState<Mode>('rate')
  const { month, year } = getCurrentMonthYear()

  const { data: trend } = useQuery({
    queryKey: ['trend-12mo', month, year],
    queryFn: async () => {
      const months: any[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1)
        months.push({ month: d.getMonth() + 1, year: d.getFullYear() })
      }
      const camps = await endpoints.camps()
      return Promise.all(months.map(async m => {
        const results = await Promise.all(camps.data.map((c: any) =>
          endpoints.reportSummary(c.id, m.month, m.year).catch(() => null)
        ))
        const rent = results.reduce((s: any, r: any) => s + (r?.financials?.total_rent || 0), 0)
        const paid = results.reduce((s: any, r: any) => s + (r?.financials?.total_paid || 0), 0)
        return {
          label: MONTHS[m.month - 1].slice(0, 3),
          fullLabel: `${MONTHS[m.month - 1]} ${m.year}`,
          rate: rent ? (paid / rent) * 100 : 0,
          rent, paid, balance: rent - paid,
        }
      }))
    },
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bezel p-6"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="eyebrow mb-1.5">Last 12 months</div>
          <h3 className="display-sm">{mode === 'rate' ? 'Collection rate' : 'Rent billed vs collected'}</h3>
        </div>
        <div className="flex p-0.5 rounded-lg bg-sand-100 text-[11px] font-body font-medium">
          {(['rate', 'amount'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn('px-3 py-1.5 rounded-md transition-all',
                mode === m ? 'bg-white text-espresso shadow-raise-1' : 'text-espresso-muted hover:text-espresso')}
            >
              {m === 'rate' ? 'Rate %' : 'Amount'}
            </button>
          ))}
        </div>
      </div>

      {trend ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {mode === 'rate' ? (
              <LineChart data={trend} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
                <CartesianGrid vertical={false} stroke="#E8DFD1" strokeDasharray="2 3" />
                <XAxis dataKey="label" stroke="#6A6159" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6A6159" fontSize={11} tickLine={false} axisLine={false} domain={[50, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<TrendTooltip mode="rate" />} />
                <ReferenceLine y={95} stroke="#1E4D52" strokeDasharray="3 3" strokeOpacity={0.4} />
                <Line type="monotone" dataKey="rate" stroke="#B8883D" strokeWidth={2.5}
                  dot={{ r: 3, fill: '#B8883D', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#B8883D', stroke: 'white', strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              <LineChart data={trend} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
                <CartesianGrid vertical={false} stroke="#E8DFD1" strokeDasharray="2 3" />
                <XAxis dataKey="label" stroke="#6A6159" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6A6159" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<TrendTooltip mode="amount" />} />
                <Line type="monotone" dataKey="rent" stroke="#1A1816" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="paid" stroke="#1E4D52" strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 skeleton-shimmer rounded-lg" />
      )}
    </motion.div>
  )
}

function TrendTooltip({ active, payload, mode }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-white rounded-lg shadow-raise-3 p-3 border border-[color:var(--color-border-subtle)] min-w-[180px]">
      <div className="text-[11px] font-medium text-espresso-muted mb-1.5">{p.fullLabel}</div>
      {mode === 'rate' ? (
        <>
          <div className="font-mono text-espresso tabular text-[15px] font-semibold">{formatPct(p.rate)}</div>
          <div className="text-[11px] text-espresso-subtle mt-1">{formatAED(p.paid)} of {formatAED(p.rent)}</div>
        </>
      ) : (
        <div className="space-y-1">
          <Row label="Billed"    value={formatAED(p.rent)}    dot="bg-espresso" />
          <Row label="Collected" value={formatAED(p.paid)}    dot="bg-teal" />
          <Row label="Balance"   value={formatAED(p.balance)} dot="bg-rust" />
        </div>
      )}
    </div>
  )
}

function Row({ label, value, dot }: any) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-[11px] text-espresso-muted flex-1">{label}</span>
      <span className="font-mono text-[11px] tabular text-espresso">{value}</span>
    </div>
  )
}
