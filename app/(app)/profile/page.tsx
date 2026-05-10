'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'
import { Users, LogOut, Download } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState({ movies: 0, tvshows: 0, games: 0 })
  const [friendCount, setFriendCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)

      const [mediaRes, friendsRes] = await Promise.all([
        fetch('/api/media?wishlist=false'),
        fetch('/api/friends'),
      ])

      if (mediaRes.ok) {
        const items = await mediaRes.json()
        setStats({
          movies: items.filter((i: { type: string }) => i.type === 'movie').length,
          tvshows: items.filter((i: { type: string }) => i.type === 'tvshow').length,
          games: items.filter((i: { type: string }) => i.type === 'game').length,
        })
      }

      if (friendsRes.ok) {
        const { friends } = await friendsRes.json()
        setFriendCount(friends?.length ?? 0)
      }
    }

    load()
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.replace('/login')
  }

  function handleExport() {
    const a = document.createElement('a')
    a.href = '/api/export'
    a.download = ''
    a.click()
  }

  if (!user) return null

  const avatar = user.user_metadata?.avatar_url
  const name = user.user_metadata?.full_name ?? user.email

  return (
    <div className="px-4 pt-16 pb-8 flex flex-col gap-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 pt-4">
        {avatar
          ? <img src={avatar} alt="avatar" className="rounded-full" style={{ width: 72, height: 72 }} />
          : <div className="rounded-full" style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.15)' }} />
        }
        <p className="text-xl font-bold">{name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: 'Films', value: stats.movies },
          { label: 'Séries', value: stats.tvshows },
          { label: 'Jeux', value: stats.games },
        ] as const).map(({ label, value }) => (
          <div key={label} className="glass rounded-2xl p-3 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Link
          href="/friends"
          className="glass rounded-2xl px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Users size={18} style={{ color: 'var(--color-purple)' }} />
            <span className="font-medium">Mes amis</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{friendCount} →</span>
        </Link>

        <button
          onClick={handleExport}
          className="glass rounded-2xl px-4 py-3 flex items-center gap-3 text-sm font-medium"
        >
          <Download size={18} style={{ color: 'var(--color-purple)' }} />
          Exporter en JSON
        </button>

        <button
          onClick={handleLogout}
          className="glass rounded-2xl px-4 py-3 flex items-center gap-3 text-sm font-medium"
          style={{ color: '#F87171' }}
        >
          <LogOut size={18} />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
