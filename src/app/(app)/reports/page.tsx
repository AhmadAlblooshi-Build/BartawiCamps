'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { Icon } from '@/components/ui/Icon'
import { FileArrowDown, Table, Warning, ChartLine, House } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { cn, formatAED, formatPct, getCurrentMonthYear } from '@/lib/utils'
import { generateRentRoll } from '@/lib/pdf/rentRoll'
import { generateOutstanding } from '@/lib/pdf/outstanding'
import { generateMonthlySummary } from '@/lib/pdf/summary'
import { generateOccupancyReport } from '@/lib/pdf/occupancy'
import { toast } from 'sonner'

type ReportKind = 'rent_roll' | 'outstanding' | 'summary' | 'occupancy'

const REPORTS: { id: ReportKind; title: string; description: string; icon: any; tone: string }[] = [
  { id: 'rent_roll',   title: 'Rent roll',          description: 'Every occupied room with tenant, company, and rent.', icon: Table,      tone: 'bg-espresso text-sand-50' },
  { id: 'outstanding', title: 'Outstanding balances', description: 'Unpaid records grouped by entity, sorted by amount.', icon: Warning,  tone: 'bg-rust text-white' },
  { id: 'summary',     title: 'Monthly summary',    description: 'Camp KPIs, collection rate, and month vs baseline.',  icon: ChartLine,  tone: 'bg-teal text-white' },
  { id: 'occupancy',   title: 'Occupancy report',   description: 'By block, category, size — with % breakdowns.',       icon: House,      tone: 'bg-amber-500 text-white' },
]

export default function ReportsPage() {
  const { month: cm, year: cy } = getCurrentMonthYear()
  const [month, setMonth] = useState(cm)
  const [year, setYear] = useState(cy)
  const [campId, setCampId] = useState<'all' | string>('all')
  const [generating, setGenerating] = useState<ReportKind | null>(null)

  const { data: camps } = useQuery({ queryKey: ['camps'], queryFn: () => endpoints.camps() })

  const generate = async (kind: ReportKind) => {
    setGenerating(kind)
    try {
      const campIds = campId === 'all' ? camps?.data.map((c: any) => c.id) : [campId]
      if (kind === 'rent_roll') {
        const rows = await endpoints.reportRentRoll({ camp_ids: campIds, month, year })
        generateRentRoll({ month, year, rows: rows.records || [], totals: rows.totals })
      } else if (kind === 'outstanding') {
        const rows = await endpoints.reportOutstanding({ camp_ids: campIds, month, year })
        generateOutstanding({ month, year, records: rows.records || [], totals: rows.totals })
      } else if (kind === 'summary') {
        const data = await endpoints.reportSummaryMulti({ camp_ids: campIds, month, year })
        generateMonthlySummary({ month, year, camps: data.camps || [] })
      } else if (kind === 'occupancy') {
        const data = await endpoints.reportOccupancyMulti({ camp_ids: campIds })
        generateOccupancyReport({ camps: data.camps || [] })
      }
    } catch (err: any) {
      toast.error('Failed to generate', { description: err.message })
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="animate-rise">
        <div className="eyebrow mb-2">Exports</div>
        <h1 className="display-lg">Reports</h1>
        <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
          Generate PDF reports on demand. Filters below apply to all reports.
        </p>
      </div>

      <div className="bezel p-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="eyebrow">Camp</span>
          <select value={campId} onChange={e => setCampId(e.target.value)}
            className="h-9 px-3 rounded-lg bg-sand-100 text-[12px] font-medium text-espresso border-0 outline-none hover:bg-sand-200 cursor-pointer">
            <option value="all">All camps</option>
            {camps?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="eyebrow">Period</span>
          <MonthSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map((r, i) => (
          <motion.button
            key={r.id}
            onClick={() => generate(r.id)}
            disabled={generating !== null}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'bezel p-6 text-left group transition-all',
              generating === r.id ? 'ring-2 ring-amber-500' : 'hover:shadow-raise-2 active:scale-[0.99]',
              generating !== null && generating !== r.id && 'opacity-50'
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className={cn('w-10 h-10 rounded-xl grid place-items-center shrink-0', r.tone)}>
                <Icon icon={r.icon} size={16} emphasis />
              </div>
              {generating === r.id ? (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
                  <div className="live-pulse w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Generating…
                </div>
              ) : (
                <Icon icon={FileArrowDown} size={14} className="text-espresso-muted group-hover:text-espresso" />
              )}
            </div>
            <h3 className="display-sm mb-1.5">{r.title}</h3>
            <p className="text-[12px] text-espresso-muted leading-relaxed">{r.description}</p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
