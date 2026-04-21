'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister() {
    setLoading(true)
    setError('')

    // Validate phone
    if (!phone.startsWith('0') || phone.length < 10) {
      setError('Enter a valid Malawi phone number e.g 0999 123 456')
      setLoading(false)
      return
    }

    // Create auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Create profile — role defaults to fan
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id:        data.user.id,
          email,
          full_name: fullName,
          phone,
          role:      'fan',
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      // Go buy their ticket
      const savedEvent = sessionStorage.getItem('buy_event_id')
      if (savedEvent) {
        router.push(`/ticket/buy?event=${savedEvent}`)
      } else {
        router.push('/home')
      }
    }
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
          Create Account
        </h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          Join EventCore Africa
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

        {/* Full Name */}
        <input
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
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

        {/* Phone */}
        <input
          type="tel"
          placeholder="Phone e.g 0999 123 456"
          value={phone}
          onChange={e => setPhone(e.target.value)}
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
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
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

        {/* Register Button */}
        <button
          onClick={handleRegister}
          disabled={loading || !fullName || !email || !phone || !password}
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
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        {/* Already have account */}
        <button
          onClick={() => router.push('/login')}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Already have an account? Sign in
        </button>
      </div>
    </div>
  )
}