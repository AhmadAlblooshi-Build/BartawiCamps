'use client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '@/lib/api'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, Area, AreaChart } from 'recharts'
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
              <AreaChart data={trend} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(184,136,61,0.12)" stopOpacity={1}/>
                    <stop offset="100%" stopColor="rgba(184,136,61,0)" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#E8DFD3" strokeOpacity={0.5} strokeDasharray="2 4" />
                <XAxis dataKey="label" stroke="#6A6159" fontSize={11} fontFamily="JetBrains Mono, monospace" tickLine={false} axisLine={false} />
                <YAxis stroke="#6A6159" fontSize={11} fontFamily="JetBrains Mono, monospace" tickLine={false} axisLine={false} domain={[50, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<TrendTooltip mode="rate" />} cursor={false} />
                <ReferenceLine y={85} stroke="rgba(168,74,59,0.05)" strokeWidth={60} />
                <Area type="monotone" dataKey="rate" stroke="#B8883D" strokeWidth={2.5} fill="url(#amberGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#B8883D', strokeWidth: 0, className: 'glow-amber' }}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            ) : (
              <LineChart data={trend} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
                <CartesianGrid vertical={false} stroke="#E8DFD3" strokeOpacity={0.5} strokeDasharray="2 4" />
                <XAxis dataKey="label" stroke="#6A6159" fontSize={11} fontFamily="JetBrains Mono, monospace" tickLine={false} axisLine={false} />
                <YAxis stroke="#6A6159" fontSize={11} fontFamily="JetBrains Mono, monospace" tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<TrendTooltip mode="amount" />} cursor={false} />
                <Line type="monotone" dataKey="rent" stroke="#B8883D" strokeWidth={2.5} dot={false}
                  activeDot={{ r: 5, fill: '#B8883D', strokeWidth: 0, className: 'glow-amber' }}
                  isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                <Line type="monotone" dataKey="paid" stroke="#B8883D" strokeWidth={2.5} dot={false}
                  activeDot={{ r: 5, fill: '#B8883D', strokeWidth: 0, className: 'glow-amber' }}
                  isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
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
    <div className="elevation-float bg-sand-50 rounded-lg px-3 py-2">
      <div className="eyebrow mb-1">{p.fullLabel}</div>
      {mode === 'rate' ? (
        <div className="data-md">{formatPct(p.rate)}</div>
      ) : (
        <div className="data-md">{formatAED(p.paid)}</div>
      )}
    </div>
  )
}

