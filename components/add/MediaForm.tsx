'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import CriteriaRating from '@/components/ui/CriteriaRating'
import type { MediaItem, MediaStatus, CriterionValue } from '@/lib/types'

type FormData = Omit<MediaItem, 'id' | 'date_added'>

interface Props {
  initial: Partial<FormData>
  onSubmit: (data: FormData) => Promise<void>
  submitLabel?: string
  wishlist?: boolean
}

const statusOptions: { value: MediaStatus; label: string }[] = [
  { value: 'completed', label: 'Terminé' },
  { value: 'inProgress', label: 'En cours' },
]

const CRITERIA: Record<string, { label: string; key: string }[]> = {
  movie: [
    { label: 'Histoire', key: 'histoire' },
    { label: 'Réalisation', key: 'realisation' },
    { label: 'Acteurs', key: 'acteurs' },
    { label: 'Musique', key: 'musique' },
  ],
  tvshow: [
    { label: 'Histoire', key: 'histoire' },
    { label: 'Acteurs', key: 'acteurs' },
    { label: 'Réalisation', key: 'realisation' },
    { label: 'Rythme', key: 'rythme' },
  ],
  book: [
    { label: 'Histoire', key: 'histoire' },
    { label: 'Écriture', key: 'ecriture' },
    { label: 'Personnages', key: 'personnages' },
    { label: 'Univers', key: 'univers' },
  ],
  game: [
    { label: 'Graphisme', key: 'graphisme' },
    { label: 'Histoire', key: 'histoire' },
    { label: 'Gameplay', key: 'gameplay' },
    { label: 'Level Design', key: 'leveldesign' },
  ],
}

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

export default function MediaForm({ initial, onSubmit, submitLabel = 'Ajouter', wishlist = false }: Props) {
  const [form, setForm] = useState<Partial<FormData>>(initial)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function update(key: keyof FormData, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.type) return
    if (!wishlist && !form.status) return
    setLoading(true)
    await onSubmit(form as FormData)
    setDone(true)
    setLoading(false)
  }

  const criteria = form.type ? (CRITERIA[form.type] ?? []) : []

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        value={form.title ?? ''}
        onChange={e => update('title', e.target.value)}
        placeholder="Titre"
        style={inputStyle}
        required
      />

      {criteria.length > 0 && form.status === 'completed' && (
        <div>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Notes</p>
          <CriteriaRating
            criteria={criteria}
            values={(form.ratings_json ?? {}) as Record<string, CriterionValue>}
            onChange={v => update('ratings_json', v)}
          />
        </div>
      )}

      {!wishlist && (
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
      )}

      {form.type === 'movie' && (
        <input
          value={form.director ?? ''}
          onChange={e => update('director', e.target.value || undefined)}
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
        disabled={loading || !form.title || (!wishlist && !form.status)}
        className="py-3 rounded-[12px] font-semibold relative overflow-hidden"
        style={{
          background: '#7C3AED',
          color: 'white',
          opacity: loading || !form.title || (!wishlist && !form.status) ? 0.4 : 1,
        }}
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
