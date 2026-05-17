'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/browser'

export default function ProfileAvatar() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const profileRes = await fetch('/api/profile')
      if (profileRes.ok) {
        const profile = await profileRes.json()
        setAvatarUrl(profile.avatar_url || user.user_metadata?.avatar_url || null)
      }

      const [friendsRes, notifsRes] = await Promise.all([
        fetch('/api/friends'),
        fetch('/api/notifications'),
      ])

      if (friendsRes.ok) {
        const json = await friendsRes.json()
        setPendingCount(json.pending?.length ?? 0)
      }

      if (notifsRes.ok) {
        const json = await notifsRes.json()
        setUnreadCount(json.unread_count ?? 0)
      }
    }

    load()
  }, [])

  return (
    <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
      <Link
        href="/notifications"
        className="relative flex items-center justify-center"
        style={{ width: 36, height: 36 }}
      >
        <Bell size={20} style={{ color: 'rgba(255,255,255,0.7)' }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
            style={{ width: 16, height: 16, fontSize: 10, background: '#EF4444' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>

      <Link href="/profile" style={{ width: 36, height: 36 }}>
        <div className="relative">
          {avatarUrl ? (
            <img
              key={avatarUrl}
              src={avatarUrl}
              alt="Profil"
              className="rounded-full object-cover"
              style={{ width: 36, height: 36 }}
            />
          ) : (
            <div
              className="rounded-full"
              style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}
            />
          )}
          {pendingCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
              style={{ width: 16, height: 16, fontSize: 10, background: '#EF4444' }}
            >
              {pendingCount}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
