import { NextRequest, NextResponse } from 'next/server'
import { buildMovieResult, buildGameResult } from '@/lib/search'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const RAWG_BASE = 'https://api.rawg.io/api'

export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get('type') ?? 'movie'

  if (type === 'game') {
    try {
      const res = await fetch(
        `${RAWG_BASE}/games?ordering=-metacritic&page_size=12&key=${process.env.RAWG_API_KEY}`
      )
      if (!res.ok) return NextResponse.json([], { status: 200 })
      const data = await res.json()
      return NextResponse.json((data.results ?? []).map(buildGameResult))
    } catch {
      return NextResponse.json([], { status: 200 })
    }
  }

  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/top_rated?api_key=${process.env.TMDB_API_KEY}`
    )
    if (!res.ok) return NextResponse.json([], { status: 200 })
    const data = await res.json()
    return NextResponse.json((data.results ?? []).slice(0, 12).map(buildMovieResult))
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
