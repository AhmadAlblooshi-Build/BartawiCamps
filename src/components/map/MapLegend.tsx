'use client'
export function MapLegend() {
  return (
    <div className="pt-4 border-t border-sand-200/60" style={{
      background: 'linear-gradient(90deg, transparent 0%, rgba(214,207,197,0.5) 20%, rgba(214,207,197,0.8) 50%, rgba(214,207,197,0.5) 80%, transparent 100%)',
      height: '1px',
      marginBottom: '16px'
    }}>
      <div className="flex items-center gap-6 text-[11px] font-body text-espresso-muted flex-wrap pt-3">
        <LegendCircle color="rgba(30,77,82,0.4)" label="OCCUPIED" />
        <LegendCircle color="rgba(184,136,61,0.4)" label="VACANT" dashed />
        <LegendCircle color="rgba(196,138,30,0.4)" label="VACATING" />
        <LegendCircle color="rgba(168,74,59,0.4)" label="MAINTENANCE" />
        <LegendCircle color="rgba(214,207,197,0.5)" label="BARTAWI USE" />
      </div>
    </div>
  )
}

function LegendCircle({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          backgroundColor: dashed ? 'transparent' : color,
          border: `1.5px ${dashed ? 'dashed' : 'solid'} ${color}`
        }}
      />
      <span className="overline">{label}</span>
    </div>
  )
}
