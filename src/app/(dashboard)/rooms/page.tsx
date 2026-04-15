'use client'
import { useState } from 'react'
import { useCamps, useRooms } from '@/lib/queries'
import { useBuildings } from '@/lib/queries'
import { CampTabs } from '@/components/dashboard/CampTabs'
import { RoomsTable } from '@/components/rooms/RoomsTable'
import { RoomFilterBar } from '@/components/rooms/RoomFilters'
import { RoomDetailPanel } from '@/components/rooms/RoomDetailPanel'
import type { Room, RoomFilters, Block } from '@/lib/types'

export default function RoomsPage() {
  const { data: camps } = useCamps()
  const [activeCampId, setActiveCampId] = useState<string | null>(null)
  const effectiveCampId = activeCampId ?? camps?.[0]?.id
  const [filters, setFilters] = useState<RoomFilters>({})
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  const { data: buildings } = useBuildings(effectiveCampId ?? null)
  const allBlocks: Block[] = buildings?.flatMap(b => b.blocks || []) ?? []

  const { data: roomsData, isLoading } = useRooms(effectiveCampId ?? null, filters)

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading font-bold text-2xl text-text-primary">Rooms</h1>
        <p className="text-text-muted text-sm mt-0.5">All rooms across selected camp</p>
      </div>

      {camps && camps.length > 0 && (
        <CampTabs camps={camps} activeCampId={effectiveCampId ?? ''} onChange={(id) => { setActiveCampId(id); setFilters({}) }} />
      )}

      <RoomFilterBar filters={filters} blocks={allBlocks} onChange={setFilters} />

      <RoomsTable
        rooms={roomsData?.data ?? []}
        loading={isLoading}
        onRoomClick={(room: Room) => setSelectedRoomId(room.id)}
      />

      {roomsData && (
        <p className="text-text-dim text-xs text-center font-body">
          {roomsData.data.length} of {roomsData.pagination.total} rooms
        </p>
      )}

      {selectedRoomId && effectiveCampId && (
        <RoomDetailPanel
          roomId={selectedRoomId}
          campId={effectiveCampId}
          onClose={() => setSelectedRoomId(null)}
        />
      )}
    </div>
  )
}
