'use client'
import { useState, useEffect } from 'react'
import { MagnifyingGlass, Bed, Buildings, Files, UsersThree } from '@phosphor-icons/react'
import * as Dialog from '@radix-ui/react-dialog'
import { Icon } from '@/components/ui/Icon'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const router = useRouter()

  // ⌘K / Ctrl-K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data: rooms } = useQuery({
    queryKey: ['search-rooms', q],
    queryFn: () => endpoints.rooms({ q, limit: 5 }),
    enabled: q.length >= 2,
  })
  const { data: people } = useQuery({
    queryKey: ['people-search', q],
    queryFn: () => endpoints.peopleSearch(q),
    enabled: q.length >= 2,
  })
  const { data: companies } = useQuery({
    queryKey: ['search-companies', q],
    queryFn: () => endpoints.searchEntities(q, 'company'),
    enabled: q.length >= 2,
  })

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 px-3 h-9 rounded-lg border border-[color:var(--color-border-subtle)] hover:border-[color:var(--color-border-medium)] bg-white text-espresso-muted transition-colors">
          <Icon icon={MagnifyingGlass} size={14} />
          <span className="text-[12px] font-body min-w-[180px] text-left">Search rooms, tenants...</span>
          <kbd className="ml-2 px-1.5 py-0.5 rounded bg-sand-100 text-[10px] font-mono text-espresso-subtle">⌘K</kbd>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-espresso/20 backdrop-blur-sm z-50 animate-fade" />
        <Dialog.Content className="fixed top-[18vh] left-1/2 -translate-x-1/2 w-[640px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-raise-4 overflow-hidden z-50 animate-rise">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="flex items-center gap-3 px-5 h-14 border-b border-[color:var(--color-border-subtle)]">
            <Icon icon={MagnifyingGlass} size={16} className="text-espresso-muted" />
            <input
              autoFocus
              placeholder="Search rooms, tenants, companies, contracts..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="flex-1 bg-transparent outline-none font-body text-sm text-espresso placeholder:text-espresso-subtle"
            />
            <kbd className="px-1.5 py-0.5 rounded bg-sand-100 text-[10px] font-mono text-espresso-subtle">ESC</kbd>
          </div>
          <div className="max-h-[50vh] overflow-y-auto py-2">
            {q.length < 2 ? (
              <div className="px-5 py-10 text-center">
                <div className="eyebrow mb-2">Tip</div>
                <div className="text-[12px] text-espresso-muted">Type at least 2 characters. Search covers room numbers, tenant names, companies, contracts.</div>
              </div>
            ) : (
              <>
                {rooms?.data && rooms.data.length > 0 && (
                  <ResultSection title="Rooms" icon={Bed}>
                    {rooms.data.map((r: any) => (
                      <ResultItem
                        key={r.id}
                        label={`Room ${r.room_number}`}
                        sub={r.current_occupancy?.individual?.owner_name || r.current_occupancy?.company?.name || 'Vacant'}
                        onClick={() => { router.push(`/rooms?open=${r.id}`); setOpen(false) }}
                      />
                    ))}
                  </ResultSection>
                )}
                {people?.results && people.results.length > 0 && (
                  <ResultSection title="People" icon={UsersThree}>
                    {people.results.map((person: any) => (
                      <PeopleResultItem
                        key={person.id}
                        person={person}
                        onClick={() => {
                          if (person.type === 'tenant') {
                            router.push(`/tenants/${person.id}`)
                          } else if (person.type === 'occupant' && person.tenant_id) {
                            router.push(`/tenants/${person.tenant_id}`)
                          }
                          setOpen(false)
                        }}
                      />
                    ))}
                  </ResultSection>
                )}
                {companies?.data && companies.data.length > 0 && (
                  <ResultSection title="Companies" icon={Buildings}>
                    {companies.data.map((c: any) => (
                      <ResultItem
                        key={c.id}
                        label={c.name}
                        sub={c.contact_person || ''}
                        onClick={() => { router.push(`/contracts?company=${c.id}`); setOpen(false) }}
                      />
                    ))}
                  </ResultSection>
                )}
                {(!rooms?.data?.length && !people?.results?.length && !companies?.data?.length) && (
                  <div className="px-5 py-10 text-center text-[12px] text-espresso-muted">
                    No matches for &ldquo;{q}&rdquo;
                  </div>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ResultSection({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <Icon icon={icon} size={12} className="text-espresso-subtle" />
        <div className="eyebrow">{title}</div>
      </div>
      <div>{children}</div>
    </div>
  )
}

function ResultItem({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-sand-100 transition-colors text-left">
      <div className="font-body text-[13px] font-medium text-espresso truncate">{label}</div>
      <div className="font-body text-[11px] text-espresso-muted truncate ml-4">{sub}</div>
    </button>
  )
}

function PeopleResultItem({ person, onClick }: { person: any; onClick: () => void }) {
  // Determine badge styling based on display_subtype
  const getBadgeStyles = (subtype: string) => {
    if (subtype === 'Lessee') {
      return { bg: 'bg-teal/10', text: 'text-teal' }
    } else if (subtype === 'Active occupant') {
      return { bg: 'bg-amber/10', text: 'text-amber-gold' }
    } else if (subtype === 'Past occupant') {
      return { bg: 'bg-stone/10', text: 'text-stone' }
    }
    return { bg: 'bg-sand-100', text: 'text-espresso-muted' }
  }

  // Determine secondary info based on type
  const getSecondaryInfo = () => {
    if (person.type === 'tenant') {
      return person.national_id || person.phone || ''
    } else if (person.type === 'occupant') {
      if (person.current_bed) {
        const parts = [person.current_bed]
        if (person.lessee_name) parts.push(`Under: ${person.lessee_name}`)
        if (person.phone) parts.push(person.phone)
        return parts.join(' · ')
      } else {
        return `Past occupant${person.national_id ? ' · ' + person.national_id : ''}`
      }
    }
    return ''
  }

  const badge = getBadgeStyles(person.display_subtype)
  const secondaryInfo = getSecondaryInfo()

  return (
    <button onClick={onClick} className="w-full px-3 py-2 rounded-lg hover:bg-sand-100 transition-colors text-left">
      <div className="flex items-center justify-between mb-1">
        <div className="font-body text-[13px] font-bold text-espresso truncate">{person.name}</div>
        <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-medium ${badge.bg} ${badge.text} shrink-0`}>
          {person.display_subtype}
        </span>
      </div>
      {secondaryInfo && (
        <div className="font-body text-[11px] text-espresso-muted truncate">{secondaryInfo}</div>
      )}
    </button>
  )
}
