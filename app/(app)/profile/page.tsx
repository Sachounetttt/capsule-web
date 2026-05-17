'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'
import { Users, LogOut, Download, Pencil, Check, X, Camera } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({ movies: 0, tvshows: 0, games: 0 })
  const [friendCount, setFriendCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      setUser(user)

      const [mediaRes, friendsRes, profileRes] = await Promise.all([
        fetch('/api/media?wishlist=false'),
        fetch('/api/friends'),
        supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single(),
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

      const name = profileRes.data?.display_name
        || user.user_metadata?.full_name
        || user.email
        || ''
      setDisplayName(name)
      setAvatarUrl(profileRes.data?.avatar_url || user.user_metadata?.avatar_url || null)
    }

    load()
  }, [router])

  function startEdit() {
    setEditValue(displayName)
    setEditing(true)
  }

  async function saveEdit() {
    if (!editValue.trim() || editValue.trim() === displayName) {
      setEditing(false)
      return
    }
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: editValue.trim() }),
    })
    if (res.ok) setDisplayName(editValue.trim())
    setSaving(false)
    setEditing(false)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    setAvatarError(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) {
      setAvatarError('Bucket "avatars" manquant dans Supabase Storage — crée-le en mode public.')
      setUploadingAvatar(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithBust = `${publicUrl}?t=${Date.now()}`
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: urlWithBust }),
    })
    setAvatarUrl(urlWithBust)
    setUploadingAvatar(false)
  }

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

  return (
    <div className="px-4 pt-16 pb-28 flex flex-col gap-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        {avatarError && (
          <p className="text-xs text-center px-4 mb-1" style={{ color: '#F87171' }}>
            {avatarError}
          </p>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative rounded-full"
          style={{ width: 72, height: 72 }}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" className="rounded-full w-full h-full object-cover" />
            : <div className="rounded-full w-full h-full flex items-center justify-center text-2xl font-bold"
                style={{ background: 'rgba(138,77,255,0.3)', color: 'var(--color-purple)' }}>
                {displayName[0]?.toUpperCase()}
              </div>
          }
          <div
            className="absolute bottom-0 right-0 rounded-full flex items-center justify-center"
            style={{ width: 22, height: 22, background: 'rgba(138,77,255,0.9)' }}
          >
            {uploadingAvatar
              ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera size={12} color="white" />
            }
          </div>
        </button>

        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
              maxLength={30}
              className="glass rounded-xl px-3 py-1.5 text-lg font-bold bg-transparent outline-none text-center"
              style={{ minWidth: 0, width: `${Math.max(editValue.length, 8)}ch` }}
            />
            <button onClick={saveEdit} disabled={saving}>
              <Check size={18} style={{ color: '#4ADE80' }} />
            </button>
            <button onClick={() => setEditing(false)}>
              <X size={18} style={{ color: '#F87171' }} />
            </button>
          </div>
        ) : (
          <button
            onClick={startEdit}
            className="flex items-center gap-2 group"
          >
            <p className="text-xl font-bold">{displayName}</p>
            <Pencil size={14} style={{ color: 'rgba(255,255,255,0.3)' }} className="group-hover:opacity-100 opacity-0 transition-opacity" />
          </button>
        )}
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
