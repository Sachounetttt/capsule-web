'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { AppNotification, CoopInvitePayload, CoopAcceptedPayload, NotificationSharePayload } from '@/lib/types'
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
  const [pendingInvites, setPendingInvites] = useState<{ id: string; capsule_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/notifications').then(r => r.json()),
      fetch('/api/shared-capsules/invitations/pending').then(r => r.json()),
    ]).then(([notifs, invites]) => {
      if (notifs.status === 'fulfilled') setNotifications(notifs.value.notifications ?? [])
      if (invites.status === 'fulfilled' && Array.isArray(invites.value)) setPendingInvites(invites.value)
      setLoading(false)
    })
  }, [])

  async function markRead(notifId: string) {
    await fetch(`/api/notifications/${notifId}`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
  }

  async function handleShareTap(notif: AppNotification) {
    if (!notif.read) await markRead(notif.id)
    const p = notif.payload as NotificationSharePayload
    const query = new URLSearchParams({ q: p.media_title, type: p.media_type })
    router.push(`/add?${query}`)
  }

  async function respondToInvite(notifId: string, capsuleId: string, accepted: boolean) {
    if (responding === capsuleId) return
    const invite = pendingInvites.find(i => i.capsule_id === capsuleId)
    if (!invite) return
    setResponding(capsuleId)
    await fetch(`/api/shared-capsules/invitations/${invite.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accepted }),
    })
    await markRead(notifId)
    setPendingInvites(prev => prev.filter(i => i.capsule_id !== capsuleId))
    setResponding(null)
    if (accepted) router.push(`/shared/${capsuleId}`)
    else router.refresh()
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
        <p className="text-sm text-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Aucune notification pour l&apos;instant
        </p>
      ) : (
        notifications.map(notif => {
          if (notif.type === 'coop_invite') {
            const p = notif.payload as CoopInvitePayload
            const hasPendingInvite = pendingInvites.some(i => i.capsule_id === p.capsule_id)
            return (
              <div
                key={notif.id}
                className="glass rounded-2xl px-4 py-3"
                style={{
                  background: notif.read ? undefined : 'rgba(124,58,237,0.12)',
                  border: notif.read ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(124,58,237,0.3)',
                }}
              >
                {p.poster_url && (
                  <img src={p.poster_url} className="rounded-lg object-cover mb-2 float-left mr-3" style={{ width: 44, height: 64 }} alt="" />
                )}
                <p className="text-sm leading-snug mb-1">
                  <span className="font-semibold" style={{ color: 'rgba(139,92,246,1)' }}>{p.inviter_name}</span>
                  {' '}t&apos;invite à jouer co-op à{' '}
                  <span className="font-semibold">{p.capsule_title}</span>
                </p>
                <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(notif.created_at)}</p>
                <div className="clear-both" />
                {hasPendingInvite && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => respondToInvite(notif.id, p.capsule_id, true)}
                      disabled={responding === p.capsule_id}
                      className="flex-1 py-2 rounded-[10px] text-sm font-medium"
                      style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', opacity: responding === p.capsule_id ? 0.5 : 1 }}
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => respondToInvite(notif.id, p.capsule_id, false)}
                      disabled={responding === p.capsule_id}
                      className="flex-1 py-2 rounded-[10px] text-sm font-medium"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', opacity: responding === p.capsule_id ? 0.5 : 1 }}
                    >
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            )
          }

          if (notif.type === 'coop_accepted') {
            const p = notif.payload as CoopAcceptedPayload
            return (
              <div
                key={notif.id}
                className="glass rounded-2xl px-4 py-3"
                style={{
                  background: notif.read ? undefined : 'rgba(124,58,237,0.12)',
                  border: notif.read ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(124,58,237,0.3)',
                }}
              >
                <p className="text-sm leading-snug mb-1">
                  <span className="font-semibold" style={{ color: 'rgba(139,92,246,1)' }}>{p.accepter_name}</span>
                  {' '}a rejoint ta capsule co-op{' '}
                  <Link href={`/shared/${p.capsule_id}`} className="font-semibold underline">
                    {p.capsule_title}
                  </Link>
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(notif.created_at)}</p>
              </div>
            )
          }

          // type === 'share' (default)
          const p = notif.payload as NotificationSharePayload
          return (
            <button
              key={notif.id}
              onClick={() => handleShareTap(notif)}
              className="glass rounded-2xl px-4 py-3 flex items-center gap-3 text-left w-full"
              style={{
                background: notif.read ? undefined : 'rgba(124,58,237,0.12)',
                border: notif.read ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(124,58,237,0.3)',
              }}
            >
              {p.poster_url && (
                <img src={p.poster_url} className="rounded-lg object-cover flex-shrink-0" style={{ width: 44, height: 64 }} alt="" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  <span className="font-semibold">{p.sender_name}</span>
                  {' t\'a recommandé '}
                  <span className="font-semibold">{p.media_title}</span>
                  {p.rating != null && <span> · ⭐ {p.rating.toFixed(1)}</span>}
                </p>
                {p.message && (
                  <p className="text-xs mt-1 italic" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    &ldquo;{p.message}&rdquo;
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeAgo(notif.created_at)}</p>
              </div>
              {!notif.read && (
                <div className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: 'var(--color-purple)' }} />
              )}
            </button>
          )
        })
      )}
    </div>
  )
}
