'use client'
import type { WizardState } from '../LeaseWizard'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { endpoints } from '@/lib/api'
import { MagnifyingGlass, User, Buildings } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

interface Props {
  state: WizardState
  patchIndividual: (p: Partial<WizardState['individual']>) => void
  patchState: (p: Partial<WizardState>) => void
}

export function Step1Tenant({ state, patchIndividual, patchState }: Props) {
  const [personQ, setPersonQ] = useState('')
  const [companyQ, setCompanyQ] = useState('')

  const { data: people } = useQuery({
    queryKey: ['search-people', personQ],
    queryFn: () => endpoints.searchEntities(personQ, 'individual'),
    enabled: personQ.length >= 2,
  })
  const { data: companies } = useQuery({
    queryKey: ['search-companies-wizard', companyQ],
    queryFn: () => endpoints.searchEntities(companyQ, 'company'),
    enabled: companyQ.length >= 2,
  })

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-3">Tenant details</div>
        <div className="bezel p-4 mb-4">
          <label className="flex items-center gap-2 text-[11px] font-medium text-espresso-muted mb-2">
            <Icon icon={User} size={12} />
            Find existing person
          </label>
          <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-sand-50 border border-[color:var(--color-border-subtle)]">
            <Icon icon={MagnifyingGlass} size={12} className="text-espresso-muted" />
            <input
              value={personQ}
              onChange={e => setPersonQ(e.target.value)}
              placeholder="Search by name..."
              className="flex-1 bg-transparent outline-none text-[13px] font-body"
            />
          </div>
          {people?.data && people.data.length > 0 && personQ.length >= 2 && (
            <div className="mt-2 max-h-40 overflow-y-auto border border-[color:var(--color-border-subtle)] rounded-lg">
              {people.data.map((p: any) => (
                <button key={p.id} onClick={() => {
                  patchIndividual({
                    full_name: p.full_name,
                    owner_name: p.owner_name,
                    mobile_number: p.mobile_number,
                    nationality: p.nationality,
                    emergency_contact_name: p.emergency_contact_name,
                    emergency_contact_phone: p.emergency_contact_phone,
                  })
                  setPersonQ('')
                }}
                  className="w-full text-left px-3 py-2 hover:bg-sand-50 transition-colors border-b border-[color:var(--color-border-subtle)] last:border-0">
                  <div className="text-[13px] text-espresso">{p.full_name || p.owner_name}</div>
                  <div className="text-[11px] text-espresso-muted tabular">{p.mobile_number || '—'} · {p.nationality || '—'}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField label="Full name *" value={state.individual.full_name ?? ''} onChange={v => patchIndividual({ full_name: v })} />
          <TextField label="Mobile"      value={state.individual.mobile_number ?? ''} onChange={v => patchIndividual({ mobile_number: v })} mono />
          <TextField label="Nationality" value={state.individual.nationality ?? ''} onChange={v => patchIndividual({ nationality: v })} />
          <TextField label="Date of birth" type="date" value={state.individual.dob ?? ''} onChange={v => patchIndividual({ dob: v })} />
          <TextField label="Emirates ID" value={state.individual.eid_number ?? ''} onChange={v => patchIndividual({ eid_number: v })} mono />
          <TextField label="Passport #"  value={state.individual.passport_number ?? ''} onChange={v => patchIndividual({ passport_number: v })} mono />
        </div>
      </div>

      <div>
        <div className="eyebrow mb-3">Emergency contact</div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Name"  value={state.individual.emergency_contact_name ?? ''} onChange={v => patchIndividual({ emergency_contact_name: v })} />
          <TextField label="Phone" value={state.individual.emergency_contact_phone ?? ''} onChange={v => patchIndividual({ emergency_contact_phone: v })} mono />
          <SelectField label="Relation" value={state.individual.emergency_contact_relation ?? ''} onChange={v => patchIndividual({ emergency_contact_relation: v })}
            options={[['', 'Select...'],['spouse', 'Spouse'],['parent', 'Parent'],['sibling', 'Sibling'],['child', 'Child'],['friend', 'Friend'],['coworker', 'Coworker'],['other', 'Other']]} />
        </div>
      </div>

      <div>
        <div className="eyebrow mb-3">Company (optional)</div>
        <div className="bezel p-4">
          <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-sand-50 border border-[color:var(--color-border-subtle)]">
            <Icon icon={Buildings} size={12} className="text-espresso-muted" />
            <input value={state.company_name || companyQ}
              onChange={e => { setCompanyQ(e.target.value); patchState({ company_name: e.target.value, company_id: undefined }) }}
              placeholder="Search or type company name..."
              className="flex-1 bg-transparent outline-none text-[13px] font-body" />
          </div>
          {companies?.data && companies.data.length > 0 && companyQ.length >= 2 && (
            <div className="mt-2 max-h-40 overflow-y-auto border border-[color:var(--color-border-subtle)] rounded-lg">
              {companies.data.map((c: any) => (
                <button key={c.id} onClick={() => { patchState({ company_id: c.id, company_name: c.name }); setCompanyQ('') }}
                  className="w-full text-left px-3 py-2 hover:bg-sand-50 transition-colors border-b border-[color:var(--color-border-subtle)] last:border-0">
                  <div className="text-[13px] text-espresso">{c.name}</div>
                  {c.contact_person && <div className="text-[11px] text-espresso-muted">{c.contact_person}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, mono = false, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean; type?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className={cn('h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none transition-colors', mono && 'font-mono tabular')} />
    </label>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][]
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none transition-colors cursor-pointer">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}
