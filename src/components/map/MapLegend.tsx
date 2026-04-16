'use client'
export function MapLegend() {
  return (
    <div className="flex items-center gap-4 text-[11px] font-body text-espresso-muted flex-wrap">
      <LegendDot color="bg-teal"      label="Occupied" />
      <LegendDot color="bg-sand-300"  label="Vacant" />
      <LegendDot color="bg-ochre"     label="Vacating" />
      <LegendDot color="bg-amber-500" label="Bartawi" />
      <LegendDot color="bg-rust"      label="Overdue" />
      <LegendDot color="bg-plum"      label="Legal" />
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />
      <span>{label}</span>
    </div>
  )
}
