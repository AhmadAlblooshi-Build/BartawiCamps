'use client'
import type { WizardState } from '../LeaseWizard'
import { cn, formatAED } from '@/lib/utils'

export function Step4Deposit({ state, patchState }: { state: WizardState; patchState: (p: Partial<WizardState>) => void }) {
  const suggest = state.monthly_rent
  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-3">Security deposit</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Amount (AED)</span>
            <input type="number" value={state.deposit_amount || ''} onChange={e => patchState({ deposit_amount: Number(e.target.value) || 0 })}
              placeholder="0"
              className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
            <div className="flex items-center gap-2 text-[10px] text-espresso-muted">
              <button onClick={() => patchState({ deposit_amount: 0 })} className="hover:text-espresso">None</button>
              <span className="text-espresso-subtle">·</span>
              <button onClick={() => patchState({ deposit_amount: suggest })} className="hover:text-espresso">1 month ({formatAED(suggest)})</button>
              <span className="text-espresso-subtle">·</span>
              <button onClick={() => patchState({ deposit_amount: suggest * 2 })} className="hover:text-espresso">2 months</button>
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Payment method</span>
            <select value={state.deposit_method} onChange={e => patchState({ deposit_method: e.target.value as any })}
              className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none">
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </label>
          {state.deposit_method !== 'cash' && (
            <div className="col-span-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Reference</span>
                <input type="text" value={state.deposit_reference ?? ''} onChange={e => patchState({ deposit_reference: e.target.value })}
                  placeholder={state.deposit_method === 'cheque' ? 'Cheque number' : 'Transaction reference'}
                  className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
              </label>
            </div>
          )}
        </div>
      </div>
      <div className={cn('rounded-lg p-4 text-[12px]', state.deposit_amount > 0 ? 'bg-teal-pale text-teal' : 'bg-sand-100 text-espresso-muted')}>
        {state.deposit_amount > 0
          ? `A receipt will be generated for ${formatAED(state.deposit_amount)} on activation.`
          : 'No deposit will be collected. Receipt not issued.'}
      </div>
    </div>
  )
}
