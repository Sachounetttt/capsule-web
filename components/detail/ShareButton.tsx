'use client'

import { useState } from 'react'
import { Share2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserProfile } from '@/lib/types'

interface Props {
  mediaItemId: string
  mediaTitle: string
  mediaType: string
  posterUrl?: string
  rating?: number
}

export default function ShareButton({ mediaItemId, mediaTitle, mediaType, posterUrl, rating }: Props) {
  const [open, setOpen] = useState(false)
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function openModal() {
    setOpen(true)
    setSent(false)
    setSelected(null)
    setMessage('')
    const res = await fetch('/api/friends')
    if (res.ok) {
      const json = await res.json()
      setFriends(
        (json.friends ?? [])
          .map((f: { profile?: UserProfile }) => f.profile)
          .filter(Boolean) as UserProfile[]
      )
    }
  }

  async function handleSend() {
    if (!selected) return
    setSending(true)
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_id: selected,
        media_item_id: mediaItemId,
        message: message.trim() || undefined,
      }),
    })
    setSending(false)
    setSent(true)
    setTimeout(() => setOpen(false), 1200)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="glass rounded-[12px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-4 w-full"
      >
        <Share2 size={16} />
        Partager à un ami
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60]"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[70] glass rounded-t-[24px] p-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Partager</h2>
                <button onClick={() => setOpen(false)}>
                  <X size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              {sent ? (
                <p className="text-center py-4 font-medium" style={{ color: '#4ADE80' }}>
                  Partagé !
                </p>
              ) : friends.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Ajoute des amis pour partager
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-2 mb-4 max-h-48 overflow-y-auto">
                    {friends.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSelected(f.id)}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-left"
                        style={{
                          background: selected === f.id
                            ? 'rgba(124,58,237,0.3)'
                            : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${selected === f.id ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        {f.avatar_url ? (
                          <img
                            src={f.avatar_url}
                            className="rounded-full flex-shrink-0"
                            style={{ width: 32, height: 32 }}
                            alt=""
                          />
                        ) : (
                          <div
                            className="rounded-full flex-shrink-0"
                            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)' }}
                          />
                        )}
                        <span className="font-medium text-sm">{f.display_name}</span>
                      </button>
                    ))}
                  </div>

                  <input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Ajouter un message... (optionnel)"
                    className="w-full glass rounded-2xl px-4 py-3 text-sm bg-transparent outline-none mb-4"
                    maxLength={200}
                  />

                  <button
                    onClick={handleSend}
                    disabled={!selected || sending}
                    className="w-full py-3 rounded-2xl font-semibold text-sm disabled:opacity-40"
                    style={{ background: 'var(--color-purple)', color: 'white' }}
                  >
                    {sending ? 'Envoi...' : 'Envoyer'}
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
