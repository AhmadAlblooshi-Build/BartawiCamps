'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X, ArrowRightLeft, User, Phone, Globe, Calendar, AlertCircle, ArrowRight } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints, type Occupant, type OccupantSwapPayload } from '@/lib/api'
import { invalidateOccupantCaches } from '@/lib/cache-invalidation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SwapOccupantDialogProps {
  isOpen: boolean
  onClose: () => void
  occupant: Occupant
  leaseId: string
  roomId: string
}

export function SwapOccupantDialog({
  isOpen,
  onClose,
  occupant,
  leaseId,
  roomId
}: SwapOccupantDialogProps) {
  const qc = useQueryClient()

  const [formData, setFormData] = useState({
    full_name: '',
    nationality: null as string | null,
    phone: null as string | null,
    passport_number: null as string | null,
    date_of_birth: null as string | null,
    emergency_contact: null as string | null,
    emergency_phone: null as string | null,
    notes: null as string | null
  })

  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const swapMutation = useMutation({
    mutationFn: () => {
      const payload: OccupantSwapPayload = {
        from_occupant_id: occupant.id,
        to_occupant: {
          full_name: formData.full_name,
          nationality: formData.nationality,
          phone: formData.phone,
          passport_number: formData.passport_number,
          date_of_birth: formData.date_of_birth,
          emergency_contact: formData.emergency_contact,
          emergency_phone: formData.emergency_phone,
          notes: formData.notes
        },
        reason: reason || null
      }
      return endpoints.swapOccupants(leaseId, payload)
    },
    retry: false,
    onSuccess: () => {
      toast.success('Occupant swapped successfully')
      invalidateOccupantCaches(qc, {
        leaseId,
        bedspaceId: occupant.bedspace_id,
        roomId
      })
      handleClose()
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to swap occupant')
      if (error.details?.fieldErrors) {
        setErrors(error.details.fieldErrors)
      }
    }
  })

  const handleClose = () => {
    setFormData({
      full_name: '',
      nationality: null,
      phone: null,
      passport_number: null,
      date_of_birth: null,
      emergency_contact: null,
      emergency_phone: null,
      notes: null
    })
    setReason('')
    setErrors({})
    onClose()
  }

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name?.trim()) {
      newErrors.full_name = 'Full name is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    swapMutation.mutate()
  }

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: typeof formData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
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
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6"
          style={{ backgroundColor: '#FAF7F2' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ArrowRightLeft size={16} className="text-amber-gold" />
                <span className="overline text-amber-gold">SWAP OCCUPANT</span>
              </div>
              <h2 className="font-display italic text-2xl text-espresso">
                Replace Occupant
              </h2>
              <div className="mt-2 text-sm text-espresso/60">
                Atomic swap: archives current occupant and adds new one in single transaction
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-sand/30 transition-colors text-espresso/60 hover:text-espresso"
            >
              <X size={20} />
            </button>
          </div>

          {/* Swap Visualization */}
          <div className="mb-6 p-4 rounded-lg bg-sand/20 border border-sand/40">
            <div className="flex items-center gap-4">
              {/* From */}
              <div className="flex-1 p-3 rounded-lg bg-white border border-sand">
                <div className="text-xs text-espresso/50 mb-1">Current Occupant</div>
                <div className="font-display italic text-lg text-espresso">
                  {occupant.full_name}
                </div>
                {occupant.bedspace?.bed_number && (
                  <div className="text-xs text-espresso/60 mt-1">
                    Bed <span className="font-mono tabular">{occupant.bedspace.bed_number}</span>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight size={24} className="text-amber-gold shrink-0" />

              {/* To */}
              <div className="flex-1 p-3 rounded-lg bg-white border border-amber-gold/40">
                <div className="text-xs text-amber-gold mb-1">New Occupant</div>
                <div className="font-display italic text-lg text-espresso">
                  {formData.full_name || 'Enter name below'}
                </div>
                {occupant.bedspace?.bed_number && (
                  <div className="text-xs text-espresso/60 mt-1">
                    Bed <span className="font-mono tabular">{occupant.bedspace.bed_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Swap Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-espresso mb-1.5">
              Swap Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-sand bg-white text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-amber-gold/30"
              placeholder="e.g., Worker rotation, Department transfer"
            />
          </div>

          {/* New Occupant Form */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-sand/20">
              <User size={16} className="text-espresso/60" />
              <h3 className="text-sm font-medium text-espresso uppercase tracking-wide">
                New Occupant Details
              </h3>
            </div>

            <div className="space-y-4">
              {/* Full Name - Required */}
              <div>
                <label className="block text-sm font-medium text-espresso mb-1.5">
                  Full Name <span className="text-rust">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/40" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={e => updateField('full_name', e.target.value)}
                    className={cn(
                      'w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white text-espresso',
                      'placeholder:text-espresso/30 focus:outline-none focus:ring-2',
                      errors.full_name
                        ? 'border-rust/50 focus:ring-rust/30'
                        : 'border-sand focus:ring-amber-gold/30'
                    )}
                    placeholder="Enter full name"
                  />
                </div>
                {errors.full_name && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-rust">
                    <AlertCircle size={12} />
                    <span>{errors.full_name}</span>
                  </div>
                )}
              </div>

              {/* Nationality */}
              <div>
                <label className="block text-sm font-medium text-espresso mb-1.5">
                  Nationality
                </label>
                <div className="relative">
                  <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/40" />
                  <input
                    type="text"
                    value={formData.nationality || ''}
                    onChange={e => updateField('nationality', e.target.value || null)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-sand bg-white text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-amber-gold/30"
                    placeholder="e.g., Filipino, Indian, Pakistani"
                  />
                </div>
              </div>

              {/* Phone & Passport - Two Column */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-espresso mb-1.5">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/40" />
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={e => updateField('phone', e.target.value || null)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-sand bg-white text-espresso font-mono tabular placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-amber-gold/30"
                      placeholder="+971..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-espresso mb-1.5">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    value={formData.passport_number || ''}
                    onChange={e => updateField('passport_number', e.target.value || null)}
                    className="w-full px-4 py-2.5 rounded-lg border border-sand bg-white text-espresso font-mono tabular placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-amber-gold/30"
                    placeholder="e.g., AB1234567"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-espresso mb-1.5">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/40" />
                  <input
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={e => updateField('date_of_birth', e.target.value || null)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-sand bg-white text-espresso focus:outline-none focus:ring-2 focus:ring-amber-gold/30"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-sm font-medium text-espresso mb-1.5">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact || ''}
                  onChange={e => updateField('emergency_contact', e.target.value || null)}
                  className="w-full px-4 py-2.5 rounded-lg border border-sand bg-white text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-amber-gold/30"
                  placeholder="e.g., John Doe (Brother)"
                />
              </div>

              {/* Emergency Phone */}
              <div>
                <label className="block text-sm font-medium text-espresso mb-1.5">
                  Emergency Phone
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/40" />
                  <input
                    type="tel"
                    value={formData.emergency_phone || ''}
                    onChange={e => updateField('emergency_phone', e.target.value || null)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-sand bg-white text-espresso font-mono tabular placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-amber-gold/30"
                    placeholder="+971..."
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-espresso mb-1.5">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => updateField('notes', e.target.value || null)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-sand bg-white text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-amber-gold/30 resize-none"
                  placeholder="Any additional information..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-6 border-t border-sand/20">
            <button
              onClick={handleClose}
              disabled={swapMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg border border-sand hover:bg-sand/30 text-espresso transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={swapMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-amber-gold hover:bg-amber-gold/90 text-espresso font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {swapMutation.isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-espresso/30 border-t-espresso rounded-full"
                  />
                  <span>Swapping...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft size={16} />
                  <span>Swap Occupant</span>
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
