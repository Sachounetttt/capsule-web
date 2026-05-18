import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Clock } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

interface ExternalDetail {
  title: string
  overview?: string | null
  poster_url?: string | null
  backdrop_url?: string | null
  year?: number | null
  runtime_minutes?: number | null
  community_rating?: number | null
  community_rating_source?: string | null
  director?: string | null
  cast?: string[]
  developer?: string | null
  studios?: string[]
  genres?: string[]
  platforms?: string[]
  total_seasons?: number | null
}

const typeLabel: Record<string, string> = { movie: 'Film', tvshow: 'Série', game: 'Jeu' }

function formatRuntime(minutes: number, type: string): string {
  if (type === 'game') {
    const hours = Math.round(minutes / 60)
    return `~${hours}h de jeu`
  }
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m}min`
}

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'
const RAWG_BASE = 'https://api.rawg.io/api'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

async function fetchFromSource(type: string, id: string): Promise<ExternalDetail | null> {
  if (type === 'movie') {
    const res = await fetch(
      `${TMDB_BASE}/movie/${id}?api_key=${process.env.TMDB_API_KEY}&language=fr&append_to_response=credits`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const d = await res.json() as Record<string, unknown>
    const credits = d.credits as { cast?: { name: string }[]; crew?: { job: string; name: string }[] } | undefined
    const director = credits?.crew?.find(c => c.job === 'Director')?.name ?? null
    const cast = (credits?.cast ?? []).slice(0, 5).map(c => c.name)
    return {
      title: d.title as string,
      overview: typeof d.overview === 'string' ? d.overview : null,
      poster_url: d.poster_path ? `${TMDB_IMG}${d.poster_path}` : null,
      backdrop_url: d.backdrop_path ? `https://image.tmdb.org/t/p/w780${d.backdrop_path}` : null,
      year: d.release_date ? parseInt((d.release_date as string).slice(0, 4)) : null,
      runtime_minutes: typeof d.runtime === 'number' ? d.runtime : null,
      community_rating: typeof d.vote_average === 'number' ? d.vote_average : null,
      community_rating_source: 'TMDB',
      director,
      cast,
      genres: (d.genres as { name: string }[] | undefined)?.map(g => g.name) ?? [],
    }
  }
  if (type === 'tvshow') {
    const res = await fetch(
      `${TMDB_BASE}/tv/${id}?api_key=${process.env.TMDB_API_KEY}&language=fr&append_to_response=credits`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const d = await res.json() as Record<string, unknown>
    const credits = d.credits as { cast?: { name: string }[] } | undefined
    const cast = (credits?.cast ?? []).slice(0, 5).map(c => c.name)
    const runtimes = d.episode_run_time as number[] | undefined
    return {
      title: d.name as string,
      overview: typeof d.overview === 'string' ? d.overview : null,
      poster_url: d.poster_path ? `${TMDB_IMG}${d.poster_path}` : null,
      backdrop_url: d.backdrop_path ? `https://image.tmdb.org/t/p/w780${d.backdrop_path}` : null,
      year: d.first_air_date ? parseInt((d.first_air_date as string).slice(0, 4)) : null,
      total_seasons: typeof d.number_of_seasons === 'number' ? d.number_of_seasons : null,
      runtime_minutes: runtimes && runtimes.length > 0 ? runtimes[0] : null,
      community_rating: typeof d.vote_average === 'number' ? d.vote_average : null,
      community_rating_source: 'TMDB',
      cast,
      genres: (d.genres as { name: string }[] | undefined)?.map(g => g.name) ?? [],
    }
  }
  if (type === 'game') {
    const res = await fetch(
      `${RAWG_BASE}/games/${id}?key=${process.env.RAWG_API_KEY}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const d = await res.json() as Record<string, unknown>
    const developers = (d.developers as { name: string }[] | undefined)?.map(dev => dev.name) ?? []
    return {
      title: d.name as string,
      overview: typeof d.description_raw === 'string' ? d.description_raw : null,
      poster_url: typeof d.background_image === 'string' ? d.background_image : null,
      backdrop_url: typeof d.background_image === 'string' ? d.background_image : null,
      year: d.released ? parseInt((d.released as string).slice(0, 4)) : null,
      runtime_minutes: typeof d.playtime === 'number' ? Math.round(d.playtime * 60) : null,
      community_rating: typeof d.rating === 'number' ? d.rating : null,
      community_rating_source: 'RAWG',
      developer: developers[0] ?? null,
      studios: developers,
      genres: (d.genres as { name: string }[] | undefined)?.map(g => g.name) ?? [],
      platforms: (d.platforms as { platform: { name: string } }[] | undefined)?.map(p => p.platform.name) ?? [],
    }
  }
  return null
}

export default async function ExternalDetailPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>
}) {
  const { type, id } = await params

  if (!['movie', 'tvshow', 'game'].includes(type)) notFound()

  const supabase = createServerClient()

  // Check Supabase cache first
  const { data: cached } = await supabase
    .from('media_cache')
    .select('data, cached_at')
    .eq('external_id', id)
    .eq('media_type', type)
    .single()

  let detail: ExternalDetail | null = null

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at as string).getTime()
    if (age < CACHE_TTL_MS) {
      detail = cached.data as ExternalDetail
    }
  }

  if (!detail) {
    detail = await fetchFromSource(type, id)
    if (detail) {
      // Store in cache for next time
      await supabase.from('media_cache').upsert({
        external_id: id,
        media_type: type,
        data: detail as unknown as Record<string, unknown>,
        cached_at: new Date().toISOString(),
      })
    }
  }

  if (!detail) notFound()

  const addQuery = new URLSearchParams({ q: detail.title ?? '', type })

  return (
    <div className="min-h-screen pb-32">
      {/* Backdrop */}
      {detail.backdrop_url && (
        <div className="relative h-56 overflow-hidden">
          <img src={detail.backdrop_url} alt="" className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, transparent 30%, #07070d)' }}
          />
        </div>
      )}

      {/* Back button */}
      <div className="fixed top-0 left-0 right-0 z-10 px-4 pt-12">
        <Link
          href="/"
          className="glass rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36 }}
        >
          <ArrowLeft size={18} />
        </Link>
      </div>

      <div
        className="px-4 relative z-10"
        style={{ marginTop: detail.backdrop_url ? '-2rem' : '5rem' }}
      >
        {/* Type + year + director/developer */}
        <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {typeLabel[type] ?? type}
          {detail.year ? ` · ${detail.year}` : ''}
          {detail.director ? ` · Réal. ${detail.director}` : ''}
          {detail.developer ? ` · ${detail.developer}` : ''}
        </p>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight mb-3">{detail.title}</h1>

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {detail.community_rating != null && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <Star size={10} />
              {(detail.community_rating as number).toFixed(1)} · {detail.community_rating_source}
            </span>
          )}
          {detail.runtime_minutes != null && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <Clock size={10} />
              {formatRuntime(detail.runtime_minutes as number, type)}
            </span>
          )}
          {detail.total_seasons != null && (
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {detail.total_seasons} saison{(detail.total_seasons as number) > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Synopsis */}
        {detail.overview && (
          <div className="glass rounded-[20px] p-4 mb-4">
            <p
              className="text-xs uppercase tracking-widest mb-2"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Synopsis
            </p>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              {detail.overview}
            </p>
          </div>
        )}

        {/* Cast */}
        {detail.cast && detail.cast.length > 0 && (
          <div className="glass rounded-[20px] p-4 mb-4">
            <p
              className="text-xs uppercase tracking-widest mb-2"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Acteurs principaux
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {detail.cast.join(', ')}
            </p>
          </div>
        )}

        {/* Studios */}
        {detail.studios && detail.studios.length > 0 && (
          <div className="glass rounded-[20px] p-4 mb-4">
            <p
              className="text-xs uppercase tracking-widest mb-2"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Studio
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {detail.studios.join(', ')}
            </p>
          </div>
        )}

        {/* Genres */}
        {detail.genres && detail.genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {detail.genres.map(g => (
              <span
                key={g}
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                }}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Add to library CTA */}
        <Link
          href={`/add?${addQuery}`}
          className="w-full rounded-[16px] py-4 flex items-center justify-center gap-2 text-sm font-semibold mb-3"
          style={{ background: 'var(--color-purple)' }}
        >
          Ajouter à ma bibliothèque
        </Link>
        <Link
          href={`/add?${addQuery}&wishlist=true`}
          className="w-full glass rounded-[16px] py-3 flex items-center justify-center gap-2 text-sm font-medium"
        >
          Ajouter à la wishlist
        </Link>
      </div>
    </div>
  )
}
