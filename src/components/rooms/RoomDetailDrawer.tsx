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
import { slideRight, slideUp, staggerContainer } from '@/lib/motion'
import { getRoomStatus, getMonthlyRent } from '@/lib/room-helpers'

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
  const status = getRoomStatus(room || {})
  const rent = getMonthlyRent(room || {})

  return (
    <>
      <Dialog.Root open={true} onOpenChange={open => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-espresso/20 backdrop-blur-sm z-40 animate-fade" />
          <Dialog.Content asChild>
            <motion.div
              variants={slideRight}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] glass-surface elevation-float z-50 flex flex-col border-l border-sand-200"
            >
              <Dialog.Title className="sr-only">Room details</Dialog.Title>
              <header className="flex items-center justify-between px-6 h-16 border-b border-sand-200">
                <div>
                  <div className="display-md text-espresso">{room?.room_number}</div>
                  <div className="eyebrow mb-0.5 text-espresso-muted">
                    {room?.block?.code || '—'} · {room?.block?.floor === 0 ? 'Ground' : 'First'} Floor
                  </div>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-full bg-sand-200 grid place-items-center hover:bg-amber transition-colors hover:text-white" aria-label="Close">
                  <Icon icon={X} size={16} />
                </button>
              </header>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
              >
                {!room ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 skeleton-shimmer rounded-lg" />)}
                  </div>
                ) : (
                  <>
                    <motion.section variants={slideUp}>
                      <div className="flex items-center gap-2 mb-4">
                        <StatusPill status={status} />
                        {room.property_type?.name && (
                          <span className="overline text-espresso-muted">
                            · {room.property_type.name}
                          </span>
                        )}
                      </div>
                      <div className="divider-warm my-4" />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Standard rent" value={formatAED(rent)} mono />
                        <Field label="Max capacity"  value={`${room.max_capacity || 0} ppl`} mono />
                        <Field label="Room size"     value={room.room_size} />
                        <Field label="Block"         value={room.block?.code || '—'} mono />
                      </div>
                    </motion.section>

                    {occ && (person || company) && (
                      <motion.section variants={slideUp}>
                        <div className="divider-warm my-6" />
                        <div className="eyebrow mb-3">CURRENT TENANT</div>
                        {person && (
                          <div className="display-sm mb-2">{person.owner_name || person.full_name}</div>
                        )}
                        {company && (
                          <div className="body text-espresso-muted mb-3">{company.name}</div>
                        )}
                        <div className="bezel p-4 space-y-3">
                          {person && (
                            <>
                              {person.nationality && (
                                <div>
                                  <div className="overline mb-1">Nationality</div>
                                  <div className="text-[13px] text-espresso">{person.nationality}</div>
                                </div>
                              )}
                              {person.mobile_number && (
                                <div className="flex items-center gap-2 text-[12px]">
                                  <Icon icon={Phone} size={12} className="text-espresso-muted" />
                                  <span className="font-mono tabular">{person.mobile_number}</span>
                                </div>
                              )}
                              {person.emergency_contact_name && (
                                <div className="pt-2 border-t border-sand-200">
                                  <div className="eyebrow mb-1">Emergency contact</div>
                                  <div className="text-[12px] text-espresso">{person.emergency_contact_name}</div>
                                  <div className="text-[11px] text-espresso-muted font-mono tabular">{person.emergency_contact_phone || '—'}</div>
                                </div>
                              )}
                            </>
                          )}
                          {company && company.contact_person && (
                            <div className="pt-2 border-t border-sand-200">
                              <div className="eyebrow mb-1">Company contact</div>
                              <div className="text-[12px] text-espresso">{company.contact_person}</div>
                            </div>
                          )}
                          <div className="pt-2 border-t border-sand-200 grid grid-cols-2 gap-3">
                            <div>
                              <div className="overline mb-1">Check-in</div>
                              <div className="text-[12px] text-espresso">{formatDate(occ.check_in_date)}</div>
                            </div>
                            {contract?.end_date && (
                              <div>
                                <div className="overline mb-1">Contract ends</div>
                                <div className="text-[12px] text-espresso">{formatDate(contract.end_date)}</div>
                              </div>
                            )}
                            {occ.people_count && (
                              <div>
                                <div className="overline mb-1">Occupants</div>
                                <div className="text-[12px] text-espresso">{occ.people_count} people</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.section>
                    )}

                    {balance && balance.outstanding > 0 && (
                      <motion.section variants={slideUp}>
                        <div className="divider-warm my-6" />
                        <div className="eyebrow mb-3">FINANCIAL OVERVIEW</div>
                        <div className="mb-4">
                          <div className="data-lg text-rust">{formatAED(balance.outstanding)}</div>
                          <div className="overline text-espresso-muted">Total Outstanding</div>
                        </div>
                        <div className="bezel p-3 space-y-1.5">
                          {balance.by_month.slice(0, 5).map((m: any) => (
                            <div key={`${m.year}-${m.month}`} className={cn(
                              "flex items-center justify-between text-[12px] p-2 rounded",
                              Number(m.balance) > 0 && "bg-rust/5"
                            )}>
                              <span className="text-espresso-muted tabular font-mono">{m.month}/{m.year}</span>
                              <span className="font-mono tabular text-rust data-md">{formatAED(m.balance)}</span>
                            </div>
                          ))}
                        </div>
                      </motion.section>
                    )}

                    <motion.section variants={slideUp}>
                      <div className="divider-warm my-6" />
                      <div className="eyebrow mb-3">LAST 6 MONTHS</div>
                      {history?.data && history.data.length > 0 ? (
                        <div className="bezel p-3 divide-y divide-sand-200">
                          {history.data.slice(0, 6).map((h: any) => (
                            <div key={`${h.year}-${h.month}`} className={cn(
                              "py-2 flex items-center justify-between text-[12px]",
                              Number(h.balance) > 0 && "bg-rust/5 -mx-3 px-3 rounded"
                            )}>
                              <span className="text-espresso-muted tabular font-mono">{String(h.month).padStart(2, '0')}/{h.year}</span>
                              <span className="flex-1 text-espresso ml-4 truncate">{h.company_name || h.owner_name || '—'}</span>
                              <span className="font-mono tabular text-espresso data-md">{formatAED(h.rent)}</span>
                              <span className={cn('ml-4 font-mono tabular font-semibold data-md', Number(h.balance) > 0 ? 'text-rust' : 'text-teal')}>
                                {Number(h.balance) > 0 ? formatAED(h.balance) : 'Paid'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[12px] text-espresso-muted">No history records.</div>
                      )}
                    </motion.section>
                  </>
                )}
              </motion.div>

              {room && (
                <footer className="px-6 py-4 border-t border-sand-200 bg-sand-50 flex items-center gap-2">
                  {status === 'vacant' && onStartCheckin && (
                    <button onClick={() => onStartCheckin(room)}
                      className="flex-1 h-11 flex items-center justify-center gap-2 rounded-full bg-amber text-espresso font-body text-[13px] font-medium hover:bg-amber/90 transition-all active:scale-[0.98]">
                      <Icon icon={ArrowDownLeft} size={13} /> New Lease
                    </button>
                  )}
                  {status === 'occupied' && (
                    <>
                      <button onClick={() => setNoticeOpen(true)}
                        className="flex-1 h-11 flex items-center justify-center gap-2 rounded-full border-2 border-espresso text-espresso font-body text-[13px] font-medium hover:bg-espresso hover:text-sand-50 transition-all">
                        <Icon icon={FileText} size={13} /> Give Notice
                      </button>
                      <button onClick={() => setCheckoutOpen(true)}
                        className="h-11 px-5 flex items-center justify-center gap-2 rounded-full bg-amber text-espresso font-body text-[13px] font-medium hover:bg-amber/90 transition-all">
                        Log Payment
                      </button>
                    </>
                  )}
                  {status === 'vacating' && (
                    <button onClick={() => setCheckoutOpen(true)}
                      className="flex-1 h-11 flex items-center justify-center gap-2 rounded-full bg-rust text-white font-body text-[13px] font-medium hover:bg-rust/90 transition-all active:scale-[0.98]">
                      <Icon icon={ArrowUpRight} size={13} /> Complete Checkout
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
    occupied:    { bg: 'bg-teal-pale',    fg: 'text-teal',    label: 'OCCUPIED' },
    vacant:      { bg: 'bg-sand-100',     fg: 'text-espresso-muted', label: 'VACANT' },
    vacating:    { bg: 'bg-ochre-pale',   fg: 'text-ochre',   label: 'VACATING' },
    bartawi_use: { bg: 'bg-amber-50',     fg: 'text-amber-600', label: 'BARTAWI USE' },
    maintenance: { bg: 'bg-ochre-pale',   fg: 'text-ochre',   label: 'MAINTENANCE' },
  }
  const s = map[status] || map.vacant
  return <span className={cn('inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-wide', s.bg, s.fg)}>{s.label}</span>
}
