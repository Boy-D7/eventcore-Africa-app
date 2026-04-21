'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  return (
    <header style={{
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #f0f3f9',
    }}>
      {/* Hamburger */}
      <button
        onClick={() => document.getElementById('side-menu')?.classList.add('active')}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '1.8rem',
          cursor: 'pointer',
          color: '#1e293b',
        }}
      >
        ☰
      </button>

      {/* Logo — bible exact */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{
          fontWeight: 800,
          fontSize: '1.4rem',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          EVENTCORE
        </span>
        <span style={{
          fontSize: '0.6rem',
          fontWeight: 600,
          letterSpacing: '3px',
          color: '#2563eb',
        }}>
          AFRICA LIMITED
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '1.2rem' }}>🔔</span>
        {user ? (
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/home')
              router.refresh()
            }}
            style={{
              background: 'transparent',
              border: '1px solid #cbd5e1',
              padding: '8px 16px',
              borderRadius: '40px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        ) : (
          <button
            onClick={() => router.push('/login')}
            style={{
              background: 'transparent',
              border: '1px solid #cbd5e1',
              padding: '8px 16px',
              borderRadius: '40px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  )
}