'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/home'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Get role and redirect
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    const role = profile?.role ?? 'fan'

    if (role === 'admin') router.push('/admin/dashboard')
    else if (role === 'agent') router.push('/agent/sell')
    else if (role === 'gate_staff') router.push('/scanner')
    else router.push(next)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f4f6fb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Modal — bible exact */}
      <div style={{
        background: 'white',
        borderRadius: '36px',
        padding: '32px 24px',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            fontWeight: 800,
            fontSize: '1.6rem',
            letterSpacing: '-0.02em',
          }}>
            EVENTCORE
          </div>
          <div style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '3px',
            color: '#2563eb',
          }}>
            AFRICA LIMITED
          </div>
        </div>

        <h2 style={{
          fontSize: '1.8rem',
          fontWeight: 700,
          margin: '16px 0 8px',
        }}>
          Welcome Back
        </h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Sign in to buy tickets
        </p>

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

        {/* Email */}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '60px',
            border: '1px solid #e2e8f0',
            marginBottom: '12px',
            fontSize: '1rem',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: '60px',
            border: '1px solid #e2e8f0',
            marginBottom: '16px',
            fontSize: '1rem',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        />

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '60px',
            background: loading ? '#94a3b8' : '#2563eb',
            color: 'white',
            border: 'none',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '16px',
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          color: '#94a3b8',
          margin: '20px 0',
        }}>
          <div style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }} />
          <span style={{ margin: '0 12px', fontSize: '0.8rem' }}>or</span>
          <div style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }} />
        </div>

        {/* Register */}
        <button
          onClick={() => router.push('/register')}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '60px',
            background: 'transparent',
            color: '#2563eb',
            border: '1px solid #2563eb',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          Create Account
        </button>

        {/* Back */}
        <button
          onClick={() => router.push('/home')}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Browse events without signing in
        </button>
      </div>
    </div>
  )
}