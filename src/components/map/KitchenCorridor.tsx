'use client'
import { ForkKnife } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

export function KitchenCorridor() {
  return (
    <div className="w-full h-12 bg-sand-200/30 rounded-lg flex items-center justify-center gap-2">
      <Icon icon={ForkKnife} size={14} className="text-espresso-muted" />
      <span className="eyebrow text-[10px]">KITCHEN · DINING</span>
      <Icon icon={ForkKnife} size={14} className="text-espresso-muted" />
    </div>
  )
}
