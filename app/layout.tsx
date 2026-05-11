import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0F0F14',
}

export const metadata: Metadata = {
  title: 'Capsule',
  description: 'Tracker films, séries et jeux',
  manifest: '/manifest.json',
  icons: {
    icon: '/logocapsuleclean.png',
    apple: '/logocapsuleclean.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Capsule',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={inter.className} style={{ background: 'var(--color-bg)', color: 'white' }}>
        {children}
      </body>
    </html>
  )
}
