import { Building2, ChevronRight } from 'lucide-react'
import type { Building } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  building: Building
  onClick: () => void
}

export function BuildingCard({ building, onClick }: Props) {
  const groundBlock = building.blocks?.find(b => b.floor_number === 0)
  const upperBlock  = building.blocks?.find(b => b.floor_number === 1)
  const totalRooms  = (groundBlock?.room_count || 0) + (upperBlock?.room_count || 0)

  return (
    <button
      onClick={onClick}
      className="group w-full bg-bg-card border border-border rounded-xl p-5 text-left hover:border-accent-cyan/30 hover:bg-bg-elevated transition-all duration-200 relative overflow-hidden"
    >
      {/* Hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-glow border border-accent-cyan/20 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-text-primary text-lg leading-none">
              {building.code}
            </h3>
            <p className="text-text-muted text-xs mt-0.5">{building.name}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-dim group-hover:text-accent-cyan group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* Floor breakdown */}
      <div className="space-y-2">
        {groundBlock && (
          <div className="flex items-center justify-between py-2 px-3 bg-bg-primary/50 rounded-lg border border-border/50">
            <span className="text-text-muted text-xs font-body">Ground Floor ({building.ground_block_code})</span>
            <span className="text-text-secondary text-xs font-mono font-medium">{groundBlock.room_count} rooms</span>
          </div>
        )}
        {upperBlock && (
          <div className="flex items-center justify-between py-2 px-3 bg-bg-primary/50 rounded-lg border border-border/50">
            <span className="text-text-muted text-xs font-body">First Floor ({building.upper_block_code})</span>
            <span className="text-text-secondary text-xs font-mono font-medium">{upperBlock.room_count} rooms</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-text-muted text-xs">Total</span>
        <span className="font-heading font-bold text-text-primary">{totalRooms} rooms</span>
      </div>
    </button>
  )
}
