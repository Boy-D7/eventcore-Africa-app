import { createClient } from '@/lib/supabase/server'
import { formatMWK, formatDate, formatTime } from '@/lib/utils'
import { redirect } from 'next/navigation'
import SideMenu from '@/components/layout/SideMenu'
import Header from '@/components/layout/Header'

export const revalidate = 30

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  // Only admin and super_admin allowed
  if (!['admin', 'super_admin'].includes(profile?.role ?? '')) {
    redirect('/home')
  }

  const isSuperAdmin = profile?.role === 'super_admin'

  // Fetch active event
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .order('event_date', { ascending: true })
    .limit(1)

  const event = events?.[0] ?? null

  // Live stats
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('event_id', event?.id ?? '')

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('event_id', event?.id ?? '')
    .eq('status', 'completed')

  const { data: scanLogs } = await supabase
    .from('scan_logs')
    .select(`
      *,
      ticket:tickets(ticket_type, qr_code)
    `)
    .order('scanned_at', { ascending: false })
    .limit(10)

  const { count: duplicateCount } = await supabase
    .from('scan_logs')
    .select('id', { count: 'exact' })
    .eq('result', 'duplicate')

  // Stats
  const totalSold    = tickets?.length ?? 0
  const totalScanned = tickets?.filter(t => t.status === 'scanned').length ?? 0
  const totalRevenue = transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0
  const vipSold      = tickets?.filter(t => t.ticket_type === 'vip').length ?? 0
  const generalSold  = tickets?.filter(t => t.ticket_type === 'general').length ?? 0
  const compTickets  = tickets?.filter(t => t.amount_paid === 0).length ?? 0

  return (
    <>
      <SideMenu />
      <div className="app-shell">
        <Header />

        <div style={{ padding: '16px' }}>

          {/* Title + role badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '16px 0',
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}>
              Dashboard
            </h2>
            <span style={{
              background: isSuperAdmin ? '#0b1b33' : '#2563eb',
              color: 'white',
              padding: '4px 14px',
              borderRadius: '40px',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '1px',
            }}>
              {isSuperAdmin ? '⚡ SUPER ADMIN' : '🏛️ ADMIN'}
            </span>
          </div>

          <div style={{
            fontSize: '0.9rem',
            color: '#64748b',
            marginBottom: '20px',
          }}>
            👤 {profile?.full_name}
          </div>

          {/* Active Event */}
          {event ? (
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
                ACTIVE EVENT
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {event.title}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                📅 {formatDate(event.event_date)} · 📍 {event.venue}
              </p>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                Capacity: {event.total_capacity.toLocaleString()}
              </p>
            </div>
          ) : (
            <div style={{
              background: '#fef9c3',
              borderRadius: '20px',
              padding: '16px',
              marginBottom: '20px',
              color: '#854d0e',
            }}>
              ⚠️ No active event
              {isSuperAdmin && (
                <a href="/admin/events/new">
                  <button style={{
                    marginLeft: '12px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: '40px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}>
                    + Create Event
                  </button>
                </a>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <div className="stat-grid">
            <div className="stat-item">
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Tickets Sold
              </span>
              <br />
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>
                {totalSold.toLocaleString()}
              </span>
            </div>
            <div className="stat-item">
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Revenue
              </span>
              <br />
              <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                {formatMWK(totalRevenue)}
              </span>
            </div>
            <div className="stat-item">
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Entries
              </span>
              <br />
              <span style={{ fontSize: '2rem', fontWeight: 800 }}>
                {totalScanned.toLocaleString()}
              </span>
            </div>
            <div className="stat-item">
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Duplicates
              </span>
              <br />
              <span style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: (duplicateCount ?? 0) > 0 ? '#dc2626' : '#0b1b33',
              }}>
                {duplicateCount ?? 0}
              </span>
            </div>
          </div>

          {/* Ticket Breakdown */}
          <div style={{
            background: '#f8fafd',
            borderRadius: '20px',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>
              Ticket Breakdown
            </h3>
            {[
              { label: '🎟️ General',       value: generalSold },
              { label: '⭐ VIP',            value: vipSold },
              { label: '🎁 Complimentary', value: compTickets },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #f0f3f9',
              }}>
                <span style={{ color: '#64748b' }}>{row.label}</span>
                <span style={{ fontWeight: 700 }}>{row.value.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Recent Scans */}
          <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>
            Recent Gate Entries
          </h3>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            border: '1px solid #f0f3f9',
            overflow: 'hidden',
            marginBottom: '24px',
          }}>
            {scanLogs && scanLogs.length > 0 ? (
              scanLogs.map((log: any) => (
                <div key={log.id} style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #f0f3f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <span style={{ marginRight: '8px' }}>
                      {log.result === 'valid'
                        ? '✅'
                        : log.result === 'duplicate'
                        ? '⚠️'
                        : '❌'}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {log.ticket?.qr_code ?? 'Unknown'}
                    </span>
                    <span style={{
                      marginLeft: '8px',
                      fontSize: '0.8rem',
                      color: '#64748b',
                    }}>
                      Gate {log.gate}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {formatTime(log.scanned_at)}
                  </span>
                </div>
              ))
            ) : (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#64748b',
              }}>
                No entries yet
              </div>
            )}
          </div>

          {/* Quick Actions — Super Admin only */}
          {isSuperAdmin && (
            <>
              <h3 style={{ fontWeight: 700, marginBottom: '12px' }}>
                Super Admin Actions
              </h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '32px',
              }}>
                {[
                  { label: '➕ Create New Event', href: '/admin/events/new', primary: true },
                  { label: '📅 Manage Events',    href: '/admin/events',     primary: false },
                  { label: '💳 All Transactions', href: '/admin/transactions', primary: false },
                  { label: '👥 Manage Users',     href: '/admin/users',      primary: false },
                  { label: '🎁 Complimentary Tickets', href: '/admin/complimentary', primary: false },
                ].map(action => (
                  <a key={action.href} href={action.href}>
                    <button style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '60px',
                      background: action.primary ? '#2563eb' : '#f1f5f9',
                      color: action.primary ? 'white' : '#0b1b33',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '1rem',
                      cursor: 'pointer',
                    }}>
                      {action.label}
                    </button>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}