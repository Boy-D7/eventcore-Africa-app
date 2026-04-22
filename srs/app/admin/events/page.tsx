'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatMWK, formatDate } from '@/lib/utils'
import Header from '@/components/layout/Header'
import SideMenu from '@/components/layout/SideMenu'
import type { Event } from '@/types'

export default function ManageEventsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [events, setEvents]       = useState<Event[]>([])
  const [loading, setLoading]     = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!['admin', 'super_admin'].includes(profile?.role ?? '')) {
      router.push('/home')
      return
    }

    setIsSuperAdmin(profile?.role === 'super_admin')
    loadEvents()
  }

  async function loadEvents() {
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })
    setEvents(data ?? [])
    setLoading(false)
  }

  async function updateStatus(
    eventId: string,
    status: 'draft' | 'active' | 'cancelled' | 'completed'
  ) {
    setActionLoading(eventId)
    await supabase
      .from('events')
      .update({ status })
      .eq('id', eventId)
    await loadEvents()
    setActionLoading(null)
  }

  async function deleteEvent(eventId: string) {
    if (!confirm('Delete this event? This cannot be undone.')) return
    setActionLoading(eventId)
    await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
    await loadEvents()
    setActionLoading(null)
  }

  const statusColor: Record<string, string> = {
    draft:     '#f59e0b',
    active:    '#22c55e',
    cancelled: '#ef4444',
    completed: '#64748b',
  }

  const statusBg: Record<string, string> = {
    draft:     '#fef9c3',
    active:    '#dcfce7',
    cancelled: '#fef2f2',
    completed: '#f1f5f9',
  }

  return (
    <>
      <SideMenu />
      <div className="app-shell">
        <Header />

        <div style={{ padding: '16px' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '16px 0 24px',
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}>
              Manage Events
            </h2>
            {isSuperAdmin && (
              <button
                onClick={() => router.push('/admin/events/new')}
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '60px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                ➕ New
              </button>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#64748b',
            }}>
              Loading events...
            </div>
          )}

          {/* Events List */}
          {!loading && events.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#64748b',
            }}>
              No events yet.
              {isSuperAdmin && (
                <button
                  onClick={() => router.push('/admin/events/new')}
                  style={{
                    display: 'block',
                    margin: '16px auto 0',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '60px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Create First Event
                </button>
              )}
            </div>
          )}

          {events.map(event => (
            <div
              key={event.id}
              style={{
                background: 'white',
                borderRadius: '24px',
                border: '1px solid #f0f3f9',
                marginBottom: '16px',
                overflow: 'hidden',
              }}
            >
              {/* Event Image */}
              {event.image_url && (
                <div style={{
                  height: '120px',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <img
                    src={event.image_url}
                    alt={event.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  {/* Status badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: statusBg[event.status],
                    color: statusColor[event.status],
                    padding: '4px 12px',
                    borderRadius: '40px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}>
                    {event.status}
                  </div>
                </div>
              )}

              <div style={{ padding: '16px' }}>
                {/* Title + status (if no image) */}
                {!event.image_url && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}>
                    <span style={{
                      background: statusBg[event.status],
                      color: statusColor[event.status],
                      padding: '4px 12px',
                      borderRadius: '40px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      {event.status}
                    </span>
                  </div>
                )}

                <h3 style={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  marginBottom: '6px',
                }}>
                  {event.title}
                </h3>

                <p style={{
                  color: '#64748b',
                  fontSize: '0.9rem',
                  marginBottom: '4px',
                }}>
                  📅 {formatDate(event.event_date)}
                </p>

                <p style={{
                  color: '#64748b',
                  fontSize: '0.9rem',
                  marginBottom: '12px',
                }}>
                  📍 {event.venue}
                </p>

                {/* Stats row */}
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '16px',
                  padding: '12px',
                  background: '#f8fafd',
                  borderRadius: '16px',
                }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                      {event.tickets_sold.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Sold
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                      {event.total_capacity.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Capacity
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                      {formatMWK(event.general_price)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      General
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                      {formatMWK(event.vip_price)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      VIP
                    </div>
                  </div>
                </div>

                {/* Actions — super admin only */}
                {isSuperAdmin && (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}>
                    {event.status === 'draft' && (
                      <button
                        onClick={() => updateStatus(event.id, 'active')}
                        disabled={actionLoading === event.id}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '40px',
                          background: '#22c55e',
                          color: 'white',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        ✅ Activate
                      </button>
                    )}

                    {event.status === 'active' && (
                      <>
                        <button
                          onClick={() => updateStatus(event.id, 'completed')}
                          disabled={actionLoading === event.id}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '40px',
                            background: '#64748b',
                            color: 'white',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          🏁 Complete
                        </button>
                        <button
                          onClick={() => updateStatus(event.id, 'cancelled')}
                          disabled={actionLoading === event.id}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '40px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          ❌ Cancel
                        </button>
                      </>
                    )}

                    {event.status === 'draft' && (
                      <button
                        onClick={() => deleteEvent(event.id)}
                        disabled={actionLoading === event.id}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '40px',
                          background: '#fef2f2',
                          color: '#ef4444',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    )}

                    {/* Complimentary tickets */}
                    {event.status === 'active' && (
                      <button
                        onClick={() => router.push(
                          `/admin/complimentary?event=${event.id}`
                        )}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '40px',
                          background: '#f0f4fe',
                          color: '#2563eb',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          marginTop: '4px',
                        }}
                      >
                        🎁 Generate Complimentary Tickets
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}