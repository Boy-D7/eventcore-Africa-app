'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import SideMenu from '@/components/layout/SideMenu'

export default function NewEventPage() {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle]             = useState('')
  const [venue, setVenue]             = useState('Dedza Stadium')
  const [eventDate, setEventDate]     = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl]       = useState('')
  const [generalPrice, setGeneralPrice] = useState('')
  const [vipPrice, setVipPrice]       = useState('')
  const [totalCapacity, setTotalCapacity] = useState('')
  const [vipCapacity, setVipCapacity] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  async function handleCreate() {
    setLoading(true)
    setError('')

    // Verify super_admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      setError('Only Super Admin can create events')
      setLoading(false)
      return
    }

    // Validate
    if (!title || !venue || !eventDate ||
        !generalPrice || !vipPrice ||
        !totalCapacity || !vipCapacity) {
      setError('All fields are required')
      setLoading(false)
      return
    }

    if (parseInt(vipCapacity) >= parseInt(totalCapacity)) {
      setError('VIP capacity must be less than total capacity')
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from('events')
      .insert({
        title,
        venue,
        event_date:     eventDate,
        description,
        image_url:      imageUrl,
        general_price:  parseInt(generalPrice),
        vip_price:      parseInt(vipPrice),
        total_capacity: parseInt(totalCapacity),
        vip_capacity:   parseInt(vipCapacity),
        status:         'draft',
        created_by:     user.id,
      })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    router.push('/admin/events')
  }

  return (
    <>
      <SideMenu />
      <div className="app-shell">
        <Header />

        <div style={{ padding: '16px' }}>
          {/* Title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '16px 0 24px',
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
              Create Event
            </h2>
          </div>

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

          {/* Form */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>

            {/* Event Title */}
            <div>
              <label style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                display: 'block',
                marginBottom: '6px',
              }}>
                Event Title
              </label>
              <input
                type="text"
                placeholder="e.g Dynamos vs Silver Strikers"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '60px',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>

            {/* Venue */}
            <div>
              <label style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                display: 'block',
                marginBottom: '6px',
              }}>
                Venue
              </label>
              <input
                type="text"
                placeholder="e.g Dedza Stadium"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '60px',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>

            {/* Event Date */}
            <div>
              <label style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                display: 'block',
                marginBottom: '6px',
              }}>
                Event Date & Time
              </label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '60px',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                display: 'block',
                marginBottom: '6px',
              }}>
                Description
              </label>
              <textarea
                placeholder="Event details..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '24px',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  resize: 'none',
                }}
              />
            </div>

            {/* Image URL */}
            <div>
              <label style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#64748b',
                display: 'block',
                marginBottom: '6px',
              }}>
                Event Image URL
              </label>
              <input
                type="url"
                placeholder="https://images.pexels.com/..."
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: '60px',
                  border: '1px solid #e2e8f0',
                  fontSize: '1rem',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
              {/* Image preview */}
              {imageUrl && (
                <div style={{
                  marginTop: '12px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  height: '140px',
                }}>
                  <img
                    src={imageUrl}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Prices */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#64748b',
                  display: 'block',
                  marginBottom: '6px',
                }}>
                  General Price (MWK)
                </label>
                <input
                  type="number"
                  placeholder="3500"
                  value={generalPrice}
                  onChange={e => setGeneralPrice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '60px',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#64748b',
                  display: 'block',
                  marginBottom: '6px',
                }}>
                  VIP Price (MWK)
                </label>
                <input
                  type="number"
                  placeholder="7000"
                  value={vipPrice}
                  onChange={e => setVipPrice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '60px',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>
            </div>

            {/* Capacity */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#64748b',
                  display: 'block',
                  marginBottom: '6px',
                }}>
                  Total Capacity
                </label>
                <input
                  type="number"
                  placeholder="15000"
                  value={totalCapacity}
                  onChange={e => setTotalCapacity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '60px',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#64748b',
                  display: 'block',
                  marginBottom: '6px',
                }}>
                  VIP Capacity
                </label>
                <input
                  type="number"
                  placeholder="500"
                  value={vipCapacity}
                  onChange={e => setVipCapacity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '60px',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={loading}
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
                marginTop: '8px',
              }}
            >
              {loading ? 'Creating...' : '➕ Create Event'}
            </button>

            {/* Save as draft note */}
            <p style={{
              textAlign: 'center',
              fontSize: '0.85rem',
              color: '#64748b',
            }}>
              Event saved as draft. Activate it from Manage Events.
            </p>
          </div>
        </div>
      </div>