import type { SearchResult } from './types'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

export function buildMovieResult(raw: Record<string, unknown>): SearchResult {
  return {
    title: raw.title as string,
    year: raw.release_date
      ? parseInt((raw.release_date as string).slice(0, 4))
      : undefined,
    poster_url: raw.poster_path
      ? `${TMDB_IMG}${raw.poster_path}`
      : undefined,
    community_rating: raw.vote_average ? (raw.vote_average as number) : undefined,
    community_rating_source: raw.vote_average ? 'TMDB' : undefined,
  }
}

export function buildTVResult(raw: Record<string, unknown>): SearchResult {
  return {
    title: raw.name as string,
    year: raw.first_air_date
      ? parseInt((raw.first_air_date as string).slice(0, 4))
      : undefined,
    poster_url: raw.poster_path
      ? `${TMDB_IMG}${raw.poster_path}`
      : undefined,
    community_rating: raw.vote_average ? (raw.vote_average as number) : undefined,
    community_rating_source: raw.vote_average ? 'TMDB' : undefined,
  }
}

export async function searchMovies(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&api_key=${process.env.TMDB_API_KEY}`
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? []).slice(0, 8).map(buildMovieResult)
}

export async function searchTV(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${TMDB_BASE}/search/tv?query=${encodeURIComponent(query)}&api_key=${process.env.TMDB_API_KEY}`
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? []).slice(0, 8).map(buildTVResult)
}

const RAWG_BASE = 'https://api.rawg.io/api'

export function buildGameResult(raw: Record<string, unknown>): SearchResult {
  return {
    title: raw.name as string,
    year: raw.released ? parseInt((raw.released as string).slice(0, 4)) : undefined,
    poster_url: (raw.background_image as string | null) ?? undefined,
    community_rating: raw.rating ? (raw.rating as number) : undefined,
    community_rating_source: raw.rating ? 'RAWG' : undefined,
  }
}

export async function searchGames(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${RAWG_BASE}/games?search=${encodeURIComponent(query)}&page_size=8&key=${process.env.RAWG_API_KEY}`
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? []).map(buildGameResult)
}
