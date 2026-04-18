'use client'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { useState } from 'react'
import { CampMap1 } from './CampMap1'
import { CampMap2 } from './CampMap2'
import { MapLegend } from './MapLegend'
import { MapControls } from './MapControls'
import { RoomDetailDrawer } from '@/components/rooms/RoomDetailDrawer'
import { motion, AnimatePresence } from 'motion/react'
import * as Tooltip from '@radix-ui/react-tooltip'

export type RoomStatusFilter = 'all' | 'occupied' | 'vacant' | 'vacating' | 'bartawi_use' | 'overdue' | 'legal_dispute' | 'maintenance'

interface Props { campId: string }

export function CampMapView({ campId }: Props) {
  const [floor, setFloor] = useState<'ground' | 'first' | 'both'>('both')
  const [filter, setFilter] = useState<RoomStatusFilter>('all')
  const [openRoomId, setOpenRoomId] = useState<string | null>(null)

  const { data: camp } = useQuery({ queryKey: ['camp', campId], queryFn: () => endpoints.camp(campId) })
  const { data: rooms } = useQuery({
    queryKey: ['rooms-for-map', campId],
    queryFn: () => endpoints.rooms({ camp_id: campId, limit: 500 }),
  })

  const code = camp?.code as 'C1' | 'C2' | undefined

  return (
    <Tooltip.Provider delayDuration={100}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <MapControls floor={floor} filter={filter} onFloor={setFloor} onFilter={setFilter} />
          <MapLegend />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bezel atmosphere-strong overflow-hidden"
          style={{ padding: '32px' }}
        >
          <div className="relative min-h-[640px]" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(214,207,197,0.03) 0px, rgba(214,207,197,0.03) 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, rgba(214,207,197,0.03) 0px, rgba(214,207,197,0.03) 1px, transparent 1px, transparent 20px)'
          }}>
            {code === 'C1' && rooms && <CampMap1 rooms={rooms.data} floor={floor} filter={filter} onSelect={setOpenRoomId} />}
            {code === 'C2' && rooms && <CampMap2 rooms={rooms.data} floor={floor} filter={filter} onSelect={setOpenRoomId} />}
            {!rooms && <div className="h-full min-h-[560px] skeleton-shimmer rounded-xl" />}
          </div>
        </motion.div>

        <AnimatePresence>
          {openRoomId && <RoomDetailDrawer roomId={openRoomId} onClose={() => setOpenRoomId(null)} />}
        </AnimatePresence>
      </div>
    </Tooltip.Provider>
  )
}
