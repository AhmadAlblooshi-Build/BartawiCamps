'use client'
import type { WizardState } from '../LeaseWizard'
import { formatAED, formatDate } from '@/lib/utils'
import { CheckCircle } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

export function Step6Activate({ room, state }: { room: any; state: WizardState }) {
  return (
    <div className="space-y-5">
      <div className="bezel p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-teal text-white grid place-items-center">
            <Icon icon={CheckCircle} size={16} emphasis />
          </div>
          <div>
            <div className="eyebrow">Final review</div>
            <div className="display-sm mt-0.5">Confirm and activate</div>
          </div>
        </div>
        <div className="space-y-3">
          <Section title="Tenant">
            <Row label="Name"     value={state.individual.full_name || state.individual.owner_name || '—'} />
            <Row label="Mobile"   value={state.individual.mobile_number || '—'} mono />
            <Row label="Company"  value={state.company_name || '—'} />
            {state.individual.emergency_contact_name && <Row label="Emergency" value={`${state.individual.emergency_contact_name} · ${state.individual.emergency_contact_phone || ''}`} />}
          </Section>
          <Section title="Room">
            <Row label="Room"  value={room.room_number} mono />
            <Row label="Type"  value={room.property_type?.name || '—'} />
            <Row label="Block" value={room.block?.code || '—'} mono />
          </Section>
          <Section title="Contract">
            <Row label="Type"     value={state.contract_type.toUpperCase()} />
            <Row label="Rent"     value={`${formatAED(state.monthly_rent)}/mo`} mono />
            <Row label="People"   value={String(state.people_count)} mono />
            <Row label="Check-in" value={formatDate(state.check_in_date)} />
            {state.contract_end_date && <Row label="Contract end" value={formatDate(state.contract_end_date)} />}
          </Section>
          {state.deposit_amount > 0 && (
            <Section title="Deposit">
              <Row label="Amount" value={formatAED(state.deposit_amount)} mono />
              <Row label="Method" value={state.deposit_method} />
            </Section>
          )}
          {state.generate_schedule && (
            <Section title="Schedule">
              <Row label="Months"  value={String(state.schedule_months)} mono />
              <Row label="Due day" value={`${state.schedule_due_day} of each month`} />
              <Row label="Total"   value={formatAED(state.monthly_rent * state.schedule_months)} mono />
            </Section>
          )}
        </div>
      </div>
      <div className="bezel p-4 bg-teal-pale text-teal flex items-start gap-3">
        <Icon icon={CheckCircle} size={14} emphasis className="mt-0.5 shrink-0" />
        <div className="text-[12px]">
          Clicking <strong>Activate lease</strong> will create the occupancy, generate the contract,
          issue the deposit receipt, and schedule future payments — in one atomic transaction.
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2">{title}</div>
      <div className="space-y-1 pl-3 border-l-2 border-sand-200">{children}</div>
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center text-[12px]">
      <span className="text-espresso-muted w-28 shrink-0">{label}</span>
      <span className={`text-espresso ${mono ? 'font-mono tabular' : ''}`}>{value}</span>
    </div>
  )
}
