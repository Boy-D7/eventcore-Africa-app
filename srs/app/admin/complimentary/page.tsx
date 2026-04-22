'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { generateQRCode } from '@/lib/utils'
import Header from '@/components/layout/Header'
import SideMenu from '@/components/layout/SideMenu'
import type { Event } from '@/types'

type CompTicket = {
  ticket_id: string
  qr_code:   string
  type:      'general' | 'vip'
  qr_image?: string
}

export default function ComplimentaryPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const eventId      = searchParams.get('event')
  const supabase     = createClient()

  const [event, setEvent]       = useState<Event | null>(null)
  const [reason, setReason]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [tickets, setTickets]   = useState<CompTicket[]>([])
  const [generated, setGenerated] = useState(false)
  const [existing, setExisting] = useState<CompTicket[]>([])
  const [loadingExisting, setLoadingExisting] = useState(true)

  useEffect(() => {
    init()
  }, [])

  async function init() {
    // Verify super_admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      router.push('/admin/dashboard')
      return
    }

    // Load event
    if (eventId) {
      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      setEvent(ev)
    }

    // Check existing comp tickets
    await loadExisting()
  }

  async function loadExisting() {
    if (!eventId) return
    setLoadingExisting(true)

    const { data } = await supabase
      .from('tickets')
      .select('id, qr_code, ticket_type')
      .eq('event_id', eventId)
      .eq('amount_paid', 0)

    if (data && data.length > 0) {
      // Generate QR images for existing tickets
      const withQR = await Promise.all(
        data.map(async t => ({
          ticket_id: t.id,
          qr_code:   t.qr_code,
          type:      t.ticket_type as 'general' | 'vip',
          qr_image:  await generateQRCode(t.id),
        }))
      )
      setExisting(withQR)
    }

    setLoadingExisting(false)
  }

  async function handleGenerate() {
    if (!reason.trim()) {
      setError('Please enter a reason for these complimentary tickets')
      return
    }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: rpcError } = await supabase.rpc(
      'generate_complimentary_tickets',
      {
        p_event_id: eventId,
        p_admin_id: user.id,
        p_reason:   reason,
      }
    )

    if (rpcError || !data?.success) {
      setError(data?.error ?? rpcError?.message ?? 'Failed to generate tickets')
      setLoading(false)
      return
    }

    // Generate QR images for all tickets
    const ticketList: CompTicket[] = data.tickets
    const withQR = await Promise.all(
      ticketList.map(async (t: CompTicket) => ({
        ...t,
        qr_image: await generateQRCode(t.ticket_id),
      }))
    )

    setTickets(withQR)
    setGenerated(true)
    setLoading(false)
  }

  const generalTickets = (generated ? tickets : existing)
    .filter(t => t.type === 'general')

  const vipTickets = (generated ? tickets : existing)
    .filter(t => t.type === 'vip')

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
            gap: '12px',
            margin: '16px 0 20px',
          }}>
            <button
              onClick={() => router.back()}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '1.2rem',
              }}
            >
              ←
            </button>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}>
              🎁 Complimentary Tickets
            </h2>
          </div>

          {/* Event Info */}
          {event && (
            <div style={{
              background: '#f0f4fe',
              borderRadius: '20px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '2px',
                color: '#2563eb',
                marginBottom: '4px',
              }}>
                EVENT
              </div>
              <h3 style={{ fontWeight: 700 }}>{event.title}</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                📅 {formatDate(event.event_date)} · 📍 {event.venue}
              </p>
            </div>
          )}

          {/* Already generated */}
          {existing.length > 0 && !generated && (
            <div style={{
              background: '#fef9c3',
              borderRadius: '20px',
              padding: '16px',
              marginBottom: '20px',
              color: '#854d0e',
              fontSize: '0.9rem',
            }}>
              ⚠️ Complimentary tickets already generated for this event.
              Showing existing tickets below.
            </div>
          )}

          {/* Generate Form */}
          {existing.length === 0 && !generated && (
            <div style={{
              background: '#f8fafd',
              borderRadius: '24px',
              padding: '24px',
              marginBottom: '24px',
            }}>
              {/* Summary */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
              }}>
                {[
                  { label: '🎟️ General', value: '10 tickets' },
                  { label: '⭐ VIP',      value: '5 tickets' },
                  { label: '💰 Cost',     value: 'MK 0' },
                ].map(item => (
                  <div key={item.label} style={{
                    flex: 1,
                    background: 'white',
                    borderRadius: '16px',
                    padding: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontWeight: 800,
                      fontSize: '0.95rem',
                    }}>
                      {item.value}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      marginTop: '2px',
                    }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reason */}
              <label style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                display: 'block',
                marginBottom: '6px',
              }}>
                Reason (logged for council transparency)
              </label>
              <input
                type="text"
                placeholder="e.g Staff access, Media, Sponsors, Giveaway"
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '60px',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  marginBottom: '16px',
                }}
              />

              {error && (
                <div style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  marginBottom: '16px',
                  fontSize: '0.9rem',
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading || !reason.trim()}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '60px',
                  background: loading ? '#94a3b8' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading
                  ? 'Generating...'
                  : '🎁 Generate 15 Complimentary Tickets'}
              </button>

              <p style={{
                textAlign: 'center',
                fontSize: '0.8rem',
                color: '#64748b',
                marginTop: '12px',
              }}>
                Can only be generated once per event.
                All tickets logged as MK 0 for council records.
              </p>
            </div>
          )}

          {/* Success */}
          {generated && (
            <div style={{
              background: '#dcfce7',
              borderRadius: '20px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'center',
              color: '#14532d',
            }}>
              ✅ 15 complimentary tickets generated successfully
            </div>
          )}

          {/* Tickets Display */}
          {(generated || existing.length > 0) && !loadingExisting && (
            <>
              {/* General Tickets */}
              <h3 style={{
                fontWeight: 700,
                marginBottom: '12px',
                fontSize: '1rem',
              }}>
                🎟️ General Tickets ({generalTickets.length})
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '24px',
              }}>
                {generalTickets.map((ticket, i) => (
                  <div
                    key={ticket.ticket_id}
                    style={{
                      background: 'white',
                      borderRadius: '20px',
                      padding: '16px',
                      border: '1px solid #f0f3f9',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#64748b',
                      letterSpacing: '1px',
                      marginBottom: '8px',
                    }}>
                      COMP #{i + 1}
                    </div>
                    {ticket.qr_image && (
                      <img
                        src={ticket.qr_image}
                        alt="QR"
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: '12px',
                        }}
                      />
                    )}
                    <div style={{
                      fontSize: '0.65rem',
                      fontFamily: 'monospace',
                      color: '#64748b',
                      marginTop: '8px',
                      wordBreak: 'break-all',
                    }}>
                      {ticket.qr_code}
                    </div>
                  </div>
                ))}
              </div>

              {/* VIP Tickets */}
              <h3 style={{
                fontWeight: 700,
                marginBottom: '12px',
                fontSize: '1rem',
              }}>
                ⭐ VIP Tickets ({vipTickets.length})
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '32px',
              }}>
                {vipTickets.map((ticket, i) => (
                  <div
                    key={ticket.ticket_id}
                    style={{
                      background: '#fefce8',
                      borderRadius: '20px',
                      padding: '16px',
                      border: '1px solid #fef08a',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#854d0e',
                      letterSpacing: '1px',
                      marginBottom: '8px',
                    }}>
                      VIP COMP #{i + 1}
                    </div>
                    {ticket.qr_image && (
                      <img
                        src={ticket.qr_image}
                        alt="QR"
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: '12px',
                        }}
                      />
                    )}
                    <div style={{
                      fontSize: '0.65rem',
                      fontFamily: 'monospace',
                      color: '#854d0e',
                      marginTop: '8px',
                      wordBreak: 'break-all',
                    }}>
                      {ticket.qr_code}
                    </div>
                  </div>
                ))}
              </div>

              {/* Print note */}
              <div style={{
                background: '#f0f4fe',
                borderRadius: '20px',
                padding: '16px',
                fontSize: '0.9rem',
                color: '#1e40af',
                marginBottom: '32px',
                textAlign: 'center',
              }}>
                📲 Screenshot or print these QR codes.
                Each code works once at any gate.
                All logged as complimentary in council records.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}