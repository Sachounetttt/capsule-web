'use client'
import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import FilterPills, { type Filter, type StatusFilter } from '@/components/library/FilterPills'
import MediaCard from '@/components/library/MediaCard'
import CoopCard from '@/components/library/CoopCard'
import ShimmerCard from '@/components/ui/ShimmerCard'
import type { MediaItem, MediaStatus } from '@/lib/types'

interface CoopCapsuleSummary {
  id: string
  title: string
  poster_url?: string
  my_status: MediaStatus
  members: { user_id: string; profile: { id: string; display_name: string; avatar_url?: string } | null }[]
}

export default function LibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [wishlistItems, setWishlistItems] = useState<MediaItem[]>([])
  const [coopCapsules, setCoopCapsules] = useState<CoopCapsuleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/media').then(r => r.json()),
      fetch('/api/media?wishlist=true').then(r => r.json()),
      fetch('/api/shared-capsules').then(r => r.json()),
    ]).then(([lib, wish, coop]) => {
      if (lib.status === 'fulfilled') setItems(Array.isArray(lib.value) ? lib.value : [])
      if (wish.status === 'fulfilled') setWishlistItems(Array.isArray(wish.value) ? wish.value : [])
      if (coop.status === 'fulfilled') setCoopCapsules(Array.isArray(coop.value) ? coop.value : [])
      setLoading(false)
    })
  }, [])

  const displayed = useMemo(() => {
    const source = filter === 'wishlist' ? wishlistItems : items
    let list = [...source]
    if (filter !== 'all' && filter !== 'wishlist') list = list.filter(i => i.type === filter)
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter)
    if (query) list = list.filter(i => i.title.toLowerCase().includes(query.toLowerCase()))
    return list
  }, [items, wishlistItems, filter, statusFilter, query])

  const displayedCoop = useMemo(() => {
    if (filter !== 'game') return []
    if (query) return coopCapsules.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
    return coopCapsules
  }, [coopCapsules, filter, query])

  const visible = useMemo(
    () => (showAll ? displayed : displayed.slice(0, 5)),
    [displayed, showAll]
  )

  function handleFilterChange(f: Filter) {
    setFilter(f)
    setStatusFilter('all')
    setShowAll(false)
  }

  function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    setWishlistItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="px-4 pb-28" style={{ paddingTop: '3.5rem' }}>
      <h1 className="text-3xl font-bold tracking-tight mb-4">Bibliothèque</h1>

      <div className="glass rounded-[12px] flex items-center gap-2 px-3 py-2 mb-3">
        <Search size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setShowAll(false) }}
          placeholder="Rechercher..."
          className="bg-transparent flex-1 outline-none text-sm"
          style={{ color: 'white' }}
        />
      </div>

      <div className="mb-4">
        <FilterPills
          filter={filter}
          onFilter={handleFilterChange}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
        />
      </div>

      <div className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <ShimmerCard key={i} className="h-24" />)
          : <>
              {/* Personal items — hide games that have a matching coop capsule */}
              {(() => {
                const coopTitles = new Set(displayedCoop.map(c => c.title.toLowerCase().trim()))
                const filteredVisible = (filter === 'all' || filter === 'game')
                  ? visible.filter(item => !(item.type === 'game' && coopTitles.has(item.title.toLowerCase().trim())))
                  : visible
                return filteredVisible.map((item, i) => (
                  <MediaCard key={item.id} item={item} index={i} onDelete={handleDelete} />
                ))
              })()}

              {/* Coop section */}
              {displayedCoop.length > 0 && (
                <>
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mt-2 mb-1"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    Avec vos amis
                  </p>
                  {displayedCoop.map((item, i) => (
                    <CoopCard key={item.id} item={item} index={i} />
                  ))}
                </>
              )}
            </>
        }
        {!loading && displayed.length === 0 && displayedCoop.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Aucun élément
          </p>
        )}
      </div>

      {!loading && !showAll && displayed.length > 5 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full mt-3 py-3 rounded-[12px] text-sm font-medium"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          Afficher plus ({displayed.length - 5} de plus)
        </button>
      )}
    </div>
  )
}
