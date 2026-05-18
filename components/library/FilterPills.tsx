'use client'
import type { MediaType } from '@/lib/types'

export type Filter = MediaType | 'all' | 'wishlist'
export type StatusFilter = 'all' | 'completed' | 'inProgress' | 'coop'

interface Props {
  filter: Filter
  onFilter: (f: Filter) => void
  statusFilter: StatusFilter
  onStatusFilter: (s: StatusFilter) => void
}

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'movie', label: 'Films' },
  { value: 'tvshow', label: 'Séries' },
  { value: 'game', label: 'Jeux' },
  { value: 'wishlist', label: 'Wishlist' },
]

const statusFiltersBase: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'completed', label: 'Terminé' },
  { value: 'inProgress', label: 'En cours' },
]

export default function FilterPills({ filter, onFilter, statusFilter, onStatusFilter }: Props) {
  const statusFilters = filter === 'game'
    ? [...statusFiltersBase, { value: 'coop' as StatusFilter, label: 'Coop' }]
    : statusFiltersBase

  return (
    <div className="flex flex-col gap-2">
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
      {filter !== 'wishlist' && (
        <div className="flex gap-2">
          {statusFilters.map(s => (
            <button
              key={s.value}
              onClick={() => onStatusFilter(s.value)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: statusFilter === s.value ? 'rgba(124,58,237,0.2)' : 'transparent',
                color: statusFilter === s.value ? '#A78BFA' : 'rgba(255,255,255,0.3)',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
