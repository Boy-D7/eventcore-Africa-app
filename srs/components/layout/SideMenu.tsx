'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { Profile } from '@/types'

export default function SideMenu() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        setProfile(p)
      }
    })
  }, [])

  function close() {
    document.getElementById('side-menu')?.classList.remove('active')
    document.getElementById('menu-overlay')?.classList.remove('active')
  }

  function navigate(path: string) {
    close()
    router.push(path)
  }

  // Menu items based on role — bible exact
  const menuItems = [
    { label: 'Home',          icon: '🏠', path: '/home',             roles: ['fan','agent','gate_staff','admin', null] },
    { label: 'My Tickets',    icon: '🎟️', path: '/tickets',          roles: ['fan'] },
    { label: 'All Events',    icon: '📅', path: '/events',           roles: ['fan','agent','admin'] },
    { label: 'Booth Agent',   icon: '🏪', path: '/agent/sell',       roles: ['agent'] },
    { label: 'Gate Scanner',  icon: '📷', path: '/scanner',          roles: ['gate_staff'] },
    { label: 'Admin Dashboard',icon: '📊',path: '/admin/dashboard',  roles: ['admin'] },
  ]

  const visibleItems = menuItems.filter(item =>
    item.roles.includes(profile?.role ?? null)
  )

  return (
    <>
      {/* Overlay */}
      <div
        id="menu-overlay"
        onClick={close}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          zIndex: 1000,
          opacity: 0,
          visibility: 'hidden',
          transition: 'all 0.3s',
        }}
      />

      {/* Side Menu — bible exact */}
      <nav
        id="side-menu"
        style={{
          position: 'fixed',
          top: 0, left: '-280px',
          width: '280px', height: '100%',
          background: '#ffffff',
          boxShadow: '8px 0 30px rgba(0,0,0,0.08)',
          zIndex: 1001,
          transition: 'left 0.3s',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Menu Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
              EVENTCORE
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '2px', color: '#2563eb' }}>
              AFRICA LIMITED
            </span>
          </div>
          <button
            onClick={close}
            style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: '#5b6c85' }}
          >
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <ul style={{ listStyle: 'none', flex: 1 }}>
          {visibleItems.map(item => (
            <li key={item.path} style={{ marginBottom: '12px' }}>
              <button
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  fontWeight: 600,
                  color: '#1e293b',
                  background: 'none',
                  border: 'none',
                  width: '100%',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#2563eb'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'white'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'none'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#1e293b'
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* User info at bottom */}
        {profile && (
          <div style={{
            padding: '16px 0',
            fontSize: '0.85rem',
            color: '#8696a8',
            borderTop: '1px solid #f0f3f9',
          }}>
            👤 {profile.full_name} · {profile.role}
          </div>
        )}
      </nav>

      {/* CSS for active states */}
      <style>{`
        #side-menu.active { left: 0 !important; }
        #menu-overlay.active { opacity: 1 !important; visibility: visible !important; }
      `}</style>
    </>
  )
}