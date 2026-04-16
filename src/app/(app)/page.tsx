'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { useSession } from '@/lib/auth'
import { getCurrentMonthYear } from '@/lib/utils'
import { StatStrip } from '@/components/dashboard/StatStrip'
import { AnomalyNarrator } from '@/components/dashboard/AnomalyNarrator'
import { CollectionTrend } from '@/components/dashboard/CollectionTrend'
import { OutstandingLeaderboard } from '@/components/dashboard/OutstandingLeaderboard'
import { ExpiryPanel } from '@/components/dashboard/ExpiryPanel'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'

export default function DashboardPage() {
  const { month, year } = getCurrentMonthYear()
  const user = useSession(s => s.user)
  const firstName = user?.fullName?.split(' ')[0] || 'there'
  const greeting = getGreeting()

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between animate-rise">
        <div>
          <div className="eyebrow mb-2">Today · {new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 className="display-lg">{greeting}, {firstName}</h1>
        </div>
        <div className="text-[12px] text-espresso-muted tabular">
          Last sync · <span className="font-mono text-espresso">just now</span>
        </div>
      </div>

      <StatStrip month={month} year={year} />

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <AnomalyNarrator month={month} year={year} />
          <CollectionTrend />
          <OutstandingLeaderboard month={month} year={year} />
        </div>
        <div className="space-y-6">
          <ExpiryPanel />
          <ActivityFeed />
        </div>
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
