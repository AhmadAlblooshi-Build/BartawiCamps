'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { getCurrentMonthYear } from '@/lib/utils'
import { CampCard } from '@/components/camps/CampCard'

export default function CampsPage() {
  const { month, year } = getCurrentMonthYear()
  const { data: camps } = useQuery({ queryKey: ['camps'], queryFn: () => endpoints.camps() })

  return (
    <div className="space-y-8">
      <div className="animate-rise">
        <div className="eyebrow mb-2">Properties</div>
        <h1 className="display-lg">Camps</h1>
        <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
          Overview of both operational camps. Click through for rooms, map view, and analytics.
        </p>
      </div>

      {!camps ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 skeleton-shimmer rounded-2xl" />
          <div className="h-80 skeleton-shimmer rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {camps.data.map((camp: any, i: number) => (
            <CampCard key={camp.id} camp={camp} month={month} year={year} delay={i * 0.1} />
          ))}
        </div>
      )}
    </div>
  )
}
