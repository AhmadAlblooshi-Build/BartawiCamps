'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { endpoints } from '@/lib/api'
import { Search } from 'lucide-react'
import CreateLeaseWizard from '@/components/leases/CreateLeaseWizard'

type FilterType = 'all' | 'company' | 'individual'

export default function TenantsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [wizardOpen, setWizardOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['room-tenants', { search, type: filterType }],
    queryFn: () => {
      const params: Record<string, any> = {}
      if (search) params.search = search
      if (filterType !== 'all') params.type = filterType
      return endpoints.roomTenants(params)
    },
  })

  const tenants = data?.tenants || []

  return (
    <div style={{
      padding: '32px',
      maxWidth: '1600px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: '32px',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'Fraunces, serif',
            fontStyle: 'italic',
            fontSize: '36px',
            fontWeight: 600,
            color: '#231F20',
            marginBottom: '8px',
          }}>
            People & Companies
          </h1>
          <p style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: '14px',
            color: '#666',
          }}>
            Tenants
          </p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          style={{
            padding: '12px 22px',
            background: '#1A1816',
            color: '#F4EFE7',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.03em',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          + New lease
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {/* Search Input */}
        <div style={{
          position: 'relative',
          flex: '1 1 300px',
        }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999',
            }}
          />
          <input
            type="text"
            placeholder="Search by name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid #D6CFC5',
              borderRadius: '8px',
              fontFamily: 'Geist, sans-serif',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#B8883D'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#D6CFC5'
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{
          display: 'flex',
          gap: '8px',
        }}>
          {(['all', 'company', 'individual'] as const).map((type) => {
            const isActive = filterType === type
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                style={{
                  padding: '8px 16px',
                  background: isActive ? '#B8883D' : 'transparent',
                  color: isActive ? '#FFF' : '#666',
                  border: `1px solid ${isActive ? '#B8883D' : '#D6CFC5'}`,
                  borderRadius: '999px',
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#B8883D'
                    e.currentTarget.style.color = '#B8883D'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#D6CFC5'
                    e.currentTarget.style.color = '#666'
                  }
                }}
              >
                {type === 'all' ? 'All' : type === 'company' ? 'Companies' : 'Individuals'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tenants Grid */}
      {isLoading ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          fontFamily: 'Geist, sans-serif',
          fontSize: '14px',
          color: '#999',
        }}>
          Loading tenants...
        </div>
      ) : tenants.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px',
        }}>
          <p style={{
            fontFamily: 'Fraunces, serif',
            fontStyle: 'italic',
            fontSize: '18px',
            color: '#999',
          }}>
            No tenants match your search
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px',
        }}>
          {tenants.map((tenant: any) => {
            const monthlyRent = Number(tenant.monthly_rent_total || 0)

            return (
              <div
                key={tenant.id}
                onClick={() => router.push(`/tenants/${tenant.id}`)}
                style={{
                  padding: '20px',
                  background: '#FFF',
                  border: '1px solid #D6CFC5',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#B8883D'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 136, 61, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D6CFC5'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Name + Company Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px',
                }}>
                  <h3 style={{
                    fontFamily: 'Fraunces, serif',
                    fontStyle: 'italic',
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#231F20',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {tenant.display_name}
                  </h3>
                  {tenant.is_company && (
                    <span style={{
                      padding: '3px 8px',
                      background: '#1E4D5214',
                      color: '#1E4D52',
                      borderRadius: '999px',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}>
                      Co.
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}>
                  <div>
                    <p style={{
                      fontFamily: 'Geist, sans-serif',
                      fontSize: '13px',
                      color: tenant.active_rooms_count > 0 ? '#666' : '#6A6159',
                      marginBottom: '4px',
                      fontStyle: tenant.active_rooms_count === 0 && tenant.total_leases > 0 ? 'italic' : 'normal',
                    }}>
                      {tenant.active_rooms_count > 0 ? (
                        `${tenant.active_rooms_count} active ${tenant.active_rooms_count === 1 ? 'room' : 'rooms'}`
                      ) : tenant.total_leases > 0 ? (
                        `0 active · ${tenant.total_leases} historical`
                      ) : (
                        'No leases'
                      )}
                    </p>
                  </div>
                  <div style={{
                    textAlign: 'right',
                  }}>
                    <p style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#231F20',
                    }}>
                      AED {monthlyRent.toLocaleString()}
                    </p>
                    <p style={{
                      fontFamily: 'Geist, sans-serif',
                      fontSize: '11px',
                      color: '#999',
                    }}>
                      monthly rent
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreateLeaseWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  )
}
