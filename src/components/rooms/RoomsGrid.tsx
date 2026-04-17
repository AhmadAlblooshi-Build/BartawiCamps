'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAED, cn } from '@/lib/utils'
import { MagnifyingGlass, ArrowUpRight, ArrowDownLeft, X } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { RoomDetailDrawer } from './RoomDetailDrawer'
import { LeaseWizard } from './LeaseWizard'
import { AnimatePresence } from 'motion/react'

interface Props { campId?: string }

export function RoomsGrid({ campId }: Props) {
  const search = useSearchParams()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<string>('')
  const [sizeFilter, setSizeFilter] = useState<string>('')
  const [hasBalance, setHasBalance] = useState<boolean>(false)
  const [wizardRoom, setWizardRoom] = useState<any | null>(null)

  const openRoomId = search.get('open')
  const setOpenRoomId = (id: string | null) => {
    const qs = new URLSearchParams(search.toString())
    if (id) qs.set('open', id); else qs.delete('open')
    router.replace(`?${qs.toString()}`, { scroll: false })
  }

  const [qDebounced, setQDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250)
    return () => clearTimeout(t)
  }, [q])

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', campId, qDebounced, status, sizeFilter, hasBalance],
    queryFn: () => endpoints.rooms({
      ...(campId ? { camp_id: campId } : {}),
      ...(qDebounced ? { q: qDebounced } : {}),
      ...(status ? { status } : {}),
      ...(sizeFilter ? { room_size: sizeFilter } : {}),
      ...(hasBalance ? { has_balance: 'true' } : {}),
      limit: 500,
    }),
  })

  return (
    <div className="space-y-5">
      <div className="bezel p-3 flex items-center gap-2 flex-wrap">
        <div className="flex-1 flex items-center gap-2 min-w-[240px]">
          <Icon icon={MagnifyingGlass} size={14} className="text-espresso-muted ml-2" />
          <input
            placeholder="Search room number, tenant, or company..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="flex-1 bg-transparent outline-none font-body text-sm text-espresso placeholder:text-espresso-subtle py-1"
          />
          {q && (
            <button onClick={() => setQ('')} className="w-6 h-6 rounded grid place-items-center hover:bg-sand-100">
              <Icon icon={X} size={12} />
            </button>
          )}
        </div>

        <select value={status} onChange={e => setStatus(e.target.value)}
          className="h-9 px-3 rounded-lg bg-sand-100 text-[11px] font-medium text-espresso border-0 outline-none hover:bg-sand-200 transition-colors cursor-pointer">
          <option value="">All statuses</option>
          <option value="occupied">Occupied</option>
          <option value="vacant">Vacant</option>
          <option value="vacating">Vacating</option>
          <option value="bartawi_use">Bartawi</option>
          <option value="maintenance">Maintenance</option>
        </select>

        <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-sand-100 text-[11px] font-medium text-espresso border-0 outline-none hover:bg-sand-200 transition-colors cursor-pointer">
          <option value="">All sizes</option>
          <option value="big">Big</option>
          <option value="small">Small</option>
          <option value="service">Service</option>
        </select>

        <button
          onClick={() => setHasBalance(v => !v)}
          className={cn('px-3 h-9 rounded-lg text-[11px] font-medium transition-colors',
            hasBalance ? 'bg-rust text-white' : 'bg-sand-100 text-espresso-muted hover:bg-sand-200')}
        >
          Has balance
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-14 skeleton-shimmer rounded-lg" />)}
        </div>
      ) : !data?.data?.length ? (
        <div className="bezel p-12 text-center">
          <div className="text-[13px] font-medium text-espresso mb-1">No rooms match your filters</div>
          <div className="text-[12px] text-espresso-muted">Try clearing a filter or the search.</div>
        </div>
      ) : (
        <div className="bezel overflow-hidden">
          <div className="grid grid-cols-[100px_1fr_1fr_140px_120px_120px_120px] gap-0 px-4 py-3 border-b border-[color:var(--color-border-subtle)] bg-sand-50">
            <div className="eyebrow">Room</div>
            <div className="eyebrow">Occupant</div>
            <div className="eyebrow">Company</div>
            <div className="eyebrow">Status</div>
            <div className="eyebrow text-right">Rent</div>
            <div className="eyebrow text-right">Balance</div>
            <div className="eyebrow text-right">Actions</div>
          </div>
          <div className="divide-y divide-[color:var(--color-border-subtle)] max-h-[calc(100vh-380px)] overflow-y-auto">
            {data.data.map((room: any) => (
              <RoomRow
                key={room.id}
                room={room}
                onOpen={() => setOpenRoomId(room.id)}
                onCheckin={() => setWizardRoom(room)}
              />
            ))}
          </div>
          <div className="px-4 py-3 border-t border-[color:var(--color-border-subtle)] bg-sand-50 text-[11px] text-espresso-muted">
            Showing <span className="font-mono tabular text-espresso">{data.data.length}</span> rooms
          </div>
        </div>
      )}

      <AnimatePresence>
        {openRoomId && (
          <RoomDetailDrawer
            roomId={openRoomId}
            onClose={() => setOpenRoomId(null)}
            onStartCheckin={room => setWizardRoom(room)}
          />
        )}
        {wizardRoom && <LeaseWizard room={wizardRoom} onClose={() => setWizardRoom(null)} />}
      </AnimatePresence>
    </div>
  )
}

function RoomRow({ room, onOpen, onCheckin }: { room: any; onOpen: () => void; onCheckin: () => void }) {
  const occupant = room.current_occupancy?.individual?.owner_name
    || room.current_occupancy?.individual?.full_name
    || (room.status === 'vacant' ? '—' : '')
  const company = room.current_occupancy?.company?.name || '—'
  const balance = Number(room.outstanding_balance || 0)

  return (
    <div onClick={onOpen}
      className="grid grid-cols-[100px_1fr_1fr_140px_120px_120px_120px] gap-0 px-4 py-3 hover:bg-sand-50 cursor-pointer transition-colors items-center">
      <div className="font-mono tabular text-[13px] font-semibold text-espresso">{room.room_number}</div>
      <div className="text-[13px] text-espresso truncate pr-3">{occupant}</div>
      <div className="text-[13px] text-espresso-muted truncate pr-3">{company}</div>
      <div><StatusBadge status={room.status} /></div>
      <div className="text-right font-mono tabular text-[12px] text-espresso">
        {Number(room.standard_rent) > 0 ? formatAED(room.standard_rent) : '—'}
      </div>
      <div className={cn('text-right font-mono tabular text-[12px]',
        balance > 0 ? 'text-rust font-semibold' : 'text-espresso-subtle')}>
        {balance > 0 ? formatAED(balance) : '—'}
      </div>
      <div className="flex items-center justify-end gap-1">
        {room.status === 'vacant' && (
          <button onClick={e => { e.stopPropagation(); onCheckin() }}
            className="w-7 h-7 rounded-md grid place-items-center bg-teal-pale text-teal hover:bg-teal hover:text-white transition-colors"
            aria-label="Check in">
            <Icon icon={ArrowDownLeft} size={12} />
          </button>
        )}
        {room.status === 'occupied' && (
          <button onClick={e => { e.stopPropagation(); onOpen() }}
            className="w-7 h-7 rounded-md grid place-items-center bg-sand-100 text-espresso-muted hover:bg-sand-200 transition-colors"
            aria-label="Open">
            <Icon icon={ArrowUpRight} size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    occupied:    { bg: 'bg-teal-pale',    fg: 'text-teal',    label: 'Occupied' },
    vacant:      { bg: 'bg-sand-100',     fg: 'text-espresso-muted', label: 'Vacant' },
    vacating:    { bg: 'bg-ochre-pale',   fg: 'text-ochre',   label: 'Vacating' },
    bartawi_use: { bg: 'bg-amber-50',     fg: 'text-amber-600', label: 'Bartawi' },
    maintenance: { bg: 'bg-ochre-pale',   fg: 'text-ochre',   label: 'Maintenance' },
  }
  const s = map[status] || map.vacant
  return <span className={cn('inline-flex items-center px-2 py-1 rounded text-[10px] font-medium', s.bg, s.fg)}>{s.label}</span>
}
