'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useOperationsData, getSummary, getOutstandingRooms, getExpiredRooms, getExpiringSoonRooms, getVacantRooms } from '@/lib/operations-data'
import { OperationsSummary } from '@/components/operations/OperationsSummary'
import { QueueTabs, type QueueKey } from '@/components/operations/QueueTabs'
import { QueueFilters, type FilterState } from '@/components/operations/QueueFilters'
import { QueueTable } from '@/components/operations/QueueTable'
import { QueueActionBar } from '@/components/operations/QueueActionBar'

export default function OperationsPage() {
  const { allRooms, isLoading, error } = useOperationsData()
  const [activeQueue, setActiveQueue] = useState<QueueKey>('outstanding')
  const [filters, setFilters] = useState<FilterState>({
    camp: 'all',
    block: 'all',
    search: '',
    amountMin: null,
    amountMax: null,
    showSynthesized: true,
  })
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set())

  // Reset selection when queue changes
  useEffect(() => {
    setSelectedRooms(new Set())
  }, [activeQueue])

  const summary = useMemo(() => getSummary(allRooms), [allRooms])

  const baseQueue = useMemo(() => {
    switch (activeQueue) {
      case 'outstanding': return getOutstandingRooms(allRooms)
      case 'expired':     return getExpiredRooms(allRooms)
      case 'expiring':    return getExpiringSoonRooms(allRooms)
      case 'vacancies':   return getVacantRooms(allRooms)
    }
  }, [allRooms, activeQueue])

  // Apply filters
  const filteredQueue = useMemo(() => {
    return baseQueue.filter(r => {
      if (filters.camp !== 'all') {
        const matches = filters.camp === 'camp1'
          ? r.campName.toLowerCase().includes('camp 1')
          : r.campName.toLowerCase().includes('camp 2')
        if (!matches) return false
      }
      if (filters.block !== 'all' && r.blockCode !== filters.block) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!r.tenant.toLowerCase().includes(q) &&
            !r.roomNumber.toLowerCase().includes(q) &&
            !(r.remarks || '').toLowerCase().includes(q)) {
          return false
        }
      }
      if (activeQueue === 'outstanding') {
        if (filters.amountMin !== null && r.balance < filters.amountMin) return false
        if (filters.amountMax !== null && r.balance > filters.amountMax) return false
        if (!filters.showSynthesized && r.isSynthesized) return false
      }
      return true
    })
  }, [baseQueue, filters, activeQueue])

  // Available blocks for filter dropdown
  const availableBlocks = useMemo(() => {
    const blocks = new Set<string>()
    baseQueue.forEach(r => blocks.add(r.blockCode))
    return Array.from(blocks).sort()
  }, [baseQueue])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Escape clears selection
      if (e.key === 'Escape' && selectedRooms.size > 0) {
        setSelectedRooms(new Set())
        return
      }

      // Cmd/Ctrl + A selects all visible rows
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && activeQueue) {
        // Only if focus isn't in an input
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

        e.preventDefault()
        const next = new Set<string>()
        filteredQueue.forEach(r => next.add(`${r.campId}::${r.roomNumber}`))
        setSelectedRooms(next)
        return
      }

      // Number keys 1-4 switch queues
      if (!e.metaKey && !e.ctrlKey && ['1','2','3','4'].includes(e.key)) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        const queues: QueueKey[] = ['outstanding', 'expired', 'expiring', 'vacancies']
        setActiveQueue(queues[parseInt(e.key) - 1])
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedRooms, filteredQueue, activeQueue])

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6A6159' }}>
        <p style={{ fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Loading operations data…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', color: '#A84A3B' }}>
        <p style={{ fontSize: '14px' }}>Failed to load operations data.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px 48px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6A6159', marginBottom: '8px', fontWeight: 500 }}>
          Operations Command
        </p>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '42px', fontStyle: 'italic', color: '#1A1816', margin: 0, lineHeight: 1.1 }}>
          Work queue
        </h1>
        <p style={{ fontSize: '14px', color: '#6A6159', marginTop: '8px' }}>
          Outstanding balances, expired contracts, and vacancies across both camps.
        </p>
      </div>

      {/* Summary strip */}
      <OperationsSummary summary={summary} />

      {/* Queue tabs */}
      <div style={{ marginTop: '32px' }}>
        <QueueTabs
          activeQueue={activeQueue}
          onChange={setActiveQueue}
          summary={summary}
        />
      </div>

      {/* Filter bar */}
      <div style={{ marginTop: '20px' }}>
        <QueueFilters
          queue={activeQueue}
          filters={filters}
          onChange={setFilters}
          availableBlocks={availableBlocks}
        />
      </div>

      {/* Table */}
      <div style={{ marginTop: '16px' }}>
        <QueueTable
          queue={activeQueue}
          rooms={filteredQueue}
          selected={selectedRooms}
          onSelectionChange={setSelectedRooms}
        />
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedRooms.size > 0 && (
          <QueueActionBar
            selected={selectedRooms}
            queue={activeQueue}
            rooms={filteredQueue}
            onClear={() => setSelectedRooms(new Set())}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
