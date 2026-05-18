import { NextRequest, NextResponse } from 'next/server'
import type { SearchResult } from '@/lib/types'
import { buildGameResult } from '@/lib/search'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'
const RAWG_BASE = 'https://api.rawg.io/api'

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') ?? 'movie'

  if (type === 'game') {
    try {
      const res = await fetch(
        `${RAWG_BASE}/games?ordering=-added&page_size=12&key=${process.env.RAWG_API_KEY}`
      )
      if (!res.ok) return NextResponse.json([], { status: 200 })
      const data = await res.json()
      return NextResponse.json((data.results ?? []).map(buildGameResult))
    } catch {
      return NextResponse.json([], { status: 200 })
    }
  }

  const endpoint = type === 'tvshow' ? 'tv' : 'movie'
  try {
    const res = await fetch(
      `${TMDB_BASE}/trending/${endpoint}/week?api_key=${process.env.TMDB_API_KEY}`
    )
    if (!res.ok) return NextResponse.json([], { status: 200 })
    const data = await res.json()
    const results: SearchResult[] = (data.results ?? []).slice(0, 12).map((r: Record<string, unknown>) => ({
      title: (r.title ?? r.name) as string,
      year: r.release_date
        ? parseInt((r.release_date as string).slice(0, 4))
        : r.first_air_date
          ? parseInt((r.first_air_date as string).slice(0, 4))
          : undefined,
      poster_url: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : undefined,
      external_id: r.id ? String(r.id) : undefined,
    }))
    return NextResponse.json(results)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
