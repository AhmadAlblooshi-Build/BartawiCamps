'use client'

import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import {
  getTenantName,
  getCompanyName,
  getPeopleCount,
  getMonthlyRent,
  getRoomStatus,
  getBalance,
  getMobile,
  getNationality,
  getCheckInDate,
  getContractType,
} from '@/lib/room-helpers'
import { CaretLeft } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface RoomInteriorProps {
  room: any
  onBack: () => void
}

export function RoomInterior({ room, onBack }: RoomInteriorProps) {
  const roomCode = room.room_number
  const blockCode = room.block?.code

  // Fetch room history and balance
  const { data: balanceData } = useQuery({
    queryKey: ['room-balance', room.id],
    queryFn: () => endpoints.roomBalance(room.id),
    enabled: !!room.id,
  })

  const { data: historyData } = useQuery({
    queryKey: ['room-history', room.id],
    queryFn: () => endpoints.roomHistory(room.id),
    enabled: !!room.id,
  })

  const status = getRoomStatus(room)
  const tenantName = getTenantName(room) || '—'
  const companyName = getCompanyName(room)
  const peopleCount = getPeopleCount(room)
  const maxCapacity = room.max_capacity || 8
  const rent = getMonthlyRent(room)
  const balance = balanceData?.outstanding ?? getBalance(room)
  const mobile = getMobile(room) || '—'
  const nationality = getNationality(room) || '—'
  const checkIn = getCheckInDate(room) || '—'
  const contractType = getContractType(room) || 'Monthly'

  const paid = Math.max(0, rent - balance)
  const isPaid = balance === 0 && rent > 0

  const isBartawi = ['Bartawi', 'bartawi_use'].includes(status) ||
                    ['A-17', 'A-18', 'A-19', 'C-11', 'C-20', 'D-1'].includes(roomCode)

  // Generate bed layout — distribute beds along left and right walls
  // Assumes max 8 beds, 4 on each wall
  const leftBeds = Array.from({ length: 4 }).map((_, i) => ({
    id: `B${i + 1}`,
    occupied: i < Math.min(peopleCount, 4),
  }))
  const rightBeds = Array.from({ length: Math.min(4, maxCapacity - 4) }).map((_, i) => ({
    id: `B${i + 5}`,
    occupied: i < Math.max(0, peopleCount - 4),
  }))

  return (
    <motion.div
      className="relative w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-start px-6 pt-6 pb-4">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[11px] text-amber hover:text-amber/80 mb-2 transition-colors"
          >
            <CaretLeft size={12} weight="light" />
            Back to Block {blockCode}
          </button>
          <p className="font-serif text-[30px] italic text-espresso leading-tight">
            Room {roomCode}
          </p>
          <p className="text-[11px] tracking-[0.12em] uppercase text-stone mt-1 font-medium">
            Block {blockCode} · Ground floor · {peopleCount}/{maxCapacity} beds · {contractType}
          </p>
        </div>

        <div className="flex gap-2">
          {isPaid && (
            <span className="px-3 py-1.5 rounded-full bg-teal/12 text-teal text-[10px] font-semibold tracking-wider uppercase">
              ● Paid
            </span>
          )}
          {balance > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-rust/12 text-rust text-[10px] font-semibold tracking-wider uppercase">
              ● Outstanding
            </span>
          )}
          {isBartawi && (
            <span className="px-3 py-1.5 rounded-full bg-amber/12 text-amber text-[10px] font-semibold tracking-wider uppercase">
              ● Bartawi
            </span>
          )}
        </div>
      </div>

      {/* Main grid: room drawing on left, data panel on right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 px-6 pb-6">
        {/* ROOM INTERIOR SVG */}
        <motion.div
          layoutId={`room-${roomCode}`}
          className="bg-paper rounded-xl border border-dust p-6"
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        >
          <svg
            viewBox="0 0 480 420"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
          >
            {/* Room floor */}
            <rect
              x="40"
              y="30"
              width="400"
              height="340"
              fill="#F4EFE7"
              stroke="#1A1816"
              strokeWidth="1.5"
              rx="3"
            />

            {/* Window at top wall */}
            <rect
              x="200"
              y="25"
              width="80"
              height="10"
              fill="#D8E3E4"
              stroke="#1A1816"
              strokeWidth="1"
            />
            <line x1="220" y1="25" x2="220" y2="35" stroke="#1A1816" strokeWidth="0.5" />
            <line x1="240" y1="25" x2="240" y2="35" stroke="#1A1816" strokeWidth="0.5" />
            <line x1="260" y1="25" x2="260" y2="35" stroke="#1A1816" strokeWidth="0.5" />
            <text
              x="240"
              y="18"
              textAnchor="middle"
              fontFamily="Geist, Inter, sans-serif"
              fontSize="10"
              fill="#6A6159"
              letterSpacing="1"
            >
              window
            </text>

            {/* Door at bottom wall with swing arc */}
            <rect
              x="210"
              y="365"
              width="60"
              height="10"
              fill="#E8E0D6"
              stroke="#1A1816"
              strokeWidth="1"
            />
            <path
              d="M 270 375 Q 270 335 230 335"
              fill="none"
              stroke="#9C948B"
              strokeWidth="0.6"
              strokeDasharray="3 3"
            />
            <text
              x="240"
              y="395"
              textAnchor="middle"
              fontFamily="Geist, Inter, sans-serif"
              fontSize="10"
              fill="#6A6159"
              letterSpacing="1"
            >
              door
            </text>

            {/* LEFT WALL beds */}
            {leftBeds.map((bed, idx) => {
              const yPos = 60 + idx * 72
              return (
                <g key={bed.id}>
                  {bed.occupied ? (
                    <>
                      <rect
                        x="60"
                        y={yPos}
                        width="120"
                        height="56"
                        fill="#1E4D52"
                        stroke="#0D2A2D"
                        strokeWidth="0.8"
                        rx="2"
                      />
                      {/* Pillow */}
                      <rect
                        x="66"
                        y={yPos + 6}
                        width="30"
                        height="18"
                        fill="#F4EFE7"
                        rx="1.5"
                      />
                      {/* Tenant name (first name only if occupied by main tenant) */}
                      <text
                        x="130"
                        y={yPos + 34}
                        textAnchor="middle"
                        fontFamily="Geist, Inter, sans-serif"
                        fontSize="13"
                        fontWeight="500"
                        fill="#F4EFE7"
                      >
                        {idx === 0 && tenantName !== '—'
                          ? tenantName.split(' ')[0].substring(0, 10)
                          : `Person ${idx + 1}`}
                      </text>
                      <text
                        x="130"
                        y={yPos + 48}
                        textAnchor="middle"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="9"
                        fill="#9FE1CB"
                        letterSpacing="1"
                      >
                        BED {bed.id.substring(1)}
                      </text>
                    </>
                  ) : (
                    <>
                      <rect
                        x="60"
                        y={yPos}
                        width="120"
                        height="56"
                        fill="none"
                        stroke="#B8883D"
                        strokeWidth="1"
                        strokeDasharray="4 3"
                        rx="2"
                      />
                      <rect
                        x="66"
                        y={yPos + 6}
                        width="30"
                        height="18"
                        fill="none"
                        stroke="#B8883D"
                        strokeWidth="0.6"
                        strokeDasharray="2 2"
                        rx="1.5"
                      />
                      <text
                        x="130"
                        y={yPos + 38}
                        textAnchor="middle"
                        fontFamily="Geist, Inter, sans-serif"
                        fontSize="12"
                        fontStyle="italic"
                        fill="#B8883D"
                      >
                        vacant
                      </text>
                    </>
                  )}
                </g>
              )
            })}

            {/* RIGHT WALL beds */}
            {rightBeds.map((bed, idx) => {
              const yPos = 60 + idx * 72
              return (
                <g key={bed.id}>
                  {bed.occupied ? (
                    <>
                      <rect
                        x="300"
                        y={yPos}
                        width="120"
                        height="56"
                        fill="#1E4D52"
                        stroke="#0D2A2D"
                        strokeWidth="0.8"
                        rx="2"
                      />
                      {/* Pillow on the wall-adjacent side (right) */}
                      <rect
                        x="384"
                        y={yPos + 6}
                        width="30"
                        height="18"
                        fill="#F4EFE7"
                        rx="1.5"
                      />
                      <text
                        x="360"
                        y={yPos + 34}
                        textAnchor="middle"
                        fontFamily="Geist, Inter, sans-serif"
                        fontSize="13"
                        fontWeight="500"
                        fill="#F4EFE7"
                      >
                        Person {idx + 5}
                      </text>
                      <text
                        x="360"
                        y={yPos + 48}
                        textAnchor="middle"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="9"
                        fill="#9FE1CB"
                        letterSpacing="1"
                      >
                        BED {bed.id.substring(1)}
                      </text>
                    </>
                  ) : (
                    <>
                      <rect
                        x="300"
                        y={yPos}
                        width="120"
                        height="56"
                        fill="none"
                        stroke="#B8883D"
                        strokeWidth="1"
                        strokeDasharray="4 3"
                        rx="2"
                      />
                      <rect
                        x="384"
                        y={yPos + 6}
                        width="30"
                        height="18"
                        fill="none"
                        stroke="#B8883D"
                        strokeWidth="0.6"
                        strokeDasharray="2 2"
                        rx="1.5"
                      />
                      <text
                        x="360"
                        y={yPos + 38}
                        textAnchor="middle"
                        fontFamily="Geist, Inter, sans-serif"
                        fontSize="12"
                        fontStyle="italic"
                        fill="#B8883D"
                      >
                        vacant
                      </text>
                    </>
                  )}
                </g>
              )
            })}

            {/* Center: table */}
            <rect
              x="200"
              y="170"
              width="80"
              height="50"
              fill="#E8DFD3"
              stroke="#1A1816"
              strokeWidth="1"
              rx="2"
            />
            <text
              x="240"
              y="200"
              textAnchor="middle"
              fontFamily="Geist, Inter, sans-serif"
              fontSize="10"
              fill="#6A6159"
              letterSpacing="1"
            >
              table
            </text>

            {/* Scale reference */}
            <g transform="translate(400, 390)">
              <line x1="0" y1="0" x2="40" y2="0" stroke="#6A6159" strokeWidth="0.8" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#6A6159" strokeWidth="0.8" />
              <line x1="40" y1="-3" x2="40" y2="3" stroke="#6A6159" strokeWidth="0.8" />
              <text
                x="20"
                y="14"
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                fontSize="9"
                fill="#9C948B"
                letterSpacing="0.05em"
              >
                3.45 m
              </text>
            </g>
          </svg>
        </motion.div>

        {/* DATA SIDEBAR */}
        <div className="flex flex-col gap-2.5">
          {/* Tenant card */}
          {status === 'occupied' && (
            <motion.div
              className="p-4 bg-paper rounded-xl border border-dust"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-stone mb-1.5 font-medium">
                Tenant
              </p>
              <p className="font-serif italic text-[18px] text-espresso leading-tight">
                {tenantName}
              </p>
              <p className="text-[12px] text-stone mt-1">
                {contractType} · {peopleCount} residents
              </p>
              {mobile !== '—' && (
                <p className="text-[11px] font-mono text-stone mt-1">{mobile}</p>
              )}
            </motion.div>
          )}

          {/* Financials card */}
          {status === 'occupied' && rent > 0 && (
            <motion.div
              className="p-4 bg-teal/6 rounded-xl border border-teal/20"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-[10px] tracking-[0.14em] uppercase text-teal font-semibold">
                  March 2026
                </p>
                <p className="text-[10px] text-teal font-medium">
                  {isPaid ? '✓ settled' : 'due'}
                </p>
              </div>
              <div className="flex justify-between font-mono text-[12px] py-0.5">
                <span className="text-stone">Rent</span>
                <span className="text-espresso">AED {rent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-mono text-[12px] py-0.5">
                <span className="text-stone">Paid</span>
                <span className="text-teal">AED {paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-mono text-[12px] pt-2 mt-1 border-t border-teal/20">
                <span className="text-espresso font-semibold">Balance</span>
                <span className={cn('font-semibold', balance > 0 ? 'text-rust' : 'text-teal')}>
                  AED {balance.toLocaleString()}
                </span>
              </div>
            </motion.div>
          )}

          {/* History card */}
          {historyData?.data && historyData.data.length > 0 && (
            <motion.div
              className="p-4 bg-paper rounded-xl border border-dust"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-stone mb-2 font-medium">
                Last 3 months
              </p>
              <div className="font-mono text-[11px]">
                {historyData.data.slice(0, 3).map((entry: any, idx: number) => {
                  const month = entry.month || ''
                  const paid = entry.paid || 0
                  const balance = entry.balance || 0
                  const fullyPaid = balance === 0

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'flex justify-between py-1',
                        idx < 2 ? 'border-b border-dust' : ''
                      )}
                    >
                      <span className="text-stone">{month.substring(0, 3)}</span>
                      <span className={fullyPaid ? 'text-teal' : 'text-amber'}>
                        {fullyPaid
                          ? `${paid.toLocaleString()} ✓`
                          : `${paid.toLocaleString()} / ${balance.toLocaleString()}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Action buttons */}
          {status === 'occupied' && (
            <motion.div
              className="flex gap-2 mt-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                disabled
                className="flex-1 py-2.5 bg-amber text-sand rounded-full text-[12px] font-medium hover:bg-amber/90 transition-colors disabled:opacity-70 cursor-not-allowed"
                title="Available in Phase 4"
              >
                Log payment
              </button>
              <button
                disabled
                className="flex-1 py-2.5 bg-transparent text-espresso border border-dust rounded-full text-[12px] font-medium hover:bg-dust/30 transition-colors disabled:opacity-70 cursor-not-allowed"
                title="Available in Phase 4"
              >
                Give notice
              </button>
            </motion.div>
          )}

          {/* For Bartawi rooms */}
          {isBartawi && (
            <motion.div
              className="p-4 bg-amber/8 rounded-xl border border-amber/30"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-amber mb-1.5 font-semibold">
                Bartawi Use
              </p>
              <p className="font-serif italic text-[16px] text-espresso">
                {tenantName}
              </p>
              <p className="text-[12px] text-stone mt-1">
                Reserved for operations · not tenanted
              </p>
            </motion.div>
          )}

          {/* For vacant rooms */}
          {status === 'vacant' && (
            <motion.div
              className="p-4 bg-dust/30 rounded-xl border border-dust"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-[10px] tracking-[0.14em] uppercase text-stone mb-1.5 font-medium">
                Available
              </p>
              <p className="font-serif italic text-[16px] text-espresso">
                Room vacant
              </p>
              <p className="text-[12px] text-stone mt-1">
                Ready for new lease
              </p>
              <button
                disabled
                className="mt-3 w-full py-2.5 bg-teal text-sand rounded-full text-[12px] font-medium disabled:opacity-70 cursor-not-allowed"
                title="Available in Phase 4"
              >
                New lease
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
