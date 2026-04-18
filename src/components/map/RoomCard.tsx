'use client'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface RoomCardProps {
  room: {
    id: string
    room_number: string
    status: string
    room_size: string
    max_capacity: number
    standard_rent: number
    current_occupancy: {
      people_count: number
      monthly_rent: number
      individual: { owner_name: string } | null
      company: { name: string } | null
    } | null
  }
  onClick: () => void
  layoutId: string
}

export function RoomCard({ room, onClick, layoutId }: RoomCardProps) {
  // Extract tenant name
  const tenantName = room.current_occupancy?.individual?.owner_name
    || room.current_occupancy?.company?.name
    || (room.status === 'vacant' ? 'VACANT' : 'UNKNOWN')

  // Calculate payment percentage (mock for now - would come from balance API)
  const rent = room.current_occupancy?.monthly_rent || room.standard_rent
  const paymentPercentage = room.status === 'occupied' ? 96 : 0

  // Get status indicator
  const getStatusDot = () => {
    switch (room.status) {
      case 'occupied':
        return paymentPercentage >= 90 ? 'bg-teal' : 'bg-ochre'
      case 'vacant':
        return 'bg-amber'
      case 'vacating':
        return 'bg-ochre'
      case 'bartawi_use':
        return 'bg-sand-300'
      case 'maintenance':
        return 'bg-rust'
      default:
        return 'bg-sand-300'
    }
  }

  const getStatusBackground = () => {
    switch (room.status) {
      case 'occupied':
        return paymentPercentage < 90 ? 'bg-amber-pale/20' : ''
      case 'vacant':
        return 'border-dashed border-amber'
      case 'bartawi_use':
        return 'bg-sand-200/30'
      case 'maintenance':
        return 'bg-rust-pale/20'
      default:
        return ''
    }
  }

  const getPaymentBarColor = () => {
    if (paymentPercentage >= 90) return 'bg-teal'
    if (paymentPercentage >= 50) return 'bg-amber'
    return 'bg-rust'
  }

  const bedsOccupied = room.current_occupancy?.people_count || 0
  const bedsTotal = room.max_capacity

  return (
    <motion.div
      layoutId={layoutId}
      onClick={onClick}
      className={cn(
        'bezel cursor-pointer rounded-lg p-3',
        'w-[160px] h-[110px] flex flex-col',
        'elevation-hover transition-all duration-200',
        'hover:border-amber',
        getStatusBackground()
      )}
      whileHover={{ scale: 1.02 }}
    >
      {/* Header: Room number + status dot */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="data-sm font-semibold">{room.room_number}</span>
        <div className={cn('w-2 h-2 rounded-full', getStatusDot())} />
      </div>

      {/* Tenant name */}
      <div className="text-[11px] font-medium text-espresso-muted truncate mb-1">
        {tenantName}
      </div>

      {/* Beds */}
      <div className="eyebrow text-[9px] mb-2">
        {bedsOccupied}/{bedsTotal} beds
      </div>

      {/* Payment bar (only for occupied rooms) */}
      {room.status === 'occupied' && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex-1 h-[3px] bg-sand-200 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-300', getPaymentBarColor())}
              style={{ width: `${paymentPercentage}%` }}
            />
          </div>
          <span className="eyebrow text-[9px]">{paymentPercentage}%</span>
        </div>
      )}

      {/* Rent */}
      <div className="mt-auto data-sm font-semibold">
        AED {rent.toLocaleString()}
      </div>
    </motion.div>
  )
}
