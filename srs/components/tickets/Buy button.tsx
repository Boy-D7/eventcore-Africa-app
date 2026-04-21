'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/types'

export default function BuyButton({ event }: { event: Event }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleBuy() {
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Bible: compulsory login to buy
      // Save intended event to redirect back after login
      sessionStorage.setItem('buy_event_id', event.id)
      router.push('/login?next=/ticket/buy')
      return
    }

    // Logged in — go to purchase modal
    router.push(`/ticket/buy?event=${event.id}`)
  }

  const isSoldOut = event.tickets_sold >= event.total_capacity

  return (
    <button
      onClick={handleBuy}
      disabled={isSoldOut}
      style={{
        background: isSoldOut ? '#94a3b8' : 'white',
        color: isSoldOut ? 'white' : '#2563eb',
        border: 'none',
        padding: '12px 20px',
        borderRadius: '60px',
        fontWeight: 700,
        fontSize: '1rem',
        cursor: isSoldOut ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        transition: 'all 0.2s',
      }}
    >
      🎟️ {isSoldOut ? 'Sold Out' : 'Buy Now'}
    </button>
  )
}