import { NextRequest, NextResponse } from 'next/server'
import { searchMovies, searchTV, searchBooks, searchGames } from '@/lib/search'
import type { MediaType, SearchResult } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const type = searchParams.get('type') as MediaType | null

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Requête trop courte' }, { status: 400 })
  }

  try {
    let results: SearchResult[]
    if (type === 'movie') results = await searchMovies(query)
    else if (type === 'tvshow') results = await searchTV(query)
    else if (type === 'book') results = await searchBooks(query)
    else if (type === 'game') results = await searchGames(query)
    else results = []

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Erreur de recherche' }, { status: 500 })
  }
}
