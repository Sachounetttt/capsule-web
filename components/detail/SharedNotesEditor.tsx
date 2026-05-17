'use client'
import { useState, useRef } from 'react'

interface Props {
  capsuleId: string
  initialNotes: string
}

export default function SharedNotesEditor({ capsuleId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes)
  const [saving, setSaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(value: string) {
    setNotes(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSaving(true)
      await fetch(`/api/shared-capsules/${capsuleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_notes: value }),
      })
      setSaving(false)
    }, 1000)
  }

  return (
    <div className="glass rounded-[20px] p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Notes partagées
        </p>
        {saving && (
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Sauvegarde...</p>
        )}
      </div>
      <textarea
        value={notes}
        onChange={e => handleChange(e.target.value)}
        placeholder="Notes visibles par les deux joueurs..."
        rows={4}
        className="w-full bg-transparent outline-none text-sm leading-relaxed resize-none"
        style={{ color: 'rgba(255,255,255,0.8)' }}
      />
    </div>
  )
}
