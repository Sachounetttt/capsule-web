'use client'
import { useState, useEffect } from 'react'
import DiscoverSection from '@/components/home/DiscoverSection'
import type { MediaType, SearchResult } from '@/lib/types'

function getHref(item: SearchResult, mediaType: MediaType): string {
  if (item.external_id) return `/external/${mediaType}/${item.external_id}`
  return `/external/${mediaType}/find?q=${encodeURIComponent(item.title)}`
}

export default function DiscoverPage() {
  const [trendingMovies, setTrendingMovies] = useState<SearchResult[]>([])
  const [trendingSeries, setTrendingSeries] = useState<SearchResult[]>([])
  const [trendingGames, setTrendingGames] = useState<SearchResult[]>([])
  const [topMovies, setTopMovies] = useState<SearchResult[]>([])
  const [topGames, setTopGames] = useState<SearchResult[]>([])
  const [loadingTrendingMovies, setLoadingTrendingMovies] = useState(true)
  const [loadingTrendingSeries, setLoadingTrendingSeries] = useState(true)
  const [loadingTrendingGames, setLoadingTrendingGames] = useState(true)
  const [loadingTopMovies, setLoadingTopMovies] = useState(true)
  const [loadingTopGames, setLoadingTopGames] = useState(true)

  useEffect(() => {
    fetch('/api/trending?type=movie')
      .then(r => r.json()).then(d => setTrendingMovies(Array.isArray(d) ? d : [])).catch(() => setTrendingMovies([])).finally(() => setLoadingTrendingMovies(false))

    fetch('/api/trending?type=tvshow')
      .then(r => r.json()).then(d => setTrendingSeries(Array.isArray(d) ? d : [])).catch(() => setTrendingSeries([])).finally(() => setLoadingTrendingSeries(false))

    fetch('/api/trending?type=game')
      .then(r => r.json()).then(d => setTrendingGames(Array.isArray(d) ? d : [])).catch(() => setTrendingGames([])).finally(() => setLoadingTrendingGames(false))

    fetch('/api/top?type=movie')
      .then(r => r.json()).then(d => setTopMovies(Array.isArray(d) ? d : [])).catch(() => setTopMovies([])).finally(() => setLoadingTopMovies(false))

    fetch('/api/top?type=game')
      .then(r => r.json()).then(d => setTopGames(Array.isArray(d) ? d : [])).catch(() => setTopGames([])).finally(() => setLoadingTopGames(false))
  }, [])

  return (
    <div className="pb-28" style={{ paddingTop: '3.5rem' }}>
      <h1 className="text-3xl font-bold tracking-tight mb-6 px-4">Découvrir</h1>
      <DiscoverSection
        title="Tendances Films"
        items={trendingMovies}
        loading={loadingTrendingMovies}
        getHref={item => getHref(item, 'movie')}
      />
      <DiscoverSection
        title="Tendances Séries"
        items={trendingSeries}
        loading={loadingTrendingSeries}
        getHref={item => getHref(item, 'tvshow')}
      />
      <DiscoverSection
        title="Tendances Jeux"
        items={trendingGames}
        loading={loadingTrendingGames}
        getHref={item => getHref(item, 'game')}
      />
      <DiscoverSection
        title="Les mieux notés — Films"
        items={topMovies}
        loading={loadingTopMovies}
        getHref={item => getHref(item, 'movie')}
      />
      <DiscoverSection
        title="Les mieux notés — Jeux"
        items={topGames}
        loading={loadingTopGames}
        getHref={item => getHref(item, 'game')}
      />
    </div>
  )
}
