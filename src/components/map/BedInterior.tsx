'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { endpoints, type Occupant } from '@/lib/api'
import { Icon } from '@/components/ui/Icon'
import { X, User, Calendar, DollarSign, LogOut, UserPlus, Users } from 'lucide-react'
import { LogPaymentDialog } from '@/components/payments/LogPaymentDialog'
import CheckoutWizard from '@/components/leases/CheckoutWizard'
import { OccupantCard } from '@/components/occupants/OccupantCard'
import { AddOccupantDialog } from '@/components/occupants/AddOccupantDialog'
import { ArchiveOccupantDialog } from '@/components/occupants/ArchiveOccupantDialog'
import { SwapOccupantDialog } from '@/components/occupants/SwapOccupantDialog'

const SPRING = { type: 'spring' as const, stiffness: 340, damping: 32 }

interface BedInteriorProps {
  bedspaceId: string | null
  onClose: () => void
}

const monthName = (m: number) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]

export default function BedInterior({ bedspaceId, onClose }: BedInteriorProps) {
  const [payOpen, setPayOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [addOccupantOpen, setAddOccupantOpen] = useState(false)
  const [archiveOccupantOpen, setArchiveOccupantOpen] = useState(false)
  const [swapOccupantOpen, setSwapOccupantOpen] = useState(false)
  const [selectedOccupant, setSelectedOccupant] = useState<Occupant | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['bedspace', bedspaceId],
    queryFn: () => endpoints.bedspace(bedspaceId!),
    enabled: !!bedspaceId,
  })

  // Phase 4B.6: Query bedspace occupants
  const { data: occupantsData } = useQuery({
    queryKey: ['bedspace-occupants', bedspaceId],
    queryFn: () => endpoints.bedspaceOccupants(bedspaceId!),
    enabled: !!bedspaceId,
  })

  if (!bedspaceId) return null

  // Phase 4B.5: Backend returns flat response, not wrapped in .bedspace
  const bed = data
  const lease = bed?.active_lease
  const activeOccupant = occupantsData?.occupants?.find((o: Occupant) => o.status === 'active')
  const history = occupantsData?.occupants?.filter(
    (o: Occupant) => o.status === 'archived'
  ) || []

  // Phase 4B.7: Derive scope from lease.bedspace_id
  const isBedLevel = !!lease?.bedspace_id
  const isWholeRoom = lease && !lease.bedspace_id

  return (
    <AnimatePresence>
      {bedspaceId && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bed-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-espresso/40 z-40"
          />

          {/* Panel */}
          <motion.div
            key="bed-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={SPRING}
            className="fixed right-0 top-0 bottom-0 w-[480px] bg-sand z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="p-6 border-b border-dust">
              <button
                onClick={onClose}
                className="text-xs text-stone hover:text-espresso mb-4 transition-colors"
              >
                ← Back to room
              </button>
              <h2 className="font-display italic text-3xl text-espresso">
                {bed ? `Room ${bed.room.room_number} · Bed ${bed.bed_number}` : 'Loading...'}
              </h2>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="p-6">
                <div className="text-sm text-stone">Loading bed details...</div>
              </div>
            ) : !lease ? (
              <div className="p-6">
                <div className="p-4 bg-wash border border-dust rounded-xl text-center">
                  <div className="text-sm text-stone">This bed is vacant</div>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Phase 4B.7: Scope Badge */}
                {isBedLevel && (
                  <div className="px-3 py-2 rounded-lg bg-amber/10 border border-amber/30 flex items-center gap-2 mb-4">
                    <span className="text-base">🛏️</span>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-amber font-semibold">
                        Bed-level lease
                      </p>
                      <p className="text-xs text-espresso">
                        This bed only · Other beds in this room are independent
                      </p>
                    </div>
                  </div>
                )}

                {isWholeRoom && (
                  <div className="px-3 py-2 rounded-lg bg-teal/10 border border-teal/30 flex items-center gap-2 mb-4">
                    <span className="text-base">🏠</span>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-teal font-semibold">
                        Whole-room lease
                      </p>
                      <p className="text-xs text-espresso">
                        This bed is part of a room-wide lease
                      </p>
                    </div>
                  </div>
                )}

                {/* Tenant Info */}
                <div>
                  <div className="text-xs uppercase tracking-wider text-stone mb-2">
                    <Icon icon={User} size={12} className="inline mr-1" />
                    Tenant
                  </div>
                  <div className="font-display italic text-lg text-espresso">
                    {lease.tenant?.display_name}
                  </div>
                </div>

                {/* Phase 4B.6: Occupant Section */}
                <div className="border-t border-dust pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs uppercase tracking-wider text-stone">
                      <Users size={12} className="inline mr-1" />
                      Occupant
                    </div>
                    {!activeOccupant && lease.status === 'active' && (
                      <button
                        onClick={() => setAddOccupantOpen(true)}
                        className="text-xs text-teal hover:text-teal/80 flex items-center gap-1 transition-colors"
                      >
                        <UserPlus size={12} />
                        Add
                      </button>
                    )}
                  </div>

                  {activeOccupant ? (
                    <OccupantCard
                      occupant={activeOccupant}
                      showActions={lease.status === 'active'}
                      onArchive={() => {
                        setSelectedOccupant(activeOccupant)
                        setArchiveOccupantOpen(true)
                      }}
                      onSwap={() => {
                        setSelectedOccupant(activeOccupant)
                        setSwapOccupantOpen(true)
                      }}
                    />
                  ) : (
                    <div className="p-4 bg-wash border border-dust rounded-xl text-center">
                      <div className="text-sm text-stone">No active occupant</div>
                      {lease.status === 'active' && (
                        <div className="text-xs text-stone/60 mt-1">
                          Click &quot;Add&quot; to assign someone to this bed
                        </div>
                      )}
                    </div>
                  )}

                  {/* Occupant History */}
                  {history.length > 0 && (
                    <details className="mt-4">
                      <summary className="text-xs text-stone cursor-pointer hover:text-espresso select-none">
                        Occupant history ({history.length})
                      </summary>
                      <div className="space-y-2 mt-2">
                        {history.map((o: Occupant) => (
                          <OccupantCard key={o.id} occupant={o} />
                        ))}
                      </div>
                    </details>
                  )}
                </div>

                {/* Lease Terms */}
                <div className="border-t border-dust pt-4">
                  <div className="text-xs uppercase tracking-wider text-stone mb-3">
                    <Icon icon={Calendar} size={12} className="inline mr-1" />
                    Lease Terms
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-white border border-dust rounded-xl">
                      <div className="text-stone text-xs mb-1">Start Date</div>
                      <div className="font-mono text-espresso">{lease.start_date}</div>
                    </div>
                    <div className="p-3 bg-white border border-dust rounded-xl">
                      <div className="text-stone text-xs mb-1">End Date</div>
                      <div className="font-mono text-espresso">{lease.end_date || '—'}</div>
                    </div>
                    <div className="p-3 bg-white border border-dust rounded-xl">
                      <div className="text-stone text-xs mb-1">Monthly Rent</div>
                      <div className="font-mono text-espresso">
                        AED {Number(lease.monthly_rent).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-white border border-dust rounded-xl">
                      <div className="text-stone text-xs mb-1">Deposit</div>
                      <div className="font-mono text-espresso">
                        AED {Number(lease.deposit_paid).toLocaleString()} /{' '}
                        {Number(lease.deposit_amount).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                {bed?.payment_history && bed.payment_history.length > 0 && (
                  <div className="border-t border-dust pt-4">
                    <div className="text-xs uppercase tracking-wider text-stone mb-3">
                      <Icon icon={DollarSign} size={12} className="inline mr-1" />
                      Payment History (Last 6 Months)
                    </div>
                    <div className="space-y-1">
                      {bed.payment_history.slice(0, 6).map((r: any) => {
                        const paid = Number(r.paid)
                        const rent = Number(r.rent)
                        const isPaid = paid >= rent
                        return (
                          <div
                            key={r.id}
                            className="flex justify-between items-center text-xs py-2 px-3 bg-white border border-dust rounded-lg"
                          >
                            <span className="text-stone font-medium">
                              {monthName(r.month)} {r.year}
                            </span>
                            <span
                              className={`font-mono ${
                                isPaid ? 'text-teal' : paid > 0 ? 'text-amber' : 'text-rust'
                              }`}
                            >
                              AED {paid.toLocaleString()} / {rent.toLocaleString()}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t border-dust pt-4 space-y-2">
                  <button
                    onClick={() => setPayOpen(true)}
                    className="w-full h-11 rounded-full bg-teal text-white text-xs font-medium hover:bg-teal/90 transition-all"
                  >
                    <Icon icon={DollarSign} size={14} className="inline mr-2" />
                    Log Payment
                  </button>

                  {/* Notice badge (if notice given) */}
                  {lease.notice_given_date && lease.days_until_checkout !== null && (
                    <div className="p-3 bg-amber/10 border border-amber/30 rounded-xl">
                      <div className="text-xs text-amber flex items-center gap-2">
                        <Icon icon={LogOut} size={14} />
                        <span>
                          Checkout in {lease.days_until_checkout} day{lease.days_until_checkout !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Checkout button (active/notice_given leases only) */}
                  {(lease.status === 'active' || lease.status === 'notice_given') && (
                    <button
                      onClick={() => setCheckoutOpen(true)}
                      className="w-full h-11 rounded-full text-white text-xs font-medium transition-all"
                      style={{
                        background: lease.status === 'notice_given' ? '#B8883D' : '#1A1816',
                      }}
                    >
                      <Icon icon={LogOut} size={14} className="inline mr-2" />
                      {lease.status === 'notice_given' ? 'Complete Checkout' : 'Give Notice / Checkout'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-espresso/10 hover:bg-espresso/20 grid place-items-center transition-colors"
            >
              <Icon icon={X} size={16} className="text-espresso" />
            </button>
          </motion.div>

          {/* Payment Dialog */}
          {lease && (
            <LogPaymentDialog
              open={payOpen}
              onClose={() => setPayOpen(false)}
              room={{
                id: bed?.room_id,
                room_number: bed?.room?.room_number,
                active_lease: {
                  id: lease.id,
                  tenant: lease.tenant,
                  deposit_amount: lease.deposit_amount,
                  deposit_paid: lease.deposit_paid,
                },
              }}
              paymentType="rent"
            />
          )}

          {/* Checkout Wizard */}
          {lease && (
            <CheckoutWizard
              open={checkoutOpen}
              onClose={() => setCheckoutOpen(false)}
              lease={{
                ...lease,
                room_number: bed?.room?.room_number,
                bedspace_id: bedspaceId,
                camp_id: bed?.camp_id,
              }}
            />
          )}

          {/* Phase 4B.6: Occupant Dialogs */}
          {lease && (
            <>
              <AddOccupantDialog
                isOpen={addOccupantOpen}
                onClose={() => setAddOccupantOpen(false)}
                leaseId={lease.id}
                roomId={bed?.room_id}
                bedspaceId={bedspaceId}
                bedNumber={bed?.bed_number}
              />

              {selectedOccupant && (
                <>
                  <ArchiveOccupantDialog
                    isOpen={archiveOccupantOpen}
                    onClose={() => {
                      setArchiveOccupantOpen(false)
                      setSelectedOccupant(null)
                    }}
                    occupant={selectedOccupant}
                    leaseId={lease.id}
                    roomId={bed?.room_id}
                  />

                  <SwapOccupantDialog
                    isOpen={swapOccupantOpen}
                    onClose={() => {
                      setSwapOccupantOpen(false)
                      setSelectedOccupant(null)
                    }}
                    occupant={selectedOccupant}
                    leaseId={lease.id}
                    roomId={bed?.room_id}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </AnimatePresence>
  )
}
