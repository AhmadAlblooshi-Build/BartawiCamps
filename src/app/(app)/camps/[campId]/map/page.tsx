'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence } from 'motion/react'
import { endpoints } from '@/lib/api'
import { SkyView } from '@/components/map/SkyView'
import { BlockView } from '@/components/map/BlockView'
import { RoomInterior } from '@/components/map/RoomInterior'
import type { FloorLevel } from '@/data/camp1-layout'
import { getBalance } from '@/lib/room-helpers'

type MapLevel = 'sky' | 'block' | 'room'

export default function CampMapPage() {
  const params = useParams()
  const campId = params.campId as string

  // Fetch all rooms for this camp
  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['camp-rooms', campId],
    queryFn: () => endpoints.rooms({ camp_id: campId, limit: 500 }),
    enabled: !!campId,
  })

  const rooms = roomsData?.data || []

  // Navigation state
  const [level, setLevel] = useState<MapLevel>('sky')
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [currentFloor, setCurrentFloor] = useState<FloorLevel>('ground')

  // Compute anomalies (rooms with outstanding balance)
  const anomalies = rooms
    .filter((r: any) => getBalance(r) > 0)
    .map((r: any) => r.room_number)

  // Helper to normalize room codes (handles format differences)
  function normalizeRoomCode(code: string): string {
    if (!code) return ''
    // Remove leading zeros and ensure dash format: "A01" → "A-1", "A-01" → "A-1"
    const match = code.match(/^([A-Z]+)-?0*(\d+)$/i)
    if (match) return `${match[1]}-${match[2]}`
    return code
  }

  // Find selected room object with resilient matching
  function findRoomByCode(code: string) {
    if (!code) return null
    // Try exact match first
    let match = rooms.find((r: any) => r.room_number === code)
    if (match) return match
    // Try normalized match (handle format differences)
    const normalizedCode = normalizeRoomCode(code)
    match = rooms.find((r: any) => normalizeRoomCode(r.room_number) === normalizedCode)
    return match || null
  }

  const selectedRoomObject = findRoomByCode(selectedRoom || '')

  // Handle block click → dive into block
  const handleBlockClick = (blockCode: string) => {
    setSelectedBlock(blockCode)
    setLevel('block')
    // Auto-set floor based on block code
    if (['AA', 'BB', 'CC', 'DD', 'EE', 'FF'].includes(blockCode)) {
      setCurrentFloor('first')
    } else {
      setCurrentFloor('ground')
    }
  }

  // Handle room click → dive into room
  const handleRoomClick = (roomCode: string) => {
    setSelectedRoom(roomCode)
    setLevel('room')
  }

  // Back navigation
  const handleBackToSky = () => {
    setLevel('sky')
    setTimeout(() => {
      setSelectedBlock(null)
      setSelectedRoom(null)
    }, 300)
  }

  const handleBackToBlock = () => {
    setLevel('block')
    setTimeout(() => setSelectedRoom(null), 300)
  }

  // Escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (level === 'room') handleBackToBlock()
        else if (level === 'block') handleBackToSky()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [level])

  // DIAGNOSTIC — remove after debugging
  useEffect(() => {
    if (level === 'room') {
      console.log('[MAP DEBUG] Level=room triggered')
      console.log('[MAP DEBUG] selectedRoom:', selectedRoom)
      console.log('[MAP DEBUG] rooms.length:', rooms.length)
      console.log('[MAP DEBUG] First room shape:', rooms[0])
      console.log('[MAP DEBUG] selectedRoomObject:', selectedRoomObject)
      if (selectedRoomObject) {
        console.log('[MAP DEBUG] Will render RoomInterior with room:', {
          id: selectedRoomObject.id,
          room_number: selectedRoomObject.room_number,
          block: selectedRoomObject.block,
          current_occupancy: selectedRoomObject.current_occupancy,
        })
      } else {
        console.error('[MAP DEBUG] selectedRoomObject is null/undefined — fallback will render')
      }
    }
  }, [level, selectedRoom, selectedRoomObject, rooms])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-paper rounded-xl border border-dust">
        <div className="w-8 h-8 border-2 border-amber border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-stone text-[11px] tracking-[0.14em] uppercase">Loading camp data…</p>
      </div>
    )
  }

  if (!rooms.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] bg-paper rounded-xl border border-dust">
        <p className="font-serif italic text-[18px] text-espresso mb-2">No rooms found</p>
        <p className="text-[11px] text-stone">Unable to load rooms for this camp</p>
      </div>
    )
  }

  return (
    <div className="min-h-[600px] bg-paper rounded-xl border border-dust overflow-hidden">
      <AnimatePresence mode="wait">
        {level === 'sky' && (
          <SkyView
            key="sky"
            rooms={rooms}
            onBlockClick={handleBlockClick}
            currentFloor={currentFloor}
            onFloorChange={setCurrentFloor}
            anomalies={anomalies}
          />
        )}
        {level === 'block' && selectedBlock && (
          <BlockView
            key="block"
            blockCode={selectedBlock}
            rooms={rooms}
            onBack={handleBackToSky}
            onRoomClick={handleRoomClick}
          />
        )}
        {level === 'room' && (
          selectedRoomObject ? (
            <RoomInterior
              key="room"
              room={selectedRoomObject}
              onBack={handleBackToBlock}
            />
          ) : (
            <motion.div
              key="room-not-found"
              className="flex flex-col items-center justify-center min-h-[600px] p-12 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <p className="font-serif italic text-[18px] text-espresso mb-2">
                Room {selectedRoom} data not available
              </p>
              <p className="text-[12px] text-stone mb-6">
                Unable to load room data for this room.
              </p>
              <button
                onClick={handleBackToBlock}
                className="px-4 py-2 bg-amber text-sand rounded-full text-[12px] font-medium hover:bg-amber/90 transition-colors"
              >
                ← Back to block
              </button>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}
