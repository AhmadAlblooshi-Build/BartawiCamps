'use client'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import {
  getTenantName,
  getPeopleCount,
  getMonthlyRent,
  getPaymentPercentage,
  getRoomStatus,
  formatRoomNumber,
} from '@/lib/room-helpers'

interface RoomCardProps {
  room: any
  onClick: () => void
  layoutId: string
}

export function RoomCard({ room, onClick, layoutId }: RoomCardProps) {
  // Use centralized helpers to extract data
  const tenantName = getTenantName(room) || (getRoomStatus(room) === 'vacant' ? 'VACANT' : 'UNKNOWN')
  const rent = getMonthlyRent(room)
  const paymentPercentage = getPaymentPercentage(room)

  const status = getRoomStatus(room)

  // Get status indicator
  const getStatusDot = () => {
    switch (status) {
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
    switch (status) {
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

  const bedsOccupied = getPeopleCount(room)
  const bedsTotal = room.max_capacity || 0
  const displayRoomNumber = formatRoomNumber(room.room_number)

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
        <span className="data-sm font-semibold">{displayRoomNumber}</span>
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
      {status === 'occupied' && (
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
