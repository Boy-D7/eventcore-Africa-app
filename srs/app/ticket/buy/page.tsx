'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatMWK, formatDate } from '@/lib/utils'
import { generateQRCode } from '@/lib/utils'
import type { Event } from '@/types'

type Method = 'stk' | 'agent' | 'ussd'
type Step = 'select' | 'paying' | 'success'

export default function BuyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event')
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [ticketType, setTicketType] = useState<'general' | 'vip'>('general')
  const [method, setMethod] = useState<Method>('stk')
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<Step>('select')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ticketResult, setTicketResult] = useState<any>(null)
  const [qrImage, setQrImage] = useState('')

  useEffect(() => {
    if (!eventId) { router.push('/home'); return }

    supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (!data) { router.push('/home'); return }
        setEvent(data)
      })

    // Pre-fill phone from profile
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', data.user.id)
          .single()
        if (profile?.phone) setPhone(profile.phone)
      }
    })
  }, [eventId])

  async function handlePurchase() {
    if (!event) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const amount = ticketType === 'vip'
      ? event.vip_price
      : event.general_price

    // Call atomic RPC
    const { data, error: rpcError } = await supabase.rpc('purchase_ticket', {
      p_event_id:     event.id,
      p_user_id:      user.id,
      p_ticket_type:  ticketType,
      p_amount:       amount,
      p_phone_number: phone,
      p_provider:     method === 'ussd' ? 'tnm' : 'airtel',
      p_provider_ref: null,
    })

    if (rpcError || !data?.success) {
      setError(data?.error ?? rpcError?.message ?? 'Purchase failed')
      setLoading(false)
      return
    }

    // Generate QR code
    const qr = await generateQRCode(data.ticket_id)
    setQrImage(qr)
    setTicketResult(data)
    setStep('success')
    setLoading(false)
    sessionStorage.removeItem('buy_event_id')
  }

  if (!event) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#64748b',
    }}>
      Loading event...
    </div>
  )

  const amount = ticketType === 'vip' ? event.vip_price : event.general_price

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '36px',
        padding: '24px',
        width: '100%',
        maxWidth: '420px',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>

        {/* ── SUCCESS STATE ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
              Ticket Purchased!
            </h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              {event.title}
            </p>

            {/* QR Code */}
            {qrImage && (
              <div style={{
                background: '#f8fafd',
                borderRadius: '24px',
                padding: '24px',
                marginBottom: '16px',
              }}>
                <img
                  src={qrImage}
                  alt="Your ticket QR code"
                  style={{ width: '200px', height: '200px' }}
                />
                <div style={{
                  marginTop: '12px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  color: '#0b1b33',
                }}>
                  {ticketResult?.qr_code}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  marginTop: '4px',
                }}>
                  {ticketType.toUpperCase()} · {formatMWK(amount)}
                </div>
              </div>
            )}

            <div style={{
              background: '#e6f7e6',
              borderRadius: '24px',
              padding: '16px',
              marginBottom: '20px',
              fontSize: '0.9rem',
              color: '#0b5e0b',
            }}>
              ✅ Show this QR code at the gate
            </div>

            <button
              onClick={() => router.push('/home')}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '60px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Back to Events
            </button>
          </div>
        )}

        {/* ── SELECT STATE ── */}
        {step === 'select' && (
          <>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {event.title}
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  📍 {event.venue} · {formatDate(event.event_date)}
                </p>
              </div>
              <button
                onClick={() => router.back()}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.8rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Ticket Type */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
            }}>
              {['general', 'vip'].map(type => (
                <button
                  key={type}
                  onClick={() => setTicketType(type as 'general' | 'vip')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '16px',
                    border: '2px solid',
                    borderColor: ticketType === type ? '#2563eb' : '#e2e8f0',
                    background: ticketType === type ? '#eff6ff' : 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  {type === 'general' ? '🎟️ General' : '⭐ VIP'}
                  <br />
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>
                    {formatMWK(type === 'general' ? event.general_price : event.vip_price)}
                  </span>
                </button>
              ))}
            </div>

            {/* Payment Method — bible exact */}
            <div style={{
              display: 'flex',
              gap: '8px',
              margin: '16px 0',
              background: '#f1f5f9',
              padding: '6px',
              borderRadius: '60px',
            }}>
              {[
                { id: 'stk',   label: '📱 STK Push' },
                { id: 'agent', label: '🏢 Agent' },
                { id: 'ussd',  label: '📞 USSD' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id as Method)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px',
                    borderRadius: '40px',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    border: 'none',
                    background: method === m.id ? '#2563eb' : 'transparent',
                    color: method === m.id ? 'white' : '#64748b',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Phone Input */}
            {(method === 'stk' || method === 'ussd') && (
              <input
                type="tel"
                placeholder="Your phone e.g 0999 123 456"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="phone-input"
              />
            )}

            {/* Agent info */}
            {method === 'agent' && (
              <div style={{
                background: '#eef3ff',
                borderRadius: '20px',
                padding: '16px',
                margin: '16px 0',
                fontSize: '0.9rem',
                color: '#1e40af',
              }}>
                🏢 Visit any EventCore booth agent to purchase your ticket with cash or mobile money.
              </div>
            )}

            {/* USSD info */}
            {method === 'ussd' && (
              <div style={{
                background: '#1e293b',
                color: 'white',
                padding: '20px',
                borderRadius: '24px',
                textAlign: 'center',
                margin: '16px 0',
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  letterSpacing: '8px',
                }}>
                  *495#
                </div>
                <p style={{ marginTop: '8px', opacity: 0.8 }}>
                  Dial this code on your phone
                </p>
              </div>
            )}

            {/* Error */}
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

            {/* Summary */}
            <div style={{
              background: '#f8fafd',
              borderRadius: '20px',
              padding: '16px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ color: '#64748b' }}>Total to pay</span>
              <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#0b1b33' }}>
                {formatMWK(amount)}
              </span>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePurchase}
              disabled={loading || (method !== 'agent' && !phone)}
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
                ? 'Processing...'
                : method === 'stk'
                ? `💸 Pay ${formatMWK(amount)} via Airtel/TNM`
                : method === 'ussd'
                ? `📞 Confirm USSD Payment`
                : `🏢 Confirm Agent Purchase`
              }
            </button>
          </>
        )}
      </div>
    </div>
  )
}