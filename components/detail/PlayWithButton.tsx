'use client'
import { useState } from 'react'
import { Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/lib/types'

interface Props {
  gameTitle: string
  posterUrl?: string
  rawgId?: string
  dominantColor?: string
  friends: UserProfile[]
}

export default function PlayWithButton({ gameTitle, posterUrl, rawgId, dominantColor, friends }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (friends.length === 0) return null

  function toggleFriend(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreate() {
    if (selected.size === 0) return
    setLoading(true)
    setError(null)
    try {
      const capsuleRes = await fetch('/api/shared-capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: gameTitle, poster_url: posterUrl, rawg_id: rawgId, dominant_color: dominantColor }),
      })
      if (!capsuleRes.ok) throw new Error('Erreur lors de la création')
      const capsule = await capsuleRes.json() as { id: string }

      await Promise.all([...selected].map(friendId =>
        fetch(`/api/shared-capsules/${capsule.id}/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitee_id: friendId }),
        })
      ))

      setOpen(false)
      router.push(`/shared/${capsule.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full glass rounded-[16px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-3"
      >
        <Users size={16} />
        Jouer avec...
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !loading && setOpen(false)}
        >
          <div className="w-full glass rounded-[24px] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-1">Choisir des amis</h3>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Sélectionne un ou plusieurs amis
            </p>
            {error && (
              <p className="text-xs mb-3 px-1" style={{ color: 'rgba(248,113,113,0.9)' }}>{error}</p>
            )}
            <div className="flex flex-col gap-3 mb-5">
              {friends.map(friend => {
                const isSelected = selected.has(friend.id)
                return (
                  <button
                    key={friend.id}
                    onClick={() => toggleFriend(friend.id)}
                    disabled={loading}
                    className="flex items-center gap-3 rounded-[12px] p-3 text-left"
                    style={{
                      background: isSelected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isSelected ? 'rgba(139,92,246,0.5)' : 'transparent'}`,
                    }}
                  >
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt={friend.display_name} className="rounded-full" style={{ width: 36, height: 36, objectFit: 'cover' }} />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        {friend.display_name[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium flex-1">{friend.display_name}</span>
                    <div
                      className="rounded-full flex-shrink-0"
                      style={{
                        width: 20, height: 20,
                        background: isSelected ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)',
                        border: `2px solid ${isSelected ? 'var(--color-purple)' : 'rgba(255,255,255,0.2)'}`,
                      }}
                    />
                  </button>
                )
              })}
            </div>
            <button
              onClick={handleCreate}
              disabled={loading || selected.size === 0}
              className="w-full py-3 rounded-[12px] text-sm font-semibold"
              style={{
                background: selected.size > 0 ? 'var(--color-purple)' : 'rgba(255,255,255,0.08)',
                opacity: loading ? 0.6 : 1,
                color: selected.size > 0 ? 'white' : 'rgba(255,255,255,0.3)',
              }}
            >
              {loading ? 'Création...' : `Jouer avec ${selected.size > 0 ? `(${selected.size})` : '...'}`}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
