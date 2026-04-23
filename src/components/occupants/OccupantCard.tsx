'use client'
import { motion } from 'motion/react'
import { User, Calendar, Bed, ArrowRightLeft, Archive } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import type { Occupant } from '@/lib/api'

interface OccupantCardProps {
  occupant: Occupant
  delay?: number
  onArchive?: () => void
  onSwap?: () => void
  showActions?: boolean
}

export function OccupantCard({
  occupant,
  delay = 0,
  onArchive,
  onSwap,
  showActions = true
}: OccupantCardProps) {
  const isActive = occupant.status === 'active'

  const statusColors = {
    active: { bar: 'bg-teal', pill: 'bg-teal/10 text-teal' },
    archived: { bar: 'bg-stone', pill: 'bg-stone/10 text-stone' }
  }

  const tone = statusColors[occupant.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0)' }}
      transition={{
        type: 'spring',
        stiffness: 340,
        damping: 32,
        delay
      }}
      className="bezel elevation-hover overflow-hidden group"
    >
      <div className="flex items-stretch">
        <div className={cn('w-[3px] shrink-0', tone.bar)} />
        <div className="flex-1 p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <User size={14} className="text-espresso/40" />
                <span className="overline">OCCUPANT</span>
              </div>
              <h3 className="font-display italic text-lg text-espresso truncate">
                {occupant.full_name}
              </h3>
              {occupant.bedspace?.bed_number && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Bed size={12} className="text-espresso/40" />
                  <span className="text-xs text-espresso/60">
                    Bed <span className="font-mono tabular">{occupant.bedspace.bed_number}</span>
                  </span>
                </div>
              )}
            </div>
            <div className={cn('px-2 py-1 rounded-full text-[11px] font-medium uppercase whitespace-nowrap', tone.pill)}>
              {occupant.status}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 py-3 border-y border-sand/20">
            <div>
              <div className="text-xs text-espresso/50 mb-0.5">Check-in</div>
              <div className="flex items-center gap-1.5">
                <Calendar size={12} className="text-espresso/40" />
                <span className="text-sm text-espresso">
                  {formatDate(occupant.checked_in_at)}
                </span>
              </div>
            </div>

            {occupant.status === 'archived' && occupant.checked_out_at && (
              <div>
                <div className="text-xs text-espresso/50 mb-0.5">Check-out</div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-espresso/40" />
                  <span className="text-sm text-espresso">
                    {formatDate(occupant.checked_out_at)}
                  </span>
                </div>
              </div>
            )}

            {occupant.nationality && (
              <div>
                <div className="text-xs text-espresso/50 mb-0.5">Nationality</div>
                <span className="text-sm text-espresso">{occupant.nationality}</span>
              </div>
            )}

            {occupant.phone && (
              <div>
                <div className="text-xs text-espresso/50 mb-0.5">Phone</div>
                <span className="text-sm font-mono tabular text-espresso">{occupant.phone}</span>
              </div>
            )}
          </div>

          {/* Optional Details */}
          {(occupant.passport_number || occupant.emergency_contact) && (
            <div className="mt-3 space-y-2">
              {occupant.passport_number && (
                <div className="text-xs">
                  <span className="text-espresso/50">Passport: </span>
                  <span className="font-mono tabular text-espresso">{occupant.passport_number}</span>
                </div>
              )}
              {occupant.emergency_contact && (
                <div className="text-xs">
                  <span className="text-espresso/50">Emergency: </span>
                  <span className="text-espresso">{occupant.emergency_contact}</span>
                  {occupant.emergency_phone && (
                    <span className="font-mono tabular text-espresso/60 ml-2">
                      {occupant.emergency_phone}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Linked Tenant */}
          {occupant.linked_tenant && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-sand/30">
              <div className="text-xs text-espresso/50 mb-0.5">Linked to Tenant</div>
              <div className="text-sm text-espresso font-medium">
                {occupant.linked_tenant.is_company
                  ? occupant.linked_tenant.company_name
                  : occupant.linked_tenant.full_name}
              </div>
            </div>
          )}

          {/* Checkout Reason */}
          {occupant.status === 'archived' && occupant.checkout_reason && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-stone/10">
              <div className="text-xs text-espresso/50 mb-0.5">Checkout Reason</div>
              <div className="text-sm text-espresso capitalize">
                {occupant.checkout_reason.replace(/_/g, ' ')}
              </div>
              {occupant.checkout_notes && (
                <div className="text-xs text-espresso/60 mt-1">{occupant.checkout_notes}</div>
              )}
            </div>
          )}

          {/* Actions */}
          {showActions && isActive && (onArchive || onSwap) && (
            <div className="mt-4 flex items-center gap-2">
              {onSwap && (
                <button
                  onClick={onSwap}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-gold/10 hover:bg-amber-gold/20 text-amber-gold transition-colors text-sm font-medium"
                >
                  <ArrowRightLeft size={14} />
                  <span>Swap</span>
                </button>
              )}
              {onArchive && (
                <button
                  onClick={onArchive}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-rust/10 hover:bg-rust/20 text-rust transition-colors text-sm font-medium"
                >
                  <Archive size={14} />
                  <span>Archive</span>
                </button>
              )}
            </div>
          )}

          {/* Notes */}
          {occupant.notes && (
            <div className="mt-3 text-xs text-espresso/60 italic">
              Note: {occupant.notes}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
