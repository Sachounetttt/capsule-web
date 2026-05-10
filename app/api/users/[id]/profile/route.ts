// app/api/users/[id]/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import type { FriendProfileSummary } from '@/lib/types'

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

  const stats = {
    movies: all.filter(i => i.type === 'movie').length,
    tvshows: all.filter(i => i.type === 'tvshow').length,
    games: all.filter(i => i.type === 'game').length,
  }

  const recent = [...all]
    .sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime())
    .slice(0, 5)

  const favorites = all.filter(i => i.rating === 5).slice(0, 6)

  const result: FriendProfileSummary = { profile, stats, recent, favorites }
  return NextResponse.json(result)
}
