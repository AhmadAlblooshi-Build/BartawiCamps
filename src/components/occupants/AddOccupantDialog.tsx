'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X, UserPlus, Bed, User, Phone, Globe, Calendar, AlertCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints, type OccupantCreatePayload } from '@/lib/api'
import { invalidateOccupantCaches } from '@/lib/cache-invalidation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AddOccupantDialogProps {
  isOpen: boolean
  onClose: () => void
  leaseId: string
  roomId: string
  bedspaceId: string
  bedNumber: string
}

export function AddOccupantDialog({
  isOpen,
  onClose,
  leaseId,
  roomId,
  bedspaceId,
  bedNumber
}: AddOccupantDialogProps) {
  const qc = useQueryClient()

  const [formData, setFormData] = useState<OccupantCreatePayload>({
    bedspace_id: bedspaceId,
    full_name: '',
    nationality: null,
    phone: null,
    passport_number: null,
    date_of_birth: null,
    emergency_contact: null,
    emergency_phone: null,
    notes: null,
    checked_in_at: null
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: () => endpoints.createOccupant(leaseId, formData),
    retry: false,
    onSuccess: () => {
      toast.success('Occupant added successfully')
      invalidateOccupantCaches(qc, { leaseId, bedspaceId, roomId })
      handleClose()
    },
    onError: (error: any) => {
      // Handle bedspace already occupied error
      if (error.error === 'bedspace_already_occupied') {
        const occupantName = error.current_occupant_name
        const msg = occupantName
          ? `This bed already has an active occupant: ${occupantName}. Archive or swap them first.`
          : 'This bed already has an active occupant. Archive or swap them first.'
        setGeneralError(msg)
        toast.error(msg)
      } else {
        toast.error(error.message || 'Failed to add occupant')
        setGeneralError(error.message || 'Failed to add occupant')
      }

      if (error.details?.fieldErrors) {
        setErrors(error.details.fieldErrors)
      }
    }
  })

  const handleClose = () => {
    setFormData({
      bedspace_id: bedspaceId,
      full_name: '',
      nationality: null,
      phone: null,
      passport_number: null,
      date_of_birth: null,
      emergency_contact: null,
      emergency_phone: null,
      notes: null,
      checked_in_at: null
    })
    setErrors({})
    setGeneralError(null)
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

    createMutation.mutate()
  }

  const updateField = <K extends keyof OccupantCreatePayload>(
    field: K,
    value: OccupantCreatePayload[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field-specific error
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    // Clear general error on any field change (user is correcting)
    if (generalError) {
      setGeneralError(null)
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
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6"
          style={{ backgroundColor: '#FAF7F2' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <UserPlus size={16} className="text-teal" />
                <span className="overline text-teal">ADD OCCUPANT</span>
              </div>
              <h2 className="font-display italic text-2xl text-espresso">
                New Occupant
              </h2>
              <div className="flex items-center gap-1.5 mt-2 text-sm text-espresso/60">
                <Bed size={14} />
                <span>Bed <span className="font-mono tabular">{bedNumber}</span></span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-sand/30 transition-colors text-espresso/60 hover:text-espresso"
            >
              <X size={20} />
            </button>
          </div>

          {/* General Error Banner */}
          {generalError && (
            <div className="mb-6 p-4 rounded-lg bg-rust/10 border border-rust/20">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-rust shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-rust mb-1">
                    Cannot Add Occupant
                  </div>
                  <div className="text-xs text-espresso/70">
                    {generalError}
                  </div>
                </div>
                <button
                  onClick={() => setGeneralError(null)}
                  className="p-1 rounded hover:bg-rust/20 transition-colors"
                >
                  <X size={14} className="text-rust" />
                </button>
              </div>
            </div>
          )}

          {/* Form */}
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
                      : 'border-sand focus:ring-teal/30'
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-sand bg-white text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-teal/30"
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-sand bg-white text-espresso font-mono tabular placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-teal/30"
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
                  className="w-full px-4 py-2.5 rounded-lg border border-sand bg-white text-espresso font-mono tabular placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-teal/30"
                  placeholder="e.g., AB1234567"
                />
              </div>
            </div>

            {/* Date of Birth & Check-in Date - Two Column */}
            <div className="grid grid-cols-2 gap-4">
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-sand bg-white text-espresso focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-espresso mb-1.5">
                  Check-in Date
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/40" />
                  <input
                    type="date"
                    value={formData.checked_in_at || ''}
                    onChange={e => updateField('checked_in_at', e.target.value || null)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-sand bg-white text-espresso focus:outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
                <div className="text-xs text-espresso/50 mt-1">
                  Leave empty to use today
                </div>
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
                className="w-full px-4 py-2.5 rounded-lg border border-sand bg-white text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-teal/30"
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-sand bg-white text-espresso font-mono tabular placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-teal/30"
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
                className="w-full px-4 py-2.5 rounded-lg border border-sand bg-white text-espresso placeholder:text-espresso/30 focus:outline-none focus:ring-2 focus:ring-teal/30 resize-none"
                placeholder="Any additional information..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-sand/20">
            <button
              onClick={handleClose}
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg border border-sand hover:bg-sand/30 text-espresso transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-teal hover:bg-teal/90 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Add Occupant</span>
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
