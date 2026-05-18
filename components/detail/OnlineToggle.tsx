'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wifi } from 'lucide-react'

export default function OnlineToggle({ itemId, defaultValue }: { itemId: string; defaultValue: boolean }) {
  const [online, setOnline] = useState(defaultValue)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function toggle() {
    setSaving(true)
    const next = !online
    await fetch(`/api/media/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online: next }),
    })
    setOnline(next)
    setSaving(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className="glass rounded-[16px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-3 w-full"
      style={{
        border: `1px solid ${online ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)'}`,
        opacity: saving ? 0.6 : 1,
      }}
    >
      <Wifi size={16} style={{ color: online ? 'var(--color-purple)' : 'rgba(255,255,255,0.4)' }} />
      <span style={{ color: online ? 'var(--color-purple)' : 'rgba(255,255,255,0.6)' }}>
        {online ? 'Jeu en ligne' : 'Jeu solo'}
      </span>
    </button>
  )
}
