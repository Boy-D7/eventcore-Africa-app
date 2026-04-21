from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatMWK, formatDate } from '@/lib/utils'
import SideMenu from '@/components/layout/SideMenu'
import Header from '@/components/layout/Header'
import type { Event } from '@/types'

type Step = 'select' | 'paying' | 'success'

export default function AgentSellPage() {
  const supabase = createClient()

  const [agent, setAgent]           = useState<any>(null)
  const [events, setEvents]         = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [ticketType, setTicketType] = useState<'general' | 'vip'>('general')
  const [phone, setPhone]           = useState('')
  const [step, setStep]             = useState<Step>('select')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [result, setResult]         = useState<any>(null)
  const [salesHistory, setSalesHistory] = useState<any[]>([])

  useEffect(() => {
    // Get agent profile
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      setAgent(profile)
    })

    // Fetch active events
    supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .order('event_date', { ascending: true })
      .then(({ data }) => {
        setEvents(data ?? [])
        if (data && data.length > 0) setSelectedEvent(data[0])
      })

    // Fetch today's sales by this agent
    loadSalesHistory()
  }, [])

  async function loadSalesHistory() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('transactions')
      .select(`
        *,
        ticket:tickets(ticket_type, qr_code, status)
      `)
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })

    setSalesHistory(data ?? [])
  }

  async function handleSell() {
    if (!selectedEvent) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (!phone.startsWith('0') || phone.length < 10) {
      setError('Enter a valid Malawi phone number')
      setLoading(false)
      return
    }

    const amount = ticketType === 'vip'
      ? selectedEvent.vip_price
      : selectedEvent.general_price

    // Atomic purchase via RPC
    const { data, error: rpcError } = await supabase.rpc('purchase_ticket', {
      p_event_id:     selectedEvent.id,
      p_user_id:      user.id,
      p_ticket_type:  ticketType,
      p_amount:       amount,
      p_phone_number: phone,
      p_provider:     'cash',
      p_provider_ref: `AGENT-${agent?.full_name}`,
    })

    if (rpcError || !data?.success) {
      setError(data?.error ?? 'Sale failed. Try again.')
      setLoading(false)
      return
    }

    setResult(data)
    setStep('success')
    setLoading(false)
    loadSalesHistory()
  }

  function resetSale() {
    setStep('select')
    setPhone('')
    setResult(null)
    setError('')
  }

  // Today's revenue
  const todayRevenue = salesHistory.reduce((sum, t) => sum + t.amount, 0)

  return (
    <>
      <SideMenu />
      <div className="app-shell">
        <Header />

        <div style={{ padding: '16px' }}>
          <h2 className="section-title">
            🏪 Booth Agent
          </h2>

          {/* Agent info */}
          {agent && (
            <div style={{
              background: '#f0f4fe',
              borderRadius: '20px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: 700 }}>{agent.full_name}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  📱 {agent.phone}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Today's sales
                </div>
                <div style={{ fontWeight: 800, color: '#2563eb' }}>
                  {formatMWK(todayRevenue)}
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && result && (
            <div style={{
              background: '#e6f7e6',
              borderRadius: '24px',
              padding: '24px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
                ✅
              </div>
              <h3 style={{ fontWeight: 700, marginBottom: '8px' }}>
                Ticket Issued!
              </h3>
              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '16px',
                margin: '16px 0',
              }}>
                <div style={{
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  letterSpacing: '2px',
                  color: '#0b1b33',
                }}>
                  {result.qr_code}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#64748b',
                  marginTop: '4px',
                }}>
                  {ticketType.toUpperCase()} ·{' '}
                  {formatMWK(
                    ticketType === 'vip'
                      ? selectedEvent!.vip_price
                      : selectedEvent!.general_price
                  )}
                </div>
              </div>
              <div style={{
                fontSize: '0.9rem',
                color: '#0b5e0b',
                marginBottom: '16px',
              }}>
                Give ticket code to customer.
                They can view QR in the app.
              </div>
              <button
                onClick={resetSale}
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
                Sell Another Ticket
              </button>
            </div>
          )}

          {/* Sell Form */}
          {step === 'select' && (
            <div style={{
              background: '#f8fafd',
              borderRadius: '28px',
              padding: '24px',
              marginBottom: '20px',
            }}>
              {/* Event selector */}
              <label style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                display: 'block',
                marginBottom: '8px',
              }}>
                Select Event
              </label>
              <select
                value={selectedEvent?.id ?? ''}
                onChange={e => {
                  const ev = events.find(ev => ev.id === e.target.value)
                  setSelectedEvent(ev ?? null)
                }}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '60px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '16px',
                  fontSize: '1rem',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  background: 'white',
                }}
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} · {formatDate(ev.event_date)}
                  </option>
                ))}
              </select>

              {/* Active event info */}
              {selectedEvent && (
                <div style={{
                  background: '#eef3ff',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  fontSize: '0.9rem',
                }}>
                  <div style={{ fontWeight: 700 }}>
                    {selectedEvent.title}
                  </div>
                  <div style={{ color: '#64748b' }}>
                    🎟️ General: {formatMWK(selectedEvent.general_price)}
                    &nbsp;·&nbsp;
                    ⭐ VIP: {formatMWK(selectedEvent.vip_price)}
                  </div>
                </div>
              )}

              {/* Ticket Type */}
              <label style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                display: 'block',
                marginBottom: '8px',
              }}>
                Ticket Type
              </label>
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
              }}>
                {(['general', 'vip'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setTicketType(type)}
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
                      {formatMWK(
                        type === 'general'
                          ? selectedEvent?.general_price ?? 0
                          : selectedEvent?.vip_price ?? 0
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {/* Customer Phone */}
              <label style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                display: 'block',
                marginBottom: '4px',
              }}>
                Customer Phone Number
              </label>
              <input
                type="tel"
                placeholder="0999 123 456"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="phone-input"
              />

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
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'white',
                borderRadius: '16px',
                marginBottom: '16px',
              }}>
                <span style={{ color: '#64748b' }}>Amount</span>
                <span style={{ fontWeight: 800, fontSize: '1.3rem' }}>
                  {formatMWK(
                    ticketType === 'vip'
                      ? selectedEvent?.vip_price ?? 0
                      : selectedEvent?.general_price ?? 0
                  )}
                </span>
              </div>

              {/* STK Push Button */}
              <button
                onClick={handleSell}
                disabled={loading || !phone || !selectedEvent}
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
                {loading ? 'Processing...' : '💸 Issue Ticket'}
              </button>
            </div>
          )}

          {/* Today's Sales History */}
          <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>
            Today's Sales
          </h3>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            border: '1px solid #f0f3f9',
            overflow: 'hidden',
          }}>
            {salesHistory.length > 0 ? (
              salesHistory.map((sale: any) => (
                <div key={sale.id} style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #f0f3f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <span style={{ marginRight: '8px' }}>
                      {sale.ticket?.ticket_type === 'vip' ? '⭐' : '🎟️'}
                    </span>
                    <span style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                    }}>
                      {sale.ticket?.qr_code}
                    </span>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#64748b',
                      marginTop: '2px',
                    }}>
                      📱 {sale.phone_number}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>
                      {formatMWK(sale.amount)}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                    }}>
                      {sale.provider.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#64748b',
              }}>
                No sales yet today
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}