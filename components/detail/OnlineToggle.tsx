'use client'

import { useState } from 'react'
import { Wifi } from 'lucide-react'

export default function OnlineToggle({ itemId, defaultValue }: { itemId: string; defaultValue: boolean }) {
  const [online, setOnline] = useState(defaultValue)
  const [saving, setSaving] = useState(false)

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
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className="glass rounded-[12px] px-4 py-3 flex items-center gap-3 text-sm font-medium mb-4 w-full"
      style={{
        border: `1px solid ${online ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)'}`,
        opacity: saving ? 0.6 : 1,
      }}
    >
      <Wifi size={16} style={{ color: online ? 'var(--color-purple)' : 'rgba(255,255,255,0.3)' }} />
      <span style={{ color: online ? 'var(--color-purple)' : 'rgba(255,255,255,0.5)' }}>
        {online ? 'Jeu en ligne' : 'Jeu solo'}
      </span>
      <div
        className="ml-auto rounded-full transition-colors"
        style={{
          width: 20, height: 20,
          background: online ? 'var(--color-purple)' : 'rgba(255,255,255,0.1)',
          border: `2px solid ${online ? 'var(--color-purple)' : 'rgba(255,255,255,0.2)'}`,
        }}
      />
    </button>
  )
}
