'use client'

import { motion } from 'motion/react'
import type { OperationsSummary as Summary } from '@/lib/operations-data'

interface Props {
  summary: Summary
}

interface StatCardProps {
  label: string
  value: string | number
  sublabel?: string
  color?: string
  delay?: number
}

function StatCard({ label, value, sublabel, color = '#1A1816', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      style={{
        flex: 1,
        padding: '20px',
        background: '#FFFFFF',
        border: '0.5px solid #D6CFC5',
        borderRadius: '10px',
      }}
    >
      <p style={{
        fontSize: '9px',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: '#6A6159',
        margin: 0,
        marginBottom: '8px',
        fontWeight: 500,
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '24px',
        fontWeight: 600,
        color,
        margin: 0,
        lineHeight: 1.1,
      }}>
        {value}
      </p>
      {sublabel && (
        <p style={{
          fontSize: '10px',
          color: '#6A6159',
          marginTop: '6px',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {sublabel}
        </p>
      )}
    </motion.div>
  )
}

export function OperationsSummary({ summary }: Props) {
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <StatCard
        label="Outstanding"
        value={`AED ${summary.outstandingTotal.toLocaleString()}`}
        sublabel={`${summary.confirmedOutstandingCount} confirmed · ${summary.pendingEntryCount} pending entry`}
        color="#A84A3B"
        delay={0}
      />
      <StatCard
        label="Expired contracts"
        value={summary.expiredCount}
        sublabel={summary.expiredCount > 0 ? 'Needs renewal' : 'All active'}
        color={summary.expiredCount > 0 ? '#8B6420' : '#1A1816'}
        delay={0.05}
      />
      <StatCard
        label="Expiring soon"
        value={summary.expiringCount}
        sublabel="Next 30 days"
        color={summary.expiringCount > 0 ? '#B8883D' : '#1A1816'}
        delay={0.1}
      />
      <StatCard
        label="Vacancies"
        value={summary.vacantCount}
        sublabel={summary.vacantCount > 0 ? 'Available to lease' : 'Full occupancy'}
        color={summary.vacantCount > 0 ? '#1E4D52' : '#1A1816'}
        delay={0.15}
      />
      <StatCard
        label="Monthly billing"
        value={`AED ${summary.totalBilling.toLocaleString()}`}
        sublabel={`C1 ${summary.camp1Billing.toLocaleString()} · C2 ${summary.camp2Billing.toLocaleString()}`}
        color="#1A1816"
        delay={0.2}
      />
    </div>
  )
}
