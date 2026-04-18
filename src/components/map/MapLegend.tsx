'use client'
export function MapLegend() {
  return (
    <div className="flex items-center gap-4 text-[11px] font-body text-espresso-muted flex-wrap">
      <LegendSquare fill="#D8E3E4" stroke="#1E4D52" label="Occupied" />
      <LegendSquare fill="#FAF7F2" stroke="#B8883D" dashed label="Vacant" />
      <LegendSquare fill="#F4E5C1" stroke="#C48A1E" label="Vacating" />
      <LegendSquare fill="#E8DFD3" stroke="#D6CFC5" label="Bartawi Use" />
      <LegendSquare fill="#F0DDD9" stroke="#A84A3B" label="Overdue/Maint" />
      <LegendSquare fill="#EAE3F3" stroke="#5A3E8A" label="Legal" />
    </div>
  )
}

function LegendSquare({ fill, stroke, dashed, label }: { fill: string; stroke: string; dashed?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="14" height="14" className="shrink-0">
        <rect
          x="0.5"
          y="0.5"
          width="13"
          height="13"
          rx="2"
          fill={fill}
          stroke={stroke}
          strokeWidth="1"
          strokeDasharray={dashed ? '2,2' : undefined}
        />
      </svg>
      <span>{label}</span>
    </div>
  )
}
