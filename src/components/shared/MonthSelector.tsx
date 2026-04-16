'use client'
import { MONTHS } from '@/lib/utils'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Icon } from '@/components/ui/Icon'

interface Props { month: number; year: number; onChange: (m: number, y: number) => void }

export function MonthSelector({ month, year, onChange }: Props) {
  const prev = () => month === 1 ? onChange(12, year - 1) : onChange(month - 1, year)
  const next = () => month === 12 ? onChange(1, year + 1) : onChange(month + 1, year)

  return (
    <div className="flex items-center gap-1 bg-white rounded-lg px-1 py-1 shadow-raise-1">
      <button onClick={prev} className="w-7 h-7 rounded-md grid place-items-center hover:bg-sand-100 transition-colors" aria-label="Previous month">
        <Icon icon={CaretLeft} size={12} />
      </button>
      <div className="flex items-center gap-1 px-2 font-mono text-[12px] tabular text-espresso min-w-[140px] justify-center">
        <span className="font-body font-medium">{MONTHS[month - 1]}</span>
        <span className="text-espresso-subtle">·</span>
        <span>{year}</span>
      </div>
      <button onClick={next} className="w-7 h-7 rounded-md grid place-items-center hover:bg-sand-100 transition-colors" aria-label="Next month">
        <Icon icon={CaretRight} size={12} />
      </button>
    </div>
  )
}
