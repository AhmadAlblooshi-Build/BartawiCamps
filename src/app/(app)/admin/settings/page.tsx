'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Gear, Key, FlagBanner, Buildings } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

type Tab = 'tenant' | 'features' | 'keys'

const FEATURE_FLAGS = [
  { key: 'ai_anomaly_detection',   label: 'AI anomaly detection', description: 'Generate insight narrations on dashboard.' },
  { key: 'ai_complaint_classify',  label: 'AI complaint classification', description: 'Auto-categorize complaints as they are typed.' },
  { key: 'payment_schedules',      label: 'Auto payment schedules', description: 'Generate forward-looking monthly records daily.' },
  { key: 'overdue_detection',      label: 'Overdue detection', description: 'Mark unpaid records as overdue nightly.' },
  { key: 'ejari_validation',       label: 'Ejari format validation', description: 'Enforce ejari number format on entry.' },
  { key: 'sensor_ingest',          label: 'Sensor data ingestion', description: 'Accept sensor readings (future).' },
]

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('tenant')
  return (
    <div className="space-y-8">
      <div className="animate-rise">
        <div className="eyebrow mb-2">Admin</div>
        <h1 className="display-lg">Settings</h1>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-sand-100 w-fit">
        {([
          ['tenant',   Buildings,  'Tenant info'],
          ['features', FlagBanner, 'Feature flags'],
          ['keys',     Key,        'API keys'],
        ] as [Tab, any, string][]).map(([v, icon, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={cn('px-4 py-2 rounded-lg text-[12px] font-medium flex items-center gap-2 transition-all',
              tab === v ? 'bg-white text-espresso shadow-raise-1' : 'text-espresso-muted hover:text-espresso')}>
            <Icon icon={icon} size={12} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'tenant' && <TenantTab />}
      {tab === 'features' && <FeaturesTab />}
      {tab === 'keys' && <KeysTab />}
    </div>
  )
}

function TenantTab() {
  const { data: tenant } = useQuery({ queryKey: ['tenant'], queryFn: () => endpoints.tenant() })
  const [name, setName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [trn, setTrn] = useState('')
  const qc = useQueryClient()

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '')
      setLegalName(tenant.legal_name || '')
      setTrn(tenant.trn || '')
    }
  }, [tenant])

  const save = useMutation({
    mutationFn: () => endpoints.updateTenant({ name, legal_name: legalName, trn }),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries({ queryKey: ['tenant'] }) },
  })

  return (
    <div className="bezel p-6 max-w-[640px]">
      <div className="eyebrow mb-4">Organization</div>
      <div className="space-y-4">
        <Field label="Display name"   value={name}       onChange={setName} />
        <Field label="Legal name"     value={legalName}  onChange={setLegalName} />
        <Field label="TRN"            value={trn}        onChange={setTrn} mono />
      </div>
      <div className="mt-5 flex justify-end">
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="h-9 px-4 rounded-full bg-espresso text-sand-50 text-[12px] font-medium hover:bg-espresso-soft disabled:opacity-50 transition-all">
          {save.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

function FeaturesTab() {
  const { data: flags } = useQuery({ queryKey: ['feature-flags'], queryFn: () => endpoints.featureFlags() })
  const qc = useQueryClient()
  const toggle = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => endpoints.setFeatureFlag(key, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature-flags'] }),
  })

  const get = (k: string) => flags?.data?.find((f: any) => f.key === k)?.enabled ?? false

  return (
    <div className="bezel p-6 max-w-[720px]">
      <div className="eyebrow mb-4">Feature flags</div>
      <div className="divide-y divide-[color:var(--color-border-subtle)]">
        {FEATURE_FLAGS.map(f => (
          <label key={f.key} className="flex items-start gap-4 py-4 cursor-pointer">
            <input type="checkbox" checked={get(f.key)} onChange={e => toggle.mutate({ key: f.key, enabled: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-amber-500 cursor-pointer" />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-espresso">{f.label}</div>
              <div className="text-[11px] text-espresso-muted mt-0.5">{f.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

function KeysTab() {
  return (
    <div className="bezel p-6 max-w-[640px]">
      <div className="eyebrow mb-3">API access</div>
      <div className="text-[13px] text-espresso-muted leading-relaxed">
        API keys for third-party integrations (Ejari system, payment gateway, accounting software) will be managed here in a future release.
      </div>
      <div className="mt-4 px-3 py-2 rounded bg-amber-50 text-amber-600 text-[11px] font-medium inline-block">
        Coming soon
      </div>
    </div>
  )
}

function Field({ label, value, onChange, mono = false }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-espresso-muted">{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className={cn('h-10 px-3 bg-white border border-[color:var(--color-border-medium)] rounded-lg text-[13px] focus:border-amber-500 focus:outline-none', mono && 'font-mono tabular')} />
    </label>
  )
}
