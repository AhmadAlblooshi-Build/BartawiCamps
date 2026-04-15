'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS } from '@/lib/utils'

interface Props {
  month: number
  year: number
  onChange: (month: number, year: number) => void
}

export function MonthSelector({ month, year, onChange }: Props) {
  const prev = () => {
    if (month === 1) onChange(12, year - 1)
    else onChange(month - 1, year)
  }
  const next = () => {
    const now = new Date()
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)) return
    if (month === 12) onChange(1, year + 1)
    else onChange(month + 1, year)
  }

  return (
    <div className="flex items-center gap-2 bg-bg-elevated border border-border rounded-lg px-3 py-2">
      <button
        onClick={prev}
        className="p-1 text-text-muted hover:text-text-primary transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="font-body font-medium text-text-primary text-sm min-w-[120px] text-center">
        {MONTHS[month - 1]} {year}
      </span>
      <button
        onClick={next}
        className="p-1 text-text-muted hover:text-text-primary transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
