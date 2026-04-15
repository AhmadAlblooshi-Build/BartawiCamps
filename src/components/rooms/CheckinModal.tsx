'use client'
import { useState } from 'react'
import { format, addYears, addMonths } from 'date-fns'
import { LogIn } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useCheckin } from '@/lib/queries'
import type { Room } from '@/lib/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  room: Room
  campCode: string
}

export function CheckinModal({ isOpen, onClose, room, campCode }: Props) {
  const { mutateAsync, isPending } = useCheckin()
  const isC2 = campCode === 'C2'

  const [form, setForm] = useState({
    owner_name: '',
    company_name: '',
    contract_type: 'monthly',
    contract_start_date: format(new Date(), 'yyyy-MM-dd'),
    contract_end_date: '',
    ejari_number: '',
    monthly_rent: room.standard_rent ? String(room.standard_rent) : '',
    people_count: '',
    checkin_date: format(new Date(), 'yyyy-MM-dd'),
    off_days: '0',
  })
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  const endDatePresets = [
    { label: '+6 Months', date: format(addMonths(new Date(), 6),  'yyyy-MM-dd') },
    { label: '+1 Year',   date: format(addYears(new Date(), 1),   'yyyy-MM-dd') },
    { label: '+2 Years',  date: format(addYears(new Date(), 2),   'yyyy-MM-dd') },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.monthly_rent || parseFloat(form.monthly_rent) <= 0) {
      setError('Monthly rent is required')
      return
    }
    if (isC2 && !form.company_name.trim()) {
      setError('Company name is required for Camp 2')
      return
    }
    if (!isC2 && !form.owner_name.trim()) {
      setError('Tenant name is required')
      return
    }
    try {
      await mutateAsync({
        room_id: room.id,
        camp_id: room.camp_id,
        ...(isC2 ? {
          company_name: form.company_name.trim(),
          contract_type: form.contract_type,
          contract_start_date: form.contract_start_date || undefined,
          contract_end_date: form.contract_end_date || undefined,
          ejari_number: form.ejari_number || undefined,
        } : {
          owner_name: form.owner_name.trim(),
        }),
        monthly_rent: parseFloat(form.monthly_rent),
        people_count: parseInt(form.people_count) || 0,
        checkin_date: form.checkin_date,
        off_days: parseInt(form.off_days) || 0,
      })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 1600)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Check-in failed')
    }
  }

  const inp = 'w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm font-body text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-cyan/50 transition-colors'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Check In — Room ${room.room_number}`} size="md">
      {success ? (
        <div className="py-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-status-occupied-dim border border-status-occupied/30 flex items-center justify-center">
            <span className="text-status-occupied text-3xl">✓</span>
          </div>
          <div className="text-center">
            <p className="font-heading font-bold text-text-primary text-lg">Checked In</p>
            <p className="text-text-muted text-sm mt-1">Room {room.room_number} is now occupied</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Camp indicator */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-accent-glow border border-accent-cyan/20 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-accent-cyan flex-shrink-0 animate-pulse-slow" />
            <span className="text-accent-cyan text-xs font-body font-medium">
              {isC2
                ? 'Camp 2 — Corporate tenant with formal contract'
                : 'Camp 1 — Individual tenant, monthly cash basis'}
            </span>
          </div>

          {/* Camp 1: individual name */}
          {!isC2 && (
            <div>
              <label className="block text-text-muted text-xs font-body mb-1.5">Tenant Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Mohammad Al Rashidi"
                value={form.owner_name}
                onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))}
                className={inp}
                required
              />
            </div>
          )}

          {/* Camp 2: company + contract */}
          {isC2 && (
            <>
              <div>
                <label className="block text-text-muted text-xs font-body mb-1.5">Company Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Tayas Contracting LLC"
                  value={form.company_name}
                  onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                  className={inp}
                  required
                />
              </div>

              <div>
                <label className="block text-text-muted text-xs font-body mb-1.5">Contract Type *</label>
                <select
                  value={form.contract_type}
                  onChange={e => setForm(p => ({ ...p, contract_type: e.target.value }))}
                  className={inp}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="ejari">Ejari</option>
                  <option value="bgc">BGC (Bartawi Gen. Cont.)</option>
                </select>
              </div>

              {form.contract_type !== 'monthly' && (
                <div>
                  <label className="block text-text-muted text-xs font-body mb-2">Contract End Date</label>
                  <div className="flex gap-2 mb-2">
                    {endDatePresets.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, contract_end_date: p.date }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-body transition-colors border ${
                          form.contract_end_date === p.date
                            ? 'bg-accent-glow border-accent-cyan/30 text-accent-cyan'
                            : 'bg-bg-elevated border-border text-text-muted hover:text-text-secondary'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="date"
                    value={form.contract_end_date}
                    onChange={e => setForm(p => ({ ...p, contract_end_date: e.target.value }))}
                    className={inp}
                  />
                </div>
              )}

              {form.contract_type === 'ejari' && (
                <div>
                  <label className="block text-text-muted text-xs font-body mb-1.5">Ejari Number</label>
                  <input
                    type="text"
                    placeholder="EJ-2026-XXXXXX"
                    value={form.ejari_number}
                    onChange={e => setForm(p => ({ ...p, ejari_number: e.target.value }))}
                    className={inp}
                  />
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted text-xs font-body mb-1.5">Monthly Rent (AED) *</label>
              <input
                type="number"
                placeholder="3500"
                value={form.monthly_rent}
                onChange={e => setForm(p => ({ ...p, monthly_rent: e.target.value }))}
                className={inp}
                required
              />
            </div>
            <div>
              <label className="block text-text-muted text-xs font-body mb-1.5">No. of People</label>
              <input
                type="number"
                placeholder="4"
                value={form.people_count}
                onChange={e => setForm(p => ({ ...p, people_count: e.target.value }))}
                className={inp}
              />
            </div>
          </div>

          <div>
            <label className="block text-text-muted text-xs font-body mb-1.5">Check-in Date *</label>
            <input
              type="date"
              value={form.checkin_date}
              onChange={e => setForm(p => ({ ...p, checkin_date: e.target.value }))}
              className={inp}
              required
            />
          </div>

          {error && (
            <p className="text-status-vacant text-xs bg-status-vacant-dim border border-status-vacant/20 rounded-lg px-3 py-2.5">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-sm font-body text-text-muted hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-cyan text-bg-primary rounded-lg text-sm font-body font-semibold hover:bg-accent-dim transition-colors disabled:opacity-50">
              <LogIn className="w-4 h-4" />
              {isPending ? 'Processing...' : 'Confirm Check In'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
