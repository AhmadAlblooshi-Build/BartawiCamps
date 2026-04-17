'use client'
import { Suspense } from 'react'
import { RoomsGrid } from '@/components/rooms/RoomsGrid'

export default function RoomsPage() {
  return (
    <div className="space-y-8">
      <div className="animate-rise">
        <div className="eyebrow mb-2">Inventory</div>
        <h1 className="display-lg">All rooms</h1>
        <p className="mt-2 text-[13px] text-espresso-muted max-w-[520px]">
          453 rooms across both camps. Filter, search, check-in, or check-out.
        </p>
      </div>
      <Suspense fallback={<div className="h-80 skeleton-shimmer rounded-xl" />}>
        <RoomsGrid />
      </Suspense>
    </div>
  )
}
