'use client'
import { Moon } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

export function MosqueMarker() {
  return (
    <div className="absolute flex flex-col items-center" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
      <div className="w-6 h-6 rounded-full bg-teal-pale grid place-items-center">
        <Icon icon={Moon} size={12} className="text-teal" />
      </div>
      <div className="eyebrow text-[9px] mt-1.5">MOSQUE</div>
    </div>
  )
}
