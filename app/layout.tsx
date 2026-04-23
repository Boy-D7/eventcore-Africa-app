import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EventCore Africa',
  description: 'Secure Digital Ticketing — Malawi',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0b1b33',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="theme-color" content="#0b1b33" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}