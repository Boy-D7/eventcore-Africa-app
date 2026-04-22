'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import SideMenu from '@/components/layout/SideMenu'
import type { Profile } from '@/types'

export default function ManageUsersPage() {
  const router = useRouter()
  const supabase = createClient()

  const [users, setUsers]         = useState<Profile[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [newRole, setNewRole]     = useState('')
  const [newGate, setNewGate]     = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  useEffect(() => {
    init()
  }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      router.push('/admin/dashboard')
      return
    }

    loadUsers()
  }

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data ?? [])
    setLoading(false)
  }

  async function updateUser() {
    if (!editingUser) return
    setActionLoading(true)
    setError('')
    setSuccess('')

    const updates: any = { role: newRole }

    // Gate only applies to gate_staff
    if (newRole === 'gate_staff') {
      if (!newGate) {
        setError('Gate is required for gate staff')
        setActionLoading(false)
        return
      }
      updates.gate = newGate
    } else {
      updates.gate = null
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', editingUser.id)

    if (updateError) {
      setError(updateError.message)
      setActionLoading(false)
      return
    }

    setSuccess(`${editingUser.full_name} updated successfully`)
    setEditingUser(null)
    setActionLoading(false)
    loadUsers()
  }

  async function registerDevice(userId: string, gate: string) {
    const deviceName = prompt('Enter device name e.g "Gate A Scanner"')
    if (!deviceName) return

    const deviceId = prompt('Enter device ID (from device settings)')
    if (!deviceId) return

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('approved_devices')
      .insert({
        device_name:   deviceName,
        device_id:     deviceId,
        gate,
        assigned_to:   userId,
        registered_by: user!.id,
        is_active:     true,
      })

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert(`Device "${deviceName}" registered for Gate ${gate}`)
    }
  }

  // Filter users
  const filtered = users.filter(u => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search)

    const matchRole = filterRole === 'all' || u.role === filterRole

    return matchSearch && matchRole
  })

  const roleColor: Record<string, string> = {
    fan:         '#64748b',
    agent:       '#f59e0b',
    gate_staff:  '#2563eb',
    admin:       '#8b5cf6',
    super_admin: '#0b1b33',
  }

  const roleBg: Record<string, string> = {
    fan:         '#f1f5f9',
    agent:       '#fef9c3',
    gate_staff:  '#eff6ff',
    admin:       '#f5f3ff',
    super_admin: '#f0f4fe',
  }

  return (
    <>
      <SideMenu />
      <div className="app-shell">
        <Header />

        <div style={{ padding: '16px' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '16px 0 20px',
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
              Manage Users
            </h2>
          </div>

          {/* Success */}
          {success && (
            <div style={{
              background: '#dcfce7',
              color: '#14532d',
              padding: '12px 16px',
              borderRadius: '16px',
              marginBottom: '16px',
              fontSize: '0.9rem',
            }}>
              ✅ {success}
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '60px',
              border: '1px solid #e2e8f0',
              fontSize: '1rem',
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
              marginBottom: '12px',
            }}
          />

          {/* Role Filter */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '20px',
          }}>
            {['all','fan','agent','gate_staff','admin','super_admin'].map(role => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '40px',
                  border: 'none',
                  background: filterRole === role ? '#2563eb' : '#f1f5f9',
                  color: filterRole === role ? 'white' : '#64748b',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {role === 'all' ? 'All' : role.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            overflowX: 'auto',
          }}>
            {[
              { label: 'Total',      value: users.length },
              { label: 'Fans',       value: users.filter(u => u.role === 'fan').length },
              { label: 'Agents',     value: users.filter(u => u.role === 'agent').length },
              { label: 'Gate Staff', value: users.filter(u => u.role === 'gate_staff').length },
              { label: 'Admins',     value: users.filter(u => u.role === 'admin').length },
            ].map(stat => (
              <div key={stat.label} style={{
                background: '#f8fafd',
                borderRadius: '16px',
                padding: '12px 16px',
                textAlign: 'center',
                minWidth: '80px',
              }}>
                <div style={{ fontWeight: 800, fontSize: '1.3rem' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#64748b',
            }}>
              Loading users...
            </div>
          )}

          {/* Users List */}
          {filtered.map(user => (
            <div
              key={user.id}
              style={{
                background: 'white',
                borderRadius: '20px',
                border: '1px solid #f0f3f9',
                padding: '16px',
                marginBottom: '12px',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px',
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                    {user.full_name}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    marginTop: '2px',
                  }}>
                    {user.email}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                  }}>
                    📱 {user.phone}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                  <span style={{
                    background: roleBg[user.role],
                    color: roleColor[user.role],
                    padding: '4px 12px',
                    borderRadius: '40px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}>
                    {user.role.replace('_', ' ')}
                  </span>
                  {user.role === 'gate_staff' && (user as any).gate && (
                    <span style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      padding: '4px 12px',
                      borderRadius: '40px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}>
                      Gate {(user as any).gate}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={() => {
                    setEditingUser(user)
                    setNewRole(user.role)
                    setNewGate((user as any).gate ?? '')
                    setError('')
                    setSuccess('')
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '40px',
                    background: '#f0f4fe',
                    color: '#2563eb',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  ✏️ Edit Role
                </button>

                {user.role === 'gate_staff' && (user as any).gate && (
                  <button
                    onClick={() => registerDevice(user.id, (user as any).gate)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '40px',
                      background: '#f0fdf4',
                      color: '#16a34a',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    📱 Add Device
                  </button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#64748b',
            }}>
              No users found
            </div>
          )}
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(5px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '36px 36px 0 0',
            padding: '32px 24px',
            width: '100%',
            maxWidth: '480px',
          }}>
            <h3 style={{
              fontWeight: 700,
              fontSize: '1.2rem',
              marginBottom: '4px',
            }}>
              Edit User Role
            </h3>
            <p style={{
              color: '#64748b',
              marginBottom: '24px',
              fontSize: '0.9rem',
            }}>
              {editingUser.full_name}
            </p>

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

            {/* Role Select */}
            <label style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#64748b',
              display: 'block',
              marginBottom: '6px',
            }}>
              Role
            </label>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '60px',
                border: '1px solid #e2e8f0',
                fontSize: '1rem',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
                marginBottom: '16px',
                background: 'white',
              }}
            >
              <option value="fan">Fan</option>
              <option value="agent">Booth Agent</option>
              <option value="gate_staff">Gate Staff</option>
              <option value="admin">Admin (Council/Club)</option>
              <option value="super_admin">Super Admin</option>
            </select>

            {/* Gate — only for gate_staff */}
            {newRole === 'gate_staff' && (
              <>
                <label style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#64748b',
                  display: 'block',
                  marginBottom: '6px',
                }}>
                  Assign Gate
                </label>
                <select
                  value={newGate}
                  onChange={e => setNewGate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: '60px',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem',
                    outline: 'none',
                    fontFamily: 'Inter, sans-serif',
                    marginBottom: '16px',
                    background: 'white',
                  }}
                >
                  <option value="">Select Gate</option>
                  <option value="A">Gate A</option>
                  <option value="B">Gate B</option>
                  <option value="C">Gate C</option>
                  <option value="D">Gate D</option>
                  <option value="E">Gate E</option>
                </select>
              </>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setEditingUser(null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '60px',
                  background: '#f1f5f9',
                  color: '#0b1b33',
                  border: 'none',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={updateUser}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '60px',
                  background: actionLoading ? '#94a3b8' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  fontWeight: 700,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}