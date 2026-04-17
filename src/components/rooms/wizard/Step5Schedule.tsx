'use client'
import type { WizardState } from '../LeaseWizard'
import { cn, formatAED } from '@/lib/utils'

export function Step5Schedule({ state, patchState }: { state: WizardState; patchState: (p: Partial<WizardState>) => void }) {
  const total = state.monthly_rent * state.schedule_months
  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-3">Payment schedule</div>
        <div className="bezel p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={state.generate_schedule} onChange={e => patchState({ generate_schedule: e.target.checked })}
              className="w-4 h-4 accent-amber-500 cursor-pointer" />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-espresso">Auto-generate monthly billing schedule</div>
              <div className="text-[11px] text-espresso-muted mt-0.5">
                Creates forward-looking monthly records. Overdue detection runs daily at 01:00 Dubai time.
              </div>
            </div>
          </label>
        </div>
      </div>
      {state.generate_schedule && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Months to generate</span>
              <input type="number" min={1} max={60} value={state.schedule_months}
                onChange={e => patchState({ schedule_months: Math.max(1, Math.min(60, Number(e.target.value) || 12)) })}
                className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] font-mono tabular focus:border-amber-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">Due day of month</span>
              <select value={state.schedule_due_day} onChange={e => patchState({ schedule_due_day: Number(e.target.value) })}
                className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none cursor-pointer">
                {[1, 5, 10, 15, 20, 25, 28].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          </div>
          <div className="bezel p-4">
            <div className="eyebrow mb-2">Summary</div>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex items-center justify-between"><span className="text-espresso-muted">Monthly rent</span><span className="font-mono tabular text-espresso">{formatAED(state.monthly_rent)}</span></div>
              <div className="flex items-center justify-between"><span className="text-espresso-muted">Months</span><span className="font-mono tabular text-espresso">{state.schedule_months}</span></div>
              <div className="h-px bg-[color:var(--color-border-subtle)] my-2" />
              <div className="flex items-center justify-between"><span className="text-espresso-muted">Total scheduled</span><span className="font-mono tabular text-espresso font-semibold">{formatAED(total)}</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
