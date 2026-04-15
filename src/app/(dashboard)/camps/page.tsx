'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCamps } from '@/lib/queries'
import { Building2, MapPin } from 'lucide-react'

export default function CampsPage() {
  const router = useRouter()
  const { data: camps, isLoading } = useCamps()

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading font-bold text-2xl text-text-primary">Camps</h1>
        <p className="text-text-muted text-sm mt-0.5">Select a camp to explore buildings and rooms</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {camps?.map((camp) => (
          <button
            key={camp.id}
            onClick={() => router.push(`/camps/${camp.id}`)}
            className="group bg-bg-card border border-border rounded-2xl p-8 text-left hover:border-accent-cyan/30 hover:bg-bg-elevated transition-all duration-200 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-accent-glow border border-accent-cyan/20 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-accent-cyan" />
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-body font-medium border ${
                camp.map_configured
                  ? 'bg-status-occupied-dim border-status-occupied/20 text-status-occupied'
                  : 'bg-border/50 border-border text-text-dim'
              }`}>
                {camp.map_configured ? 'Map Ready' : 'Map Pending'}
              </div>
            </div>
            <h2 className="font-heading font-bold text-2xl text-text-primary mb-1">{camp.name}</h2>
            <div className="flex items-center gap-1.5 text-text-muted mb-5">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-sm">{camp.city}, UAE</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-primary/50 rounded-xl border border-border/50 p-3 text-center">
                <p className="font-heading font-bold text-xl text-text-primary">{camp.total_rooms}</p>
                <p className="text-text-muted text-xs mt-0.5">Total Rooms</p>
              </div>
              <div className="bg-bg-primary/50 rounded-xl border border-border/50 p-3 text-center">
                <p className="font-heading font-bold text-xl text-text-primary">{camp.leasable_rooms}</p>
                <p className="text-text-muted text-xs mt-0.5">Leasable</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
