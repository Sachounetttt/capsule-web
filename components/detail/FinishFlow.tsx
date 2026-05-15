'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CriteriaRating from '@/components/ui/CriteriaRating'
import CapsuleBurst from '@/components/detail/CapsuleBurst'
import type { MediaType, CriterionValue } from '@/lib/types'

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
  game: [
    { label: 'Graphisme', key: 'graphisme' },
    { label: 'Histoire', key: 'histoire' },
    { label: 'Gameplay', key: 'gameplay' },
    { label: 'Level Design', key: 'leveldesign' },
  ],
  game_online: [
    { label: 'Graphisme', key: 'graphisme' },
    { label: 'Gameplay', key: 'gameplay' },
  ],
}

interface Props {
  itemId: string
  mediaType: MediaType
  online?: boolean
}

export default function FinishFlow({ itemId, mediaType, online }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'button' | 'form' | 'celebrating'>('button')
  const [ratings, setRatings] = useState<Record<string, CriterionValue>>({})
  const [loading, setLoading] = useState(false)

  const criteriaKey = mediaType === 'game' && online ? 'game_online' : mediaType
  const criteria = CRITERIA[criteriaKey] ?? []
  const finishLabel = mediaType === 'game' && online ? "J'arrête d'y jouer" : "J'ai terminé !"

  async function handleConfirm() {
    setLoading(true)
    await fetch(`/api/media/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', ratings_json: ratings }),
    })
    setStep('celebrating')
  }

  if (step === 'celebrating') {
    return <CapsuleBurst onComplete={() => router.push('/library')} />
  }

  if (step === 'button') {
    return (
      <button
        onClick={() => setStep('form')}
        className="w-full py-3 rounded-[12px] font-semibold mb-4"
        style={{ background: '#7C3AED', color: 'white' }}
      >
        {finishLabel}
      </button>
    )
  }

  return (
    <div className="glass rounded-[20px] p-4 mb-4 flex flex-col gap-4">
      <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Comment c'était ?
      </p>
      {criteria.length > 0 && (
        <CriteriaRating
          criteria={criteria}
          values={ratings}
          onChange={setRatings}
        />
      )}
      <div className="flex gap-3">
        <button
          onClick={() => setStep('button')}
          className="flex-1 py-3 rounded-[12px] text-sm font-medium"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
          }}
        >
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 py-3 rounded-[12px] text-sm font-semibold"
          style={{ background: '#7C3AED', color: 'white', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '...' : 'Confirmer'}
        </button>
      </div>
    </div>
  )
}
