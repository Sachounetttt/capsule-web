'use client'
import type { MediaType } from '@/lib/types'

type Filter = MediaType | 'all'
type Sort = 'date' | 'rating' | 'title'

interface Props {
  filter: Filter
  sort: Sort
  onFilter: (f: Filter) => void
  onSort: (s: Sort) => void
}

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'movie', label: 'Films' },
  { value: 'tvshow', label: 'Séries' },
  { value: 'game', label: 'Jeux' },
]

export default function FilterPills({ filter, sort, onFilter, onSort }: Props) {
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
      <div className="w-px shrink-0 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
      {(['date', 'rating', 'title'] as Sort[]).map(s => (
        <button
          key={s}
          onClick={() => onSort(s)}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs"
          style={{
            background: sort === s ? 'rgba(124,58,237,0.2)' : 'transparent',
            color: sort === s ? '#A78BFA' : 'rgba(255,255,255,0.3)',
          }}
        >
          {s === 'date' ? 'Date' : s === 'rating' ? 'Note' : 'Titre'}
        </button>
      ))}
    </div>
  )
}
