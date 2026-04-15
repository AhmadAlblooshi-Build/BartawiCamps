'use client'
import { useState } from 'react'
import { CampTabs } from '@/components/dashboard/CampTabs'
import { MonthSelector } from '@/components/dashboard/MonthSelector'
import { KPICard } from '@/components/dashboard/KPICard'
import { OutstandingTable } from '@/components/dashboard/OutstandingTable'
import { RoomDetailPanel } from '@/components/rooms/RoomDetailPanel'
import { useCamps, useDashboard } from '@/lib/queries'
import { formatAED, formatPct, getCurrentMonthYear } from '@/lib/utils'
import {
  BedDouble, Users, DoorOpen, Banknote, TrendingUp, AlertCircle
} from 'lucide-react'

export default function DashboardPage() {
  const { month: cm, year: cy } = getCurrentMonthYear()
  const [month, setMonth] = useState(cm)
  const [year,  setYear]  = useState(cy)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  const { data: camps, isLoading: campsLoading } = useCamps()
  const [activeCampId, setActiveCampId] = useState<string | null>(null)

  // Set first camp once loaded
  const effectiveCampId = activeCampId ?? camps?.[0]?.id ?? null
  const activeCamp = camps?.find(c => c.id === effectiveCampId)

  const { data: dash, isLoading: dashLoading } = useDashboard(effectiveCampId, month, year)

  const loading = campsLoading || dashLoading

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Dashboard</h1>
          <p className="text-text-muted text-sm mt-0.5">Real-time overview across both camps</p>
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          icon={BedDouble}
          label="Total Rooms"
          value={dash?.occupancy.total_rooms?.toString() ?? '—'}
          sub={`${dash?.occupancy.leasable_rooms ?? '—'} leasable`}
          loading={loading}
        />
        <KPICard
          icon={Users}
          label="Occupied"
          value={dash?.occupancy.occupied?.toString() ?? '—'}
          sub={formatPct(dash?.occupancy.occupancy_rate ?? 0)}
          trend="up"
          loading={loading}
        />
        <KPICard
          icon={DoorOpen}
          label="Vacant"
          value={dash?.occupancy.vacant?.toString() ?? '—'}
          sub={`${dash?.occupancy.bartawi_use ?? 0} Bartawi use`}
          loading={loading}
        />
        <KPICard
          icon={Banknote}
          label="Total Rent"
          value={formatAED(dash?.financials.total_rent)}
          loading={loading}
        />
        <KPICard
          icon={TrendingUp}
          label="Collected"
          value={formatAED(dash?.financials.total_paid)}
          sub={`${formatPct(dash?.financials.collection_rate ?? 0)} rate`}
          trend="up"
          loading={loading}
        />
        <KPICard
          icon={AlertCircle}
          label="Outstanding"
          value={formatAED(dash?.financials.total_balance)}
          sub={`${dash?.outstanding_records?.length ?? 0} rooms`}
          highlight={(dash?.financials.total_balance ?? 0) > 0}
          loading={loading}
        />
      </div>

      {/* Outstanding balances */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-heading font-semibold text-text-primary">Outstanding Balances</h2>
            <p className="text-text-muted text-xs mt-0.5">
              Rooms with unpaid rent — {activeCamp?.name}
            </p>
          </div>
          {(dash?.financials.total_balance ?? 0) > 0 && (
            <span className="px-3 py-1 bg-status-vacant-dim border border-status-vacant/20 rounded-full text-status-vacant text-xs font-body font-medium">
              {formatAED(dash?.financials.total_balance)} overdue
            </span>
          )}
        </div>
        <OutstandingTable
          records={dash?.outstanding_records ?? []}
          onRoomClick={(id) => setSelectedRoomId(id)}
        />
      </div>

      {/* Room detail panel */}
      {selectedRoomId && effectiveCampId && (
        <RoomDetailPanel
          roomId={selectedRoomId}
          campId={effectiveCampId}
          onClose={() => setSelectedRoomId(null)}
        />
      )}
    </div>
  )
}
