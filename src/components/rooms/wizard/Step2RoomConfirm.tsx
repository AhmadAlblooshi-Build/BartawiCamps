'use client'
import type { WizardState } from '../LeaseWizard'
import { formatAED } from '@/lib/utils'
import { CheckCircle, Warning } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

export function Step2RoomConfirm({ room, state }: { room: any; state: WizardState }) {
  const available = room.status === 'vacant'
  return (
    <div className="space-y-5">
      <div className="eyebrow">Verify room availability</div>
      <div className="bezel p-6">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${available ? 'bg-teal text-white' : 'bg-rust text-white'}`}>
            <Icon icon={available ? CheckCircle : Warning} size={18} emphasis />
          </div>
          <div className="flex-1">
            <div className="font-mono tabular text-[20px] font-semibold text-espresso">Room {room.room_number}</div>
            <div className="text-[12px] text-espresso-muted mt-1">
              {available ? 'Available for lease.' : `Currently ${room.status}. Cannot proceed until vacant.`}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[color:var(--color-border-subtle)]">
              <div><div className="eyebrow mb-1">Standard rent</div><div className="text-[13px] text-espresso font-mono tabular">{formatAED(room.standard_rent)}</div></div>
              <div><div className="eyebrow mb-1">Max capacity</div><div className="text-[13px] text-espresso font-mono tabular">{room.max_capacity || 0} ppl</div></div>
              <div><div className="eyebrow mb-1">Property type</div><div className="text-[13px] text-espresso">{room.property_type?.name || '—'}</div></div>
              <div><div className="eyebrow mb-1">Room size</div><div className="text-[13px] text-espresso">{room.room_size}</div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="bezel p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-pale text-teal grid place-items-center shrink-0">
          <Icon icon={CheckCircle} size={13} emphasis />
        </div>
        <div className="text-[12px] text-espresso-soft leading-relaxed">
          Proceeding for <strong className="text-espresso">{state.individual.full_name || state.individual.owner_name}</strong>
          {state.company_name && <> · <strong className="text-espresso">{state.company_name}</strong></>}.
        </div>
      </div>
    </div>
  )
}
