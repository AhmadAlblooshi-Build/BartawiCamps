'use client'
import { X, User, Building2, CreditCard, Calendar, AlertTriangle, LogIn, LogOut } from 'lucide-react'
import { formatAED, formatAEDShort, formatDate, getBalanceColor, MONTHS } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useRoom, useCamps } from '@/lib/queries'
import { useState } from 'react'
import { PaymentModal } from './PaymentModal'
import { CheckoutModal } from './CheckoutModal'
import { CheckinModal }  from './CheckinModal'
import type { Room, MonthlyRecord } from '@/lib/types'

interface Props {
  roomId: string | null
  campId: string
  onClose: () => void
}

export function RoomDetailPanel({ roomId, campId, onClose }: Props) {
  const { data: room, isLoading } = useRoom(roomId)
  const [payRecord, setPayRecord] = useState<MonthlyRecord | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showCheckin,  setShowCheckin]  = useState(false)
  const { data: camps } = useCamps()
  const campCode = camps?.find(c => c.id === campId)?.code ?? 'C1'

  if (!roomId) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-bg-card border-l border-border z-50 flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-elevated">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <span className="font-heading font-bold text-text-primary text-xl">
                  {room?.room_number}
                </span>
                {room && <StatusBadge status={room.status} size="md" />}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {room?.status === 'occupied' && (
              <button
                onClick={() => setShowCheckout(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-status-vacant-dim border border-status-vacant/20 rounded-lg text-status-vacant text-xs font-body font-semibold hover:bg-status-vacant/20 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Check Out
              </button>
            )}
            {(room?.status === 'vacant') && (
              <button
                onClick={() => setShowCheckin(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-status-occupied-dim border border-status-occupied/20 rounded-lg text-status-occupied text-xs font-body font-semibold hover:bg-status-occupied/20 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Check In
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : room ? (
            <div className="p-6 space-y-6">

              {/* Occupancy info */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-text-muted" />
                  <span className="font-heading font-semibold text-text-secondary text-sm">CURRENT OCCUPANT</span>
                </div>
                {room.current_occupancy ? (
                  <div className="bg-bg-elevated border border-border rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-text-muted text-sm">Name</span>
                      <span className="text-text-primary text-sm font-medium max-w-[200px] text-right">
                        {room.current_occupancy.individual?.owner_name || room.current_occupancy.company?.name || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted text-sm">People</span>
                      <span className="text-text-secondary text-sm number-cell">{room.current_occupancy.people_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted text-sm">Monthly Rent</span>
                      <span className="text-text-primary text-sm font-mono font-semibold">
                        {formatAED(room.current_occupancy.monthly_rent)}
                      </span>
                    </div>
                    {room.current_occupancy.contract && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-text-muted text-sm">Contract Type</span>
                          <StatusBadge status={room.current_occupancy.contract.contract_type} />
                        </div>
                        {room.current_occupancy.contract.end_date && (
                          <div className="flex justify-between">
                            <span className="text-text-muted text-sm">Contract End</span>
                            <span className="text-text-secondary text-sm">{formatDate(room.current_occupancy.contract.end_date)}</span>
                          </div>
                        )}
                      </>
                    )}
                    {room.current_occupancy.check_in_date && (
                      <div className="flex justify-between">
                        <span className="text-text-muted text-sm">Check-in</span>
                        <span className="text-text-secondary text-sm">{formatDate(room.current_occupancy.check_in_date)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-status-vacant-dim border border-status-vacant/20 rounded-xl p-4 text-center">
                    <p className="text-status-vacant text-sm font-body">Room is vacant</p>
                  </div>
                )}
              </section>

              {/* Monthly records */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-text-muted" />
                  <span className="font-heading font-semibold text-text-secondary text-sm">PAYMENT HISTORY</span>
                  <span className="text-text-dim text-xs ml-auto">Last 3 months</span>
                </div>
                <div className="space-y-2">
                  {room.monthly_records && room.monthly_records.length > 0 ? (
                    room.monthly_records.slice(0, 3).map((rec) => (
                      <div key={rec.id} className="bg-bg-elevated border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-body font-medium text-text-secondary text-sm">
                            {MONTHS[rec.month - 1]} {rec.year}
                          </span>
                          {rec.balance > 0 && (
                            <div className="flex items-center gap-1 text-status-vacant text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Outstanding</span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-center">
                            <p className="text-text-dim text-[10px] uppercase mb-1">Rent</p>
                            <p className="number-cell text-text-secondary text-xs">{formatAEDShort(rec.rent)}</p>
                          </div>
                          <div className="text-center border-x border-border">
                            <p className="text-text-dim text-[10px] uppercase mb-1">Paid</p>
                            <p className="number-cell text-status-occupied text-xs">{formatAEDShort(rec.paid)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-text-dim text-[10px] uppercase mb-1">Balance</p>
                            <p className={`number-cell text-xs font-bold ${getBalanceColor(rec.balance)}`}>
                              {formatAEDShort(rec.balance)}
                            </p>
                          </div>
                        </div>
                        {rec.balance > 0 && (
                          <button
                            onClick={() => setPayRecord(rec)}
                            className="w-full py-2 bg-accent-cyan/10 border border-accent-cyan/20 rounded-lg text-accent-cyan text-xs font-body font-medium hover:bg-accent-cyan/20 transition-colors"
                          >
                            Log Payment →
                          </button>
                        )}
                        {rec.remarks && (
                          <p className="text-text-muted text-xs mt-2 font-body italic">"{rec.remarks}"</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-text-muted text-sm font-body">
                      No payment records
                    </div>
                  )}
                </div>
              </section>

              {/* Room info */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-text-muted" />
                  <span className="font-heading font-semibold text-text-secondary text-sm">ROOM INFO</span>
                </div>
                <div className="bg-bg-elevated border border-border rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">Room Type</span>
                    <StatusBadge status={room.room_type} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">Max Capacity</span>
                    <span className="text-text-secondary text-sm number-cell">{room.max_capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">Block</span>
                    <span className="text-text-secondary text-sm font-mono">{room.block?.code || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">Floor</span>
                    <span className="text-text-secondary text-sm">{room.block?.floor_label || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted text-sm">Map Config</span>
                    <span className={`text-sm font-body ${room.map_x !== null ? 'text-status-occupied' : 'text-text-dim'}`}>
                      {room.map_x !== null ? 'Configured' : 'Pending paper'}
                    </span>
                  </div>
                </div>
              </section>

            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              Room not found
            </div>
          )}
        </div>
      </div>

      {/* Payment modal */}
      <PaymentModal
        isOpen={!!payRecord}
        onClose={() => setPayRecord(null)}
        record={payRecord}
        campId={campId}
      />

      {/* Check In/Out modals */}
      {room && (
        <>
          <CheckoutModal
            isOpen={showCheckout}
            onClose={() => setShowCheckout(false)}
            room={room}
          />
          <CheckinModal
            isOpen={showCheckin}
            onClose={() => setShowCheckin(false)}
            room={room}
            campCode={campCode}
          />
        </>
      )}
    </>
  )
}
