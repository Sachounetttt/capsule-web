// app/api/users/[id]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import type { FriendProfileSummary, Comparison } from '@/lib/types'

function computeComparison(
  myAll: { title: string; rating?: number | null; status: string }[],
  friendAll: { id: string; title: string; type: string; year?: number | null; poster_url?: string | null; rating?: number | null; status: string }[]
): Comparison {
  const normalize = (t: string) => t.toLowerCase().trim()

  const myMap = new Map(myAll.map(i => [normalize(i.title), i]))
  const friendMap = new Map(friendAll.map(i => [normalize(i.title), i]))

  const commonKeys = [...friendMap.keys()].filter(k => myMap.has(k))

  const totalUnique = myMap.size + friendMap.size - commonKeys.length
  const jaccard = totalUnique > 0 ? commonKeys.length / totalUnique : 0

  const ratedCommon = commonKeys.filter(k => myMap.get(k)?.rating && friendMap.get(k)?.rating)
  const ratingAgreement = ratedCommon.length > 0
    ? ratedCommon.reduce((sum, k) => {
        const diff = Math.abs((myMap.get(k)!.rating ?? 0) - (friendMap.get(k)!.rating ?? 0))
        return sum + (1 - diff / 4)
      }, 0) / ratedCommon.length
    : null

  const rawScore = ratingAgreement !== null
    ? (jaccard + ratingAgreement) / 2
    : jaccard
  const score = Math.round(rawScore * 100)

  const common = commonKeys.slice(0, 6).map(k => {
    const f = friendMap.get(k)!
    return { id: f.id, title: f.title, type: f.type, year: f.year ?? undefined, poster_url: f.poster_url ?? undefined }
  })

  const toDiscover = friendAll
    .filter(i => i.status === 'completed' && !myMap.has(normalize(i.title)) && i.rating)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6)
    .map(i => ({ id: i.id, title: i.title, type: i.type, year: i.year ?? undefined, poster_url: i.poster_url ?? undefined }))

  return { score, common, toDiscover }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  // Vérifier que la friendship est acceptée (dans les deux sens)
  const { data: friendship } = await supabase
    .from('friendships')
    .select('status')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${id}),` +
      `and(requester_id.eq.${id},addressee_id.eq.${user.id})`
    )
    .eq('status', 'accepted')
    .single()

  if (!friendship) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, created_at')
    .eq('id', id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const { data: items } = await supabase
    .from('media_items')
    .select('id, type, title, year, poster_url, date_added, rating, status')
    .eq('user_id', id)
    .eq('wishlist', false)

  const all = items ?? []

  const { data: myItems } = await supabase
    .from('media_items')
    .select('id, type, title, year, poster_url, rating, status')
    .eq('user_id', user.id)
    .eq('wishlist', false)

  const myAll = myItems ?? []

  const stats = {
    movies: all.filter(i => i.type === 'movie').length,
    tvshows: all.filter(i => i.type === 'tvshow').length,
    games: all.filter(i => i.type === 'game').length,
  }

  const recent = [...all]
    .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime())
    .slice(0, 5)

  const favorites = all.filter(i => i.rating === 5).slice(0, 6)

  const comparison = computeComparison(myAll, all)
  const result: FriendProfileSummary = { profile, stats, recent, favorites, comparison }
  return NextResponse.json(result)
}
