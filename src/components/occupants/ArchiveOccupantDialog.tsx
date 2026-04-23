'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X, Archive, Calendar, AlertTriangle, FileText } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints, type Occupant } from '@/lib/api'
import { invalidateOccupantCaches } from '@/lib/cache-invalidation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ArchiveOccupantDialogProps {
  isOpen: boolean
  onClose: () => void
  occupant: Occupant
  leaseId: string
  roomId: string
}

const CHECKOUT_REASONS = [
  { value: 'left_voluntarily', label: 'Left Voluntarily' },
  { value: 'lease_ended', label: 'Lease Ended' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'swap', label: 'Swap' },
  { value: 'other', label: 'Other' }
] as const

export function ArchiveOccupantDialog({
  isOpen,
  onClose,
  occupant,
  leaseId,
  roomId
}: ArchiveOccupantDialogProps) {
  const qc = useQueryClient()

  const [checkoutReason, setCheckoutReason] = useState<typeof CHECKOUT_REASONS[number]['value']>('left_voluntarily')
  const [checkoutDate, setCheckoutDate] = useState('')
  const [checkoutNotes, setCheckoutNotes] = useState('')

  const archiveMutation = useMutation({
    mutationFn: () => endpoints.archiveOccupant(occupant.id, {
      checkout_reason: checkoutReason,
      checkout_notes: checkoutNotes || null,
      checked_out_at: checkoutDate || null
    }),
    retry: false,
    onSuccess: () => {
      toast.success('Occupant archived successfully')
      invalidateOccupantCaches(qc, {
        leaseId,
        bedspaceId: occupant.bedspace_id,
        roomId
      })
      handleClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to archive occupant')
    }
  })

  const handleClose = () => {
    setCheckoutReason('left_voluntarily')
    setCheckoutDate('')
    setCheckoutNotes('')
    onClose()
  }

  const handleSubmit = () => {
    archiveMutation.mutate()
  }

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(26, 24, 22, 0.5)' }}
          onClick={handleClose}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0)' }}
          exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
          transition={{
            type: 'spring',
            stiffness: 340,
            damping: 32
          }}
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6"
          style={{ backgroundColor: '#FAF7F2' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Archive size={16} className="text-rust" />
                <span className="overline text-rust">ARCHIVE OCCUPANT</span>
              </div>
              <h2 className="font-display italic text-2xl text-espresso">
                Check Out Occupant
              </h2>
              <div className="mt-2 text-sm text-espresso/60">
                {occupant.full_name}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-sand/30 transition-colors text-espresso/60 hover:text-espresso"
            >
              <X size={20} />
            </button>
          </div>

          {/* Warning */}
          <div className="mb-6 p-4 rounded-lg bg-amber-gold/10 border border-amber-gold/20">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-gold shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-amber-gold mb-1">
                  This action will mark the occupant as checked out
                </div>
                <div className="text-xs text-espresso/60">
                  The bed will become available for new occupants. This action can be reversed
                  if needed (via checkout reversal if part of lease checkout).
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Checkout Reason - Required */}
            <div>
              <label className="block text-sm font-medium text-espresso mb-1.5">
                Checkout Reason <span className="text-rust">*</span>
              </label>
              <select
                value={checkoutReason}
                onChange={e => setCheckoutReason(e.target.value as typeof checkoutReason)}
                className="w-full px-4 py-2.5 rounded-lg border border-sand bg-white text-espresso focus:outline-none focus:ring-2 focus:ring-rust/30"
              >
                {CHECKOUT_REASONS.map(reason => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Checkout Date */}
            <div>
              <label className="block text-sm font-medium text-espresso mb-1.5">
                Checkout Date
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/40" />
                <input
                  type="date"
                  value={checkoutDate}
                  onChange={e => setCheckoutDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-sand bg-white text-espresso focus:outline-none focus:ring-2 focus:ring-rust/30"
                />
              </div>
              <div className="text-xs text-espresso/50 mt-1">
                Leave empty to use today
              </div>
            </div>

            {/* Checkout Notes */}
            <div>
              <label className="block text-sm font-medium text-espresso mb-1.5">
                Notes
              </label>
              <div className="relative">
                <FileText size={16} className="absolute left-3 top-3 text-espresso/40" />
                <textarea
                  value={checkoutNotes}
                  onChange={e => setCheckoutNotes(e.target.value)}
                  rows={4}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-sand bg-white text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-rust/30 resize-none"
                  placeholder="Any additional details about the checkout..."
                />
              </div>
            </div>
          </div>

          {/* Occupant Summary */}
          <div className="mt-6 p-4 rounded-lg bg-stone/10 border border-stone/20">
            <div className="text-xs text-espresso/50 mb-2">Occupant Summary</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-espresso/60">Name:</span>
                <span className="text-espresso font-medium">{occupant.full_name}</span>
              </div>
              {occupant.bedspace?.bed_number && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-espresso/60">Bed:</span>
                  <span className="text-espresso font-mono tabular">{occupant.bedspace.bed_number}</span>
                </div>
              )}
              {occupant.checked_in_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-espresso/60">Checked in:</span>
                  <span className="text-espresso font-mono tabular">
                    {new Date(occupant.checked_in_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-sand/20">
            <button
              onClick={handleClose}
              disabled={archiveMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg border border-sand hover:bg-sand/30 text-espresso transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={archiveMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-rust hover:bg-rust/90 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {archiveMutation.isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  <span>Archiving...</span>
                </>
              ) : (
                <>
                  <Archive size={16} />
                  <span>Archive Occupant</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
