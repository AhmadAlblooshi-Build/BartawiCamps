'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { X, ArrowUpRight, Warning } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { formatAED, cn } from '@/lib/utils'
import { scaleUp, slideUp } from '@/lib/motion'

export function CompleteCheckoutModal({ room, onClose }: { room: any; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [checkoutDate, setCheckoutDate] = useState(today)
  const [reason, setReason] = useState('')
  const [inspection, setInspection] = useState('')
  const [depositAction, setDepositAction] = useState<'refund_full' | 'refund_partial' | 'forfeit_full' | 'none'>('refund_full')
  const [refundAmt, setRefundAmt] = useState(0)
  const [forfeitAmt, setForfeitAmt] = useState(0)
  const [depositReason, setDepositReason] = useState('')
  const [settleBalance, setSettleBalance] = useState(false)

  const qc = useQueryClient()

  const { data: balance } = useQuery({ queryKey: ['room-balance', room.id], queryFn: () => endpoints.roomBalance(room.id) })
  const { data: deposits } = useQuery({
    queryKey: ['room-deposits', room.id],
    queryFn: () => endpoints.deposits({ room_id: room.id, status: 'held' }),
  })

  const outstanding = balance?.outstanding ?? 0
  const blocked = outstanding > 0 && !settleBalance
  const hasDeposit = (deposits?.data?.length ?? 0) > 0

  const mutation = useMutation({
    mutationFn: () => endpoints.completeCheckout({
      camp_id: room.camp_id, room_id: room.id,
      occupancy_id: room.current_occupancy?.id,
      actual_checkout_date: checkoutDate,
      reason_for_leaving: reason,
      inspection_notes: inspection,
      final_balance_settled: settleBalance,
      deposit_action: depositAction,
      deposit_refund_amount: refundAmt,
      deposit_forfeit_amount: forfeitAmt,
      deposit_reason: depositReason,
    }),
    onSuccess: () => {
      toast.success('Checkout complete', { description: `Room ${room.room_number} is now vacant.` })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room', room.id] })
      onClose()
    },
    onError: (err: any) => toast.error(err.message || 'Failed to complete checkout'),
  })

  return (
    <Dialog.Root open onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50 animate-fade" />
        <Dialog.Content asChild>
          <motion.div
            variants={scaleUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-1/2 top-[6vh] -translate-x-1/2 w-[640px] max-w-[calc(100vw-2rem)] max-h-[88vh] bg-white rounded-2xl shadow-raise-4 z-50 flex flex-col overflow-hidden"
          >
            <Dialog.Title className="sr-only">Complete checkout</Dialog.Title>
            <header className="flex items-center justify-between px-6 h-14 border-b border-[color:var(--color-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rust text-white grid place-items-center"><Icon icon={ArrowUpRight} size={14} /></div>
                <div className="display-xs">Complete checkout · Room {room.room_number}</div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-sand-100"><Icon icon={X} size={14} /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {outstanding > 0 && (
                <motion.div
                  variants={slideUp}
                  initial="hidden"
                  animate="visible"
                  className={cn('flex items-start gap-3 p-4 rounded-lg border-2', blocked ? 'bg-rust-pale border-rust' : 'bg-ochre-pale border-ochre')}
                >
                  <Icon icon={Warning} size={16} className={blocked ? 'text-rust' : 'text-ochre'} emphasis />
                  <div className="flex-1">
                    <div className={cn('text-[13px] font-semibold', blocked ? 'text-rust' : 'text-ochre')}>
                      Outstanding balance: {formatAED(outstanding)}
                    </div>
                    <div className="text-[12px] text-espresso-soft mt-1">
                      Checkout cannot complete while balance exists. Either collect payment first or tick the box below to write it off.
                    </div>
                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                      <input type="checkbox" checked={settleBalance} onChange={e => setSettleBalance(e.target.checked)}
                        className="w-4 h-4 accent-rust cursor-pointer" />
                      <span className="text-[12px] font-medium text-espresso">Write off balance as unrecoverable</span>
                    </label>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Actual checkout date *</span>
                  <input type="date" value={checkoutDate} onChange={e => setCheckoutDate(e.target.value)}
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Reason for leaving *</span>
                  <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="Contract end, termination, company change..."
                    className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none" />
                </label>
                <div className="col-span-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Inspection notes</span>
                    <textarea value={inspection} onChange={e => setInspection(e.target.value)} rows={3}
                      placeholder="Room condition, damages, keys returned..."
                      className="px-3 py-2 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none resize-none" />
                  </label>
                </div>
              </div>

              {hasDeposit && (
                <div>
                  <div className="eyebrow mb-3">Deposit handling</div>
                  <div className="bezel p-4 space-y-4">
                    <div className="text-[12px] text-espresso-muted">
                      Held deposits: {deposits?.data?.map((d: any) => formatAED(d.amount)).join(' + ')} total
                    </div>
                    <div className="space-y-2">
                      {[
                        { v: 'refund_full',    l: 'Refund full deposit' },
                        { v: 'refund_partial', l: 'Partial refund' },
                        { v: 'forfeit_full',   l: 'Forfeit all deposits' },
                        { v: 'none',           l: 'Skip deposit handling' },
                      ].map(opt => (
                        <label key={opt.v} className="flex items-center gap-3 p-3 rounded-lg border border-sand-200 cursor-pointer hover:bg-sand-50 transition-colors">
                          <input
                            type="radio"
                            name="depositAction"
                            checked={depositAction === opt.v}
                            onChange={() => setDepositAction(opt.v as any)}
                            className="w-4 h-4 accent-espresso cursor-pointer"
                          />
                          <span className="text-[12px] font-medium text-espresso">{opt.l}</span>
                        </label>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      {depositAction === 'refund_partial' && (
                        <motion.div
                          variants={slideUp}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="grid grid-cols-2 gap-3 pt-2"
                        >
                          <label className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-espresso-muted">Refund amount</span>
                            <input type="number" value={refundAmt} onChange={e => setRefundAmt(Number(e.target.value) || 0)}
                              className="h-9 px-2 bg-white border border-[color:var(--color-border-medium)] rounded text-[12px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                          </label>
                          <label className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-espresso-muted">Forfeit amount</span>
                            <input type="number" value={forfeitAmt} onChange={e => setForfeitAmt(Number(e.target.value) || 0)}
                              className="h-9 px-2 bg-white border border-[color:var(--color-border-medium)] rounded text-[12px] font-mono tabular focus:border-amber-500 focus:outline-none" />
                          </label>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                      {(depositAction === 'forfeit_full' || (depositAction === 'refund_partial' && forfeitAmt > 0)) && (
                        <motion.label
                          variants={slideUp}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="flex flex-col gap-1.5 pt-2"
                        >
                          <span className="text-[10px] font-medium uppercase tracking-wide text-espresso-muted">Forfeiture reason *</span>
                          <input type="text" value={depositReason} onChange={e => setDepositReason(e.target.value)}
                            placeholder="Damage, unpaid rent, early termination..."
                            className="h-9 px-2 bg-white border border-[color:var(--color-border-medium)] rounded text-[12px] focus:border-amber-500 focus:outline-none" />
                        </motion.label>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex justify-end gap-2">
              <button onClick={onClose} className="px-4 h-9 rounded-full text-[12px] font-medium text-espresso-muted hover:text-espresso">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={mutation.isPending || blocked || !reason}
                className="px-4 h-9 rounded-full bg-rust text-white text-[12px] font-medium hover:bg-rust/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]">
                {mutation.isPending ? 'Completing…' : 'Complete checkout'}
              </button>
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
