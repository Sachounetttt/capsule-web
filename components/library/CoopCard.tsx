'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { UserPlus } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import type { MediaStatus, UserProfile } from '@/lib/types'

interface CoopCapsuleSummary {
  id: string
  title: string
  poster_url?: string
  my_status: MediaStatus
  members: { user_id: string; profile: UserProfile | null }[]
}

interface Props {
  item: CoopCapsuleSummary
  index: number
}

export default function CoopCard({ item, index }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [invited, setInvited] = useState<Set<string>>(new Set())

  const memberIds = new Set(item.members.map(m => m.user_id))

  async function openModal() {
    setModalOpen(true)
    setLoading(true)
    try {
      const res = await fetch('/api/friends')
      const data = await res.json() as { accepted?: { id: string; profile?: UserProfile }[] }
      const accepted = (data.accepted ?? [])
        .map(f => f.profile)
        .filter((p): p is UserProfile => !!p && !memberIds.has(p.id) && !invited.has(p.id))
      setFriends(accepted)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(friend: UserProfile) {
    if (inviting) return
    setInviting(friend.id)
    try {
      await fetch(`/api/shared-capsules/${item.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitee_id: friend.id }),
      })
      setInvited(prev => new Set([...prev, friend.id]))
      setFriends(prev => prev.filter(f => f.id !== friend.id))
    } finally {
      setInviting(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="glass rounded-[20px] flex gap-3 p-3">
        {/* Poster — cliquable vers /shared/[id] */}
        <Link href={`/shared/${item.id}`} className="flex-shrink-0 block">
          <div
            className="rounded-[10px] overflow-hidden relative"
            style={{ width: 112, height: 63, background: 'rgba(255,255,255,0.05)' }}
          >
            {item.poster_url ? (
              <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-lg font-bold"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                {item.title[0]}
              </div>
            )}
            {/* Member avatars */}
            <div className="absolute bottom-1 right-1 flex">
              {item.members.slice(0, 3).map((m, i) => (
                m.profile?.avatar_url ? (
                  <img
                    key={m.user_id}
                    src={m.profile.avatar_url}
                    alt={m.profile.display_name}
                    className="rounded-full border border-black"
                    style={{ width: 16, height: 16, objectFit: 'cover', marginLeft: i > 0 ? -4 : 0 }}
                  />
                ) : (
                  <div
                    key={m.user_id}
                    className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px] font-bold"
                    style={{ background: 'rgba(139,92,246,0.8)', marginLeft: i > 0 ? -4 : 0 }}
                  >
                    {m.profile?.display_name?.[0] ?? '?'}
                  </div>
                )
              ))}
            </div>
          </div>
        </Link>

        {/* Info — cliquable vers /shared/[id] */}
        <Link href={`/shared/${item.id}`} className="flex-1 min-w-0 py-1 block">
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Jeu · Co-op · {item.members.length} joueur{item.members.length > 1 ? 's' : ''}
          </p>
          <h3 className="font-semibold text-sm leading-tight mb-2 truncate">{item.title}</h3>
          <StatusBadge status={item.my_status} />
        </Link>

        {/* Bouton inviter */}
        <button
          onClick={openModal}
          className="flex-shrink-0 flex items-center justify-center rounded-full self-center"
          style={{
            width: 32, height: 32,
            background: 'rgba(139,92,246,0.18)',
            border: '1px solid rgba(139,92,246,0.35)',
          }}
          title="Inviter un ami"
        >
          <UserPlus size={14} style={{ color: 'rgba(180,140,255,0.9)' }} />
        </button>
      </div>

      {/* Modal invitation */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full glass rounded-[24px] p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold mb-1">Inviter à {item.title}</h3>
            <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Choisis un ami à inviter en co-op
            </p>

            {loading ? (
              <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Chargement...
              </p>
            ) : friends.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Tous tes amis sont déjà dans cette capsule
              </p>
            ) : (
              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                {friends.map(friend => (
                  <button
                    key={friend.id}
                    onClick={() => handleInvite(friend)}
                    disabled={!!inviting}
                    className="flex items-center gap-3 rounded-[12px] p-3 text-left"
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
                        style={{ width: 36, height: 36, objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: 'rgba(139,92,246,0.3)' }}
                      >
                        {friend.display_name[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium flex-1">{friend.display_name}</span>
                    <span className="text-xs" style={{ color: 'rgba(139,92,246,0.9)' }}>
                      {inviting === friend.id ? 'Invitation...' : 'Inviter'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setModalOpen(false)}
              className="w-full mt-4 py-2.5 rounded-[12px] text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
