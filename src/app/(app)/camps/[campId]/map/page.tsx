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

  // Find selected room object
  const selectedRoomObject = rooms.find((r: any) => r.room_number === selectedRoom)

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <p className="text-stone text-[12px] tracking-wider uppercase">Loading camp data…</p>
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
        {level === 'room' && selectedRoomObject && (
          <RoomInterior
            key="room"
            room={selectedRoomObject}
            onBack={handleBackToBlock}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
