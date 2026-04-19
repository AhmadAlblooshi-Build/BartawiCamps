'use client'

import { motion } from 'motion/react'
import type { QueueKey } from './QueueTabs'
import type { OperationsRoom } from '@/lib/operations-data'
import { exportToCSV, copyToClipboard } from '@/lib/operations-export'

interface Props {
  selected: Set<string>
  queue: QueueKey
  rooms: OperationsRoom[]
  onClear: () => void
}

function rowKey(r: OperationsRoom): string {
  return `${r.campId}::${r.roomNumber}`
}

export function QueueActionBar({ selected, queue, rooms, onClear }: Props) {
  const selectedRooms = rooms.filter(r => selected.has(rowKey(r)))

  const handleExportCSV = () => {
    exportToCSV(queue, selectedRooms)
  }

  const handleCopyTenants = async () => {
    const text = selectedRooms
      .map(r => `${r.roomNumber}\t${r.tenant}\tAED ${r.balance.toLocaleString()}`)
      .join('\n')
    await copyToClipboard(text)
  }

  const handleCopyRooms = async () => {
    const text = selectedRooms.map(r => r.roomNumber).join(', ')
    await copyToClipboard(text)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        background: '#1A1816',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
        zIndex: 50,
      }}
    >
      <span style={{
        fontSize: '12px',
        color: '#FAF7F2',
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 500,
        paddingRight: '8px',
        borderRight: '0.5px solid rgba(250, 247, 242, 0.2)',
      }}>
        {selected.size} selected
      </span>
      <ActionButton onClick={handleExportCSV} label="Export CSV" />
      <ActionButton onClick={handleCopyTenants} label="Copy tenant list" />
      <ActionButton onClick={handleCopyRooms} label="Copy room codes" />
      <button
        onClick={onClear}
        style={{
          padding: '8px',
          background: 'transparent',
          border: 'none',
          color: 'rgba(250, 247, 242, 0.5)',
          cursor: 'pointer',
          fontSize: '14px',
          marginLeft: '4px',
        }}
        title="Clear selection (Esc)"
      >
        ✕
      </button>
    </motion.div>
  )
}

function ActionButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        background: 'rgba(250, 247, 242, 0.08)',
        border: '0.5px solid rgba(250, 247, 242, 0.15)',
        borderRadius: '6px',
        color: '#FAF7F2',
        fontSize: '11px',
        fontWeight: 500,
        cursor: 'pointer',
        letterSpacing: '0.04em',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250, 247, 242, 0.16)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250, 247, 242, 0.08)' }}
    >
      {label}
    </button>
  )
}
