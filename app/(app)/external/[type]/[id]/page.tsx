import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Clock, Tv } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

interface Actor {
  name: string
  character: string
  photo: string | null
}

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
  creators?: string[]
  actors?: Actor[]
  developer?: string | null
  studios?: string[]
  publishers?: string[]
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
const TMDB_IMG_W500 = 'https://image.tmdb.org/t/p/w500'
const TMDB_IMG_W185 = 'https://image.tmdb.org/t/p/w185'
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280'
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
    const credits = d.credits as {
      cast?: { name: string; character: string; profile_path: string | null }[]
      crew?: { job: string; name: string }[]
    } | undefined
    const director = credits?.crew?.find(c => c.job === 'Director')?.name ?? null
    const actors: Actor[] = (credits?.cast ?? []).slice(0, 3).map(c => ({
      name: c.name,
      character: c.character ?? '',
      photo: c.profile_path ? `${TMDB_IMG_W185}${c.profile_path}` : null,
    }))
    return {
      title: d.title as string,
      overview: typeof d.overview === 'string' ? d.overview : null,
      poster_url: d.poster_path ? `${TMDB_IMG_W500}${d.poster_path}` : null,
      backdrop_url: d.backdrop_path ? `${TMDB_BACKDROP}${d.backdrop_path}` : null,
      year: d.release_date ? parseInt((d.release_date as string).slice(0, 4)) : null,
      runtime_minutes: typeof d.runtime === 'number' ? d.runtime : null,
      community_rating: typeof d.vote_average === 'number' ? d.vote_average : null,
      community_rating_source: 'TMDB',
      director,
      actors,
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
    const credits = d.credits as {
      cast?: { name: string; character: string; profile_path: string | null }[]
    } | undefined
    const actors: Actor[] = (credits?.cast ?? []).slice(0, 3).map(c => ({
      name: c.name,
      character: c.character ?? '',
      photo: c.profile_path ? `${TMDB_IMG_W185}${c.profile_path}` : null,
    }))
    const runtimes = d.episode_run_time as number[] | undefined
    const creators = d.created_by as { name: string }[] | undefined
    return {
      title: d.name as string,
      overview: typeof d.overview === 'string' ? d.overview : null,
      poster_url: d.poster_path ? `${TMDB_IMG_W500}${d.poster_path}` : null,
      backdrop_url: d.backdrop_path ? `${TMDB_BACKDROP}${d.backdrop_path}` : null,
      year: d.first_air_date ? parseInt((d.first_air_date as string).slice(0, 4)) : null,
      total_seasons: typeof d.number_of_seasons === 'number' ? d.number_of_seasons : null,
      runtime_minutes: runtimes && runtimes.length > 0 ? runtimes[0] : null,
      community_rating: typeof d.vote_average === 'number' ? d.vote_average : null,
      community_rating_source: 'TMDB',
      creators: creators?.map(c => c.name) ?? [],
      actors,
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
    const publishers = (d.publishers as { name: string }[] | undefined)?.map(p => p.name) ?? []
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
      publishers,
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

  const { data: cached } = await supabase
    .from('media_cache')
    .select('data, cached_at')
    .eq('external_id', id)
    .eq('media_type', type)
    .single()

  let detail: ExternalDetail | null = null

  if (cached) {
    const age = Date.now() - new Date(cached.cached_at as string).getTime()
    const hasActors = (cached.data as Record<string, unknown>).actors !== undefined
    if (age < CACHE_TTL_MS && hasActors) {
      detail = cached.data as ExternalDetail
    }
  }

  if (!detail) {
    detail = await fetchFromSource(type, id)
    if (detail) {
      await supabase.from('media_cache').upsert({
        external_id: id,
        media_type: type,
        data: detail as unknown as Record<string, unknown>,
        cached_at: new Date().toISOString(),
      })
    }
  }

  if (!detail) notFound()

  const heroImg = detail.backdrop_url ?? detail.poster_url
  const addQuery = new URLSearchParams({ q: detail.title ?? '', type })
  const isFilmOrSerie = type === 'movie' || type === 'tvshow'

  return (
    <div className="min-h-screen pb-36">

      {/* ── Hero backdrop ── */}
      <div className="relative overflow-hidden" style={{ height: 300 }}>
        {heroImg && (
          <img
            src={heroImg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* gradient fort vers le bas */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(7,7,13,0.15) 0%, rgba(7,7,13,0.5) 50%, #07070d 100%)',
          }}
        />
        {/* Back button */}
        <Link
          href="/"
          className="absolute glass rounded-full flex items-center justify-center"
          style={{ top: '3rem', left: '1rem', width: 36, height: 36, zIndex: 10 }}
        >
          <ArrowLeft size={18} />
        </Link>
      </div>

      {/* ── Poster flottant + titre ── */}
      <div className="px-4 relative z-10" style={{ marginTop: '-4rem' }}>
        <div className="flex gap-4 mb-5">

          {/* Affiche portrait */}
          {detail.poster_url && (
            <div className="flex-shrink-0 rounded-[14px] overflow-hidden shadow-2xl" style={{ width: 110, height: 165 }}>
              <img
                src={detail.poster_url}
                alt={detail.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Titre + meta */}
          <div className="flex flex-col justify-end pb-1 min-w-0">
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {typeLabel[type] ?? type}{detail.year ? ` · ${detail.year}` : ''}
            </p>
            <h1 className="text-xl font-bold tracking-tight leading-tight mb-2">
              {detail.title}
            </h1>

            {/* Note */}
            {detail.community_rating != null && (
              <div className="flex items-center gap-1 mb-1">
                <Star size={12} fill="rgba(255,200,50,0.9)" stroke="none" />
                <span className="text-sm font-semibold" style={{ color: 'rgba(255,200,50,0.9)' }}>
                  {(detail.community_rating as number).toFixed(1)}
                </span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  / 10 · {detail.community_rating_source}
                </span>
              </div>
            )}

            {/* Durée / Saisons */}
            <div className="flex flex-wrap gap-2">
              {detail.runtime_minutes != null && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <Clock size={10} />
                  {formatRuntime(detail.runtime_minutes as number, type)}
                </span>
              )}
              {detail.total_seasons != null && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <Tv size={10} />
                  {detail.total_seasons} saison{(detail.total_seasons as number) > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Réalisateur / Créateurs */}
            {detail.director && (
              <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Réal. <span style={{ color: 'rgba(255,255,255,0.7)' }}>{detail.director}</span>
              </p>
            )}
            {detail.creators && detail.creators.length > 0 && (
              <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Créé par <span style={{ color: 'rgba(255,255,255,0.7)' }}>{detail.creators.join(', ')}</span>
              </p>
            )}
          </div>
        </div>

        {/* ── Genres ── */}
        {detail.genres && detail.genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {detail.genres.map(g => (
              <span
                key={g}
                className="text-xs px-2.5 py-1 rounded-full"
                style={{
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: 'rgba(180,140,255,0.9)',
                }}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* ── Synopsis ── */}
        {detail.overview && (
          <div className="glass rounded-[20px] p-4 mb-5">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Synopsis
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)' }}>
              {detail.overview}
            </p>
          </div>
        )}

        {/* ── Acteurs (films & séries uniquement) ── */}
        {isFilmOrSerie && detail.actors && detail.actors.length > 0 && (
          <div className="mb-5">
            <p className="text-xs uppercase tracking-widest mb-3 px-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Acteurs principaux
            </p>
            <div className="flex gap-4" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
              {detail.actors.map((actor, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ width: 76 }}>
                  {actor.photo ? (
                    <img
                      src={actor.photo}
                      alt={actor.name}
                      className="rounded-full object-cover"
                      style={{ width: 64, height: 64, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.12)' }}
                    />
                  ) : (
                    <div
                      className="rounded-full flex items-center justify-center text-base font-bold"
                      style={{ width: 64, height: 64, background: 'rgba(139,92,246,0.25)', border: '2px solid rgba(139,92,246,0.3)', color: 'rgba(180,140,255,0.9)' }}
                    >
                      {actor.name[0]}
                    </div>
                  )}
                  <p
                    className="text-xs text-center leading-tight font-semibold"
                    style={{ color: 'rgba(255,255,255,0.88)', width: 76 }}
                  >
                    {actor.name}
                  </p>
                  {actor.character && (
                    <p
                      className="text-xs text-center leading-tight"
                      style={{ color: 'rgba(255,255,255,0.38)', width: 76, marginTop: -2 }}
                    >
                      {actor.character}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Infos jeu ── */}
        {type === 'game' && (detail.studios?.length || detail.publishers?.length || detail.platforms?.length) && (
          <div className="glass rounded-[20px] p-4 mb-5 flex flex-col gap-3">
            {detail.studios && detail.studios.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Développeur</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{detail.studios.join(', ')}</p>
              </div>
            )}
            {detail.publishers && detail.publishers.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Éditeur</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{detail.publishers.join(', ')}</p>
              </div>
            )}
            {detail.platforms && detail.platforms.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Plateformes</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{detail.platforms.slice(0, 5).join(', ')}</p>
              </div>
            )}
          </div>
        )}

        {/* ── CTAs ── */}
        <Link
          href={`/add?${addQuery}`}
          className="w-full rounded-[16px] py-4 flex items-center justify-center text-sm font-semibold mb-3"
          style={{ background: 'var(--color-purple)' }}
        >
          Ajouter à ma bibliothèque
        </Link>
        <Link
          href={`/add?${addQuery}&wishlist=true`}
          className="w-full glass rounded-[16px] py-3 flex items-center justify-center text-sm font-medium"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Ajouter à la wishlist
        </Link>
      </div>
    </div>
  )
}
