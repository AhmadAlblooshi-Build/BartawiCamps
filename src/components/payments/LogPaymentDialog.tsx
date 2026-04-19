'use client'

/**
 * LogPaymentDialog - Phase 4A Write Layer
 *
 * Three-step wizard for logging rent/deposit payments with transactional integrity.
 * - Step 1: Amount entry with overpayment/partial payment validation
 * - Step 2: Payment method selection with conditional forms (cheque/bank_transfer)
 * - Step 3: Confirmation summary
 *
 * Design: Desert Software aesthetic with Fraunces italic titles, Geist body, JetBrains Mono for amounts
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatMethod, paymentMethodDetails, getTodayISO, type PaymentMethod } from '@/lib/payment-helpers'
import { invalidatePaymentCaches } from '@/lib/cache-invalidation'
import { toast } from 'sonner'

interface LogPaymentDialogProps {
  open: boolean
  onClose: () => void
  room: {
    id: string
    room_number: string
    camp_id?: string
    current_month?: {
      id: string
      balance: number
      rent: number
      paid: number
      lease_id?: string
      tenant?: any
    }
    active_lease?: {
      id: string
      tenant?: any
      deposit_amount: number
      deposit_paid: number
    }
  }
  paymentType?: 'rent' | 'deposit'
}

type Step = 1 | 2 | 3

interface PaymentData {
  lease_id: string
  monthly_record_id?: string
  target_month?: number
  target_year?: number
  amount: number
  payment_date: string
  method: PaymentMethod
  payment_type: 'rent' | 'deposit'
  cheque_number?: string
  cheque_bank?: string
  cheque_date?: string
  transfer_reference?: string
  transfer_bank?: string
  notes?: string
}

export function LogPaymentDialog({ open, onClose, room, paymentType = 'rent' }: LogPaymentDialogProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>(1)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [paymentDate, setPaymentDate] = useState(getTodayISO())
  const [notes, setNotes] = useState('')

  // Cheque fields
  const [chequeNumber, setChequeNumber] = useState('')
  const [chequeBank, setChequeBank] = useState('')
  const [chequeDate, setChequeDate] = useState('')

  // Bank transfer fields
  const [transferReference, setTransferReference] = useState('')
  const [transferBank, setTransferBank] = useState('')

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1)
      setAmount('')
      setMethod('cash')
      setPaymentDate(getTodayISO())
      setNotes('')
      setChequeNumber('')
      setChequeBank('')
      setChequeDate('')
      setTransferReference('')
      setTransferBank('')
    }
  }, [open])

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  // Determine lease and balance info
  const lease = paymentType === 'rent'
    ? {
        id: room?.current_month?.lease_id || room?.active_lease?.id || '',
        tenant: room?.current_month?.tenant || room?.active_lease?.tenant
      }
    : { id: room?.active_lease?.id || '', tenant: room?.active_lease?.tenant }

  const maxAmount = paymentType === 'rent'
    ? room?.current_month?.balance || 0
    : (room?.active_lease?.deposit_amount || 0) - (room?.active_lease?.deposit_paid || 0)

  const amountNum = parseFloat(amount) || 0
  const isOverpayment = amountNum > maxAmount
  const isPartialPayment = amountNum > 0 && amountNum < maxAmount
  const canContinueStep1 = amountNum > 0 && amountNum <= maxAmount

  // Mutation
  const createPaymentMutation = useMutation({
    mutationFn: (data: PaymentData) => endpoints.createPayment(data),
    onSuccess: () => {
      // Invalidate all caches affected by payment write (centralized helper)
      invalidatePaymentCaches(queryClient, {
        roomId: room?.id,
        leaseId: lease?.id,
        tenantId: lease?.tenant?.id,
      })

      toast.success('Payment logged successfully')
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to log payment')
    },
  })

  const handleSubmit = () => {
    if (!lease?.id) {
      toast.error('No active lease found')
      return
    }

    const data: PaymentData = {
      lease_id: lease.id,
      monthly_record_id: paymentType === 'rent' ? room?.current_month?.id : undefined,
      target_month: paymentType === 'rent' && !room?.current_month?.id ? room?.current_month?.month : undefined,
      target_year: paymentType === 'rent' && !room?.current_month?.id ? room?.current_month?.year : undefined,
      amount: amountNum,
      payment_date: paymentDate,
      method,
      payment_type: paymentType,
      notes: notes || undefined,
    }

    // Add method-specific fields
    if (method === 'cheque') {
      data.cheque_number = chequeNumber
      data.cheque_bank = chequeBank
      data.cheque_date = chequeDate || undefined
    } else if (method === 'bank_transfer') {
      data.transfer_reference = transferReference
      data.transfer_bank = transferBank
    }

    createPaymentMutation.mutate(data)
  }

  const { requiresCheque, requiresTransfer } = paymentMethodDetails(method)

  const canContinueStep2 =
    (method === 'cheque' && chequeNumber && chequeBank) ||
    (method === 'bank_transfer' && transferReference && transferBank) ||
    (!requiresCheque && !requiresTransfer)

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'rgba(26, 24, 22, 0.4)' }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-2xl"
            style={{ backgroundColor: '#FAF7F2' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b px-6 py-4" style={{ borderColor: '#E5DFD5' }}>
              <h2
                className="text-2xl italic"
                style={{ fontFamily: 'Fraunces', color: '#1A1816' }}
              >
                Log {paymentType === 'rent' ? 'Rent' : 'Deposit'} Payment
              </h2>
              <p className="mt-1 text-sm" style={{ fontFamily: 'Geist', color: '#6B6662' }}>
                Room {room.room_number} • Step {step} of 3
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Step 1: Amount */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Geist', color: '#1A1816' }}>
                      Payment Amount
                    </label>
                    <div className="relative">
                      <span
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-lg"
                        style={{ fontFamily: 'JetBrains Mono', color: '#6B6662' }}
                      >
                        AED
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full rounded-md border px-4 py-3 pl-16 text-lg"
                        style={{
                          fontFamily: 'JetBrains Mono',
                          borderColor: isOverpayment ? '#A84A3B' : '#D4CEC4',
                          backgroundColor: '#FFFFFF',
                          color: '#1A1816',
                        }}
                        placeholder="0.00"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Balance info */}
                  <div className="rounded-md p-3" style={{ backgroundColor: '#F0EBE3' }}>
                    <div className="flex justify-between text-sm" style={{ fontFamily: 'Geist' }}>
                      <span style={{ color: '#6B6662' }}>
                        {paymentType === 'rent' ? 'Outstanding balance' : 'Remaining deposit'}
                      </span>
                      <span style={{ fontFamily: 'JetBrains Mono', color: '#1A1816' }}>
                        AED {maxAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Validation messages */}
                  {isOverpayment && (
                    <div className="rounded-md p-3" style={{ backgroundColor: '#FEF2F2', borderLeft: '3px solid #A84A3B' }}>
                      <p className="text-sm" style={{ fontFamily: 'Geist', color: '#A84A3B' }}>
                        ⚠️ Amount exceeds outstanding balance. Maximum: AED {maxAmount.toFixed(2)}
                      </p>
                    </div>
                  )}

                  {isPartialPayment && (
                    <div className="rounded-md p-3" style={{ backgroundColor: '#F0F9FF', borderLeft: '3px solid #1E4D52' }}>
                      <p className="text-sm" style={{ fontFamily: 'Geist', color: '#1E4D52' }}>
                        ℹ️ Partial payment. Remaining after payment: AED {(maxAmount - amountNum).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Geist', color: '#1A1816' }}>
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full rounded-md border px-4 py-2"
                      style={{
                        fontFamily: 'Geist',
                        borderColor: '#D4CEC4',
                        backgroundColor: '#FFFFFF',
                        color: '#1A1816',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Method */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Geist', color: '#1A1816' }}>
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['cash', 'cheque', 'bank_transfer', 'card', 'other'] as PaymentMethod[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMethod(m)}
                          className="rounded-md border px-4 py-3 text-sm font-medium transition-colors"
                          style={{
                            fontFamily: 'Geist',
                            borderColor: method === m ? '#1A1816' : '#D4CEC4',
                            backgroundColor: method === m ? '#1A1816' : '#FFFFFF',
                            color: method === m ? '#FAF7F2' : '#1A1816',
                          }}
                        >
                          {formatMethod(m)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cheque fields */}
                  {requiresCheque && (
                    <div className="space-y-3 rounded-md border p-4" style={{ borderColor: '#D4CEC4', backgroundColor: '#F0EBE3' }}>
                      <p className="text-sm font-medium" style={{ fontFamily: 'Geist', color: '#1A1816' }}>
                        Cheque Details
                      </p>
                      <input
                        type="text"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        placeholder="Cheque number"
                        className="w-full rounded-md border px-3 py-2"
                        style={{
                          fontFamily: 'JetBrains Mono',
                          borderColor: '#D4CEC4',
                          backgroundColor: '#FFFFFF',
                          color: '#1A1816',
                        }}
                      />
                      <input
                        type="text"
                        value={chequeBank}
                        onChange={(e) => setChequeBank(e.target.value)}
                        placeholder="Bank name"
                        className="w-full rounded-md border px-3 py-2"
                        style={{
                          fontFamily: 'Geist',
                          borderColor: '#D4CEC4',
                          backgroundColor: '#FFFFFF',
                          color: '#1A1816',
                        }}
                      />
                      <input
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        placeholder="Cheque date (optional)"
                        className="w-full rounded-md border px-3 py-2"
                        style={{
                          fontFamily: 'Geist',
                          borderColor: '#D4CEC4',
                          backgroundColor: '#FFFFFF',
                          color: '#1A1816',
                        }}
                      />
                    </div>
                  )}

                  {/* Bank transfer fields */}
                  {requiresTransfer && (
                    <div className="space-y-3 rounded-md border p-4" style={{ borderColor: '#D4CEC4', backgroundColor: '#F0EBE3' }}>
                      <p className="text-sm font-medium" style={{ fontFamily: 'Geist', color: '#1A1816' }}>
                        Transfer Details
                      </p>
                      <input
                        type="text"
                        value={transferReference}
                        onChange={(e) => setTransferReference(e.target.value)}
                        placeholder="Reference number"
                        className="w-full rounded-md border px-3 py-2"
                        style={{
                          fontFamily: 'JetBrains Mono',
                          borderColor: '#D4CEC4',
                          backgroundColor: '#FFFFFF',
                          color: '#1A1816',
                        }}
                      />
                      <input
                        type="text"
                        value={transferBank}
                        onChange={(e) => setTransferBank(e.target.value)}
                        placeholder="Bank name"
                        className="w-full rounded-md border px-3 py-2"
                        style={{
                          fontFamily: 'Geist',
                          borderColor: '#D4CEC4',
                          backgroundColor: '#FFFFFF',
                          color: '#1A1816',
                        }}
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'Geist', color: '#1A1816' }}>
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Additional notes..."
                      className="w-full rounded-md border px-3 py-2"
                      style={{
                        fontFamily: 'Geist',
                        borderColor: '#D4CEC4',
                        backgroundColor: '#FFFFFF',
                        color: '#1A1816',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-md border p-4 space-y-3" style={{ borderColor: '#D4CEC4' }}>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ fontFamily: 'Geist', color: '#6B6662' }}>Amount</span>
                      <span className="font-medium" style={{ fontFamily: 'JetBrains Mono', color: '#1A1816' }}>
                        AED {amountNum.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ fontFamily: 'Geist', color: '#6B6662' }}>Method</span>
                      <span className="font-medium" style={{ fontFamily: 'Geist', color: '#1A1816' }}>
                        {formatMethod(method)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm" style={{ fontFamily: 'Geist', color: '#6B6662' }}>Date</span>
                      <span className="font-medium" style={{ fontFamily: 'Geist', color: '#1A1816' }}>
                        {paymentDate}
                      </span>
                    </div>

                    {requiresCheque && (
                      <>
                        <div className="border-t pt-2 mt-2" style={{ borderColor: '#E5DFD5' }} />
                        <div className="flex justify-between">
                          <span className="text-sm" style={{ fontFamily: 'Geist', color: '#6B6662' }}>Cheque #</span>
                          <span className="font-medium" style={{ fontFamily: 'JetBrains Mono', color: '#1A1816' }}>
                            {chequeNumber}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm" style={{ fontFamily: 'Geist', color: '#6B6662' }}>Bank</span>
                          <span className="font-medium" style={{ fontFamily: 'Geist', color: '#1A1816' }}>
                            {chequeBank}
                          </span>
                        </div>
                      </>
                    )}

                    {requiresTransfer && (
                      <>
                        <div className="border-t pt-2 mt-2" style={{ borderColor: '#E5DFD5' }} />
                        <div className="flex justify-between">
                          <span className="text-sm" style={{ fontFamily: 'Geist', color: '#6B6662' }}>Reference</span>
                          <span className="font-medium" style={{ fontFamily: 'JetBrains Mono', color: '#1A1816' }}>
                            {transferReference}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm" style={{ fontFamily: 'Geist', color: '#6B6662' }}>Bank</span>
                          <span className="font-medium" style={{ fontFamily: 'Geist', color: '#1A1816' }}>
                            {transferBank}
                          </span>
                        </div>
                      </>
                    )}

                    {notes && (
                      <>
                        <div className="border-t pt-2 mt-2" style={{ borderColor: '#E5DFD5' }} />
                        <div>
                          <span className="text-sm block mb-1" style={{ fontFamily: 'Geist', color: '#6B6662' }}>Notes</span>
                          <p className="text-sm" style={{ fontFamily: 'Geist', color: '#1A1816' }}>{notes}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {isPartialPayment && (
                    <div className="rounded-md p-3" style={{ backgroundColor: '#F0F9FF', borderLeft: '3px solid #1E4D52' }}>
                      <p className="text-sm" style={{ fontFamily: 'Geist', color: '#1E4D52' }}>
                        Remaining balance after payment: AED {(maxAmount - amountNum).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 flex gap-3" style={{ borderColor: '#E5DFD5' }}>
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  disabled={createPaymentMutation.isPending}
                  className="px-4 py-2 rounded-md font-medium transition-colors"
                  style={{
                    fontFamily: 'Geist',
                    backgroundColor: '#FFFFFF',
                    color: '#1A1816',
                    border: '1px solid #D4CEC4',
                  }}
                >
                  Back
                </button>
              )}

              <button
                onClick={onClose}
                disabled={createPaymentMutation.isPending}
                className="px-4 py-2 rounded-md font-medium transition-colors"
                style={{
                  fontFamily: 'Geist',
                  backgroundColor: '#FFFFFF',
                  color: '#6B6662',
                  border: '1px solid #D4CEC4',
                }}
              >
                Cancel
              </button>

              <div className="flex-1" />

              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => (s + 1) as Step)}
                  disabled={step === 1 ? !canContinueStep1 : !canContinueStep2}
                  className="px-6 py-2 rounded-md font-medium transition-opacity"
                  style={{
                    fontFamily: 'Geist',
                    backgroundColor: '#1A1816',
                    color: '#FAF7F2',
                    opacity: (step === 1 ? !canContinueStep1 : !canContinueStep2) ? 0.5 : 1,
                    cursor: (step === 1 ? !canContinueStep1 : !canContinueStep2) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={createPaymentMutation.isPending}
                  className="px-6 py-2 rounded-md font-medium transition-opacity"
                  style={{
                    fontFamily: 'Geist',
                    backgroundColor: '#1E4D52',
                    color: '#FAF7F2',
                    opacity: createPaymentMutation.isPending ? 0.5 : 1,
                    cursor: createPaymentMutation.isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {createPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
