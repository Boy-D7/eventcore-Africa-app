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
      <body
        className={`${inter.className} bg-[#f4f6fb] text-[#0b1b33]`}
      >
        {/* App Container (matches your HTML feel) */}
        <div className="max-w-[480px] md:max-w-[1000px] mx-auto bg-white min-h-screen shadow-sm md:rounded-[36px] md:mt-5">
          {children}
        </div>
      </body>
    </html>
  )
}