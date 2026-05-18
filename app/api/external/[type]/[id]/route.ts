import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'
const RAWG_BASE = 'https://api.rawg.io/api'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

async function fetchMovieDetails(id: string) {
  const res = await fetch(
    `${TMDB_BASE}/movie/${id}?api_key=${process.env.TMDB_API_KEY}&language=fr&append_to_response=credits`
  )
  if (!res.ok) return null
  const d = await res.json() as Record<string, unknown>
  const credits = d.credits as { cast?: { name: string }[]; crew?: { job: string; name: string }[] } | undefined
  const director = credits?.crew?.find(c => c.job === 'Director')?.name ?? null
  const cast = (credits?.cast ?? []).slice(0, 5).map(c => c.name)
  return {
    title: d.title,
    overview: d.overview ?? null,
    poster_url: d.poster_path ? `${TMDB_IMG}${d.poster_path}` : null,
    backdrop_url: d.backdrop_path ? `https://image.tmdb.org/t/p/w780${d.backdrop_path}` : null,
    year: d.release_date ? parseInt((d.release_date as string).slice(0, 4)) : null,
    runtime_minutes: d.runtime ?? null,
    community_rating: d.vote_average ?? null,
    community_rating_source: 'TMDB',
    director,
    cast,
    genres: (d.genres as { name: string }[] | undefined)?.map(g => g.name) ?? [],
  }
}

async function fetchTVDetails(id: string) {
  const res = await fetch(
    `${TMDB_BASE}/tv/${id}?api_key=${process.env.TMDB_API_KEY}&language=fr&append_to_response=credits`
  )
  if (!res.ok) return null
  const d = await res.json() as Record<string, unknown>
  const credits = d.credits as { cast?: { name: string }[] } | undefined
  const cast = (credits?.cast ?? []).slice(0, 5).map(c => c.name)
  const runtimes = d.episode_run_time as number[] | undefined
  return {
    title: d.name,
    overview: d.overview ?? null,
    poster_url: d.poster_path ? `${TMDB_IMG}${d.poster_path}` : null,
    backdrop_url: d.backdrop_path ? `https://image.tmdb.org/t/p/w780${d.backdrop_path}` : null,
    year: d.first_air_date ? parseInt((d.first_air_date as string).slice(0, 4)) : null,
    total_seasons: d.number_of_seasons ?? null,
    runtime_minutes: runtimes && runtimes.length > 0 ? runtimes[0] : null,
    community_rating: d.vote_average ?? null,
    community_rating_source: 'TMDB',
    cast,
    genres: (d.genres as { name: string }[] | undefined)?.map(g => g.name) ?? [],
  }
}

async function fetchGameDetails(id: string) {
  const res = await fetch(
    `${RAWG_BASE}/games/${id}?key=${process.env.RAWG_API_KEY}`
  )
  if (!res.ok) return null
  const d = await res.json() as Record<string, unknown>
  const developers = (d.developers as { name: string }[] | undefined)?.map(dev => dev.name) ?? []
  return {
    title: d.name,
    overview: typeof d.description_raw === 'string' ? d.description_raw : null,
    poster_url: typeof d.background_image === 'string' ? d.background_image : null,
    backdrop_url: typeof d.background_image === 'string' ? d.background_image : null,
    year: d.released ? parseInt((d.released as string).slice(0, 4)) : null,
    runtime_minutes: d.playtime ? Math.round((d.playtime as number) * 60) : null,
    community_rating: d.rating ?? null,
    community_rating_source: 'RAWG',
    developer: developers[0] ?? null,
    studios: developers,
    genres: (d.genres as { name: string }[] | undefined)?.map(g => g.name) ?? [],
    platforms: (d.platforms as { platform: { name: string } }[] | undefined)?.map(p => p.platform.name) ?? [],
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params

  if (!['movie', 'tvshow', 'game'].includes(type)) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Check cache
  const { data: cached } = await supabase
    .from('media_cache')
    .select('data, cached_at')
    .eq('external_id', id)
    .eq('media_type', type)
    .single()

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at).getTime()
    if (age < CACHE_TTL_MS) {
      return NextResponse.json(cached.data)
    }
  }

  // Fetch from API
  let data: Record<string, unknown> | null = null
  if (type === 'movie') data = await fetchMovieDetails(id)
  else if (type === 'tvshow') data = await fetchTVDetails(id)
  else if (type === 'game') data = await fetchGameDetails(id)

  if (!data) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  // Upsert cache
  await supabase.from('media_cache').upsert({
    external_id: id,
    media_type: type,
    data,
    cached_at: new Date().toISOString(),
  })

  return NextResponse.json(data)
}
