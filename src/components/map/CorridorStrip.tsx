'use client'
import { Bathtub, Toilet } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

export function CorridorStrip() {
  return (
    <div className="flex flex-col items-center justify-around h-full w-10 bg-sand-100/50 rounded">
      {/* Vertical label */}
      <div
        className="eyebrow text-[9px] text-espresso-muted whitespace-nowrap"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        CORRIDOR
      </div>

      {/* Facility icons */}
      <div className="flex flex-col gap-4">
        <Icon icon={Toilet} size={8} className="text-sand-300" />
        <Icon icon={Bathtub} size={8} className="text-sand-300" />
        <Icon icon={Toilet} size={8} className="text-sand-300" />
        <Icon icon={Bathtub} size={8} className="text-sand-300" />
      </div>
    </div>
  )
}
