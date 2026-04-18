'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, CheckCircle, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { Step1Tenant } from './wizard/Step1Tenant'
import { Step2RoomConfirm } from './wizard/Step2RoomConfirm'
import { Step3Assignment } from './wizard/Step3Assignment'
import { Step4Deposit } from './wizard/Step4Deposit'
import { Step5Schedule } from './wizard/Step5Schedule'
import { Step6Activate } from './wizard/Step6Activate'

interface Props { room: any; onClose: () => void }

export interface WizardState {
  individual: {
    full_name?: string
    owner_name?: string
    nationality?: string
    mobile_number?: string
    eid_number?: string
    passport_number?: string
    dob?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    emergency_contact_relation?: string
  }
  company_id?: string
  company_name?: string
  contract_type: 'monthly' | 'yearly' | 'ejari' | 'bgc'
  people_count: number
  monthly_rent: number
  check_in_date: string
  contract_end_date?: string
  ejari_number?: string
  deposit_amount: number
  deposit_method: 'cash' | 'cheque' | 'bank_transfer' | 'other'
  deposit_reference?: string
  generate_schedule: boolean
  schedule_months: number
  schedule_due_day: number
  notes?: string
}

const STEPS = [
  { id: 1, label: 'Tenant',    description: 'Identify the person' },
  { id: 2, label: 'Confirm',   description: 'Verify room availability' },
  { id: 3, label: 'Assign',    description: 'Rent & check-in date' },
  { id: 4, label: 'Deposit',   description: 'Security deposit' },
  { id: 5, label: 'Schedule',  description: 'Future payments' },
  { id: 6, label: 'Activate',  description: 'Final review' },
]

export function LeaseWizard({ room, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>({
    individual: {},
    contract_type: 'monthly',
    people_count: 1,
    monthly_rent: Number(room.standard_rent) || 0,
    check_in_date: new Date().toISOString().slice(0, 10),
    deposit_amount: 0,
    deposit_method: 'cash',
    generate_schedule: true,
    schedule_months: 12,
    schedule_due_day: 1,
  })
  const qc = useQueryClient()

  const patchState = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }))
  const patchIndividual = (patch: Partial<WizardState['individual']>) =>
    setState(s => ({ ...s, individual: { ...s.individual, ...patch } }))

  const activate = useMutation({
    mutationFn: async () => {
      const checkin: any = await endpoints.checkin({
        camp_id: room.camp_id,
        room_id: room.id,
        people_count: state.people_count,
        check_in_date: state.check_in_date,
        rent_amount: state.monthly_rent,
        individual: state.individual,
        company_id: state.company_id,
        company_name: state.company_name,
        contract: {
          contract_type: state.contract_type,
          monthly_rent: state.monthly_rent,
          start_date: state.check_in_date,
          end_date: state.contract_end_date,
          ejari_number: state.ejari_number,
        },
      })
      if (state.deposit_amount > 0) {
        await endpoints.collectDeposit({
          camp_id: room.camp_id,
          room_id: room.id,
          contract_id: checkin?.contract_id,
          occupancy_id: checkin?.occupancy_id,
          amount: state.deposit_amount,
          payment_method: state.deposit_method,
          payment_reference: state.deposit_reference,
        })
      }
      if (state.generate_schedule && state.schedule_months > 0) {
        const startDate = new Date(state.check_in_date)
        await endpoints.generateSchedule({
          contract_id: checkin?.contract_id,
          occupancy_id: checkin?.occupancy_id,
          start_month: startDate.getMonth() + 1,
          start_year: startDate.getFullYear(),
          months: state.schedule_months,
          monthly_amount: state.monthly_rent,
          due_day: state.schedule_due_day,
        })
      }
      return checkin
    },
    onSuccess: () => {
      toast.success('Lease activated', { description: `Room ${room.room_number} is now occupied.` })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room', room.id] })
      qc.invalidateQueries({ queryKey: ['camps'] })
      onClose()
    },
    onError: (err: any) => toast.error('Failed to activate lease', { description: err.message }),
  })

  const canProceed =
    step === 1 ? Boolean(state.individual.full_name || state.individual.owner_name) :
    step === 2 ? room.status === 'vacant' :
    step === 3 ? state.monthly_rent > 0 && Boolean(state.check_in_date) :
    true

  return (
    <Dialog.Root open={true} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-espresso/30 backdrop-blur-sm z-50 animate-fade" />
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed left-1/2 top-[6vh] -translate-x-1/2 w-[720px] max-w-[calc(100vw-2rem)] max-h-[88vh] bg-white rounded-2xl shadow-raise-4 flex flex-col z-50 overflow-hidden"
          >
            <Dialog.Title className="sr-only">Lease creation wizard</Dialog.Title>
            <header className="flex items-center justify-between px-6 h-16 border-b border-[color:var(--color-border-subtle)]">
              <div>
                <div className="eyebrow mb-0.5">New lease · Room {room.room_number}</div>
                <div className="display-xs">Step {step} of {STEPS.length} · {STEPS[step - 1].label}</div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-sand-100" aria-label="Close">
                <Icon icon={X} size={16} />
              </button>
            </header>

            <div className="px-6 pt-5 pb-4">
              {/* Step indicator with numbered circles */}
              <div className="flex items-center justify-between mb-3">
                {STEPS.map((s, idx) => (
                  <div key={s.id} className="flex items-center" style={{ flex: idx === STEPS.length - 1 ? '0 0 auto' : '1 1 0%' }}>
                    <button
                      onClick={() => s.id <= step && setStep(s.id)}
                      disabled={s.id > step}
                      className={cn(
                        'relative w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors z-10',
                        s.id < step ? 'bg-teal text-white' :
                        s.id === step ? 'bg-amber text-white' :
                        'bg-sand-200 text-espresso-muted'
                      )}
                    >
                      {s.id < step ? <Icon icon={CheckCircle} size={14} emphasis /> : s.id}
                      {/* Pulse ring for current step */}
                      {s.id === step && (
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-amber"
                          initial={{ scale: 1, opacity: 1 }}
                          animate={{ scale: 1.4, opacity: 0 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                        />
                      )}
                      {/* layoutId for smooth slide between steps */}
                      {s.id === step && (
                        <motion.div
                          layoutId="activeStep"
                          className="absolute inset-0 rounded-full bg-amber -z-10"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </button>
                    {/* Connection line */}
                    {idx < STEPS.length - 1 && (
                      <div className={cn(
                        'h-0.5 flex-1 mx-2 transition-colors',
                        s.id < step ? 'bg-teal' : 'bg-sand-200'
                      )} />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center">
                <div className="text-[11px] font-medium text-espresso">{STEPS[step - 1].label}</div>
                <div className="text-[10px] text-espresso-muted">{STEPS[step - 1].description}</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <AnimatePresence mode="wait">
                <motion.div key={step}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                  {step === 1 && <Step1Tenant state={state} patchIndividual={patchIndividual} patchState={patchState} />}
                  {step === 2 && <Step2RoomConfirm room={room} state={state} />}
                  {step === 3 && <Step3Assignment state={state} patchState={patchState} room={room} />}
                  {step === 4 && <Step4Deposit state={state} patchState={patchState} />}
                  {step === 5 && <Step5Schedule state={state} patchState={patchState} />}
                  {step === 6 && <Step6Activate room={room} state={state} />}
                </motion.div>
              </AnimatePresence>
            </div>

            <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex items-center justify-between">
              <button
                onClick={() => setStep(s => Math.max(1, s - 1))}
                disabled={step === 1}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-[12px] font-medium text-espresso-muted hover:text-espresso disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon icon={CaretLeft} size={12} /> Back
              </button>
              {step < STEPS.length ? (
                <button
                  onClick={() => canProceed && setStep(s => s + 1)}
                  disabled={!canProceed}
                  className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  Continue <Icon icon={CaretRight} size={12} />
                </button>
              ) : (
                <motion.button
                  onClick={() => activate.mutate()}
                  disabled={activate.isPending}
                  className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-teal text-white text-[12px] font-medium hover:bg-teal-light disabled:opacity-50 transition-all active:scale-[0.98]"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.6, times: [0, 0.5, 1], delay: 0.3 }}
                >
                  <Icon icon={CheckCircle} size={13} emphasis />
                  {activate.isPending ? 'Activating…' : 'Activate lease'}
                </motion.button>
              )}
            </footer>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
