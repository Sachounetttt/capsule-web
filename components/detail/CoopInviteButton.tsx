'use client'
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import type { UserProfile } from '@/lib/types'

interface Props {
  capsuleId: string
  memberIds: string[]
}

export default function CoopInviteButton({ capsuleId, memberIds }: Props) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [invited, setInvited] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const excludedIds = new Set([...memberIds, ...invited])

  async function openModal() {
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/friends')
      const data = await res.json() as { accepted?: { id: string; profile?: UserProfile }[] }
      const available = (data.accepted ?? [])
        .map(f => f.profile)
        .filter((p): p is UserProfile => !!p && !excludedIds.has(p.id))
      setFriends(available)
    } catch {
      setError('Impossible de charger les amis')
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(friend: UserProfile) {
    if (inviting) return
    setInviting(friend.id)
    setError(null)
    try {
      const res = await fetch(`/api/shared-capsules/${capsuleId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitee_id: friend.id }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error ?? 'Erreur lors de l\'invitation')
      } else {
        setInvited(prev => new Set([...prev, friend.id]))
        setFriends(prev => prev.filter(f => f.id !== friend.id))
      }
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setInviting(null)
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="w-full glass rounded-[16px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-4"
        style={{ border: '1px solid rgba(139,92,246,0.4)', color: 'rgba(180,140,255,1)' }}
      >
        <UserPlus size={16} />
        Inviter un ami
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => !inviting && setOpen(false)}
        >
          <div
            className="w-full glass rounded-[24px] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-1">Inviter un ami</h3>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Choisis un ami à ajouter à cette partie co-op
            </p>

            {error && (
              <p className="text-xs mb-3" style={{ color: 'rgba(248,113,113,0.9)' }}>{error}</p>
            )}

            {loading ? (
              <p className="text-sm text-center py-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Chargement...
              </p>
            ) : friends.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Tous tes amis sont déjà dans cette partie
              </p>
            ) : (
              <div className="flex flex-col gap-3 mb-4 max-h-72 overflow-y-auto">
                {friends.map(friend => (
                  <button
                    key={friend.id}
                    onClick={() => handleInvite(friend)}
                    disabled={!!inviting}
                    className="flex items-center gap-3 rounded-[14px] p-3 text-left w-full"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      opacity: inviting === friend.id ? 0.5 : 1,
                    }}
                  >
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.display_name}
                        className="rounded-full flex-shrink-0"
                        style={{ width: 40, height: 40, objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ width: 40, height: 40, background: 'rgba(139,92,246,0.3)' }}
                      >
                        {friend.display_name[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium flex-1">{friend.display_name}</span>
                    <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.2)', color: 'rgba(180,140,255,1)' }}>
                      {inviting === friend.id ? '...' : 'Inviter'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              className="w-full py-2.5 rounded-[12px] text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
