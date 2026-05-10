'use client'
import StarRating from './StarRating'
import type { CriterionValue } from '@/lib/types'

interface CriterionDef {
  label: string
  key: string
}

interface Props {
  criteria: CriterionDef[]
  values: Record<string, CriterionValue>
  onChange: (values: Record<string, CriterionValue>) => void
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: '8px 12px',
  outline: 'none',
  fontSize: '0.8125rem',
  color: 'white',
  width: '100%',
}

export default function CriteriaRating({ criteria, values, onChange }: Props) {
  function updateRating(key: string, rating: number) {
    onChange({ ...values, [key]: { ...(values[key] ?? {}), rating } })
  }

  function updateReview(key: string, review: string) {
    onChange({ ...values, [key]: { ...(values[key] ?? { rating: 0 }), review: review || undefined } })
  }

  return (
    <div className="flex flex-col gap-4">
      {criteria.map(({ label, key }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {label}
            </span>
            <StarRating
              value={values[key]?.rating ?? 0}
              onChange={v => updateRating(key, v)}
            />
          </div>
          <input
            value={values[key]?.review ?? ''}
            onChange={e => updateReview(key, e.target.value)}
            placeholder={`Ton avis sur ${label.toLowerCase()}... (optionnel)`}
            style={inputStyle}
          />
        </div>
      ))}
    </div>
  )
}
