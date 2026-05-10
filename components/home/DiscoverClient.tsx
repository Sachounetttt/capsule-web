'use client'
import { useState, useEffect } from 'react'
import DiscoverSection from './DiscoverSection'
import QuickAddSheet from './QuickAddSheet'
import type { MediaType, SearchResult } from '@/lib/types'

export default function DiscoverClient() {
  const [trendingMovies, setTrendingMovies] = useState<SearchResult[]>([])
  const [trendingSeries, setTrendingSeries] = useState<SearchResult[]>([])
  const [trendingGames, setTrendingGames] = useState<SearchResult[]>([])
  const [similar, setSimilar] = useState<SearchResult[]>([])
  const [loadingMovies, setLoadingMovies] = useState(true)
  const [loadingSeries, setLoadingSeries] = useState(true)
  const [loadingGames, setLoadingGames] = useState(true)
  const [loadingSimilar, setLoadingSimilar] = useState(true)
  const [selected, setSelected] = useState<{ item: SearchResult; type: MediaType } | null>(null)

  useEffect(() => {
    fetch('/api/trending?type=movie')
      .then(r => r.json())
      .then(data => setTrendingMovies(Array.isArray(data) ? data : []))
      .catch(() => setTrendingMovies([]))
      .finally(() => setLoadingMovies(false))

    fetch('/api/trending?type=tvshow')
      .then(r => r.json())
      .then(data => setTrendingSeries(Array.isArray(data) ? data : []))
      .catch(() => setTrendingSeries([]))
      .finally(() => setLoadingSeries(false))

    fetch('/api/trending?type=game')
      .then(r => r.json())
      .then(data => setTrendingGames(Array.isArray(data) ? data : []))
      .catch(() => setTrendingGames([]))
      .finally(() => setLoadingGames(false))

    fetch('/api/similar')
      .then(r => r.json())
      .then(data => setSimilar(Array.isArray(data) ? data : []))
      .catch(() => setSimilar([]))
      .finally(() => setLoadingSimilar(false))
  }, [])

  return (
    <>
      <DiscoverSection
        title="Tendances Films"
        items={trendingMovies}
        loading={loadingMovies}
        onSelect={item => setSelected({ item, type: 'movie' })}
      />
      <DiscoverSection
        title="Tendances Séries"
        items={trendingSeries}
        loading={loadingSeries}
        onSelect={item => setSelected({ item, type: 'tvshow' })}
      />
      <DiscoverSection
        title="Tendances Jeux"
        items={trendingGames}
        loading={loadingGames}
        onSelect={item => setSelected({ item, type: 'game' })}
      />
      <DiscoverSection
        title="Tu pourrais aimer"
        items={similar}
        loading={loadingSimilar}
        onSelect={item => setSelected({ item, type: 'movie' })}
      />
      <QuickAddSheet
        item={selected?.item ?? null}
        mediaType={selected?.type ?? 'movie'}
        onClose={() => setSelected(null)}
      />
    </>
  )
}
