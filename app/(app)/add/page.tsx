'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { X, Search } from 'lucide-react'
import SearchResults from '@/components/add/SearchResults'
import MediaForm from '@/components/add/MediaForm'
import type { MediaType, MediaItem, SearchResult } from '@/lib/types'

const types: { value: MediaType; label: string }[] = [
  { value: 'movie', label: 'Film' },
  { value: 'tvshow', label: 'Série' },
  { value: 'game', label: 'Jeu' },
]

function AddPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mediaType, setMediaType] = useState<MediaType>('movie')
  const [destination, setDestination] = useState<'library' | 'wishlist'>('library')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [typeFromUrl, setTypeFromUrl] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Lire les query params après le mount pour éviter la divergence server/client
  useEffect(() => {
    const type = searchParams.get('type') as MediaType | null
    if (type) {
      setMediaType(type)
      setTypeFromUrl(true)
    }
    const title = searchParams.get('title')
    if (title) {
      setSelected({
        title,
        year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
        poster_url: searchParams.get('poster_url') ?? undefined,
      })
    }
  }, [searchParams])

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${mediaType}`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [query, mediaType])

  async function handleSubmit(formData: Omit<MediaItem, 'id' | 'date_added'>) {
    const payload = { ...formData, type: mediaType, wishlist: destination === 'wishlist' }

    if (selected?.poster_url) {
      try {
        const colorRes = await fetch(`/api/color?url=${encodeURIComponent(selected.poster_url)}`)
        if (colorRes.ok) {
          const { color } = await colorRes.json()
          payload.dominant_color = color
        }
      } catch { /* non-blocking */ }
    }

    const res = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
      alert(`Erreur lors de l'ajout : ${err.error}`)
      return
    }

    setTimeout(() => router.push(destination === 'wishlist' ? '/wishlist' : '/library'), 800)
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-0 overflow-y-auto"
      style={{ background: 'var(--color-bg)', zIndex: 50 }}
    >
      <div className="px-4 pb-8" style={{ paddingTop: '3.5rem' }}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Ajouter</h1>
          <button
            onClick={() => router.back()}
            className="glass rounded-full flex items-center justify-center"
            style={{ width: 36, height: 36 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Destination toggle */}
        <div className="flex gap-2 mb-4">
          {(['library', 'wishlist'] as const).map(dest => (
            <button
              key={dest}
              onClick={() => setDestination(dest)}
              className="flex-1 py-2 rounded-[12px] text-sm font-medium"
              style={{
                background: destination === dest ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
              }}
            >
              {dest === 'library' ? 'Bibliothèque' : 'Wishlist'}
            </button>
          ))}
        </div>

        {/* Type selector */}
        {!typeFromUrl && (
          <div className="flex gap-2 mb-4">
            {types.map(t => (
              <button
                key={t.value}
                onClick={() => { setMediaType(t.value); setSelected(null); setResults([]); setQuery('') }}
                className="flex-1 py-2 rounded-[12px] text-sm font-medium"
                style={{
                  background: mediaType === t.value ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${mediaType === t.value ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  color: 'white',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        {!selected && (
          <>
            <div className="glass rounded-[12px] flex items-center gap-2 px-3 py-2 mb-4">
              <Search size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Rechercher un ${
                  mediaType === 'movie' ? 'film' :
                  mediaType === 'tvshow' ? 'série' : 'jeu'
                }...`}
                className="bg-transparent flex-1 outline-none text-sm"
                style={{ color: 'white' }}
                autoFocus
              />
            </div>
            {(results.length > 0 || searching) && (
              <div className="mb-6">
                <SearchResults results={results} loading={searching} onSelect={setSelected} />
              </div>
            )}
          </>
        )}

        {/* Wishlist quick save */}
        {destination === 'wishlist' && selected ? (
          <div className="flex flex-col gap-4">
            <div className="glass rounded-[20px] p-4 flex items-center gap-3">
              <p className="text-sm font-medium flex-1 truncate">{selected.title}</p>
              {selected.year && (
                <p className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{selected.year}</p>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSubmit({
                type: mediaType,
                title: selected.title,
                year: selected.year,
                poster_url: selected.poster_url,
                status: 'inProgress',
                notes: '',
                wishlist: true,
                community_rating: selected.community_rating,
                community_rating_source: selected.community_rating_source,
              })}
              className="py-3 rounded-[12px] font-semibold"
              style={{ background: '#F87171', color: 'white' }}
            >
              Ajouter à la wishlist
            </motion.button>
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-center"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              ← Chercher à nouveau
            </button>
          </div>
        ) : (
          <>
            <MediaForm
              key={selected?.title ?? 'empty'}
              wishlist={destination === 'wishlist'}
              initial={
                selected
                  ? {
                      type: mediaType,
                      title: selected.title,
                      year: selected.year,
                      poster_url: selected.poster_url,
                      director: selected.director,
                      total_seasons: selected.total_seasons,
                      platform: selected.platform,
                      developer: selected.developer,
                      community_rating: selected.community_rating,
                      community_rating_source: selected.community_rating_source,
                      status: 'inProgress',
                      notes: '',
                    }
                  : { type: mediaType, status: 'inProgress', notes: '' }
              }
              onSubmit={handleSubmit}
              submitLabel="Ajouter à la bibliothèque"
            />
            {selected && (
              <button
                onClick={() => setSelected(null)}
                className="w-full mt-3 text-sm text-center"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                ← Chercher à nouveau
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

export default function AddPage() {
  return (
    <Suspense>
      <AddPageInner />
    </Suspense>
  )
}
