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
import { AnimatePresence, motion } from 'motion/react'
import { staggerContainer, staggerItem, cardHover } from '@/lib/motion'

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
    const t = setTimeout(() => setQDebounced(q), 200)
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

  const hasActiveFilters = status || sizeFilter || hasBalance || q
  const clearAllFilters = () => {
    setStatus('')
    setSizeFilter('')
    setHasBalance(false)
    setQ('')
  }

  return (
    <div className="space-y-5">
      {/* Filter bar - evolved styling */}
      <div className="rounded-[14px] p-3 flex items-center gap-2 flex-wrap" style={{ background: 'rgba(var(--color-sand-100-rgb, 237, 232, 225), 0.6)' }}>
        <div className="flex-1 flex items-center gap-2 min-w-[240px]">
          <Icon icon={MagnifyingGlass} size={14} className="text-espresso-muted ml-2" />
          <input
            placeholder="Search room number, tenant, or company..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="flex-1 bg-transparent outline-none font-body text-sm text-espresso placeholder:text-espresso-subtle py-1"
          />
          {q && (
            <button onClick={() => setQ('')} className="w-6 h-6 rounded grid place-items-center hover:bg-sand-100 transition-colors">
              <Icon icon={X} size={12} />
            </button>
          )}
        </div>

        <select value={status} onChange={e => setStatus(e.target.value)}
          className={cn('h-9 px-3 rounded-lg text-[11px] font-medium border-0 outline-none transition-colors cursor-pointer',
            status ? 'bg-amber text-amber' : 'bg-sand-200 text-espresso hover:bg-sand-200')}
          style={status ? { background: 'rgba(184, 136, 61, 0.1)' } : {}}>
          <option value="">All statuses</option>
          <option value="occupied">Occupied</option>
          <option value="vacant">Vacant</option>
          <option value="vacating">Vacating</option>
          <option value="bartawi_use">Bartawi</option>
          <option value="maintenance">Maintenance</option>
        </select>

        <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}
          className={cn('h-9 px-3 rounded-lg text-[11px] font-medium border-0 outline-none transition-colors cursor-pointer',
            sizeFilter ? 'bg-amber text-amber' : 'bg-sand-200 text-espresso hover:bg-sand-200')}
          style={sizeFilter ? { background: 'rgba(184, 136, 61, 0.1)' } : {}}>
          <option value="">All sizes</option>
          <option value="big">Big</option>
          <option value="small">Small</option>
          <option value="service">Service</option>
        </select>

        <button
          onClick={() => setHasBalance(v => !v)}
          className={cn('px-3 h-9 rounded-lg text-[11px] font-medium transition-colors',
            hasBalance ? 'text-amber' : 'bg-sand-200 text-espresso-muted hover:bg-sand-200')}
          style={hasBalance ? { background: 'rgba(184, 136, 61, 0.1)' } : {}}
        >
          Has balance
        </button>

        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={clearAllFilters}
              className="text-[11px] font-medium text-amber hover:text-amber-hover transition-colors"
            >
              Clear all
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-48 skeleton-shimmer rounded-xl" />)}
        </div>
      ) : !data?.data?.length ? (
        <div className="bezel p-12 text-center">
          <div className="text-[13px] font-medium text-espresso mb-1">No rooms match your filters</div>
          <div className="text-[12px] text-espresso-muted">Try clearing a filter or the search.</div>
        </div>
      ) : (
        <>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {data.data.slice(0, 8).map((room: any, idx: number) => (
              <RoomCard
                key={room.id}
                room={room}
                onOpen={() => setOpenRoomId(room.id)}
                onCheckin={() => setWizardRoom(room)}
              />
            ))}
          </motion.div>
          {data.data.length > 8 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.data.slice(8).map((room: any) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onOpen={() => setOpenRoomId(room.id)}
                  onCheckin={() => setWizardRoom(room)}
                />
              ))}
            </div>
          )}
          <div className="px-4 py-3 text-[11px] text-espresso-muted text-center">
            Showing <span className="font-mono tabular text-espresso">{data.data.length}</span> rooms
          </div>
        </>
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

function RoomCard({ room, onOpen, onCheckin }: { room: any; onOpen: () => void; onCheckin: () => void }) {
  const occupant = room.current_occupancy?.individual?.owner_name
    || room.current_occupancy?.individual?.full_name
    || null
  const company = room.current_occupancy?.company?.name || null
  const balance = Number(room.outstanding_balance || 0)

  // Status indicator color
  const statusBorder: Record<string, string> = {
    occupied: '#1E4D52',
    vacant: '#C48A1E',
    vacating: '#C48A1E',
    bartawi_use: '#D6CFC5',
    maintenance: '#A84A3B',
  }
  const borderColor = statusBorder[room.status] || '#D6CFC5'

  return (
    <motion.div
      variants={staggerItem}
      onClick={onOpen}
      className="bezel elevation-hover p-4 cursor-pointer group relative overflow-hidden"
      style={{
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* Block eyebrow */}
      {room.block?.code && (
        <div className="overline mb-2 text-espresso-faint">
          Block {room.block.code}
        </div>
      )}

      {/* Room number - display-sm Fraunces */}
      <div className="display-sm mb-3">{room.room_number}</div>

      {/* Status badge */}
      <div className="mb-3">
        <StatusBadge status={room.status} />
      </div>

      {/* Tenant name */}
      <div className="mb-3 min-h-[40px]">
        {occupant ? (
          <div className="text-[13px] text-espresso font-medium">{occupant}</div>
        ) : (
          <div className="text-[13px] text-espresso-muted italic">Vacant</div>
        )}
        {company && (
          <div className="overline mt-0.5 truncate text-espresso-muted">{company}</div>
        )}
      </div>

      {/* Monthly rent */}
      <div className="mb-2">
        <div className="overline mb-1">Monthly rent</div>
        <div className="data-md text-espresso">
          {Number(room.standard_rent) > 0 ? formatAED(room.standard_rent) : '—'}
        </div>
      </div>

      {/* Outstanding balance */}
      {balance > 0 && (
        <div className="pt-3 border-t border-sand-200">
          <div className="overline mb-1 text-rust">Outstanding</div>
          <div className="data-md text-rust font-semibold">
            {formatAED(balance)}
          </div>
        </div>
      )}
    </motion.div>
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
