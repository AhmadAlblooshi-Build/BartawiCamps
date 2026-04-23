'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { invalidateCheckoutCaches } from '@/lib/cache-invalidation'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/Icon'
import {
  X, Calendar, ClipboardCheck, DollarSign, CheckCircle2, AlertTriangle,
  AlertCircle, ArrowRight, ArrowLeft, Home, Trash2, Plus, User
} from 'lucide-react'

const SPRING = { type: 'spring' as const, stiffness: 340, damping: 32 }

interface CheckoutWizardProps {
  open: boolean
  onClose: () => void
  lease: {
    id: string
    room_tenant_id: string
    room_id: string
    bedspace_id?: string | null
    status: string
    monthly_rent: number
    deposit_paid: number
    notice_given_date?: string | null
    scheduled_checkout_date?: string | null
    tenant: { full_name?: string; company_name?: string; is_company: boolean }
    room: { room_number: string; camp_id?: string }
  }
}

type Step = 'notice' | 'inspection' | 'damages' | 'refund' | 'processing' | 'done'

interface DamageItem {
  id: string
  category: 'wall' | 'plumbing' | 'furniture' | 'cleaning' | 'utility' | 'prorated_rent' | 'other'
  description: string
  amount: string
}

interface CheckoutData {
  // Notice
  notice_given_date: string
  scheduled_checkout_date: string
  notice_notes?: string

  // Inspection
  checkout_date: string
  checkout_type: 'normal' | 'early_termination' | 'eviction'
  inspection_notes: string
  condition_rating: number
  inspected_by: string

  // Damages
  damages: DamageItem[]

  // Refund & Closure
  closure_reason: 'end_of_term' | 'mutual_early' | 'tenant_abandoned' | 'landlord_eviction' | 'legal_action' | 'other'  // Phase 4C
  refund_method: 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'adjustment'
  refund_reference: string
  process_refund: boolean
  checked_out_by_name: string  // Phase 4C: renamed from processed_by
  acknowledge_early_checkout: boolean  // Phase 4C: early checkout gate
}

export default function CheckoutWizard({ open, onClose, lease }: CheckoutWizardProps) {
  const [step, setStep] = useState<Step>('notice')
  const [data, setData] = useState<CheckoutData>({
    notice_given_date: lease.notice_given_date || new Date().toISOString().split('T')[0],  // Safe: top-level prop
    scheduled_checkout_date: lease.scheduled_checkout_date || '',  // Safe: top-level prop
    checkout_date: new Date().toISOString().split('T')[0],
    checkout_type: 'normal',
    inspection_notes: '',
    condition_rating: 5,
    inspected_by: '',
    damages: [],
    closure_reason: 'end_of_term',  // Phase 4C
    refund_method: 'cash',
    refund_reference: '',
    process_refund: true,
    checked_out_by_name: '',  // Phase 4C: renamed from processed_by
    acknowledge_early_checkout: false,  // Phase 4C
  })
  const [checkoutResult, setCheckoutResult] = useState<any>(null)
  const queryClient = useQueryClient()

  // SSR-safe portal mounting
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); return () => setMounted(false) }, [])

  // Fetch checkout preview data
  const previewQuery = useQuery({
    queryKey: ['checkout-preview', lease?.id, data.checkout_date],
    queryFn: () => endpoints.checkoutPreview(lease.id, data.checkout_date),
    enabled: open && !!lease?.id && mounted,
    retry: false,
  })
  const preview = previewQuery.data

  // Compute financial preview (using server-authoritative values from preview)
  const damagesTotal = data.damages.reduce(
    (sum, d) => sum + (parseFloat(d.amount) || 0), 0
  )
  const depositPaid = preview?.deposit_paid || 0
  const outstandingRent = preview?.outstanding_rent || 0
  const totalOwed = damagesTotal + outstandingRent
  const refundAmount = Math.max(0, depositPaid - totalOwed)
  const forfeitAmount = depositPaid - refundAmount
  const additionalOwed = Math.max(0, totalOwed - depositPaid)

  // Phase 4C: Early checkout detection
  const isEarlyCheckout = useMemo(() => {
    if (!preview?.lease.notice_given_date) return false
    const notice = new Date(preview.lease.notice_given_date)
    const out = new Date(data.checkout_date + 'T00:00:00Z')
    const days = Math.floor((out.getTime() - notice.getTime()) / (1000 * 60 * 60 * 24))
    const result = days < 10

    // BUG 2 DIAGNOSTIC
    console.log('[CHECKOUT-DEBUG]', {
      notice_given_date: preview?.lease.notice_given_date,
      checkout_date: data.checkout_date,
      days_since_notice: days,
      isEarlyCheckout: result,
    })

    return result
  }, [preview?.lease.notice_given_date, data.checkout_date])

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: () => endpoints.checkoutLease(lease.id, {
      checkout_date: data.checkout_date,
      checkout_type: data.checkout_type,
      closure_reason: data.closure_reason,  // Phase 4C
      inspection_notes: data.inspection_notes || undefined,
      condition_rating: data.condition_rating,
      inspected_by: data.inspected_by || undefined,
      damages: data.damages.map(d => ({
        category: d.category,
        description: d.description,
        amount: parseFloat(d.amount) || 0,
      })),
      refund_method: data.refund_method,
      refund_reference: data.refund_reference || undefined,
      process_refund: data.process_refund,
      checked_out_by_name: data.checked_out_by_name || undefined,  // Phase 4C: renamed from processed_by
      acknowledge_early_checkout: data.acknowledge_early_checkout,  // Phase 4C
    }),
    retry: false,
    onSuccess: (result) => {
      invalidateCheckoutCaches(queryClient, {
        leaseId: lease.id,
        roomId: preview?.room.id,
        bedspaceId: preview?.bedspace?.id,
        tenantId: preview?.tenant.id,
        campId: preview?.room.camp_id,
      })
      toast.success('Checkout processed successfully')
      setCheckoutResult(result)
      setStep('done')
    },
    onError: (err: any) => {
      // Phase 4C: Handle early checkout acknowledgment error
      if (err?.msg === 'early_checkout_requires_acknowledgment') {
        const days = err?.days_since_notice || 0
        toast.error('Early Checkout', {
          description: `Only ${days} day${days !== 1 ? 's' : ''} since notice. Please acknowledge and resubmit.`
        })
        setStep('refund')  // Return to refund step to acknowledge
        return
      }
      toast.error('Checkout failed', { description: err?.message || err?.msg || 'Unknown error' })
    },
  })

  // Give notice mutation (if lease not already in notice_given status)
  const noticeMutation = useMutation({
    mutationFn: () => endpoints.giveNotice(lease.id, {
      notice_given_date: data.notice_given_date,
      scheduled_checkout_date: data.scheduled_checkout_date,
      notes: data.notice_notes,
    }),
    retry: false,
    onSuccess: () => {
      toast.success('Notice recorded')
      invalidateCheckoutCaches(queryClient, {
        leaseId: lease.id,
        roomId: preview?.room.id,
        bedspaceId: preview?.bedspace?.id,
        tenantId: preview?.tenant.id,
        campId: preview?.room.camp_id,
      })
      setStep('inspection')
    },
    onError: (err: any) => {
      toast.error('Failed to record notice', { description: err?.message })
    },
  })

  const reset = () => {
    setStep('notice')
    setData({
      notice_given_date: new Date().toISOString().split('T')[0],
      scheduled_checkout_date: '',
      checkout_date: new Date().toISOString().split('T')[0],
      checkout_type: 'normal',
      inspection_notes: '',
      condition_rating: 5,
      inspected_by: '',
      damages: [],
      closure_reason: 'end_of_term',  // Phase 4C
      refund_method: 'cash',
      refund_reference: '',
      process_refund: true,
      checked_out_by_name: '',  // Phase 4C: renamed from processed_by
      acknowledge_early_checkout: false,  // Phase 4C
    })
    setCheckoutResult(null)
  }

  const handleClose = () => {
    if (step === 'done') {
      reset()
      onClose()
    } else if (step === 'processing') {
      // Can't close during processing
      return
    } else if (step === 'notice' && data.damages.length === 0) {
      // No progress made, close silently
      reset()
      onClose()
    } else {
      // User has made progress, show confirmation
      const confirmed = window.confirm('Close checkout wizard? Entered data will be lost.')
      if (confirmed) {
        reset()
        onClose()
      }
    }
  }

  const addDamage = () => {
    setData(prev => ({
      ...prev,
      damages: [
        ...prev.damages,
        {
          id: `damage-${Date.now()}-${Math.random()}`,
          category: 'cleaning',
          description: '',
          amount: '0',
        },
      ],
    }))
  }

  const updateDamage = (id: string, field: keyof DamageItem, value: any) => {
    setData(prev => ({
      ...prev,
      damages: prev.damages.map(d =>
        d.id === id ? { ...d, [field]: value } : d
      ),
    }))
  }

  const removeDamage = (id: string) => {
    setData(prev => ({
      ...prev,
      damages: prev.damages.filter(d => d.id !== id),
    }))
  }

  const handleNoticeStep = () => {
    // Skip if already in notice_given status
    if (preview?.lease.status === 'notice_given') {
      setStep('inspection')
      return
    }

    // Validate
    if (!data.notice_given_date) {
      toast.error('Notice date required')
      return
    }

    // Compute default scheduled checkout if not provided
    if (!data.scheduled_checkout_date) {
      const noticeDate = new Date(data.notice_given_date)
      const scheduledDate = new Date(noticeDate)
      scheduledDate.setDate(scheduledDate.getDate() + 10)
      setData(prev => ({
        ...prev,
        scheduled_checkout_date: scheduledDate.toISOString().split('T')[0],
      }))
    }

    // Record notice
    noticeMutation.mutate()
  }

  const handleInspectionStep = () => {
    // Validate
    if (!data.checkout_date) {
      toast.error('Checkout date required')
      return
    }

    setStep('damages')
  }

  const handleDamagesStep = () => {
    setStep('refund')
  }

  const handleFinalizeCheckout = () => {
    setStep('processing')
    checkoutMutation.mutate()
  }

  // SSR guard
  if (!mounted) return null
  if (!open) return null

  // Preview data loading guard
  if (previewQuery.isLoading) {
    return createPortal(
      <div className="fixed inset-0 bg-espresso/45 backdrop-blur-[6px] z-[90] flex items-center justify-center">
        <div className="bg-sand rounded-2xl shadow-2xl p-8 w-[min(400px,90vw)] text-center">
          <div className="w-8 h-8 mx-auto mb-3 border-2 border-dust border-t-espresso rounded-full animate-spin" />
          <p className="text-sm text-stone">Loading lease details…</p>
        </div>
      </div>,
      document.body
    )
  }

  // Preview data error guard
  if (previewQuery.isError || !preview?.tenant) {
    return createPortal(
      <div className="fixed inset-0 bg-espresso/45 backdrop-blur-[6px] z-[90] flex items-center justify-center">
        <div className="bg-sand rounded-2xl shadow-2xl p-6 w-[min(400px,90vw)]">
          <p className="text-sm text-rust mb-4">Failed to load lease details. Close and retry.</p>
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-dust text-stone text-xs hover:bg-dust/30 transition-colors">
            Close
          </button>
        </div>
      </div>,
      document.body
    )
  }

  const tenantName = preview.tenant.is_company ? preview.tenant.company_name : preview.tenant.full_name

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="checkout-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
        onClick={handleClose}
      />
      <motion.div
        key="checkout-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={SPRING}
        className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-8 py-6 border-b border-dust flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display italic text-espresso">Checkout: {tenantName}</h1>
            <div className="text-xs text-stone mt-1">
              Room {preview.room.room_number} {preview.is_bed_level && `· Bed-level`} · 4 Steps
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-wash transition-colors"
          >
            <Icon icon={X} size={20} className="text-stone" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="shrink-0 px-8 py-4 border-b border-wash bg-sand/30">
          <div className="flex items-center gap-2 text-xs font-medium">
            <div className={`flex items-center gap-2 ${step === 'notice' ? 'text-teal' : 'text-stone'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                ['notice'].includes(step) ? 'bg-teal text-white' : 'bg-wash text-stone'
              }`}>1</div>
              <span>Notice</span>
            </div>
            <div className="w-8 h-px bg-wash" />
            <div className={`flex items-center gap-2 ${step === 'inspection' ? 'text-teal' : 'text-stone'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                ['inspection', 'damages', 'refund', 'processing', 'done'].includes(step) ? 'bg-teal text-white' : 'bg-wash text-stone'
              }`}>2</div>
              <span>Inspection</span>
            </div>
            <div className="w-8 h-px bg-wash" />
            <div className={`flex items-center gap-2 ${step === 'damages' ? 'text-teal' : 'text-stone'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                ['damages', 'refund', 'processing', 'done'].includes(step) ? 'bg-teal text-white' : 'bg-wash text-stone'
              }`}>3</div>
              <span>Damages</span>
            </div>
            <div className="w-8 h-px bg-wash" />
            <div className={`flex items-center gap-2 ${step === 'refund' ? 'text-teal' : 'text-stone'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                ['refund', 'processing', 'done'].includes(step) ? 'bg-teal text-white' : 'bg-wash text-stone'
              }`}>4</div>
              <span>Refund</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Notice */}
            {step === 'notice' && (
              <motion.div
                key="notice-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={SPRING}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="text-center mb-8">
                  <Icon icon={Calendar} size={48} className="text-amber mx-auto mb-3" />
                  <h2 className="text-xl font-display italic text-espresso">Notice Period</h2>
                  <p className="text-sm text-stone mt-2">
                    {preview.lease.status === 'notice_given'
                      ? 'Notice already recorded. Proceeding to inspection.'
                      : 'Record formal notice before checkout.'}
                  </p>
                </div>

                {preview.lease.status !== 'notice_given' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-espresso mb-2">
                        Notice Given Date *
                      </label>
                      <input
                        type="date"
                        value={data.notice_given_date}
                        onChange={e => setData(prev => ({ ...prev, notice_given_date: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-dust focus:border-teal focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-espresso mb-2">
                        Scheduled Checkout Date
                        <span className="text-xs text-stone ml-2">(defaults to notice + 10 days)</span>
                      </label>
                      <input
                        type="date"
                        value={data.scheduled_checkout_date}
                        onChange={e => setData(prev => ({ ...prev, scheduled_checkout_date: e.target.value }))}
                        className="w-full px-4 py-3 rounded-lg border border-dust focus:border-teal focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-espresso mb-2">
                        Notes (optional)
                      </label>
                      <textarea
                        value={data.notice_notes}
                        onChange={e => setData(prev => ({ ...prev, notice_notes: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-dust focus:border-teal focus:outline-none resize-none"
                        placeholder="Reason for leaving, special circumstances..."
                      />
                    </div>
                  </div>
                )}

                {preview.lease.status === 'notice_given' && (
                  <div className="bg-amber/10 border border-amber/30 rounded-lg p-4 text-sm">
                    <div className="flex items-start gap-3">
                      <Icon icon={AlertCircle} size={20} className="text-amber shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-amber-800">Notice Already Recorded</div>
                        <div className="text-amber-700 mt-1">
                          Notice date: {new Date(preview.lease.notice_given_date!).toLocaleDateString()}
                          {preview.lease.scheduled_checkout_date && (
                            <> · Scheduled: {new Date(preview.lease.scheduled_checkout_date).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Inspection */}
            {step === 'inspection' && (
              <motion.div
                key="inspection-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={SPRING}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="text-center mb-8">
                  <Icon icon={ClipboardCheck} size={48} className="text-teal mx-auto mb-3" />
                  <h2 className="text-xl font-display italic text-espresso">Final Inspection</h2>
                  <p className="text-sm text-stone mt-2">Record room condition and checkout details.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-espresso mb-2">
                      Checkout Date *
                    </label>
                    <input
                      type="date"
                      value={data.checkout_date}
                      onChange={e => setData(prev => ({ ...prev, checkout_date: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-dust focus:border-teal focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-espresso mb-2">
                      Checkout Type
                    </label>
                    <select
                      value={data.checkout_type}
                      onChange={e => setData(prev => ({ ...prev, checkout_type: e.target.value as any }))}
                      className="w-full px-4 py-3 rounded-lg border border-dust focus:border-teal focus:outline-none"
                    >
                      <option value="normal">Normal Checkout</option>
                      <option value="early_termination">Early Termination</option>
                      <option value="eviction">Eviction</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-espresso mb-2">
                      Condition Rating
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <button
                          key={rating}
                          onClick={() => setData(prev => ({ ...prev, condition_rating: rating }))}
                          className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                            data.condition_rating === rating
                              ? 'border-teal bg-teal/10 text-teal font-medium'
                              : 'border-dust hover:border-teal/30'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-stone mt-2 flex justify-between">
                      <span>Poor</span>
                      <span>Excellent</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-espresso mb-2">
                      Inspection Notes
                    </label>
                    <textarea
                      value={data.inspection_notes}
                      onChange={e => setData(prev => ({ ...prev, inspection_notes: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-dust focus:border-teal focus:outline-none resize-none"
                      placeholder="General condition, any issues found..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-espresso mb-2">
                      Inspected By
                    </label>
                    <input
                      type="text"
                      value={data.inspected_by}
                      onChange={e => setData(prev => ({ ...prev, inspected_by: e.target.value }))}
                      className="w-full px-4 py-3 rounded-lg border border-dust focus:border-teal focus:outline-none"
                      placeholder="Inspector name"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Damages */}
            {step === 'damages' && (
              <motion.div
                key="damages-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={SPRING}
                className="max-w-3xl mx-auto space-y-6"
              >
                <div className="text-center mb-8">
                  <Icon icon={DollarSign} size={48} className="text-rust mx-auto mb-3" />
                  <h2 className="text-xl font-display italic text-espresso">Damage Charges</h2>
                  <p className="text-sm text-stone mt-2">Add any charges to be deducted from deposit.</p>
                </div>

                <div className="space-y-4">
                  {data.damages.map((damage) => (
                    <div key={damage.id} className="flex gap-3 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <select
                          value={damage.category}
                          onChange={e => updateDamage(damage.id, 'category', e.target.value)}
                          className="px-3 py-2 rounded-lg border border-dust focus:border-teal focus:outline-none text-sm"
                        >
                          <option value="wall">Wall Damage</option>
                          <option value="plumbing">Plumbing</option>
                          <option value="furniture">Furniture</option>
                          <option value="cleaning">Cleaning</option>
                          <option value="utility">Utility</option>
                          <option value="prorated_rent">Prorated Rent</option>
                          <option value="other">Other</option>
                        </select>
                        <input
                          type="text"
                          value={damage.description}
                          onChange={e => updateDamage(damage.id, 'description', e.target.value)}
                          placeholder="Description"
                          className="px-3 py-2 rounded-lg border border-dust focus:border-teal focus:outline-none text-sm"
                        />
                        <input
                          type="number"
                          value={damage.amount}
                          onChange={e => updateDamage(damage.id, 'amount', e.target.value)}
                          placeholder="Amount (AED)"
                          min="0"
                          step="0.01"
                          className="px-3 py-2 rounded-lg border border-dust focus:border-teal focus:outline-none text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeDamage(damage.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rust/10 text-rust transition-colors"
                      >
                        <Icon icon={Trash2} size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addDamage}
                    className="w-full py-3 rounded-lg border-2 border-dashed border-dust hover:border-teal text-sm font-medium text-stone hover:text-teal transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon icon={Plus} size={16} />
                    Add Damage Charge
                  </button>
                </div>

                {/* Financial Summary */}
                <div className="bg-sand/50 rounded-lg p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone">Deposit Paid:</span>
                    <span className="font-medium">AED {depositPaid.toFixed(2)}</span>
                  </div>
                  {outstandingRent > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-stone">− Outstanding Rent:</span>
                      <span className="font-medium text-rust">AED {outstandingRent.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-stone">− Total Damages:</span>
                    <span className="font-medium text-rust">AED {damagesTotal.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-dust" />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Refund Amount:</span>
                    <span className="text-teal">AED {refundAmount.toFixed(2)}</span>
                  </div>
                  {forfeitAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-stone">Retained by Bartawi:</span>
                      <span className="font-medium text-amber-600">AED {forfeitAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {additionalOwed > 0 && (
                    <div className="flex justify-between text-sm font-medium text-rust">
                      <span>Tenant owes additional:</span>
                      <span>AED {additionalOwed.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 4: Refund & Finalize */}
            {step === 'refund' && (
              <motion.div
                key="refund-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={SPRING}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="text-center mb-8">
                  <Icon icon={CheckCircle2} size={48} className="text-teal mx-auto mb-3" />
                  <h2 className="text-xl font-display italic text-espresso">Finalize Checkout</h2>
                  <p className="text-sm text-stone mt-2">Review and process refund payment.</p>
                </div>

                {/* Closure Reason - Phase 4C */}
                <div>
                  <label className="block text-sm font-medium text-espresso mb-2">
                    Closure Reason <span className="text-rust">*</span>
                  </label>
                  <select
                    value={data.closure_reason}
                    onChange={e => setData(prev => ({ ...prev, closure_reason: e.target.value as any }))}
                    className="w-full px-4 py-3 rounded-lg border border-dust focus:border-teal focus:outline-none text-sm"
                  >
                    <option value="end_of_term">End of term</option>
                    <option value="mutual_early">Mutual early end</option>
                    <option value="tenant_abandoned">Tenant abandoned</option>
                    <option value="landlord_eviction">Landlord eviction</option>
                    <option value="legal_action">Legal action</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Final Summary */}
                <div className="bg-sand/50 rounded-lg p-6 space-y-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-stone">Checkout Date:</span>
                      <span className="font-medium">{new Date(data.checkout_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone">Checkout Type:</span>
                      <span className="font-medium capitalize">{data.checkout_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone">Condition Rating:</span>
                      <span className="font-medium">{data.condition_rating}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone">Damages Count:</span>
                      <span className="font-medium">{data.damages.length}</span>
                    </div>
                  </div>
                  <div className="h-px bg-dust" />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone">Deposit Paid:</span>
                      <span className="font-medium">AED {depositPaid.toFixed(2)}</span>
                    </div>
                    {outstandingRent > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-stone">− Outstanding Rent:</span>
                        <span className="font-medium text-rust">AED {outstandingRent.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-stone">− Total Damages:</span>
                      <span className="font-medium text-rust">AED {damagesTotal.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-dust" />
                    <div className="flex justify-between font-medium text-lg">
                      <span>Refund Amount:</span>
                      <span className="text-teal">AED {refundAmount.toFixed(2)}</span>
                    </div>
                    {forfeitAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-stone">Retained by Bartawi:</span>
                        <span className="font-medium text-amber-600">AED {forfeitAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {additionalOwed > 0 && (
                      <div className="bg-rust/10 border border-rust/30 rounded p-3 mt-3">
                        <div className="text-sm font-medium text-rust">
                          Additional Charges Owed: AED {additionalOwed.toFixed(2)}
                        </div>
                        <div className="text-xs text-rust/80 mt-1">
                          Tenant owes this amount beyond the forfeited deposit.
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Phase 4B.6: Occupants being checked out */}
                {preview.occupants_to_archive && preview.occupants_to_archive.length > 0 && (
                  <div className="mt-4 p-3 bg-rust/5 border border-rust/20 rounded-lg">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-rust font-medium mb-2">
                      Occupants being checked out
                    </div>
                    <div className="space-y-1">
                      {preview.occupants_to_archive.map((o: any) => (
                        <div key={o.id} className="text-xs text-espresso flex items-center gap-2">
                          <Icon icon={User} size={11} className="text-stone" />
                          <span>{o.full_name}</span>
                          {o.bed_number && <span className="text-stone">· Bed {o.bed_number}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {refundAmount > 0 && (
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-3 mb-4">
                        <input
                          type="checkbox"
                          checked={data.process_refund}
                          onChange={e => setData(prev => ({ ...prev, process_refund: e.target.checked }))}
                          className="w-5 h-5 rounded border-dust text-teal focus:ring-teal"
                        />
                        <span className="text-sm font-medium text-espresso">Process refund now</span>
                      </label>
                    </div>

                    {data.process_refund && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-espresso mb-2">
                            Refund Method
                          </label>
                          <select
                            value={data.refund_method}
                            onChange={e => setData(prev => ({ ...prev, refund_method: e.target.value as any }))}
                            className="w-full px-4 py-3 rounded-lg border border-dust focus:border-teal focus:outline-none"
                          >
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                            <option value="online">Online</option>
                            <option value="adjustment">Adjustment</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-espresso mb-2">
                            Reference Number (optional)
                          </label>
                          <input
                            type="text"
                            value={data.refund_reference}
                            onChange={e => setData(prev => ({ ...prev, refund_reference: e.target.value }))}
                            className="w-full px-4 py-3 rounded-lg border border-dust focus:border-teal focus:outline-none"
                            placeholder="Transaction reference, cheque number, etc."
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-espresso mb-2">
                    Checked Out By
                  </label>
                  <input
                    type="text"
                    value={data.checked_out_by_name}
                    onChange={e => setData(prev => ({ ...prev, checked_out_by_name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-dust focus:border-teal focus:outline-none"
                    placeholder="Staff member name"
                  />
                </div>

                {/* Phase 4C: Early Checkout Acknowledgment */}
                {isEarlyCheckout && (
                  <div className="p-4 bg-amber/10 border border-amber/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Icon icon={AlertTriangle} size={18} className="text-amber shrink-0 mt-0.5" />
                      <label className="flex items-start gap-2 text-sm text-espresso cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={data.acknowledge_early_checkout}
                          onChange={e => setData(prev => ({ ...prev, acknowledge_early_checkout: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 rounded border-amber text-amber focus:ring-amber"
                        />
                        <span>
                          <strong>Early checkout</strong> (less than 10 days since notice). I acknowledge
                          and approve this exception.
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Processing */}
            {step === 'processing' && (
              <motion.div
                key="processing-step"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-64"
              >
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-teal/20 border-t-teal rounded-full animate-spin mx-auto mb-4" />
                  <div className="text-lg font-medium text-espresso">Processing checkout...</div>
                </div>
              </motion.div>
            )}

            {/* Done */}
            {step === 'done' && (
              <motion.div
                key="done-step"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING}
                className="max-w-2xl mx-auto text-center py-12"
              >
                <Icon icon={CheckCircle2} size={64} className="text-teal mx-auto mb-4" />
                <h2 className="text-2xl font-display italic text-espresso mb-2">Checkout Complete</h2>
                <p className="text-stone mb-6">
                  {tenantName} has been successfully checked out from Room {preview.room.room_number}.
                </p>

                {checkoutResult && (
                  <div className="bg-sand/50 rounded-lg p-6 text-left space-y-3 mb-8">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone">Refund Amount:</span>
                      <span className="font-medium text-teal">
                        AED {Number(checkoutResult.refund_amount).toFixed(2)}
                      </span>
                    </div>
                    {checkoutResult.additional_charges_owed > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-stone">Additional Owed:</span>
                        <span className="font-medium text-rust">
                          AED {Number(checkoutResult.additional_charges_owed).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-stone">Damages Count:</span>
                      <span className="font-medium">{checkoutResult.damages_count}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    reset()
                    onClose()
                  }}
                  className="px-8 py-3 bg-teal text-white rounded-lg font-medium hover:bg-teal/90 transition-colors"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        {!['processing', 'done'].includes(step) && (
          <div className="shrink-0 px-8 py-4 border-t border-dust bg-sand/30 flex items-center justify-between">
            <button
              onClick={() => {
                if (step === 'inspection') setStep('notice')
                else if (step === 'damages') setStep('inspection')
                else if (step === 'refund') setStep('damages')
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                step === 'notice'
                  ? 'text-stone/50 cursor-not-allowed'
                  : 'text-espresso hover:bg-wash'
              }`}
              disabled={step === 'notice'}
            >
              <Icon icon={ArrowLeft} size={16} />
              Back
            </button>

            <button
              onClick={() => {
                if (step === 'notice') handleNoticeStep()
                else if (step === 'inspection') handleInspectionStep()
                else if (step === 'damages') handleDamagesStep()
                else if (step === 'refund') handleFinalizeCheckout()
              }}
              disabled={
                noticeMutation.isPending ||
                checkoutMutation.isPending ||
                (step === 'refund' && isEarlyCheckout && !data.acknowledge_early_checkout)  // Phase 4C: early checkout gate
              }
              className="px-8 py-2 bg-teal text-white rounded-lg font-medium hover:bg-teal/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'refund' ? 'Finalize Checkout' : 'Continue'}
              <Icon icon={ArrowRight} size={16} />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
