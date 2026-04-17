'use client'
import type { WizardState } from '../LeaseWizard'
import { formatAED } from '@/lib/utils'

interface Props { state: WizardState; patchState: (p: Partial<WizardState>) => void; room: any }

export function Step3Assignment({ state, patchState, room }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-3">Contract type</div>
        <div className="grid grid-cols-4 gap-2">
          {(['monthly', 'yearly', 'ejari', 'bgc'] as const).map(t => (
            <button key={t} onClick={() => patchState({ contract_type: t })}
              className={`h-11 rounded-lg text-[12px] font-medium uppercase tracking-wide transition-all ${
                state.contract_type === t ? 'bg-espresso text-sand-50 shadow-raise-1' : 'bg-sand-100 text-espresso-muted hover:bg-sand-200'
              }`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Monthly rent (AED) *</span>
          <input type="number" value={state.monthly_rent || ''} onChange={e => patchState({ monthly_rent: Number(e.target.value) || 0 })}
            className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
          <span className="text-[10px] text-espresso-subtle tabular">Standard: {formatAED(room.standard_rent)}</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">People count</span>
          <input type="number" value={state.people_count} onChange={e => patchState({ people_count: Number(e.target.value) || 1 })}
            className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Check-in date *</span>
          <input type="date" value={state.check_in_date} onChange={e => patchState({ check_in_date: e.target.value })}
            className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
        </label>
        {(state.contract_type === 'yearly' || state.contract_type === 'ejari') && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Contract end date *</span>
            <input type="date" value={state.contract_end_date ?? ''} onChange={e => patchState({ contract_end_date: e.target.value })}
              className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
          </label>
        )}
        {state.contract_type === 'ejari' && (
          <div className="col-span-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Ejari number</span>
              <input type="text" value={state.ejari_number ?? ''} onChange={e => patchState({ ejari_number: e.target.value })}
                className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
