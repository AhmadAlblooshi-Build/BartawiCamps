'use client'
import { useState } from 'react'
import { useQuery }  from '@tanstack/react-query'
import { useCamps }  from '@/lib/queries'
import { reportsApi } from '@/lib/api'
import { generateRentRollPDF, generateOutstandingPDF, generateSummaryPDF } from '@/lib/pdf'
import { CampTabs }     from '@/components/dashboard/CampTabs'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { KPICard }       from '@/components/dashboard/KPICard'
import {
  FileText, Users, AlertCircle, BarChart3,
  Download, Loader2, FileSpreadsheet
} from 'lucide-react'
import { formatAED, formatPct, MONTHS, getCurrentMonthYear } from '@/lib/utils'
import { cn } from '@/lib/utils'

const TILES = [
  {
    id:    'rent-roll',
    icon:  FileText,
    title: 'Rent Roll',
    desc:  'Every room: tenant name, contract type, rent, paid, and balance. The essential monthly record.',
    border:'border-accent-cyan/20 hover:border-accent-cyan/40',
    iconBg:'bg-accent-glow',
    iconColor:'text-accent-cyan',
    badge: 'Most Used',
  },
  {
    id:    'outstanding',
    icon:  AlertCircle,
    title: 'Outstanding Balances',
    desc:  'Only rooms with unpaid rent — sorted highest first. What the collections team needs.',
    border:'border-status-vacant/20 hover:border-status-vacant/40',
    iconBg:'bg-status-vacant-dim',
    iconColor:'text-status-vacant',
    badge: 'Urgent',
  },
  {
    id:    'summary',
    icon:  BarChart3,
    title: 'Monthly Summary',
    desc:  'One-page executive summary: occupancy rate, total rent, collected, outstanding, collection rate.',
    border:'border-purple-500/20 hover:border-purple-500/40',
    iconBg:'bg-purple-500/10',
    iconColor:'text-purple-400',
    badge: 'For Management',
  },
  {
    id:    'occupancy',
    icon:  Users,
    title: 'Occupancy Report',
    desc:  'Full list of every room with current status: occupied, vacant, Bartawi use, maintenance.',
    border:'border-status-occupied/20 hover:border-status-occupied/40',
    iconBg:'bg-status-occupied-dim',
    iconColor:'text-status-occupied',
    badge: 'Operations',
  },
]

export default function ReportsPage() {
  const { month: cm, year: cy }          = getCurrentMonthYear()
  const [month, setMonth]                = useState(cm)
  const [year,  setYear]                 = useState(cy)
  const [loadingId, setLoadingId]        = useState<string | null>(null)
  const [error, setError]                = useState<string | null>(null)
  const { data: camps }                  = useCamps()
  const [activeCampId, setActiveCampId]  = useState<string | null>(null)
  const effectiveCampId                  = activeCampId ?? camps?.[0]?.id
  const activeCamp                       = camps?.find(c => c.id === effectiveCampId)

  // Live preview summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['report-summary', effectiveCampId, month, year],
    queryFn:  () => reportsApi.summary(effectiveCampId!, month, year),
    enabled:  !!effectiveCampId,
    staleTime: 60 * 1000,
  })

  const handleExport = async (id: string) => {
    if (!effectiveCampId) return
    setLoadingId(id)
    setError(null)
    try {
      if (id === 'rent-roll') {
        const d = await reportsApi.rentRoll(effectiveCampId, month, year)
        generateRentRollPDF(d)
      } else if (id === 'outstanding') {
        const d = await reportsApi.outstanding(effectiveCampId, month, year)
        generateOutstandingPDF(d)
      } else if (id === 'summary') {
        const d = await reportsApi.summary(effectiveCampId, month, year)
        generateSummaryPDF(d)
      } else if (id === 'occupancy') {
        // Occupancy is data-only for now
        setError('Occupancy PDF export coming in the next update. Data is available via the API.')
        setLoadingId(null)
        return
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to generate report. Check that the backend is running.')
    } finally {
      setLoadingId(null)
    }
  }

  const occ = summary?.occupancy
  const fin = summary?.financials

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Reports</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Professional PDF exports — generated instantly from live data
          </p>
        </div>
        <MonthSelector
          month={month}
          year={year}
          onChange={(m, y) => { setMonth(m); setYear(y) }}
        />
      </div>

      {/* Camp selector */}
      {camps && camps.length > 0 && (
        <CampTabs
          camps={camps}
          activeCampId={effectiveCampId ?? ''}
          onChange={setActiveCampId}
        />
      )}

      {/* Live KPI preview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          icon={Users}
          label="Occupancy"
          value={occ ? `${occ.occupancy_rate}%` : '—'}
          sub={occ ? `${occ.occupied} / ${occ.leasable_rooms} rooms` : undefined}
          loading={summaryLoading}
        />
        <KPICard
          icon={FileText}
          label="Total Rent"
          value={fin ? formatAED(fin.total_rent) : '—'}
          sub={`${MONTHS[month-1]} ${year}`}
          loading={summaryLoading}
        />
        <KPICard
          icon={BarChart3}
          label="Collected"
          value={fin ? formatAED(fin.total_paid) : '—'}
          sub={fin ? `${fin.collection_rate}% rate` : undefined}
          trend="up"
          loading={summaryLoading}
        />
        <KPICard
          icon={AlertCircle}
          label="Outstanding"
          value={fin ? formatAED(fin.total_balance) : '—'}
          highlight={(fin?.total_balance ?? 0) > 0}
          loading={summaryLoading}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-status-vacant-dim border border-status-vacant/20 rounded-xl text-status-vacant text-sm font-body">
          {error}
        </div>
      )}

      {/* Report tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TILES.map((tile) => {
          const Icon      = tile.icon
          const isLoading = loadingId === tile.id

          return (
            <div
              key={tile.id}
              className={cn(
                'bg-bg-card border rounded-2xl p-6 transition-all duration-200 group relative overflow-hidden',
                tile.border
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.015] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="flex items-start justify-between mb-5">
                <div className={cn('p-3 rounded-xl', tile.iconBg)}>
                  <Icon className={cn('w-6 h-6', tile.iconColor)} />
                </div>
                <span className="px-2.5 py-1 bg-bg-elevated border border-border rounded-lg text-text-dim text-[10px] font-body font-medium tracking-wide">
                  {tile.badge}
                </span>
              </div>

              <h3 className="font-heading font-bold text-text-primary text-lg mb-2">{tile.title}</h3>
              <p className="text-text-muted text-sm font-body leading-relaxed mb-6">{tile.desc}</p>

              <div className="flex items-center justify-between">
                <div className="text-xs font-body text-text-dim">
                  {activeCamp?.name}  ·  {MONTHS[month-1]} {year}
                </div>
                <button
                  onClick={() => handleExport(tile.id)}
                  disabled={!!loadingId || summaryLoading}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body font-medium transition-all border',
                    isLoading
                      ? 'bg-bg-elevated border-border text-text-muted cursor-wait'
                      : 'bg-bg-elevated border-border text-text-secondary hover:text-text-primary hover:border-border-light active:scale-95'
                  )}
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Download className="w-4 h-4" /> Export PDF</>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-text-dim text-xs text-center font-body pb-2">
        PDFs are generated client-side from live data — no server processing required
        · Dark-themed, professional layout · Ready to send to management
      </p>
    </div>
  )
}
