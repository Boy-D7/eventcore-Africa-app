import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Bible: MK currency format
export function formatMWK(amount: number): string {
  return new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Bible: ticket code generator e.g EVT-DEDZA-8G4F
export function generateTicketRef(venue: string): string {
  const short = venue.split(' ')[0].toUpperCase().slice(0, 5)
  const rand = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `EVT-${short}-${rand}`
}

// Countdown timer e.g "27d 12h 49m"
export function getCountdown(eventDate: string): string {
  const diff = new Date(eventDate).getTime() - Date.now()
  if (diff <= 0) return 'Live now'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${d}d ${h}h ${m}m`
}