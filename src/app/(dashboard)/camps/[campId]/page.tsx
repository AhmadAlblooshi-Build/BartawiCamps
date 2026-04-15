'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useBuildings, useCamps, useRooms } from '@/lib/queries'
import { BuildingCard } from '@/components/buildings/BuildingCard'
import { RoomsTable } from '@/components/rooms/RoomsTable'
import { RoomFilterBar } from '@/components/rooms/RoomFilters'
import { RoomDetailPanel } from '@/components/rooms/RoomDetailPanel'
import { ArrowLeft, Grid3x3, List } from 'lucide-react'
import type { Building, Room, RoomFilters, Block } from '@/lib/types'

export default function CampPage() {
  const { campId } = useParams<{ campId: string }>()
  const router = useRouter()
  const { data: camps } = useCamps()
  const { data: buildings, isLoading: buildingsLoading } = useBuildings(campId)
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [filters, setFilters] = useState<RoomFilters>({})
  const [view, setView] = useState<'buildings' | 'rooms'>( 'buildings')

  const camp = camps?.find(c => c.id === campId)

  // Get all blocks from buildings
  const allBlocks: Block[] = buildings?.flatMap(b => b.blocks || []) ?? []

  // Rooms query (only when in rooms view)
  const { data: roomsData, isLoading: roomsLoading } = useRooms(
    view === 'rooms' ? campId : null,
    {
      ...filters,
      ...(selectedBuilding && { blockCode: undefined }),
    }
  )

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/camps')}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">
            {camp?.name ?? 'Camp'}
          </h1>
          <p className="text-text-muted text-sm">{camp?.total_rooms} rooms across {buildings?.length ?? 0} buildings</p>
        </div>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 bg-bg-elevated border border-border rounded-lg p-1">
          <button
            onClick={() => setView('buildings')}
            className={`p-2 rounded transition-colors ${view === 'buildings' ? 'bg-bg-card text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('rooms')}
            className={`p-2 rounded transition-colors ${view === 'rooms' ? 'bg-bg-card text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map notice */}
      {!camp?.map_configured && (
        <div className="flex items-center gap-3 px-4 py-3 bg-bg-elevated border border-border rounded-xl text-sm">
          <span className="text-text-muted text-lg">🗺️</span>
          <div>
            <span className="text-text-secondary font-medium">Interactive map pending</span>
            <span className="text-text-muted ml-2">— Drop the physical layout paper in chat to activate the visual map</span>
          </div>
        </div>
      )}

      {/* Buildings grid view */}
      {view === 'buildings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {buildingsLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-bg-card border border-border rounded-xl p-5 animate-pulse">
                  <div className="skeleton h-10 w-10 rounded-lg mb-4" />
                  <div className="skeleton h-7 w-20 mb-2" />
                  <div className="skeleton h-4 w-32 mb-4" />
                  <div className="skeleton h-10 w-full" />
                </div>
              ))
            : buildings?.map((building) => (
                <BuildingCard
                  key={building.id}
                  building={building}
                  onClick={() => {
                    setSelectedBuilding(building)
                    setFilters({ blockCode: building.ground_block_code })
                    setView('rooms')
                  }}
                />
              ))
          }
        </div>
      )}

      {/* Rooms list view */}
      {view === 'rooms' && (
        <div className="space-y-4">
          <RoomFilterBar
            filters={filters}
            blocks={allBlocks}
            onChange={setFilters}
          />
          <RoomsTable
            rooms={roomsData?.data ?? []}
            loading={roomsLoading}
            onRoomClick={(room: Room) => setSelectedRoomId(room.id)}
          />
          {roomsData && (
            <p className="text-text-dim text-xs text-center font-body">
              Showing {roomsData.data.length} of {roomsData.pagination.total} rooms
            </p>
          )}
        </div>
      )}

      {/* Room detail panel */}
      {selectedRoomId && (
        <RoomDetailPanel
          roomId={selectedRoomId}
          campId={campId}
          onClose={() => setSelectedRoomId(null)}
        />
      )}
    </div>
  )
}
