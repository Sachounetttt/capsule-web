'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DiscoverSection from './DiscoverSection'
import type { MediaType, SearchResult } from '@/lib/types'

export default function DiscoverClient() {
  const router = useRouter()
  const [trendingMovies, setTrendingMovies] = useState<SearchResult[]>([])
  const [trendingSeries, setTrendingSeries] = useState<SearchResult[]>([])
  const [trendingGames, setTrendingGames] = useState<SearchResult[]>([])
  const [similar, setSimilar] = useState<SearchResult[]>([])
  const [loadingMovies, setLoadingMovies] = useState(true)
  const [loadingSeries, setLoadingSeries] = useState(true)
  const [loadingGames, setLoadingGames] = useState(true)
  const [loadingSimilar, setLoadingSimilar] = useState(true)

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

  function navigateToItem(item: SearchResult, mediaType: MediaType) {
    if (item.external_id) {
      router.push(`/external/${mediaType}/${item.external_id}`)
    } else {
      router.push(`/add?q=${encodeURIComponent(item.title)}&type=${mediaType}`)
    }
  }

  return (
    <>
      <DiscoverSection
        title="Tendances Films"
        items={trendingMovies}
        loading={loadingMovies}
        onSelect={item => navigateToItem(item, 'movie')}
      />
      <DiscoverSection
        title="Tendances Séries"
        items={trendingSeries}
        loading={loadingSeries}
        onSelect={item => navigateToItem(item, 'tvshow')}
      />
      <DiscoverSection
        title="Tendances Jeux"
        items={trendingGames}
        loading={loadingGames}
        onSelect={item => navigateToItem(item, 'game')}
      />
      <DiscoverSection
        title="Tu pourrais aimer"
        items={similar}
        loading={loadingSimilar}
        onSelect={item => navigateToItem(item, 'movie')}
      />
    </>
  )
}
