const CACHE_NAME = 'eventcore-scanner-v1'
const OFFLINE_SCANS_KEY = 'offline_scans'

// Files to cache for offline use
const STATIC_ASSETS = [
  '/scanner',
  '/manifest.json',
]

// Install — cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch — serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  )
})

// Background sync — push offline scans when online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scans') {
    event.waitUntil(syncOfflineScans())
  }
})

async function syncOfflineScans() {
  const db = await openDB()
  const scans = await getOfflineScans(db)

  for (const scan of scans) {
    try {
      const response = await fetch('/api/scans/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scan),
      })

      if (response.ok) {
        await deleteScan(db, scan.id)
      }
    } catch {
      // Still offline — try next time
      break
    }
  }
}

// IndexedDB for offline scan storage
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eventcore-offline', 1)

    request.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('scans')) {
        db.createObjectStore('scans', { keyPath: 'id' })
      }
    }

    request.onsuccess = e => resolve(e.target.result)
    request.onerror   = e => reject(e.target.error)
  })
}

function getOfflineScans(db) {
  return new Promise((resolve, reject) => {
    const tx      = db.transaction('scans', 'readonly')
    const store   = tx.objectStore('scans')
    const request = store.getAll()
    request.onsuccess = e => resolve(e.target.result)
    request.onerror   = e => reject(e.target.error)
  })
}

function deleteScan(db, id) {
  return new Promise((resolve, reject) => {
    const tx      = db.transaction('scans', 'readwrite')
    const store   = tx.objectStore('scans')
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror   = e => reject(e.target.error)
  })
}