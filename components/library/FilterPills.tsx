'use client'
import type { MediaType } from '@/lib/types'

export type Filter = MediaType | 'all' | 'wishlist'

interface Props {
  filter: Filter
  onFilter: (f: Filter) => void
}

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'movie', label: 'Films' },
  { value: 'tvshow', label: 'Séries' },
  { value: 'game', label: 'Jeux' },
  { value: 'wishlist', label: 'Wishlist' },
]

export default function FilterPills({ filter, onFilter }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {filters.map(f => (
        <button
          key={f.value}
          onClick={() => onFilter(f.value)}
          className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium"
          style={{
            background: filter === f.value ? '#7C3AED' : 'rgba(255,255,255,0.05)',
            color: filter === f.value ? 'white' : 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
