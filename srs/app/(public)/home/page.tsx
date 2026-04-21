import { createClient } from '@/lib/supabase/server'
import { formatMWK, getCountdown, formatDate } from '@/lib/utils'
import BuyButton from '@/components/tickets/BuyButton'
import SideMenu from '@/components/layout/SideMenu'
import Header from '@/components/layout/Header'

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch all active events — no static data
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .order('event_date', { ascending: true })

  // Featured event is the next upcoming one
  const featured = events?.[0] ?? null

  return (
    <>
      <SideMenu />
      <div className="app-shell">
        <Header />

        {/* ── Featured Banner (bible exact) ── */}
        {featured && (
          <div
            className="featured-banner"
            style={{
              margin: '16px 16px 8px',
              padding: '24px 20px',
              borderRadius: '32px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 30px -8px rgba(0,0,0,0.3)',
              backgroundImage: `url('${featured.image_url}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: 'white',
              minHeight: '200px',
            }}
          >
            {/* Dark overlay */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, rgba(15,43,94,0.85) 0%, rgba(26,74,158,0.7) 100%)',
              zIndex: 1,
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <div style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                opacity: 0.9,
                marginBottom: '8px',
              }}>
                Next Event · {featured.venue}
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: 800,
                lineHeight: 1.2,
                marginBottom: '12px',
              }}>
                {featured.title}
              </div>
              <div style={{
                display: 'flex',
                gap: '20px',
                fontWeight: 500,
                marginBottom: '20px',
              }}>
                <span>📅 {formatDate(featured.event_date)}</span>
              </div>
              <div>
                <span style={{
                  background: 'rgba(255,255,255,0.15)',
                  padding: '8px 16px',
                  borderRadius: '40px',
                  fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                  marginRight: '12px',
                }}>
                  ⏳ {getCountdown(featured.event_date)}
                </span>
                <BuyButton event={featured} />
              </div>
            </div>
          </div>
        )}

        {/* ── Events List ── */}
        <div style={{ padding: '8px 16px 32px' }}>
          <div style={{
            background: '#eef3ff',
            borderRadius: '40px',
            padding: '8px 16px',
            fontSize: '0.8rem',
            color: '#1e40af',
            display: 'inline-block',
            margin: '8px 0 16px',
          }}>
            📍 Dedza Stadium · Churches · Weddings · Concerts
          </div>

          <h2 className="section-title">Upcoming Events</h2>

          {events?.map(event => (
            <div
              key={event.id}
              className="event-card"
              style={{ backgroundImage: `url('${event.image_url}')` }}
            >
              <div className="event-card-content">
                <span className="event-badge">{event.venue}</span>
                <h4 style={{
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  marginBottom: '4px',
                }}>
                  {event.title}
                </h4>
                <p style={{
                  opacity: 0.9,
                  marginBottom: '12px',
                  display: 'flex',
                  gap: '12px',
                }}>
                  <span>📅 {formatDate(event.event_date)}</span>
                  <span>🎟️ {event.tickets_sold} sold</span>
                </p>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700 }}>
                    From {formatMWK(event.general_price)}
                  </span>
                  <BuyButton event={event} />
                </div>
              </div>
            </div>
          ))}

          {(!events || events.length === 0) && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#64748b',
            }}>
              No upcoming events. Check back soon.
            </div>
          )}
        </div>

        {/* ── Social Footer ── */}
        <footer style={{
          marginTop: 'auto',
          padding: '24px 16px 16px',
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          borderTop: '1px solid #eef2f6',
          color: '#64748b',
        }}>
          <a href="#">f</a>
          <a href="#">𝕏</a>
          <a href="#">ig</a>
          <a href="#">in</a>
        </footer>
      </div>
    </>
  )
}