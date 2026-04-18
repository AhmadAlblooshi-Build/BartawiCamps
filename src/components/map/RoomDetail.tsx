'use client'
import { motion } from 'motion/react'
import { ArrowLeft } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { BedVisualization } from './BedVisualization'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { getBlockByCode } from '@/data/camp1-layout'

interface RoomData {
  id: string
  room_number: string
  status: string
  room_size: string
  max_capacity: number
  standard_rent: number
  block?: { code: string }
  current_occupancy: {
    people_count: number
    monthly_rent: number
    individual: {
      owner_name: string
      mobile?: string
      nationality?: string
    } | null
    company: {
      name: string
    } | null
    check_in_date?: string
    contract_type?: string
  } | null
}

interface RoomDetailProps {
  room: RoomData
  onBack: () => void
  layoutId: string
}

// Spring configuration for room expansion
const roomExpandSpring = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
  mass: 0.8,
}

const sectionVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
}

const detailStaggerTransition = {
  staggerChildren: 0.04,
  delayChildren: 0.2,
}

export function RoomDetail({ room, onBack, layoutId }: RoomDetailProps) {
  // Fetch room history and balance
  const { data: history } = useQuery({
    queryKey: ['room-history', room.id],
    queryFn: () => endpoints.roomHistory(room.id),
  })

  const { data: balance } = useQuery({
    queryKey: ['room-balance', room.id],
    queryFn: () => endpoints.roomBalance(room.id),
  })

  const block = room.block ? getBlockByCode(room.block.code) : null

  // Extract data
  const tenant = room.current_occupancy?.individual || room.current_occupancy?.company
  const tenantName = room.current_occupancy?.individual?.owner_name
    || room.current_occupancy?.company?.name
    || '—'
  const companyName = room.current_occupancy?.company?.name || '—'
  const mobile = room.current_occupancy?.individual?.mobile || '—'
  const nationality = room.current_occupancy?.individual?.nationality || '—'
  const checkIn = room.current_occupancy?.check_in_date || '—'
  const contractType = room.current_occupancy?.contract_type || 'Monthly'

  const bedsOccupied = room.current_occupancy?.people_count || 0
  const bedsTotal = room.max_capacity

  const rent = room.current_occupancy?.monthly_rent || room.standard_rent
  const outstanding = balance?.outstanding || 0
  const isPaid = outstanding === 0

  // Get status badge
  const getStatusBadge = () => {
    switch (room.status) {
      case 'occupied':
        return (
          <span className="px-3 py-1 rounded-full bg-teal/10 text-teal text-[11px] font-semibold">
            🟢 Occupied
          </span>
        )
      case 'vacant':
        return (
          <span className="px-3 py-1 rounded-full bg-amber/10 text-amber text-[11px] font-semibold">
            🟡 Vacant
          </span>
        )
      case 'vacating':
        return (
          <span className="px-3 py-1 rounded-full bg-ochre/10 text-ochre text-[11px] font-semibold">
            🟠 Vacating
          </span>
        )
      case 'bartawi_use':
        return (
          <span className="px-3 py-1 rounded-full bg-sand-200 text-espresso-muted text-[11px] font-semibold">
            ⚪ Bartawi Use
          </span>
        )
      case 'maintenance':
        return (
          <span className="px-3 py-1 rounded-full bg-rust/10 text-rust text-[11px] font-semibold">
            🔴 Maintenance
          </span>
        )
      default:
        return null
    }
  }

  // Get contextual action buttons
  const getActionButtons = () => {
    if (room.status === 'occupied') {
      return (
        <>
          <button className="btn-primary">
            Log Payment
          </button>
          <button className="btn-outline">
            Give Notice
          </button>
        </>
      )
    }
    if (room.status === 'vacant') {
      return (
        <button className="btn-primary">
          New Lease
        </button>
      )
    }
    if (room.status === 'vacating') {
      return (
        <>
          <button className="btn-danger">
            Complete Checkout
          </button>
          <button className="btn-outline">
            Log Payment
          </button>
        </>
      )
    }
    if (room.status === 'maintenance') {
      return (
        <button className="btn-primary bg-teal hover:bg-teal/90">
          Mark Available
        </button>
      )
    }
    return null
  }

  return (
    <motion.div
      layoutId={layoutId}
      transition={roomExpandSpring}
      className="bezel atmosphere-strong p-8 rounded-xl w-full max-w-[560px] mx-auto"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.2 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-espresso-muted hover:text-espresso transition-colors group"
          >
            <Icon icon={ArrowLeft} size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to {block?.label || 'block'}</span>
          </button>
          {getStatusBadge()}
        </div>

        <h2 className="font-display text-2xl italic mb-1" style={{ color: 'var(--color-espresso)' }}>
          Room {room.room_number}
        </h2>
        <p className="eyebrow text-[11px]">
          {block?.label || 'Unknown Block'} · {block?.floor === 'ground' ? 'GROUND FLOOR' : 'FIRST FLOOR'}
        </p>

        <div className="divider-warm mt-4" />
      </motion.div>

      {/* Detail sections with stagger */}
      <motion.div
        initial="hidden"
        animate="visible"
        transition={detailStaggerTransition}
        className="space-y-6"
      >
        {/* Tenant section */}
        {room.status === 'occupied' && (
          <motion.div variants={sectionVariants}>
            <h3 className="eyebrow text-[11px] mb-3">TENANT</h3>
            <div className="bezel p-4 rounded-lg space-y-2">
              <div className="font-semibold text-espresso">{tenantName}</div>
              <div className="text-sm text-espresso-muted">Company: {companyName}</div>
              <div className="flex items-center gap-4 text-sm text-espresso-muted">
                <span>Mobile: {mobile}</span>
                <span>·</span>
                <span>Nationality: {nationality}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-espresso-muted">
                <span>Check-in: {checkIn}</span>
                <span>·</span>
                <span>Contract: {contractType}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Capacity section */}
        <motion.div variants={sectionVariants}>
          <h3 className="eyebrow text-[11px] mb-3">CAPACITY</h3>
          <div className="bezel p-4 rounded-lg">
            <BedVisualization occupied={bedsOccupied} total={bedsTotal} />
          </div>
        </motion.div>

        {/* Financials section */}
        {room.status === 'occupied' && (
          <motion.div variants={sectionVariants}>
            <h3 className="eyebrow text-[11px] mb-3">FINANCIALS — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <div className="bezel p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-espresso-muted">Rent</span>
                <span className="data-md font-semibold">AED {rent.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-espresso-muted">Outstanding</span>
                <span className={`data-md font-semibold ${outstanding > 0 ? 'text-rust' : 'text-teal'}`}>
                  AED {outstanding.toLocaleString()}
                </span>
              </div>
              <div className="divider-warm" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <span className={`text-sm font-semibold ${isPaid ? 'text-teal' : 'text-rust'}`}>
                  {isPaid ? '✅ Fully paid' : '⚠️ Balance due'}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* History section */}
        {room.status === 'occupied' && history?.data && history.data.length > 0 && (
          <motion.div variants={sectionVariants}>
            <h3 className="eyebrow text-[11px] mb-3">LAST 6 MONTHS</h3>
            <div className="bezel p-4 rounded-lg">
              <div className="space-y-2">
                {history.data.slice(0, 6).map((entry: any, i: number) => {
                  const monthName = new Date(entry.year, entry.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  const isPaid = entry.balance === 0
                  return (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <span className="text-espresso-muted">{monthName}</span>
                      <span className="data-sm">AED {entry.rent.toLocaleString()}</span>
                      <span className="data-sm text-espresso-muted">Paid: AED {entry.paid.toLocaleString()}</span>
                      <span className={`text-xs ${isPaid ? 'text-teal' : 'text-amber'}`}>
                        {isPaid ? '✅' : '⚠️'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div variants={sectionVariants}>
          <div className="divider-warm mb-4" />
          <div className="flex items-center gap-3">
            {getActionButtons()}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
