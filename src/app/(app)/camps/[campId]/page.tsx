'use client'
import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import * as Tabs from '@radix-ui/react-tabs'
import { cn, getCurrentMonthYear } from '@/lib/utils'
import { CampOverviewTab } from '@/components/camps/CampOverviewTab'
import { CampMapView } from '@/components/map/CampMapView'
import { CampBlocksTab } from '@/components/camps/CampBlocksTab'
import { RoomsGrid } from '@/components/rooms/RoomsGrid'
import { CampAnalyticsTab } from '@/components/camps/CampAnalyticsTab'
import { MonthSelector } from '@/components/shared/MonthSelector'

type Tab = 'overview' | 'map' | 'blocks' | 'rooms' | 'analytics'
const TAB_LABELS: [Tab, string][] = [
  ['overview', 'Overview'],
  ['map', 'Map'],
  ['blocks', 'Blocks'],
  ['rooms', 'Rooms'],
  ['analytics', 'Analytics'],
]

export default function CampDetailPage() {
  const params = useParams<{ campId: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>((search.get('tab') as Tab) || 'overview')
  const { month: cm, year: cy } = getCurrentMonthYear()
  const [month, setMonth] = useState(cm)
  const [year, setYear] = useState(cy)

  const { data: camp } = useQuery({ queryKey: ['camp', params.campId], queryFn: () => endpoints.camp(params.campId) })

  const setActiveTab = (t: Tab) => {
    setTab(t)
    const qs = new URLSearchParams(search.toString())
    qs.set('tab', t)
    router.replace(`/camps/${params.campId}?${qs.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between animate-rise flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-2">{camp?.code === 'C1' ? 'Camp One' : camp?.code === 'C2' ? 'Camp Two' : 'Camp'}</div>
          <h1 className="display-lg">{camp?.name || '—'}</h1>
        </div>
        {tab !== 'map' && <MonthSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y) }} />}
      </div>

      <Tabs.Root value={tab} onValueChange={v => setActiveTab(v as Tab)}>
        <Tabs.List className="flex gap-1 p-1 rounded-xl bg-sand-100 w-fit">
          {TAB_LABELS.map(([v, label]) => (
            <Tabs.Trigger
              key={v}
              value={v}
              className={cn(
                'px-4 py-2 rounded-lg font-body text-[12px] font-medium transition-all',
                'data-[state=active]:bg-white data-[state=active]:text-espresso data-[state=active]:shadow-raise-1',
                'data-[state=inactive]:text-espresso-muted hover:text-espresso'
              )}
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="mt-8">
          <Tabs.Content value="overview"><CampOverviewTab campId={params.campId} month={month} year={year} /></Tabs.Content>
          <Tabs.Content value="map"><CampMapView campId={params.campId} /></Tabs.Content>
          <Tabs.Content value="blocks"><CampBlocksTab campId={params.campId} month={month} year={year} /></Tabs.Content>
          <Tabs.Content value="rooms"><RoomsGrid campId={params.campId} /></Tabs.Content>
          <Tabs.Content value="analytics"><CampAnalyticsTab campId={params.campId} /></Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  )
}
