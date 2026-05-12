'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Search, UserPlus, Check, X } from 'lucide-react'
import type { Friendship, UserProfile } from '@/lib/types'

interface SentRequest {
  id: string
  addressee_id: string
  addressee?: UserProfile
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friendship[]>([])
  const [pending, setPending] = useState<Friendship[]>([])
  const [sent, setSent] = useState<SentRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/friends')
      .then(r => r.json())
      .then(({ friends, pending, sent }) => {
        setFriends(friends ?? [])
        setPending(pending ?? [])
        setSent(sent ?? [])
        setSentIds(new Set((sent ?? []).map((s: { addressee_id: string }) => s.addressee_id)))
      })
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const url = searchQuery.length >= 2
        ? `/api/users/search?q=${encodeURIComponent(searchQuery)}`
        : '/api/users/search'
      fetch(url).then(r => r.json()).then(setSearchResults)
    }, 300)
  }, [searchQuery])

  async function sendRequest(addresseeId: string) {
    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressee_id: addresseeId }),
    })
    if (res.ok) {
      setSentIds(prev => new Set(prev).add(addresseeId))
      const updated = await fetch('/api/friends').then(r => r.json())
      setSent(updated.sent ?? [])
    }
  }

  async function cancelRequest(id: string, addresseeId: string) {
    const res = await fetch(`/api/friends/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSent(prev => prev.filter(s => s.id !== id))
      setSentIds(prev => { const next = new Set(prev); next.delete(addresseeId); return next })
    }
  }

  async function respondToRequest(id: string, action: 'accept' | 'reject') {
    const res = await fetch(`/api/friends/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      setPending(prev => prev.filter(p => p.id !== id))
      if (action === 'accept') {
        const updated = await fetch('/api/friends').then(r => r.json())
        setFriends(updated.friends ?? [])
      }
    }
  }

  return (
    <div className="px-4 pt-16 pb-8 flex flex-col gap-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold pt-2">Amis</h1>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.4)' }} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Chercher un ami par nom..."
          className="w-full glass rounded-2xl pl-9 pr-4 py-3 text-sm bg-transparent outline-none"
        />
      </div>

      {/* Friends list */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Mes amis {friends.length > 0 && `· ${friends.length}`}
        </p>
        {friends.length === 0 && (
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Cherche des amis ci-dessous pour les ajouter.
          </p>
        )}
        {friends.map(f => (
          <Link
            key={f.id}
            href={`/users/${f.profile?.id}`}
            className="glass rounded-2xl px-4 py-3 flex items-center gap-3"
          >
            {f.profile?.avatar_url
              ? <img src={f.profile.avatar_url} className="rounded-full" style={{ width: 36, height: 36 }} alt="" />
              : <div className="rounded-full" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }} />
            }
            <span className="font-medium">{f.profile?.display_name}</span>
          </Link>
        ))}
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Demandes reçues
          </p>
          {pending.map(p => (
            <div key={p.id} className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {p.profile?.avatar_url
                  ? <img src={p.profile.avatar_url} className="rounded-full" style={{ width: 36, height: 36 }} alt="" />
                  : <div className="rounded-full" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }} />
                }
                <span className="font-medium">{p.profile?.display_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => respondToRequest(p.id, 'accept')}
                  className="glass rounded-full flex items-center justify-center"
                  style={{ width: 32, height: 32, color: '#4ADE80' }}
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => respondToRequest(p.id, 'reject')}
                  className="glass rounded-full flex items-center justify-center"
                  style={{ width: 32, height: 32, color: '#F87171' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sent requests */}
      {sent.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Demandes envoyées · {sent.length}
          </p>
          {sent.map(s => (
            <div key={s.id} className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {s.addressee?.avatar_url
                  ? <img src={s.addressee.avatar_url} className="rounded-full" style={{ width: 36, height: 36 }} alt="" />
                  : <div className="rounded-full" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }} />
                }
                <div>
                  <span className="font-medium">{s.addressee?.display_name ?? '…'}</span>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>En attente</p>
                </div>
              </div>
              <button
                onClick={() => cancelRequest(s.id, s.addressee_id)}
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: '#F87171' }}
              >
                <X size={14} />
                Annuler
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search results / all users */}
      {searchResults.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {searchQuery.length >= 2 ? 'Résultats' : 'Tous les membres'}
          </p>
          {searchResults.map(u => (
            <div key={u.id} className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {u.avatar_url
                  ? <img src={u.avatar_url} className="rounded-full" style={{ width: 36, height: 36 }} alt="" />
                  : <div className="rounded-full" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }} />
                }
                <span className="font-medium">{u.display_name}</span>
              </div>
              <button
                onClick={() => sendRequest(u.id)}
                disabled={sentIds.has(u.id)}
                className="flex items-center gap-2 text-sm font-medium disabled:opacity-40"
                style={{ color: sentIds.has(u.id) ? 'rgba(255,255,255,0.4)' : 'var(--color-purple)' }}
              >
                <UserPlus size={16} />
                {sentIds.has(u.id) ? 'Envoyé' : 'Ajouter'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
