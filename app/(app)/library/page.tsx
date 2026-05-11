'use client'
import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import FilterPills from '@/components/library/FilterPills'
import MediaCard from '@/components/library/MediaCard'
import ShimmerCard from '@/components/ui/ShimmerCard'
import type { MediaItem, MediaType } from '@/lib/types'

type Filter = MediaType | 'all'
type Sort = 'date' | 'rating' | 'title'

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('date')

  useEffect(() => {
    fetch('/api/media')
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const displayed = useMemo(() => {
    let list = [...items]
    if (filter !== 'all') list = list.filter(i => i.type === filter)
    if (query) list = list.filter(i => i.title.toLowerCase().includes(query.toLowerCase()))
    if (sort === 'rating') list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    else if (sort === 'title') list.sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [items, filter, sort, query])

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="px-4 pb-4" style={{ paddingTop: '3.5rem' }}>
      <h1 className="text-3xl font-bold tracking-tight mb-4">Bibliothèque</h1>

      {/* Search bar */}
      <div
        className="glass rounded-[12px] flex items-center gap-2 px-3 py-2 mb-3"
      >
        <Search size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher..."
          className="bg-transparent flex-1 outline-none text-sm"
          style={{ color: 'white' }}
        />
      </div>

      {/* Filter pills */}
      <div className="mb-4">
        <FilterPills filter={filter} sort={sort} onFilter={setFilter} onSort={setSort} />
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <ShimmerCard key={i} className="h-24" />
            ))
          : displayed.map((item, i) => (
              <MediaCard key={item.id} item={item} index={i} onDelete={handleDelete} />
            ))
        }
        {!loading && displayed.length === 0 && (
          <p
            className="text-center py-12 text-sm"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            Aucun élément
          </p>
        )}
      </div>
    </div>
  )
}
