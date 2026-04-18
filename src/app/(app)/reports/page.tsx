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
import { fadeIn, cardHover } from '@/lib/motion'

type ReportKind = 'rent_roll' | 'outstanding' | 'summary' | 'occupancy'

const REPORTS: { id: ReportKind; title: string; description: string; icon: any; tone: string }[] = [
  { id: 'rent_roll',   title: 'Rent roll',          description: 'Every occupied room with tenant, company, and rent.', icon: Table,      tone: 'bg-espresso text-sand-50' },
  { id: 'outstanding', title: 'Outstanding balances', description: 'Unpaid records grouped by entity, sorted by amount.', icon: Warning,  tone: 'bg-rust text-white' },
  { id: 'summary',     title: 'Monthly summary',    description: 'Camp KPIs, collection rate, and month vs baseline.',  icon: ChartLine,  tone: 'bg-teal text-white' },
  { id: 'occupancy',   title: 'Occupancy report',   description: 'By block, category, size — with % breakdowns.',       icon: House,      tone: 'bg-amber text-white' },
]

export default function ReportsPage() {
  const { month: cm, year: cy } = getCurrentMonthYear()
  const [month, setMonth] = useState(cm)
  const [year, setYear] = useState(cy)
  const [campIds, setCampIds] = useState<string[]>([])
  const [generating, setGenerating] = useState<ReportKind | null>(null)
  const [selectedReport, setSelectedReport] = useState<ReportKind | null>(null)

  const { data: camps } = useQuery({ queryKey: ['camps'], queryFn: () => endpoints.camps() })

  const toggleCamp = (campId: string) => {
    setCampIds(prev =>
      prev.includes(campId)
        ? prev.filter(id => id !== campId)
        : [...prev, campId]
    )
  }

  const isAllCampsSelected = campIds.length === 0 || (camps?.data && campIds.length === camps.data.length)

  const generate = async (kind: ReportKind) => {
    setGenerating(kind)
    try {
      const selectedCampIds = campIds.length === 0 ? camps?.data.map((c: any) => c.id) : campIds
      if (kind === 'rent_roll') {
        const rows = await endpoints.reportRentRoll({ camp_ids: selectedCampIds, month, year })
        generateRentRoll({ month, year, rows: rows.records || [], totals: rows.totals })
      } else if (kind === 'outstanding') {
        const rows = await endpoints.reportOutstanding({ camp_ids: selectedCampIds, month, year })
        generateOutstanding({ month, year, records: rows.records || [], totals: rows.totals })
      } else if (kind === 'summary') {
        const data = await endpoints.reportSummaryMulti({ camp_ids: selectedCampIds, month, year })
        generateMonthlySummary({ month, year, camps: data.camps || [] })
      } else if (kind === 'occupancy') {
        const data = await endpoints.reportOccupancyMulti({ camp_ids: selectedCampIds })
        generateOccupancyReport({ camps: data.camps || [] })
      }
      toast.success('Report generated', { description: 'PDF download started' })
    } catch (err: any) {
      toast.error('Failed to generate', { description: err.message })
    } finally {
      setGenerating(null)
    }
  }

  return (
    <motion.div
      className="space-y-8"
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      <div>
        <div className="eyebrow mb-2">Exports</div>
        <h1 className="display-lg">Reports</h1>
        <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
          Generate PDF reports on demand. Select report type and configure filters below.
        </p>
      </div>

      {/* Filter controls */}
      <div className="bezel p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Period</span>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="h-9 px-3 rounded-lg bg-sand-100 text-[12px] font-medium text-espresso border-0 outline-none hover:bg-sand-200 cursor-pointer transition-colors">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="h-9 px-3 rounded-lg bg-sand-100 text-[12px] font-medium text-espresso border-0 outline-none hover:bg-sand-200 cursor-pointer transition-colors">
              {Array.from({ length: 5 }, (_, i) => cy - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Camp multi-select with pills */}
        <div>
          <div className="eyebrow mb-3">Camps</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCampIds([])}
              className={cn(
                'h-8 px-3 rounded-full text-[12px] font-medium transition-all',
                isAllCampsSelected
                  ? 'bg-amber-pale text-amber border border-amber'
                  : 'bg-sand-100 text-espresso-muted hover:bg-sand-200'
              )}
            >
              All camps
            </button>
            {camps?.data?.map((camp: any) => (
              <button
                key={camp.id}
                onClick={() => toggleCamp(camp.id)}
                className={cn(
                  'h-8 px-3 rounded-full text-[12px] font-medium transition-all',
                  campIds.includes(camp.id)
                    ? 'bg-amber-pale text-amber border border-amber'
                    : 'bg-sand-100 text-espresso-muted hover:bg-sand-200'
                )}
              >
                {camp.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report selector cards in 2×2 grid */}
      <div>
        <div className="eyebrow mb-4">Select report type</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORTS.map((r, i) => (
            <motion.button
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              disabled={generating !== null}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              whileHover={generating === null ? { y: -2 } : {}}
              whileTap={generating === null ? { scale: 0.995 } : {}}
              className={cn(
                'bezel p-6 text-left group transition-all',
                selectedReport === r.id && 'ring-2 ring-amber border-amber',
                generating === r.id && 'ring-2 ring-amber-500',
                generating !== null && generating !== r.id && 'opacity-40'
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className={cn('w-11 h-11 rounded-xl grid place-items-center shrink-0 transition-transform group-hover:scale-105', r.tone)}>
                  <Icon icon={r.icon} size={18} emphasis />
                </div>
                {generating === r.id ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
                    <div className="live-pulse w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Generating…
                  </div>
                ) : (
                  <Icon icon={FileArrowDown} size={16} className="text-espresso-muted group-hover:text-espresso transition-colors" />
                )}
              </div>
              <h3 className="display-sm mb-1.5">{r.title}</h3>
              <p className="text-[12px] text-espresso-muted leading-relaxed">{r.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      {selectedReport && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <button
            onClick={() => generate(selectedReport)}
            disabled={generating !== null}
            className={cn(
              'h-12 px-8 rounded-full text-[13px] font-medium transition-all flex items-center gap-2.5',
              generating === selectedReport
                ? 'bg-amber-pale text-amber cursor-wait'
                : 'bg-espresso text-sand-50 hover:bg-espresso-soft active:scale-[0.98]'
            )}
          >
            {generating === selectedReport ? (
              <>
                <div className="live-pulse w-2 h-2 rounded-full bg-amber" />
                Generating report...
              </>
            ) : (
              <>
                <Icon icon={FileArrowDown} size={16} />
                Generate {REPORTS.find(r => r.id === selectedReport)?.title}
              </>
            )}
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
