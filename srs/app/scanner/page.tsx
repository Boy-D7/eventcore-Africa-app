'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils'

type ScanResult = {
  id:          string
  qr_code:     string
  result:      'valid' | 'duplicate' | 'invalid'
  message:     string
  ticket_type?: string
  event?:       string
  scanned_at:  string
  is_comp?:    boolean
  offline?:    boolean
}

export default function ScannerPage() {
  const supabase = createClient()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [profile, setProfile]       = useState<any>(null)
  const [device, setDevice]         = useState<any>(null)
  const [deviceError, setDeviceError] = useState('')
  const [scanning, setScanning]     = useState(false)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [sessionLog, setSessionLog] = useState<ScanResult[]>([])
  const [isOnline, setIsOnline]     = useState(true)
  const [offlineQueue, setOfflineQueue] = useState<any[]>([])
  const scanningRef = useRef(false)

  useEffect(() => {
    // Network status
    setIsOnline(navigator.onLine)
    window.addEventListener('online',  () => setIsOnline(true))
    window.addEventListener('offline', () => setIsOnline(false))

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }

    // Load offline queue from IndexedDB
    loadOfflineQueue()

    // Get profile + verify device
    initScanner()

    return () => {
      stopCamera()
    }
  }, [])

  // Sync offline scans when back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineScans()
    }
  }, [isOnline])

  async function initScanner() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(prof)

    // Generate device fingerprint
    const deviceId = await getDeviceFingerprint()

    // Verify device
    const { data } = await supabase.rpc('verify_device', {
      p_device_id: deviceId,
      p_user_id:   user.id,
    })

    if (!data?.approved) {
      setDeviceError(data?.error ?? 'Device not authorized')
      return
    }

    setDevice(data)
  }

  async function getDeviceFingerprint(): Promise<string> {
    // Generate consistent device ID from browser properties
    const nav = window.navigator
    const raw = [
      nav.userAgent,
      nav.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
    ].join('|')

    const buffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(raw)
    )

    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32)
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // rear camera
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setScanning(true)
        scanningRef.current = true
        requestAnimationFrame(scanFrame)
      }
    } catch {
      alert('Camera access denied. Please allow camera.')
    }
  }

  function stopCamera() {
    scanningRef.current = false
    setScanning(false)
    const video = videoRef.current
    if (video?.srcObject) {
      const tracks = (video.srcObject as MediaStream).getTracks()
      tracks.forEach(t => t.stop())
      video.srcObject = null
    }
  }

  async function scanFrame() {
    if (!scanningRef.current) return

    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== 4) {
      requestAnimationFrame(scanFrame)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    // Use BarcodeDetector API (supported on Android Chrome)
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['qr_code']
        })
        const codes = await detector.detect(canvas)
        if (codes.length > 0) {
          const qrValue = codes[0].rawValue
          stopCamera()
          await processQR(qrValue)
          return
        }
      } catch {}
    }

    requestAnimationFrame(scanFrame)
  }

  async function processQR(rawValue: string) {
    let qrCode = rawValue

    // Parse if JSON payload
    try {
      const parsed = JSON.parse(rawValue)
      if (parsed.ticketId) qrCode = parsed.ticketId
    } catch {}

    const gate = device?.gate ?? profile?.gate ?? 'A'

    if (!isOnline) {
      // Save to offline queue
      await saveOfflineScan({ qrCode, gate })
      const result: ScanResult = {
        id:         Date.now().toString(),
        qr_code:    qrCode,
        result:     'valid',
        message:    'Saved offline — will sync when connected',
        scanned_at: new Date().toISOString(),
        offline:    true,
      }
      setLastResult(result)
      setSessionLog(prev => [result, ...prev])
      return
    }

    // Online — validate via Supabase RPC
    const { data: { user } } = await supabase.auth.getUser()

    const { data } = await supabase.rpc('validate_ticket', {
      p_qr_code:    qrCode,
      p_scanned_by: user!.id,
      p_gate:       gate,
    })

    const result: ScanResult = {
      id:          Date.now().toString(),
      qr_code:     qrCode,
      result:      data?.result ?? 'invalid',
      message:     data?.message ?? 'Validation failed',
      ticket_type: data?.ticket_type,
      event:       data?.event,
      scanned_at:  new Date().toISOString(),
      is_comp:     data?.is_comp,
    }

    setLastResult(result)
    setSessionLog(prev => [result, ...prev])
  }

  async function saveOfflineScan(scan: any) {
    const db = await openIndexedDB()
    const tx = db.transaction('scans', 'readwrite')
    tx.objectStore('scans').add({
      id:        Date.now().toString(),
      ...scan,
      timestamp: new Date().toISOString(),
    })
    loadOfflineQueue()
  }

  async function syncOfflineScans() {
    const db    = await openIndexedDB()
    const scans = await getAllScans(db)

    for (const scan of scans) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.rpc('validate_ticket', {
        p_qr_code:    scan.qrCode,
        p_scanned_by: user!.id,
        p_gate:       scan.gate,
      })
      await deleteScan(db, scan.id)
    }

    loadOfflineQueue()
  }

  async function loadOfflineQueue() {
    try {
      const db    = await openIndexedDB()
      const scans = await getAllScans(db)
      setOfflineQueue(scans)
    } catch {}
  }

  function openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('eventcore-offline', 1)
      req.onupgradeneeded = e => {
        const db = (e.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('scans')) {
          db.createObjectStore('scans', { keyPath: 'id' })
        }
      }
      req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result)
      req.onerror   = e => reject((e.target as IDBOpenDBRequest).error)
    })
  }

  function getAllScans(db: IDBDatabase): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction('scans', 'readonly')
      const req = tx.objectStore('scans').getAll()
      req.onsuccess = e => resolve((e.target as IDBRequest).result)
      req.onerror   = e => reject((e.target as IDBRequest).error)
    })
  }

  function deleteScan(db: IDBDatabase, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction('scans', 'readwrite')
      const req = tx.objectStore('scans').delete(id)
      req.onsuccess = () => resolve()
      req.onerror   = e => reject((e.target as IDBRequest).error)
    })
  }

  // ── Unauthorized device ──
  if (deviceError) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0b1b33',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          background: '#1e293b',
          borderRadius: '28px',
          padding: '32px 24px',
          textAlign: 'center',
          color: 'white',
          maxWidth: '340px',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ fontWeight: 700, marginBottom: '12px' }}>
            Device Not Authorized
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '8px' }}>
            {deviceError}
          </p>
          <p style={{
            fontSize: '0.85rem',
            color: '#64748b',
            marginTop: '16px',
          }}>
            Contact EventCore Africa Limited to authorize this device.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1b33',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1e3349',
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
            EVENTCORE SCANNER
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#64748b',
            letterSpacing: '1px',
          }}>
            GATE {device?.gate ?? profile?.gate ?? '—'} ·{' '}
            {profile?.full_name}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Online indicator */}
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isOnline ? '#22c55e' : '#ef4444',
          }} />
          <span style={{
            fontSize: '0.8rem',
            color: isOnline ? '#22c55e' : '#ef4444',
          }}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {/* Offline queue badge */}
          {offlineQueue.length > 0 && (
            <span style={{
              background: '#f59e0b',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '40px',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              {offlineQueue.length} pending
            </span>
          )}
        </div>
      </div>

      {/* Camera View */}
      <div style={{
        padding: '16px',
        flex: 1,
      }}>
        <div style={{
          background: '#1e3349',
          borderRadius: '28px',
          overflow: 'hidden',
          position: 'relative',
          aspectRatio: '1',
          marginBottom: '16px',
        }}>
          {/* Video feed */}
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: scanning ? 'block' : 'none',
            }}
            playsInline
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Placeholder when not scanning */}
          {!scanning && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📷</div>
              <div style={{ fontSize: '0.9rem' }}>
                Tap Scan to open camera
              </div>
            </div>
          )}

          {/* Scanning overlay */}
          {scanning && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: '200px',
                height: '200px',
                border: '3px solid #2563eb',
                borderRadius: '16px',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
              }} />
            </div>
          )}
        </div>

        {/* Scan Result */}
        {lastResult && (
          <div style={{
            background: lastResult.result === 'valid'
              ? '#14532d'
              : lastResult.result === 'duplicate'
              ? '#713f12'
              : '#7f1d1d',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
              {lastResult.result === 'valid'
                ? '✅'
                : lastResult.result === 'duplicate'
                ? '⚠️'
                : '❌'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>
              {lastResult.message}
            </div>
            {lastResult.ticket_type && (
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {lastResult.ticket_type === 'vip' ? '⭐ VIP' : '🎟️ General'}
                {lastResult.is_comp && ' · 🎁 Complimentary'}
              </div>
            )}
            {lastResult.offline && (
              <div style={{
                marginTop: '8px',
                fontSize: '0.8rem',
                color: '#fbbf24',
              }}>
                📶 Saved offline — syncing when online
              </div>
            )}
            <div style={{
              marginTop: '8px',
              fontSize: '0.8rem',
              opacity: 0.6,
            }}>
              {lastResult.qr_code}
            </div>
          </div>
        )}

        {/* Scan Button */}
        <button
          onClick={scanning ? stopCamera : startCamera}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: '60px',
            background: scanning ? '#dc2626' : '#2563eb',
            color: 'white',
            border: 'none',
            fontWeight: 700,
            fontSize: '1.1rem',
            cursor: 'pointer',
            marginBottom: '24px',
          }}
        >
          {scanning ? '⏹ Stop Scanning' : '📷 Scan Ticket'}
        </button>

        {/* Session Stats */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
        }}>
          {[
            {
              label: 'Valid',
              value: sessionLog.filter(s => s.result === 'valid').length,
              color: '#22c55e',
            },
            {
              label: 'Duplicate',
              value: sessionLog.filter(s => s.result === 'duplicate').length,
              color: '#f59e0b',
            },
            {
              label: 'Invalid',
              value: sessionLog.filter(s => s.result === 'invalid').length,
              color: '#ef4444',
            },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1,
              background: '#1e3349',
              borderRadius: '16px',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                color: stat.color,
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Session Log */}
        <h3 style={{
          fontWeight: 700,
          marginBottom: '12px',
          color: '#94a3b8',
          fontSize: '0.9rem',
          letterSpacing: '1px',
        }}>
          SESSION LOG
        </h3>
        <div style={{
          background: '#1e3349',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          {sessionLog.length > 0 ? (
            sessionLog.slice(0, 20).map(log => (
              <div key={log.id} style={{
                padding: '12px 16px',
                borderBottom: '1px solid #0b1b33',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>
                    {log.result === 'valid'
                      ? '✅'
                      : log.result === 'duplicate'
                      ? '⚠️'
                      : '❌'}
                  </span>
                  <span style={{
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                  }}>
                    {log.qr_code}
                  </span>
                  {log.offline && (
                    <span style={{
                      fontSize: '0.7rem',
                      color: '#f59e0b',
                    }}>
                      offline
                    </span>
                  )}
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
              No scans yet this session
            </div>
          )}
        </div>
      </div>
    </div>
  )
}