'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { AppNotification } from '@/lib/types'
import Loader from '@/components/ui/Loader'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${Math.floor(hours / 24)}j`
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(({ notifications }) => setNotifications(notifications ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function handleTap(notif: AppNotification) {
    if (!notif.read) {
      await fetch(`/api/notifications/${notif.id}`, { method: 'PATCH' })
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
      )
    }
    const query = new URLSearchParams({
      q: notif.payload.media_title,
      type: notif.payload.media_type,
    })
    router.push(`/add?${query}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <Loader size={80} />
      </div>
    )
  }

  return (
    <div className="px-4 pt-16 pb-28 flex flex-col gap-3 max-w-lg mx-auto">
      <div className="flex items-center gap-3 pt-2 mb-2">
        <Link
          href="/"
          className="glass rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 36, height: 36 }}
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold">Notifications</h1>
      </div>

      {notifications.length === 0 ? (
        <p
          className="text-sm text-center py-12"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          Aucune notification pour l&apos;instant
        </p>
      ) : (
        notifications.map(notif => (
          <button
            key={notif.id}
            onClick={() => handleTap(notif)}
            className="glass rounded-2xl px-4 py-3 flex items-center gap-3 text-left w-full"
            style={{
              background: notif.read ? undefined : 'rgba(124,58,237,0.12)',
              border: notif.read
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(124,58,237,0.3)',
            }}
          >
            {notif.payload.poster_url && (
              <img
                src={notif.payload.poster_url}
                className="rounded-lg object-cover flex-shrink-0"
                style={{ width: 44, height: 64 }}
                alt=""
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">
                <span className="font-semibold">{notif.payload.sender_name}</span>
                {' t\'a recommandé '}
                <span className="font-semibold">{notif.payload.media_title}</span>
                {notif.payload.rating != null && (
                  <span> · ⭐ {notif.payload.rating.toFixed(1)}</span>
                )}
              </p>
              {notif.payload.message && (
                <p
                  className="text-xs mt-1 italic"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  &ldquo;{notif.payload.message}&rdquo;
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {timeAgo(notif.created_at)}
              </p>
            </div>
            {!notif.read && (
              <div
                className="rounded-full flex-shrink-0"
                style={{ width: 8, height: 8, background: 'var(--color-purple)' }}
              />
            )}
          </button>
        ))
      )}
    </div>
  )
}
