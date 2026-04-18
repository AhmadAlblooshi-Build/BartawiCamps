'use client'
import { Storefront } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'
import { CAMP1_FACILITIES } from '@/data/camp1-layout'

export function RetailStrip() {
  return (
    <div className="w-full h-10 bg-sand-200/20 rounded-lg flex items-center justify-between px-4 mb-6">
      <Icon icon={Storefront} size={14} className="text-espresso-muted" />
      <div className="flex-1 flex items-center justify-evenly gap-2 mx-4">
        {CAMP1_FACILITIES.retailStrip.map((shop, i) => (
          <span key={i} className="text-[9px] text-espresso-muted whitespace-nowrap truncate">
            {shop}
          </span>
        ))}
      </div>
      <Icon icon={Storefront} size={14} className="text-espresso-muted" />
    </div>
  )
}
