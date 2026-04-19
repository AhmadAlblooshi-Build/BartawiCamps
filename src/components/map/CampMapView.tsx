'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { useState, useEffect } from 'react'
import { SkyView } from './SkyView'
import { BlockView } from './BlockView'
import { RoomInterior } from './RoomInterior'
import { CampMap2 } from './CampMap2'
import { AnimatePresence } from 'motion/react'
import * as Tooltip from '@radix-ui/react-tooltip'

export type RoomStatusFilter = 'all' | 'occupied' | 'vacant' | 'vacating' | 'bartawi_use' | 'overdue' | 'legal_dispute' | 'maintenance'

type MapLevel = 'sky' | 'block' | 'room'

interface Props { campId: string }

// Helper to normalize room codes (handles format differences)
function normalizeRoomCode(code: string): string {
  if (!code) return ''
  // Remove leading zeros and ensure dash format: "A01" → "A-1", "A-01" → "A-1"
  const match = code.match(/^([A-Z]+)-?0*(\d+)$/i)
  if (match) return `${match[1]}-${match[2]}`
  return code
}

// Find room by code with resilient matching
function findRoomByCode(rooms: any[], code: string) {
  if (!code || !rooms) return null
  // Try exact match first
  let match = rooms.find((r: any) => r.room_number === code)
  if (match) return match
  // Try normalized match (handle format differences)
  const normalizedCode = normalizeRoomCode(code)
  match = rooms.find((r: any) => normalizeRoomCode(r.room_number) === normalizedCode)
  return match || null
}

export function CampMapView({ campId }: Props) {
  const [level, setLevel] = useState<MapLevel>('sky')
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [floor, setFloor] = useState<'ground' | 'first'>('ground')

  const { data: camp } = useQuery({ queryKey: ['camp', campId], queryFn: () => endpoints.camp(campId) })
  const { data: rooms } = useQuery({
    queryKey: ['rooms-for-map', campId],
    queryFn: () => endpoints.rooms({ camp_id: campId, limit: 500 }),
  })

  const code = camp?.code as 'C1' | 'C2' | undefined

  // Navigation functions
  const diveIntoBlock = (blockCode: string) => {
    setSelectedBlock(blockCode)
    setLevel('block')
  }

  const backToSky = () => {
    setSelectedBlock(null)
    setLevel('sky')
  }

  const expandRoom = (roomCode: string) => {
    setSelectedRoom(roomCode)
    setLevel('room')
  }

  const backToBlock = () => {
    setSelectedRoom(null)
    setLevel('block')
  }

  // Keyboard navigation: Escape to go back one level
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (level === 'room') backToBlock()
        else if (level === 'block') backToSky()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [level])

  // Camp 1: New three-level navigation
  if (code === 'C1' && rooms) {
    return (
      <Tooltip.Provider delayDuration={100}>
        <AnimatePresence mode="wait">
          {level === 'sky' && (
            <SkyView
              currentFloor={floor}
              onFloorChange={setFloor}
              rooms={rooms.data}
              onBlockClick={diveIntoBlock}
            />
          )}
          {level === 'block' && selectedBlock && (
            <BlockView
              blockCode={selectedBlock}
              rooms={rooms.data.filter(r => r.block?.code === selectedBlock)}
              onBack={backToSky}
              onRoomClick={expandRoom}
            />
          )}
          {level === 'room' && selectedRoom && findRoomByCode(rooms.data, selectedRoom) && (
            <RoomInterior
              room={findRoomByCode(rooms.data, selectedRoom)!}
              onBack={backToBlock}
            />
          )}
        </AnimatePresence>
      </Tooltip.Provider>
    )
  }

  // Camp 2: Keep old implementation for now
  if (code === 'C2' && rooms) {
    return (
      <Tooltip.Provider delayDuration={100}>
        <div className="bezel atmosphere-strong overflow-hidden" style={{ padding: '32px' }}>
          <div className="relative min-h-[640px]">
            <CampMap2 rooms={rooms.data} floor="both" filter="all" onSelect={(id) => setSelectedRoom(id)} />
          </div>
        </div>
      </Tooltip.Provider>
    )
  }

  // Loading state
  return (
    <div className="bezel atmosphere-strong overflow-hidden" style={{ padding: '32px' }}>
      <div className="h-full min-h-[560px] skeleton-shimmer rounded-xl" />
    </div>
  )
}
