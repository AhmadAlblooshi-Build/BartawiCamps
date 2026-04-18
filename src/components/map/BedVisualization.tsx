'use client'
import { cn } from '@/lib/utils'

interface BedVisualizationProps {
  occupied: number
  total: number
}

export function BedVisualization({ occupied, total }: BedVisualizationProps) {
  const beds = Array.from({ length: total }, (_, i) => i < occupied)
  const occupancyRate = total > 0 ? (occupied / total) * 100 : 0

  return (
    <div className="space-y-3">
      {/* Bed icons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {beds.map((isOccupied, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-2.5 rounded-sm transition-all duration-200',
              isOccupied
                ? 'bg-teal'
                : 'border border-sand-300 bg-transparent'
            )}
          />
        ))}
        <span className="ml-2 text-[11px] font-medium text-espresso-muted">
          {occupied} of {total} beds occupied
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-sand-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal transition-all duration-300"
            style={{ width: `${occupancyRate}%` }}
          />
        </div>
        <span className="data-sm font-semibold">{occupancyRate.toFixed(1)}%</span>
      </div>
    </div>
  )
}
