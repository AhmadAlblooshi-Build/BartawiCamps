'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { endpoints } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import { formatMethod, formatDateLong } from '@/lib/payment-helpers'

export default function TenantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tenantId = params.id as string

  const { data, isLoading } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => endpoints.roomTenant(tenantId),
  })

  const tenant = data?.tenant

  if (isLoading) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        fontFamily: 'Geist, sans-serif',
        fontSize: '14px',
        color: '#999',
      }}>
        Loading tenant details...
      </div>
    )
  }

  if (!tenant) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: 'Fraunces, serif',
          fontStyle: 'italic',
          fontSize: '18px',
          color: '#999',
        }}>
          Tenant not found
        </p>
      </div>
    )
  }

  // Compute stats
  const activeLeases = tenant.leases?.filter((l: any) => l.status === 'active') || []
  const totalLeases = tenant.leases?.length || 0
  const monthlyRent = activeLeases.reduce((sum: number, l: any) => sum + Number(l.monthly_rent || 0), 0)
  const outstanding = tenant.leases?.reduce((sum: number, l: any) => {
    const leaseBalance = l.monthly_records?.reduce((s: number, r: any) => s + Number(r.balance || 0), 0) || 0
    return sum + leaseBalance
  }, 0) || 0

  // All payments from all leases (max 30 most recent)
  const allPayments = tenant.leases
    ?.flatMap((l: any) =>
      l.payment_history?.map((p: any) => ({
        ...p,
        room_number: l.room_number,
      })) || []
    )
    .sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
    .slice(0, 30) || []

  // Year-to-date total paid
  const currentYear = new Date().getFullYear()
  const ytdPaid = allPayments
    .filter((p: any) => new Date(p.payment_date).getFullYear() === currentYear)
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

  return (
    <div style={{
      padding: '32px',
      maxWidth: '1600px',
      margin: '0 auto',
    }}>
      {/* Back Link */}
      <button
        onClick={() => router.push('/tenants')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          color: '#B8883D',
          fontFamily: 'Geist, sans-serif',
          fontSize: '14px',
          cursor: 'pointer',
          marginBottom: '24px',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.7'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1'
        }}
      >
        <ArrowLeft size={16} />
        Tenants
      </button>

      {/* Header */}
      <div style={{
        marginBottom: '32px',
      }}>
        <h1 style={{
          fontFamily: 'Fraunces, serif',
          fontStyle: 'italic',
          fontSize: '42px',
          fontWeight: 600,
          color: '#231F20',
          marginBottom: '8px',
        }}>
          {tenant.display_name}
        </h1>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontFamily: 'Geist, sans-serif',
          fontSize: '14px',
          color: '#666',
        }}>
          <span>{tenant.is_company ? 'Company' : 'Individual'}</span>
          {tenant.phone && (
            <>
              <span style={{ color: '#D6CFC5' }}>·</span>
              <span>{tenant.phone}</span>
            </>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '48px',
      }}>
        {/* Active Rooms */}
        <div style={{
          padding: '20px',
          background: '#FFF',
          border: '1px solid #D6CFC5',
          borderRadius: '12px',
        }}>
          <p style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: '12px',
            color: '#999',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Active Rooms
          </p>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '28px',
            fontWeight: 600,
            color: '#231F20',
          }}>
            {activeLeases.length}
          </p>
        </div>

        {/* Total Leases */}
        <div style={{
          padding: '20px',
          background: '#FFF',
          border: '1px solid #D6CFC5',
          borderRadius: '12px',
        }}>
          <p style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: '12px',
            color: '#999',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Total Leases
          </p>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '28px',
            fontWeight: 600,
            color: '#231F20',
          }}>
            {totalLeases}
          </p>
        </div>

        {/* Monthly Rent */}
        <div style={{
          padding: '20px',
          background: '#FFF',
          border: '1px solid #D6CFC5',
          borderRadius: '12px',
        }}>
          <p style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: '12px',
            color: '#999',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Monthly Rent
          </p>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '28px',
            fontWeight: 600,
            color: '#231F20',
          }}>
            {monthlyRent.toLocaleString()}
          </p>
          <p style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: '11px',
            color: '#999',
            marginTop: '4px',
          }}>
            AED
          </p>
        </div>

        {/* Outstanding */}
        <div style={{
          padding: '20px',
          background: '#FFF',
          border: `1px solid ${outstanding > 0 ? '#A84A3B' : '#D6CFC5'}`,
          borderRadius: '12px',
        }}>
          <p style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: '12px',
            color: '#999',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Outstanding
          </p>
          <p style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '28px',
            fontWeight: 600,
            color: outstanding > 0 ? '#A84A3B' : '#231F20',
          }}>
            {outstanding.toLocaleString()}
          </p>
          <p style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: '11px',
            color: '#999',
            marginTop: '4px',
          }}>
            AED
          </p>
        </div>
      </div>

      {/* Leases Section */}
      <div style={{
        marginBottom: '48px',
      }}>
        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontStyle: 'italic',
          fontSize: '24px',
          fontWeight: 600,
          color: '#231F20',
          marginBottom: '20px',
        }}>
          Leases
        </h2>

        {tenant.leases && tenant.leases.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {tenant.leases.map((lease: any) => {
              const leaseBalance = lease.monthly_records?.reduce((sum: number, r: any) => sum + Number(r.balance || 0), 0) || 0
              const hasOutstanding = leaseBalance > 0

              // Status badge colors
              const statusColors: Record<string, string> = {
                active: '#1E4D52',
                expired: '#B8883D',
                closed: '#6A6159',
              }
              const statusColor = statusColors[lease.status] || '#999'

              return (
                <div
                  key={lease.id}
                  onClick={() => {
                    if (lease.camp_id) {
                      router.push(`/camps/${lease.camp_id}/map?room=${lease.room_number}`)
                    }
                  }}
                  style={{
                    padding: '16px',
                    background: '#FFF',
                    border: `1.5px solid ${hasOutstanding ? '#A84A3B' : '#D6CFC5'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#B8883D'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 136, 61, 0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = hasOutstanding ? '#A84A3B' : '#D6CFC5'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Room Number + Status */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}>
                    <p style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#231F20',
                    }}>
                      {lease.room_number}
                    </p>
                    <span style={{
                      padding: '3px 8px',
                      background: `${statusColor}14`,
                      color: statusColor,
                      borderRadius: '999px',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}>
                      {lease.status}
                    </span>
                  </div>

                  {/* Block + Contract Type */}
                  <p style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '13px',
                    color: '#666',
                    marginBottom: '8px',
                  }}>
                    Block {lease.block_code} · {lease.contract_type}
                  </p>

                  {/* Dates */}
                  <p style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: '12px',
                    color: '#999',
                    marginBottom: '12px',
                  }}>
                    {new Date(lease.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    {' → '}
                    {lease.end_date
                      ? new Date(lease.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : 'ongoing'}
                  </p>

                  {/* Rent + Outstanding */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}>
                    <div>
                      <p style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#231F20',
                      }}>
                        AED {Number(lease.monthly_rent).toLocaleString()}
                      </p>
                      <p style={{
                        fontFamily: 'Geist, sans-serif',
                        fontSize: '11px',
                        color: '#999',
                      }}>
                        monthly
                      </p>
                    </div>
                    {hasOutstanding && (
                      <div style={{
                        textAlign: 'right',
                      }}>
                        <p style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#A84A3B',
                        }}>
                          {leaseBalance.toLocaleString()}
                        </p>
                        <p style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '10px',
                          color: '#A84A3B',
                        }}>
                          outstanding
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: '14px',
            color: '#999',
            fontStyle: 'italic',
          }}>
            No leases recorded
          </p>
        )}
      </div>

      {/* Payment History Section */}
      <div>
        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontStyle: 'italic',
          fontSize: '24px',
          fontWeight: 600,
          color: '#231F20',
          marginBottom: '8px',
        }}>
          Payment history · AED {ytdPaid.toLocaleString()} in {currentYear}
        </h2>
        <p style={{
          fontFamily: 'Geist, sans-serif',
          fontSize: '13px',
          color: '#999',
          marginBottom: '24px',
        }}>
          Most recent 30 payments
        </p>

        {allPayments.length > 0 ? (
          <div style={{
            background: '#FFF',
            border: '1px solid #D6CFC5',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {allPayments.map((payment: any, idx: number) => {
              // Type badge colors
              const typeColors: Record<string, string> = {
                rent: '#1E4D52',
                deposit: '#B8883D',
                credit: '#6A6159',
                adjustment: '#999',
              }
              const typeColor = typeColors[payment.payment_type] || '#999'

              return (
                <div
                  key={payment.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: idx < allPayments.length - 1 ? '1px solid #F5F4F2' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  {/* Date */}
                  <div style={{
                    minWidth: '100px',
                  }}>
                    <p style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '13px',
                      color: '#231F20',
                    }}>
                      {formatDateLong(payment.payment_date)}
                    </p>
                  </div>

                  {/* Room */}
                  <div style={{
                    minWidth: '60px',
                  }}>
                    <p style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '12px',
                      color: '#666',
                    }}>
                      {payment.room_number}
                    </p>
                  </div>

                  {/* Type Badge */}
                  <span style={{
                    padding: '3px 10px',
                    background: `${typeColor}14`,
                    color: typeColor,
                    borderRadius: '999px',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}>
                    {payment.payment_type}
                  </span>

                  {/* Method */}
                  <div style={{
                    flex: 1,
                  }}>
                    <p style={{
                      fontFamily: 'Geist, sans-serif',
                      fontSize: '13px',
                      color: '#666',
                    }}>
                      {formatMethod(payment.method as any)}
                      {payment.cheque_number && ` • #${payment.cheque_number}`}
                      {payment.transfer_reference && ` • ${payment.transfer_reference}`}
                    </p>
                  </div>

                  {/* Amount */}
                  <div style={{
                    textAlign: 'right',
                    minWidth: '120px',
                  }}>
                    <p style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: payment.reversed ? '#999' : '#231F20',
                      textDecoration: payment.reversed ? 'line-through' : 'none',
                    }}>
                      AED {Number(payment.amount).toLocaleString()}
                    </p>
                    {payment.reversed && (
                      <span style={{
                        display: 'inline-block',
                        marginTop: '4px',
                        padding: '2px 6px',
                        background: '#A84A3B14',
                        color: '#A84A3B',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}>
                        Reversed
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: '14px',
            color: '#999',
            fontStyle: 'italic',
          }}>
            No payments recorded
          </p>
        )}
      </div>
    </div>
  )
}
