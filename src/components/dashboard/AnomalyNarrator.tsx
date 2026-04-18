'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { Sparkle, TrendDown, TrendUp } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'
import { cn, formatPct } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface Props { month: number; year: number }

function useTypewriter(text: string | null, speed = 30) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!text) { setDisplayed(''); setDone(true); return }
    setDisplayed('')
    setDone(false)
    let i = 0
    const words = text.split(' ')
    const interval = setInterval(() => {
      i++
      setDisplayed(words.slice(0, i).join(' '))
      if (i >= words.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return { displayed, done }
}

export function AnomalyNarrator({ month, year }: Props) {
  const { data: trend } = useQuery({
    queryKey: ['trend-narrator', month, year],
    queryFn: async () => {
      const months = []
      for (let i = 5; i >= 0; i--) {
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
        return { month: m.month, year: m.year, rate: rent ? (paid / rent) * 100 : 0, rent, paid }
      }))
    },
  })

  const currentRate = trend?.[trend.length - 1]?.rate ?? null
  const baseline = trend && trend.length > 1
    ? trend.slice(0, -1).reduce((s, t) => s + t.rate, 0) / (trend.length - 1)
    : null
  const delta = currentRate !== null && baseline !== null ? currentRate - baseline : null

  const { data: narration } = useQuery({
    queryKey: ['narration', month, year, currentRate],
    queryFn: () => endpoints.aiNarrateAnomaly({
      metric: 'Collection rate',
      current_value: currentRate,
      baseline,
      period_label: `${month}/${year}`,
      series: trend,
    }).catch(() => null),
    enabled: Boolean(trend && trend.length >= 2),
  })

  const significant = delta !== null && Math.abs(delta) >= 5
  const positive = delta !== null && delta > 0

  // Typewriter effect for narration text
  const narrationText = narration?.narration || null
  const { displayed, done } = useTypewriter(narrationText, 30)

  if (!trend) return <NarratorSkeleton />

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={cn('bezel-deep relative overflow-hidden border-l-[3px] border-l-amber', significant && !positive && 'ring-1 ring-rust/20')}
    >
      <div className="bezel-inner p-6 relative">
        <div className={cn(
          'absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-40 -translate-y-16 translate-x-16 pointer-events-none',
          significant ? (positive ? 'bg-teal-pale' : 'bg-rust-pale') : 'bg-amber-50'
        )} />

        <div className="relative flex items-start gap-4">
          <div className={cn(
            'w-10 h-10 rounded-xl grid place-items-center shrink-0',
            significant ? (positive ? 'bg-teal text-white' : 'bg-rust text-white') : 'bg-espresso text-sand-50'
          )}>
            <Icon icon={significant ? (positive ? TrendUp : TrendDown) : Sparkle} size={18} emphasis />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="eyebrow">AI insight</div>
              <div className="live-pulse w-1.5 h-1.5 rounded-full bg-amber-500" />
            </div>

            {narrationText ? (
              <p className="font-display text-[22px] leading-[1.35] tracking-tight text-espresso">
                {displayed}
                {!done && <span className="inline-block w-0.5 h-4 bg-amber animate-pulse ml-0.5" />}
              </p>
            ) : delta !== null ? (
              <p className="font-display text-[22px] leading-[1.35] tracking-tight text-espresso">
                {currentRate !== null && (
                  <>
                    Collection rate is{' '}
                    <span className={cn('tabular font-mono', significant ? (positive ? 'text-teal' : 'text-rust') : 'text-amber-600')}>
                      {formatPct(currentRate)}
                    </span>{' '}this month
                    {significant && (
                      <>, {positive ? 'up' : 'down'}{' '}
                        <span className="tabular font-mono">{Math.abs(delta).toFixed(1)}pp</span>{' '}
                        from the 5-month baseline of{' '}
                        <span className="tabular font-mono">{formatPct(baseline!)}</span>.
                      </>
                    )}
                    {!significant && '. In line with the historical baseline.'}
                  </>
                )}
              </p>
            ) : (
              <p className="font-display text-[22px] leading-[1.35] text-espresso-muted">Gathering signal&hellip;</p>
            )}

            {trend && trend.length > 0 && (
              <div className="mt-5 pt-5 border-t border-[color:var(--color-border-subtle)]">
                <div className="flex items-end gap-1 h-12">
                  {trend.map((t, i) => {
                    const h = Math.max(4, (t.rate / 100) * 48)
                    const isCurrent = i === trend.length - 1
                    return (
                      <div key={`${t.year}-${t.month}`} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={cn('w-full rounded-sm transition-all',
                            isCurrent ? (significant ? (positive ? 'bg-teal' : 'bg-rust') : 'bg-amber-500') : 'bg-sand-200')}
                          style={{ height: `${h}px` }}
                          title={`${t.month}/${t.year}: ${formatPct(t.rate)}`}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-mono text-espresso-subtle tabular">
                  {trend.map(t => <span key={`l-${t.year}-${t.month}`}>{String(t.month).padStart(2, '0')}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function NarratorSkeleton() {
  return (
    <div className="bezel-deep">
      <div className="bezel-inner p-6 space-y-4">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-24 skeleton-shimmer rounded" />
            <div className="h-5 w-full skeleton-shimmer rounded" />
            <div className="h-5 w-4/5 skeleton-shimmer rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
