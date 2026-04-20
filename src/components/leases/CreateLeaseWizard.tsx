'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { invalidateLeaseCaches } from '@/lib/cache-invalidation'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/Icon'
import {
  Search, X, User, Building2, MapPin, Calendar,
  DollarSign, FileText, CheckCircle2, AlertCircle,
  ArrowRight, ArrowLeft, Sparkles, BedDouble
} from 'lucide-react'
import { LogPaymentDialog } from '@/components/payments/LogPaymentDialog'

const SPRING = { type: 'spring' as const, stiffness: 340, damping: 32 }

interface WizardProps {
  open: boolean
  onClose: () => void
  campId?: string
  prefilledRoomId?: string
  prefilledBedspaceId?: string | null
}

type Step = 'identify' | 'profile' | 'room' | 'bed' | 'terms' | 'deposit' | 'review' | 'activating' | 'done'

interface WizardData {
  // Tenant
  tenantId?: string
  tenantName?: string
  tenantType?: 'individual' | 'company'
  isNewTenant?: boolean

  // Profile fields (for new tenant)
  fullName?: string
  nationalId?: string
  phone?: string
  email?: string
  companyName?: string
  commercialReg?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  profileIsCompany?: boolean  // Phase 4B.5: track profile type

  // Room selection
  roomId?: string
  roomNumber?: string

  // Phase 4B.5: Bed selection
  bedspaceId?: string
  bedNumber?: number
  bedState?: any[]

  // Lease terms
  startDate?: string
  endDate?: string
  monthlyRent?: number
  depositAmount?: number

  // Backend IDs
  createdTenantId?: string
  draftLeaseId?: string
  depositPaid?: boolean
}

export default function CreateLeaseWizard({ open, onClose, campId, prefilledRoomId, prefilledBedspaceId }: WizardProps) {
  const [step, setStep] = useState<Step>('identify')
  const [data, setData] = useState<WizardData>({ tenantType: 'individual' })
  const queryClient = useQueryClient()

  // SSR-safe portal mounting
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Phase 4B.5: Apply prefilled room + bedspace from map bed click
  useEffect(() => {
    if (open && (prefilledRoomId || prefilledBedspaceId)) {
      setData(prev => ({
        ...prev,
        ...(prefilledRoomId && { roomId: prefilledRoomId }),
        ...(prefilledBedspaceId && { bedspaceId: prefilledBedspaceId }),
      }))
    }
  }, [open, prefilledRoomId, prefilledBedspaceId])

  const reset = () => {
    setStep('identify')
    setData({ tenantType: 'individual' })
  }

  const handleClose = () => {
    if (step === 'done') {
      reset()
      onClose()
    } else if (step === 'activating') {
      // Can't close during activation
      return
    } else if (step === 'identify' && !data.tenantId && !data.isNewTenant) {
      // No progress made on Step 1, close silently
      reset()
      onClose()
    } else {
      // User has made progress, show confirmation
      const confirmed = window.confirm('Close wizard? Any unsaved progress will be lost.')
      if (confirmed) {
        // Phase 4B.5: Clean up orphan draft if user aborts mid-flow (before activation)
        // Note: step can't be 'done' or 'activating' in this branch, so draft is always safe to delete
        if (data.draftLeaseId) {
          endpoints.deleteDraftLease(data.draftLeaseId).catch(() => {
            // Non-blocking — cron cleans orphans anyway
          })
        }
        reset()
        onClose()
      }
    }
  }

  // SSR guard
  if (!mounted) return null
  if (!open) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
        onClick={handleClose}
      />
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={SPRING}
        className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="shrink-0 px-8 py-6 border-b border-dust flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display italic text-espresso">New Lease</h1>
            <div className="text-xs text-stone mt-1">{data.bedspaceId ? '7 Steps' : '6 Steps'}</div>
          </div>
          <button
            onClick={handleClose}
            disabled={step === 'activating'}
            className="w-10 h-10 rounded-full bg-dust hover:bg-rust hover:text-white transition-colors grid place-items-center disabled:opacity-50"
          >
            <Icon icon={X} size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="shrink-0 px-8 py-4 bg-wash border-b border-dust">
          <ProgressIndicator
            step={step}
            hasBedStep={!!data.bedspaceId}
            isPrefilled={!!(prefilledRoomId && prefilledBedspaceId)}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <AnimatePresence mode="wait">
            {step === 'identify' && <IdentifyStep key="identify" data={data} setData={setData} onNext={(nextStep: Step) => {
              // Phase 4B.5: Skip room + bed if prefilled from map bed click
              if (nextStep === 'room' && prefilledRoomId && prefilledBedspaceId) {
                setStep('terms')
              } else if (nextStep === 'room' && prefilledRoomId && data.tenantType === 'company') {
                // Room prefilled, company lease → skip to terms (companies don't use bed step)
                setStep('terms')
              } else if (nextStep === 'room' && prefilledRoomId) {
                // Room prefilled but no bed → go to bed step for individuals
                setStep('bed')
              } else {
                setStep(nextStep)
              }
            }} />}
            {step === 'profile' && <ProfileStep key="profile" data={data} setData={setData} onNext={() => {
              // Phase 4B.5: Skip room + bed if prefilled from map bed click
              if (prefilledRoomId && prefilledBedspaceId) {
                setStep('terms')
              } else if (prefilledRoomId && data.tenantType === 'company') {
                setStep('terms')
              } else if (prefilledRoomId) {
                setStep('bed')
              } else {
                setStep('room')
              }
            }} onBack={() => setStep('identify')} />}
            {step === 'room' && <RoomStep key="room" data={data} setData={setData} campId={campId} onNext={(nextStep: Step) => setStep(nextStep)} onBack={(prevStep: Step) => setStep(prevStep)} />}
            {step === 'bed' && <BedStep key="bed" data={data} setData={setData} onNext={() => setStep('terms')} onBack={() => setStep('room')} />}
            {step === 'terms' && <TermsStep key="terms" data={data} setData={setData} onNext={() => setStep('deposit')} onBack={() => setStep(data.bedspaceId ? 'bed' : 'room')} />}
            {step === 'deposit' && <DepositStep key="deposit" data={data} setData={setData} onNext={() => setStep('review')} onBack={() => setStep('terms')} />}
            {step === 'review' && <ReviewStep key="review" data={data} setData={setData} onNext={() => setStep('activating')} onBack={() => setStep('deposit')} />}
            {step === 'activating' && <ActivatingStep key="activating" data={data} onDone={() => setStep('done')} />}
            {step === 'done' && <DoneStep key="done" onClose={() => { reset(); onClose(); }} />}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================

interface ProgressProps {
  step: Step
  hasBedStep?: boolean
  isPrefilled?: boolean  // Phase 4B.5: Hide Room+Bed when map bed click prefills wizard
}

function ProgressIndicator({ step, hasBedStep = false, isPrefilled = false }: ProgressProps) {
  const identifySteps: { key: Step; label: string }[] = [
    { key: 'identify', label: 'Identify' },
    { key: 'profile', label: 'Profile' },
  ]

  // Phase 4B.5: When prefilled from map bed click, skip Room + Bed steps
  const selectionSteps: { key: Step; label: string }[] = isPrefilled
    ? []
    : [
        { key: 'room', label: 'Room' },
        ...(hasBedStep ? [{ key: 'bed' as Step, label: 'Bed' }] : []),
      ]

  const finalSteps: { key: Step; label: string }[] = [
    { key: 'terms', label: 'Terms' },
    { key: 'deposit', label: 'Deposit' },
    { key: 'review', label: 'Review' },
  ]

  const steps = [...identifySteps, ...selectionSteps, ...finalSteps]

  // Show all complete when activating or done
  const currentIdx = step === 'activating' || step === 'done'
    ? steps.length
    : steps.findIndex(s => s.key === step)

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isActive = i === currentIdx
        const isComplete = i < currentIdx

        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
              ${isActive ? 'bg-teal text-white scale-110' : ''}
              ${isComplete ? 'bg-amber text-espresso' : ''}
              ${!isActive && !isComplete ? 'bg-dust text-stone' : ''}
            `}>
              {isComplete ? <Icon icon={CheckCircle2} size={14} /> : i + 1}
            </div>
            <div className={`text-xs font-medium ${isActive ? 'text-espresso' : 'text-stone'}`}>
              {s.label}
            </div>
            {i < steps.length - 1 && <div className="w-4 h-px bg-dust mx-1" />}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// STEP 1: IDENTIFY
// ============================================================================

function IdentifyStep({ data, setData, onNext }: any) {
  const [mode, setMode] = useState<'new' | 'existing' | null>(null)
  const [query, setQuery] = useState('')

  const { data: results, isLoading } = useQuery({
    queryKey: ['search-entities', query],
    queryFn: () => endpoints.searchEntities(query, 'both'),
    enabled: mode === 'existing' && query.length >= 2
  })

  const selectExisting = (tenant: any) => {
    setData((prev: any) => ({
      ...prev,
      tenantId: tenant.id,
      tenantName: tenant.full_name || tenant.company_name,
      tenantType: tenant.type,
      isNewTenant: false
    }))
    onNext('room')  // Skip profile for existing tenants
  }

  const createNew = () => {
    setData((prev: any) => ({ ...prev, isNewTenant: true }))
    onNext('profile')  // Go to profile for new tenants
  }

  return (
    <motion.div
      key="identify"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={SPRING}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-xl font-display italic text-espresso">Step 1: Identify Tenant</h2>
        <p className="text-sm text-stone mt-1">Choose tenant registration method</p>
      </div>

      {/* Mode Selection */}
      {mode === null && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode('new')}
            className="p-8 border-2 border-teal/20 rounded-xl hover:border-teal hover:bg-teal/5 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-full bg-teal text-white grid place-items-center mb-4">
              <Icon icon={Sparkles} size={20} />
            </div>
            <div className="text-lg font-display italic text-espresso mb-2">New Tenant</div>
            <div className="text-sm text-stone">Register a new individual or company</div>
          </button>

          <button
            onClick={() => setMode('existing')}
            className="p-8 border-2 border-amber/20 rounded-xl hover:border-amber hover:bg-amber/5 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-full bg-amber text-espresso grid place-items-center mb-4">
              <Icon icon={Search} size={20} />
            </div>
            <div className="text-lg font-display italic text-espresso mb-2">Existing Tenant</div>
            <div className="text-sm text-stone">Search for a previously registered tenant</div>
          </button>
        </div>
      )}

      {/* New Tenant Flow */}
      {mode === 'new' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-teal text-white grid place-items-center mx-auto mb-4">
            <Icon icon={Sparkles} size={24} />
          </div>
          <div className="text-lg font-display italic text-espresso mb-2">Register New Tenant</div>
          <div className="text-sm text-stone mb-6">You'll enter tenant details in the next step</div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setMode(null)}
              className="px-5 h-11 rounded-full border-2 border-espresso text-espresso text-xs font-medium hover:bg-espresso hover:text-white transition-all"
            >
              <Icon icon={ArrowLeft} size={14} className="inline mr-2" />
              Back
            </button>
            <button
              onClick={createNew}
              className="px-5 h-11 rounded-full bg-teal text-white text-xs font-medium hover:bg-teal/90 transition-all"
            >
              Continue
              <Icon icon={ArrowRight} size={14} className="inline ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Existing Tenant Search */}
      {mode === 'existing' && (
        <>
          <div className="flex gap-3">
            <button
              onClick={() => setMode(null)}
              className="px-4 h-11 rounded-full border-2 border-espresso text-espresso text-xs font-medium hover:bg-espresso hover:text-white transition-all"
            >
              <Icon icon={ArrowLeft} size={14} />
            </button>
            <div className="relative flex-1">
              <Icon icon={Search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, ID, phone..."
                className="w-full h-11 pl-10 pr-4 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-amber focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {query.length >= 2 && (
            <div className="border border-dust rounded-xl overflow-hidden bg-white">
              {isLoading && (
                <div className="p-8 text-center text-stone text-sm">Searching...</div>
              )}
              {!isLoading && results?.data.length === 0 && (
                <div className="p-8 text-center">
                  <div className="text-sm text-stone">No tenants found matching "{query}"</div>
                </div>
              )}
              {!isLoading && results?.data?.map((tenant: any, idx: number) => (
                <button
                  key={tenant.id || `tenant-${idx}`}
                  onClick={() => selectExisting(tenant)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-wash transition-colors border-b border-dust last:border-0 text-left"
                >
                  <div className={`w-10 h-10 rounded-full grid place-items-center text-white ${
                    tenant.type === 'individual' ? 'bg-teal' : 'bg-amber'
                  }`}>
                    <Icon icon={tenant.type === 'individual' ? User : Building2} size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-espresso text-sm truncate">
                      {tenant.full_name || tenant.company_name}
                    </div>
                    <div className="text-xs text-stone">
                      {tenant.type === 'individual' ? tenant.national_id : tenant.commercial_reg} • {tenant.phone}
                    </div>
                  </div>
                  <Icon icon={ArrowRight} size={16} className="text-stone" />
                </button>
              ))}
            </div>
          )}

          {query.length < 2 && (
            <div className="text-center py-12 text-stone text-sm">
              Type at least 2 characters to search
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}

// ============================================================================
// STEP 2: PROFILE
// ============================================================================

function ProfileStep({ data, setData, onNext, onBack }: any) {
  const isIndividual = data.tenantType === 'individual'
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (payload: any) => endpoints.createRoomTenant(payload),
    onSuccess: (result) => {
      if (result.warning) {
        toast.warning('Possible duplicate detected', { description: result.warning.message })
      }
      setData((prev: any) => ({ ...prev, createdTenantId: result.tenant.id }))
      toast.success('Tenant registered')
      invalidateLeaseCaches(queryClient, { tenantId: result.tenant.id })
      onNext()
    },
    onError: (err: any) => {
      toast.error('Failed to register tenant', { description: err.message })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload = isIndividual ? {
      is_company: false,
      full_name: data.fullName,
      mobile: data.phone,
      nationality: data.nationality,
      id_type: data.idType || 'passport',
      id_number: data.nationalId,
      email: data.email,
      emergency_contact_name: data.emergencyContactName,
      emergency_contact_phone: data.emergencyContactPhone
    } : {
      is_company: true,
      company_name: data.companyName,
      mobile: data.phone,
      email: data.email,
      emergency_contact_name: data.emergencyContactName,
      emergency_contact_phone: data.emergencyContactPhone
    }

    createMutation.mutate(payload)
  }

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={SPRING}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-xl font-display italic text-espresso">Step 2: Tenant Profile</h2>
        <p className="text-sm text-stone mt-1">Enter tenant details</p>
      </div>

      {/* Type Selection */}
      <div className="flex gap-2">
        {['individual', 'company'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setData((prev: any) => ({
              ...prev,
              tenantType: t as 'individual' | 'company',
              profileIsCompany: t === 'company'  // Phase 4B.5
            }))}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              data.tenantType === t
                ? 'bg-teal text-white'
                : 'bg-dust text-stone hover:bg-dust/80'
            }`}
          >
            {t === 'individual' ? 'Individual' : 'Company'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isIndividual ? (
          <>
            <div>
              <label className="text-xs text-stone font-medium mb-1 block">Full Name *</label>
              <input
                required
                type="text"
                value={data.fullName || ''}
                onChange={e => setData({ ...data, fullName: e.target.value })}
                className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-stone font-medium mb-1 block">National ID *</label>
              <input
                required
                type="text"
                value={data.nationalId || ''}
                onChange={e => setData({ ...data, nationalId: e.target.value })}
                className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none font-mono"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-xs text-stone font-medium mb-1 block">Company Name *</label>
              <input
                required
                type="text"
                value={data.companyName || ''}
                onChange={e => setData({ ...data, companyName: e.target.value })}
                className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-stone font-medium mb-1 block">Commercial Registration *</label>
              <input
                required
                type="text"
                value={data.commercialReg || ''}
                onChange={e => setData({ ...data, commercialReg: e.target.value })}
                className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none font-mono"
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-stone font-medium mb-1 block">Phone *</label>
            <input
              required
              type="tel"
              value={data.phone || ''}
              onChange={e => setData({ ...data, phone: e.target.value })}
              className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-stone font-medium mb-1 block">Email</label>
            <input
              type="email"
              value={data.email || ''}
              onChange={e => setData({ ...data, email: e.target.value })}
              className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-stone font-medium mb-1 block">Emergency Contact</label>
            <input
              type="text"
              value={data.emergencyContactName || ''}
              onChange={e => setData({ ...data, emergencyContactName: e.target.value })}
              className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-stone font-medium mb-1 block">Emergency Phone</label>
            <input
              type="tel"
              value={data.emergencyContactPhone || ''}
              onChange={e => setData({ ...data, emergencyContactPhone: e.target.value })}
              className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none font-mono"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-5 h-11 rounded-full border-2 border-espresso text-espresso text-xs font-medium hover:bg-espresso hover:text-white transition-all"
          >
            <Icon icon={ArrowLeft} size={14} className="inline mr-2" />
            Back
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 px-5 h-11 rounded-full bg-teal text-white text-xs font-medium hover:bg-teal/90 disabled:opacity-50 transition-all"
          >
            {createMutation.isPending ? 'Creating...' : 'Continue'}
            <Icon icon={ArrowRight} size={14} className="inline ml-2" />
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// ============================================================================
// STEP 3: ROOM
// ============================================================================

function RoomStep({ data, setData, campId, onNext, onBack }: any) {
  const [startDate, setStartDate] = useState(data.startDate || new Date().toISOString().split('T')[0])

  const { data: availability, isLoading, refetch } = useQuery({
    queryKey: ['room-availability', campId, startDate],
    queryFn: () => endpoints.roomAvailability({ campId, start_date: startDate }),
    enabled: !!startDate
  })

  const selectRoom = (room: any) => {
    // Phase 4B.5: Bed picker logic
    const isCompany = data.tenantType === 'company' || data.profileIsCompany
    const needsBedPicker = !isCompany && room.total_beds > 1 && room.available_beds > 0

    if (needsBedPicker) {
      setData((prev: any) => ({
        ...prev,
        roomId: room.room_id,
        roomNumber: room.room_number,
        startDate,
        bedState: room.bed_state
      }))
      onNext('bed')
    } else {
      setData((prev: any) => ({
        ...prev,
        roomId: room.room_id,
        roomNumber: room.room_number,
        startDate
      }))
      onNext('terms')
    }
  }

  return (
    <motion.div
      key="room"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={SPRING}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-xl font-display italic text-espresso">Step 3: Select Room</h2>
        <p className="text-sm text-stone mt-1">Choose available room for lease start date</p>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs text-stone font-medium mb-1 block">Lease Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none font-mono"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="px-5 h-11 rounded-full bg-teal text-white text-xs font-medium hover:bg-teal/90"
        >
          Check Availability
        </button>
      </div>

      {isLoading && <div className="text-center py-8 text-sm text-stone">Loading...</div>}

      {!isLoading && availability && (
        <div>
          <div className="flex items-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal" />
              <span className="text-stone">{availability.total_available} Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rust" />
              <span className="text-stone">{availability.total_occupied} Occupied</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {availability.available.map((room: any, idx: number) => (
              <button
                key={room.id || `room-${idx}`}
                onClick={() => selectRoom(room)}
                className="p-4 border-2 border-teal/20 rounded-xl hover:border-teal hover:bg-teal/5 transition-all text-left group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon={BedDouble} size={16} className="text-teal" />
                  <div className="font-medium text-espresso text-sm">{room.room_number}</div>
                </div>
                <div className="text-xs text-stone mb-1">
                  {room.block_code || `Block ${room.block_id}`}
                </div>
                {room.total_beds > 0 && (
                  <div className="text-xs text-teal font-medium">
                    {room.total_beds === 1 ? '1 Bed' : `${room.total_beds} Beds`} • {room.available_beds} Available
                  </div>
                )}
                <div className="text-xs text-teal font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Select →
                </div>
              </button>
            ))}
          </div>

          {availability.available.length === 0 && (
            <div className="text-center py-8 text-sm text-stone">
              No rooms available for selected date
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={() => onBack(data.isNewTenant ? 'profile' : 'identify')}
          className="px-5 h-11 rounded-full border-2 border-espresso text-espresso text-xs font-medium hover:bg-espresso hover:text-white transition-all"
        >
          <Icon icon={ArrowLeft} size={14} className="inline mr-2" />
          Back
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================================
// STEP 3.5: BED SELECTION (Phase 4B.5)
// ============================================================================

function BedStep({ data, setData, onNext, onBack }: any) {
  const beds = data.bedState || []
  const availableBeds = beds.filter((b: any) => b.status === 'available')

  const selectBed = (bed: any) => {
    setData((prev: any) => ({
      ...prev,
      bedspaceId: bed.bedspace_id,
      bedNumber: bed.bed_number
    }))
    onNext()
  }

  return (
    <motion.div
      key="bed"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={SPRING}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-xl font-display italic text-espresso">Step 3.5: Select Bed</h2>
        <p className="text-sm text-stone mt-1">Choose specific bed in room {data.roomNumber}</p>
      </div>

      <div className="p-4 bg-wash border border-dust rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon icon={MapPin} size={16} className="text-teal" />
          <div className="text-sm text-espresso">
            Room <span className="font-medium font-mono">{data.roomNumber}</span>
          </div>
        </div>
        <div className="text-xs text-stone">
          {availableBeds.length} of {beds.length} beds available
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {beds.map((bed: any, idx: number) => {
          const isAvailable = bed.status === 'available'
          const isOccupied = bed.status === 'occupied'

          return (
            <button
              key={bed.bedspace_id || `bed-${idx}`}
              onClick={() => isAvailable && selectBed(bed)}
              disabled={!isAvailable}
              className={`
                p-4 rounded-xl border-2 transition-all text-left
                ${isAvailable ? 'border-teal/20 hover:border-teal hover:bg-teal/5 cursor-pointer group' : ''}
                ${isOccupied ? 'border-rust/20 bg-rust/5 cursor-not-allowed opacity-60' : ''}
              `}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon icon={BedDouble} size={16} className={isAvailable ? 'text-teal' : 'text-rust'} />
                <div className={`font-medium text-sm ${isAvailable ? 'text-espresso' : 'text-stone'}`}>
                  Bed {bed.bed_number}
                </div>
              </div>

              {isOccupied && bed.conflict?.tenant_name && (
                <div className="text-xs text-rust mt-1">
                  Occupied by {bed.conflict.tenant_name}
                </div>
              )}

              {isAvailable && (
                <div className="text-xs text-teal font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Select →
                </div>
              )}
            </button>
          )
        })}
      </div>

      {availableBeds.length === 0 && (
        <div className="text-center py-8 text-sm text-stone">
          No beds available in this room
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-5 h-11 rounded-full border-2 border-espresso text-espresso text-xs font-medium hover:bg-espresso hover:text-white transition-all"
        >
          <Icon icon={ArrowLeft} size={14} className="inline mr-2" />
          Back
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================================
// STEP 4: TERMS
// ============================================================================

function TermsStep({ data, setData, onNext, onBack }: any) {
  const queryClient = useQueryClient()
  const [startDate, setStartDate] = useState(data.startDate || '')
  const [endDate, setEndDate] = useState(data.endDate || '')
  const [monthlyRent, setMonthlyRent] = useState(data.monthlyRent || '')
  const [depositAmount, setDepositAmount] = useState(data.depositAmount || '')

  // Phase 4B.5: Create draft lease at Terms step (before Deposit step)
  const createLeaseMutation = useMutation({
    mutationFn: () => endpoints.createLease({
      room_tenant_id: data.createdTenantId || data.tenantId,
      room_id: data.roomId,
      bedspace_id: data.bedspaceId || null,  // Phase 4B.5
      start_date: startDate,
      end_date: endDate,
      monthly_rent: parseFloat(monthlyRent),
      deposit_amount: parseFloat(depositAmount)
    }),
    onSuccess: (result) => {
      setData((prev: any) => ({
        ...prev,
        startDate,
        endDate,
        monthlyRent: parseFloat(monthlyRent),
        depositAmount: parseFloat(depositAmount),
        draftLeaseId: result.lease.id  // Save draft lease ID for deposit payment
      }))
      toast.success('Draft lease created')
      invalidateLeaseCaches(queryClient, {
        roomId: data.roomId,
        tenantId: data.createdTenantId || data.tenantId,
        leaseId: result.lease.id,
        bedspaceId: data.bedspaceId  // Phase 4B.5
      })
      onNext()  // Advance to Deposit step (draft lease now exists)
    },
    onError: (err: any) => {
      toast.error('Failed to create lease', { description: err.message })
    }
  })

  const handleNext = () => {
    createLeaseMutation.mutate()
  }

  const valid = startDate && endDate && monthlyRent && depositAmount

  return (
    <motion.div
      key="terms"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={SPRING}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-xl font-display italic text-espresso">Step 4: Lease Terms</h2>
        <p className="text-sm text-stone mt-1">Enter lease dates and financial terms</p>
      </div>

      <div className="p-4 bg-wash border border-dust rounded-xl flex items-center gap-3">
        <Icon icon={MapPin} size={16} className="text-teal" />
        <div className="text-sm text-espresso">
          Room <span className="font-medium font-mono">{data.roomNumber}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-stone font-medium mb-1 block">Start Date *</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-stone font-medium mb-1 block">End Date *</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-stone font-medium mb-1 block">Monthly Rent (SAR) *</label>
          <input
            type="number"
            step="0.01"
            value={monthlyRent}
            onChange={e => setMonthlyRent(e.target.value)}
            className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-stone font-medium mb-1 block">Deposit Amount (SAR) *</label>
          <input
            type="number"
            step="0.01"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            className="w-full h-11 px-3 bg-white border border-dust rounded-xl text-sm text-espresso focus:border-teal focus:outline-none font-mono"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-5 h-11 rounded-full border-2 border-espresso text-espresso text-xs font-medium hover:bg-espresso hover:text-white transition-all"
        >
          <Icon icon={ArrowLeft} size={14} className="inline mr-2" />
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!valid || createLeaseMutation.isPending}
          className="flex-1 px-5 h-11 rounded-full bg-teal text-white text-xs font-medium hover:bg-teal/90 disabled:opacity-50 transition-all"
        >
          {createLeaseMutation.isPending ? 'Creating Draft...' : 'Create & Continue'}
          <Icon icon={createLeaseMutation.isPending ? FileText : ArrowRight} size={14} className="inline ml-2" />
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================================
// STEP 5: DEPOSIT
// ============================================================================

function DepositStep({ data, setData, onNext, onBack }: any) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [pollingEnabled, setPollingEnabled] = useState(false)

  // Poll room_tenant to check if deposit was paid
  const { data: tenant } = useQuery({
    queryKey: ['room-tenant', data.createdTenantId],
    queryFn: () => endpoints.roomTenant(data.createdTenantId),
    enabled: pollingEnabled && !!data.createdTenantId,
    refetchInterval: 2000
  })

  useEffect(() => {
    if (tenant?.tenant) {
      const depositPaid = (tenant.tenant.deposit_paid || 0) >= (data.depositAmount || 0)
      if (depositPaid && !data.depositPaid) {
        setData((prev: any) => ({ ...prev, depositPaid: true }))
        toast.success('Deposit payment recorded')
        setPollingEnabled(false)
      }
    }
  }, [tenant])

  const openPayment = () => {
    setShowPaymentDialog(true)
    setPollingEnabled(true)
  }

  const skipDeposit = () => {
    // Allow skipping without confirmation - deposit can be collected later
    setData((prev: any) => ({ ...prev, depositPaid: false }))
    onNext()
  }

  // Phase 4B.5: Clean up draft lease when going back to Terms
  const handleBack = () => {
    if (data.draftLeaseId) {
      endpoints.deleteDraftLease(data.draftLeaseId).catch(() => {
        // Non-blocking — cron cleans orphans anyway
      })
      setData((prev: any) => ({ ...prev, draftLeaseId: undefined }))
    }
    onBack()
  }

  // Synthetic room object for LogPaymentDialog
  const syntheticRoom = {
    id: data.roomId || 'pending',
    room_number: data.roomNumber || 'TBD',
    active_lease: {
      id: data.draftLeaseId || 'pending',  // Use real draft lease ID (created at Terms step)
      tenant: {
        id: data.createdTenantId,
        full_name: data.fullName || data.companyName
      },
      deposit_amount: data.depositAmount || 0,
      deposit_paid: 0
    }
  }

  return (
    <motion.div
      key="deposit"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={SPRING}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-xl font-display italic text-espresso">Step 5: Collect Deposit</h2>
        <p className="text-sm text-stone mt-1">Record deposit payment before finalizing lease</p>
      </div>

      <div className="p-6 bg-amber/10 border-2 border-amber/30 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-amber text-espresso grid place-items-center shrink-0">
            <Icon icon={DollarSign} size={20} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-espresso mb-1">Deposit Required</div>
            <div className="text-2xl font-display italic text-espresso font-mono">
              {data.depositAmount?.toLocaleString()} SAR
            </div>
            {data.depositPaid && (
              <div className="mt-3 flex items-center gap-2 text-teal text-sm">
                <Icon icon={CheckCircle2} size={16} />
                Payment recorded
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {!data.depositPaid && (
          <button
            onClick={openPayment}
            className="flex-1 px-5 h-11 rounded-full bg-teal text-white text-xs font-medium hover:bg-teal/90 transition-all"
          >
            <Icon icon={DollarSign} size={14} className="inline mr-2" />
            Log Payment
          </button>
        )}
        <button
          onClick={skipDeposit}
          className="px-5 h-11 rounded-full border-2 border-stone text-stone text-xs font-medium hover:bg-stone hover:text-white transition-all"
        >
          Skip for Now
        </button>
      </div>

      {data.depositPaid && (
        <button
          onClick={onNext}
          className="w-full px-5 h-11 rounded-full bg-teal text-white text-xs font-medium hover:bg-teal/90 transition-all"
        >
          Continue
          <Icon icon={ArrowRight} size={14} className="inline ml-2" />
        </button>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={handleBack}
          className="px-5 h-11 rounded-full border-2 border-espresso text-espresso text-xs font-medium hover:bg-espresso hover:text-white transition-all"
        >
          <Icon icon={ArrowLeft} size={14} className="inline mr-2" />
          Back
        </button>
      </div>

      {/* Payment Dialog */}
      <LogPaymentDialog
        open={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        room={syntheticRoom}
        paymentType="deposit"
      />
    </motion.div>
  )
}

// ============================================================================
// STEP 6: REVIEW
// ============================================================================

function ReviewStep({ data, setData, onNext, onBack }: any) {
  // Phase 4B.5: Draft lease already created at Terms step, just show summary
  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={SPRING}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h2 className="text-xl font-display italic text-espresso">Step 6: Review</h2>
        <p className="text-sm text-stone mt-1">Review details and activate lease</p>
      </div>

      <div className="space-y-3">
        <div className="p-4 bg-white border border-dust rounded-xl">
          <div className="text-xs text-stone mb-1">Tenant</div>
          <div className="text-sm font-medium text-espresso">{data.tenantName || data.fullName || data.companyName}</div>
        </div>

        <div className="p-4 bg-white border border-dust rounded-xl">
          <div className="text-xs text-stone mb-1">Room {data.bedNumber ? '· Bed' : ''}</div>
          <div className="text-sm font-medium text-espresso font-mono">
            {data.roomNumber}{data.bedNumber ? ` · Bed ${data.bedNumber}` : ''}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-white border border-dust rounded-xl">
            <div className="text-xs text-stone mb-1">Start Date</div>
            <div className="text-sm font-medium text-espresso font-mono">{data.startDate}</div>
          </div>
          <div className="p-4 bg-white border border-dust rounded-xl">
            <div className="text-xs text-stone mb-1">End Date</div>
            <div className="text-sm font-medium text-espresso font-mono">{data.endDate}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-white border border-dust rounded-xl">
            <div className="text-xs text-stone mb-1">Monthly Rent</div>
            <div className="text-sm font-medium text-espresso font-mono">{data.monthlyRent?.toLocaleString()} SAR</div>
          </div>
          <div className="p-4 bg-white border border-dust rounded-xl">
            <div className="text-xs text-stone mb-1">Deposit</div>
            <div className="text-sm font-medium text-espresso font-mono">{data.depositAmount?.toLocaleString()} SAR</div>
          </div>
        </div>

        {!data.depositPaid && (
          <div className="p-3 bg-amber/10 border border-amber/30 rounded-xl flex items-center gap-2 text-xs text-amber">
            <Icon icon={AlertCircle} size={14} />
            Deposit not yet collected
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-5 h-11 rounded-full border-2 border-espresso text-espresso text-xs font-medium hover:bg-espresso hover:text-white transition-all"
        >
          <Icon icon={ArrowLeft} size={14} className="inline mr-2" />
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 px-5 h-11 rounded-full bg-teal text-white text-xs font-medium hover:bg-teal/90 transition-all"
        >
          Activate Lease
          <Icon icon={CheckCircle2} size={14} className="inline ml-2" />
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================================
// STEP 7: ACTIVATING
// ============================================================================

function ActivatingStep({ data, onDone }: any) {
  const queryClient = useQueryClient()

  const activateMutation = useMutation({
    mutationFn: () => endpoints.activateLease(data.draftLeaseId),
    onSuccess: (result) => {
      toast.success(`Lease activated! ${result.scheduled_months} monthly records created.`)
      invalidateLeaseCaches(queryClient, {
        roomId: data.roomId,
        tenantId: data.createdTenantId || data.tenantId,
        leaseId: data.draftLeaseId,
        bedspaceId: data.bedspaceId  // Phase 4B.5
      })
      onDone()
    },
    onError: (err: any) => {
      toast.error('Activation failed', { description: err.message })
    },
    retry: false  // Disable auto-retry to prevent duplicate activations on transient failures
  })

  useEffect(() => {
    if (activateMutation.isPending || activateMutation.isSuccess) return
    activateMutation.mutate()
  }, [])

  return (
    <motion.div
      key="activating"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
      className="max-w-lg mx-auto text-center py-12"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 mx-auto mb-6 rounded-full bg-teal/10 border-4 border-teal/30 border-t-teal"
      />
      <h2 className="text-xl font-display italic text-espresso mb-2">Activating Lease...</h2>
      <p className="text-sm text-stone">Generating payment schedule and finalizing records</p>
    </motion.div>
  )
}

// ============================================================================
// STEP 8: DONE
// ============================================================================

function DoneStep({ onClose }: any) {
  return (
    <motion.div
      key="done"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING}
      className="max-w-lg mx-auto text-center py-12"
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-teal text-white grid place-items-center">
        <Icon icon={CheckCircle2} size={32} />
      </div>
      <h2 className="text-2xl font-display italic text-espresso mb-2">Lease Created!</h2>
      <p className="text-sm text-stone mb-8">The lease has been activated and payment schedule generated.</p>
      <button
        onClick={onClose}
        className="px-8 h-12 rounded-full bg-teal text-white text-sm font-medium hover:bg-teal/90 transition-all"
      >
        Done
      </button>
    </motion.div>
  )
}
