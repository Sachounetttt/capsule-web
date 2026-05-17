'use client'
import { useState } from 'react'
import { Users } from 'lucide-react'
import Image from 'next/image'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (friends.length === 0) return null

  async function handleSelect(friend: UserProfile) {
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

      const inviteRes = await fetch(`/api/shared-capsules/${capsule.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitee_id: friend.id }),
      })
      if (!inviteRes.ok) throw new Error("Erreur lors de l'invitation")

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
          <div
            className="w-full glass rounded-[24px] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-4">Choisir un ami</h3>
            {error && (
              <p className="text-xs mb-3 px-1" style={{ color: 'rgba(248,113,113,0.9)' }}>{error}</p>
            )}
            <div className="flex flex-col gap-3">
              {friends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => handleSelect(friend)}
                  disabled={loading}
                  className="flex items-center gap-3 rounded-[12px] p-3 text-left"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  {friend.avatar_url ? (
                    <Image
                      src={friend.avatar_url}
                      alt={friend.display_name}
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                    >
                      {friend.display_name[0]}
                    </div>
                  )}
                  <span className="text-sm font-medium">{friend.display_name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
