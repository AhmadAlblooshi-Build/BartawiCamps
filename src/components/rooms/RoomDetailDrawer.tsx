'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { formatAED, formatDate, cn } from '@/lib/utils'
import { X, ArrowDownLeft, ArrowUpRight, FileText, Phone } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { motion } from 'motion/react'
import { useState } from 'react'
import { NoticeModal } from './NoticeModal'
import { CompleteCheckoutModal } from './CompleteCheckoutModal'

interface Props {
  roomId: string
  onClose: () => void
  onStartCheckin?: (room: any) => void
}

export function RoomDetailDrawer({ roomId, onClose, onStartCheckin }: Props) {
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const { data: room } = useQuery({ queryKey: ['room', roomId], queryFn: () => endpoints.room(roomId) })
  const { data: history } = useQuery({ queryKey: ['room-history', roomId], queryFn: () => endpoints.roomHistory(roomId) })
  const { data: balance } = useQuery({ queryKey: ['room-balance', roomId], queryFn: () => endpoints.roomBalance(roomId) })

  const occ = room?.current_occupancy
  const person = occ?.individual
  const company = occ?.company
  const contract = occ?.contract

  return (
    <>
      <Dialog.Root open={true} onOpenChange={open => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-espresso/20 backdrop-blur-sm z-40 animate-fade" />
          <Dialog.Content asChild>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[560px] bg-white shadow-raise-4 z-50 flex flex-col"
            >
              <Dialog.Title className="sr-only">Room details</Dialog.Title>
              <header className="flex items-center justify-between px-6 h-16 border-b border-[color:var(--color-border-subtle)]">
                <div>
                  <div className="eyebrow mb-0.5">Room</div>
                  <div className="font-mono tabular text-[22px] font-semibold text-espresso">{room?.room_number}</div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-lg grid place-items-center hover:bg-sand-100 transition-colors" aria-label="Close">
                  <Icon icon={X} size={16} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {!room ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 skeleton-shimmer rounded-lg" />)}
                  </div>
                ) : (
                  <>
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <StatusPill status={room.status} />
                        {room.property_type?.name && (
                          <span className="text-[10px] font-medium uppercase tracking-wide text-espresso-muted">
                            · {room.property_type.name}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Standard rent" value={formatAED(room.standard_rent)} mono />
                        <Field label="Max capacity"  value={`${room.max_capacity || 0} ppl`} mono />
                        <Field label="Room size"     value={room.room_size} />
                        <Field label="Block"         value={room.block?.code || '—'} mono />
                      </div>
                    </section>

                    {occ && (person || company) && (
                      <section>
                        <div className="eyebrow mb-3">Current occupant</div>
                        <div className="bezel p-4 space-y-3">
                          {person && (
                            <>
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-espresso text-sand-50 grid place-items-center text-[11px] font-semibold">
                                  {(person.owner_name || person.full_name || '??').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-espresso text-[14px]">{person.owner_name || person.full_name}</div>
                                  {person.nationality && <div className="text-[11px] text-espresso-muted mt-0.5">{person.nationality}</div>}
                                </div>
                              </div>
                              {person.mobile_number && (
                                <div className="flex items-center gap-2 text-[12px]">
                                  <Icon icon={Phone} size={12} className="text-espresso-muted" />
                                  <span className="font-mono tabular">{person.mobile_number}</span>
                                </div>
                              )}
                              {person.emergency_contact_name && (
                                <div className="pt-2 border-t border-[color:var(--color-border-subtle)]">
                                  <div className="eyebrow mb-1">Emergency contact</div>
                                  <div className="text-[12px] text-espresso">{person.emergency_contact_name}</div>
                                  <div className="text-[11px] text-espresso-muted font-mono tabular">{person.emergency_contact_phone || '—'}</div>
                                </div>
                              )}
                            </>
                          )}
                          {company && (
                            <div className="pt-2 border-t border-[color:var(--color-border-subtle)]">
                              <div className="eyebrow mb-1">Company</div>
                              <div className="text-[13px] font-medium text-espresso">{company.name}</div>
                              {company.contact_person && <div className="text-[11px] text-espresso-muted">{company.contact_person}</div>}
                            </div>
                          )}
                          <div className="pt-2 border-t border-[color:var(--color-border-subtle)] grid grid-cols-2 gap-3">
                            <Field label="Check-in" value={formatDate(occ.check_in_date)} />
                            {contract?.end_date && <Field label="Contract ends" value={formatDate(contract.end_date)} />}
                          </div>
                        </div>
                      </section>
                    )}

                    {balance && balance.outstanding > 0 && (
                      <section>
                        <div className="flex items-center justify-between mb-3">
                          <div className="eyebrow">Outstanding</div>
                          <div className="font-mono tabular text-[14px] font-semibold text-rust">{formatAED(balance.outstanding)}</div>
                        </div>
                        <div className="bezel p-3 space-y-1.5">
                          {balance.by_month.slice(0, 5).map((m: any) => (
                            <div key={`${m.year}-${m.month}`} className="flex items-center justify-between text-[12px]">
                              <span className="text-espresso-muted tabular">{m.month}/{m.year}</span>
                              <span className="font-mono tabular text-rust">{formatAED(m.balance)}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    <section>
                      <div className="eyebrow mb-3">Monthly history · 6 months</div>
                      {history?.data && history.data.length > 0 ? (
                        <div className="bezel p-3 divide-y divide-[color:var(--color-border-subtle)]">
                          {history.data.slice(0, 6).map((h: any) => (
                            <div key={`${h.year}-${h.month}`} className="py-2 flex items-center justify-between text-[12px]">
                              <span className="text-espresso-muted tabular font-mono">{String(h.month).padStart(2, '0')}/{h.year}</span>
                              <span className="flex-1 text-espresso ml-4 truncate">{h.company_name || h.owner_name || '—'}</span>
                              <span className="font-mono tabular text-espresso">{formatAED(h.rent)}</span>
                              <span className={cn('ml-4 font-mono tabular font-semibold', Number(h.balance) > 0 ? 'text-rust' : 'text-teal')}>
                                {Number(h.balance) > 0 ? formatAED(h.balance) : 'Paid'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[12px] text-espresso-muted">No history records.</div>
                      )}
                    </section>
                  </>
                )}
              </div>

              {room && (
                <footer className="px-6 py-4 border-t border-[color:var(--color-border-subtle)] bg-sand-50 flex items-center gap-2">
                  {room.status === 'vacant' && onStartCheckin && (
                    <button onClick={() => onStartCheckin(room)}
                      className="flex-1 h-10 flex items-center justify-center gap-2 rounded-full bg-espresso text-sand-50 font-body text-[13px] font-medium hover:bg-espresso-soft transition-all active:scale-[0.98]">
                      <Icon icon={ArrowDownLeft} size={13} /> Check in tenant
                    </button>
                  )}
                  {room.status === 'occupied' && (
                    <>
                      <button onClick={() => setNoticeOpen(true)}
                        className="flex-1 h-10 flex items-center justify-center gap-2 rounded-full bg-ochre-pale text-ochre font-body text-[13px] font-medium hover:bg-ochre hover:text-white transition-all">
                        <Icon icon={FileText} size={13} /> Give notice
                      </button>
                      <button onClick={() => setCheckoutOpen(true)}
                        className="h-10 px-4 flex items-center justify-center gap-2 rounded-full bg-rust text-white font-body text-[13px] font-medium hover:bg-rust/90 transition-all">
                        <Icon icon={ArrowUpRight} size={13} /> Checkout
                      </button>
                    </>
                  )}
                  {room.status === 'vacating' && (
                    <button onClick={() => setCheckoutOpen(true)}
                      className="flex-1 h-10 flex items-center justify-center gap-2 rounded-full bg-rust text-white font-body text-[13px] font-medium hover:bg-rust/90 transition-all">
                      <Icon icon={ArrowUpRight} size={13} /> Complete checkout
                    </button>
                  )}
                </footer>
              )}
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {room && noticeOpen && <NoticeModal room={room} onClose={() => setNoticeOpen(false)} />}
      {room && checkoutOpen && <CompleteCheckoutModal room={room} onClose={() => setCheckoutOpen(false)} />}
    </>
  )
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <div className={cn('text-[13px] text-espresso', mono && 'font-mono tabular')}>{value}</div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    occupied:    { bg: 'bg-teal-pale',    fg: 'text-teal',    label: 'Occupied' },
    vacant:      { bg: 'bg-sand-100',     fg: 'text-espresso-muted', label: 'Vacant' },
    vacating:    { bg: 'bg-ochre-pale',   fg: 'text-ochre',   label: 'Vacating · notice given' },
    bartawi_use: { bg: 'bg-amber-50',     fg: 'text-amber-600', label: 'Bartawi use' },
    maintenance: { bg: 'bg-ochre-pale',   fg: 'text-ochre',   label: 'Maintenance' },
  }
  const s = map[status] || map.vacant
  return <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium', s.bg, s.fg)}>{s.label}</span>
}
