'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { endpoints } from '@/lib/api'
import { Icon } from '@/components/ui/Icon'
import { X, User, Calendar, DollarSign, FileText } from 'lucide-react'
import { LogPaymentDialog } from '@/components/payments/LogPaymentDialog'

const SPRING = { type: 'spring' as const, stiffness: 340, damping: 32 }

interface BedInteriorProps {
  bedspaceId: string | null
  onClose: () => void
}

const monthName = (m: number) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]

export default function BedInterior({ bedspaceId, onClose }: BedInteriorProps) {
  const [payOpen, setPayOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['bedspace', bedspaceId],
    queryFn: () => endpoints.bedspace(bedspaceId!),
    enabled: !!bedspaceId,
  })

  if (!bedspaceId) return null

  // Phase 4B.5: Backend returns flat response, not wrapped in .bedspace
  const bed = data
  const lease = bed?.active_lease

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
                {bed ? `Room ${bed.room_number} · Bed ${bed.bed_number}` : 'Loading...'}
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
                {/* Tenant Info */}
                <div>
                  <div className="text-xs uppercase tracking-wider text-stone mb-2">
                    <Icon icon={User} size={12} className="inline mr-1" />
                    Tenant
                  </div>
                  <div className="font-display italic text-lg text-espresso">
                    {lease.tenant?.full_name || lease.tenant?.company_name}
                  </div>
                  {lease.tenant?.national_id && (
                    <div className="text-xs text-stone font-mono mt-1">
                      ID: {lease.tenant.national_id}
                    </div>
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
                  <button
                    disabled
                    className="w-full h-11 rounded-full border border-stone text-stone text-xs font-medium opacity-50 cursor-not-allowed"
                  >
                    <Icon icon={FileText} size={14} className="inline mr-2" />
                    Give Notice (Phase 4C)
                  </button>
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
                room_number: bed?.room_number,
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
        </>
      )}
    </AnimatePresence>
  )
}
