import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import type { SearchResult } from '@/lib/types'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServerClient()

    const { data: topItem } = await supabase
      .from('media_items')
      .select('title, type')
      .eq('user_id', user.id)
      .eq('rating', 5)
      .eq('wishlist', false)
      .in('type', ['movie', 'tvshow'])
      .order('date_added', { ascending: false })
      .limit(1)
      .single()

    if (!topItem) return NextResponse.json([])

    const endpoint = topItem.type === 'tvshow' ? 'tv' : 'movie'

    const searchRes = await fetch(
      `${TMDB_BASE}/search/${endpoint}?query=${encodeURIComponent(topItem.title)}&api_key=${process.env.TMDB_API_KEY}`
    )
    if (!searchRes.ok) return NextResponse.json([])

    const searchData = await searchRes.json()
    const tmdbId = searchData.results?.[0]?.id
    if (!tmdbId) return NextResponse.json([])

    const similarRes = await fetch(
      `${TMDB_BASE}/${endpoint}/${tmdbId}/similar?api_key=${process.env.TMDB_API_KEY}`
    )
    if (!similarRes.ok) return NextResponse.json([])

    const similarData = await similarRes.json()
    const results: SearchResult[] = (similarData.results ?? []).slice(0, 6).map((r: Record<string, unknown>) => ({
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
    return NextResponse.json([])
  }
}
