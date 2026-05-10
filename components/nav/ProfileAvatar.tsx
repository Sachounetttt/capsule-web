'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'

export default function ProfileAvatar() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const meta = user.user_metadata
      setAvatarUrl(meta?.avatar_url ?? null)

      const res = await fetch('/api/friends')
      if (res.ok) {
        const json = await res.json()
        setPendingCount(json.pending?.length ?? 0)
      }
    }

    load()
  }, [])

  return (
    <Link
      href="/profile"
      className="fixed top-4 right-4 z-30"
      style={{ width: 36, height: 36 }}
    >
      <div className="relative">
        {avatarUrl ? (
          <img
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
  )
}
