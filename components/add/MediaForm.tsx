'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import StarRating from '@/components/ui/StarRating'
import type { MediaItem, MediaStatus } from '@/lib/types'

type FormData = Omit<MediaItem, 'id' | 'date_added'>

interface Props {
  initial: Partial<FormData>
  onSubmit: (data: FormData) => Promise<void>
  submitLabel?: string
}

const statusOptions: { value: MediaStatus; label: string }[] = [
  { value: 'completed', label: 'Terminé' },
  { value: 'inProgress', label: 'En cours' },
  { value: 'dropped', label: 'Abandonné' },
  { value: 'abandoned', label: 'Dropped' },
]

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '12px 16px',
  outline: 'none',
  fontSize: '0.875rem',
  color: 'white',
  width: '100%',
}

export default function MediaForm({ initial, onSubmit, submitLabel = 'Ajouter' }: Props) {
  const [form, setForm] = useState<Partial<FormData>>(initial)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function update(key: keyof FormData, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.type || !form.status) return
    setLoading(true)
    await onSubmit(form as FormData)
    setDone(true)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        value={form.title ?? ''}
        onChange={e => update('title', e.target.value)}
        placeholder="Titre"
        style={inputStyle}
        required
      />

      <div>
        <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Note</p>
        <StarRating value={form.rating ?? 0} onChange={v => update('rating', v)} />
      </div>

      <div>
        <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Statut</p>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('status', opt.value)}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: form.status === opt.value ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {form.type === 'movie' && (
        <input
          value={form.director ?? ''}
          onChange={e => update('director', e.target.value)}
          placeholder="Réalisateur (optionnel)"
          style={inputStyle}
        />
      )}
      {form.type === 'tvshow' && (
        <div className="flex gap-3">
          <input
            type="number"
            value={form.seasons_watched ?? ''}
            onChange={e => update('seasons_watched', parseInt(e.target.value) || undefined)}
            placeholder="Saisons vues"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="number"
            value={form.total_seasons ?? ''}
            onChange={e => update('total_seasons', parseInt(e.target.value) || undefined)}
            placeholder="Total saisons"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
      )}
      {form.type === 'book' && (
        <input
          type="number"
          value={form.pages ?? ''}
          onChange={e => update('pages', parseInt(e.target.value) || undefined)}
          placeholder="Nombre de pages (optionnel)"
          style={inputStyle}
        />
      )}
      {form.type === 'game' && (
        <>
          <input
            value={form.platform ?? ''}
            onChange={e => update('platform', e.target.value || undefined)}
            placeholder="Plateforme (PS5, PC, Switch…)"
            style={inputStyle}
          />
          <input
            value={form.developer ?? ''}
            onChange={e => update('developer', e.target.value || undefined)}
            placeholder="Développeur (optionnel)"
            style={inputStyle}
          />
        </>
      )}

      <textarea
        value={form.notes ?? ''}
        onChange={e => update('notes', e.target.value)}
        placeholder="Notes (optionnel)"
        rows={3}
        style={{ ...inputStyle, resize: 'none' }}
      />

      <motion.button
        type="submit"
        disabled={loading || !form.title || !form.status}
        className="py-3 rounded-[12px] font-semibold relative overflow-hidden"
        style={{ background: '#7C3AED', color: 'white', opacity: loading || !form.title || !form.status ? 0.4 : 1 }}
        whileTap={{ scale: 0.97 }}
      >
        <AnimatePresence mode="wait">
          {done ? (
            <motion.span
              key="done"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center gap-2"
            >
              <Check size={18} /> Ajouté !
            </motion.span>
          ) : (
            <motion.span key="label" exit={{ opacity: 0 }}>
              {loading ? '...' : submitLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </form>
  )
}
