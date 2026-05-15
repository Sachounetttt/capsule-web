import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const unread_count = (data ?? []).filter(n => !n.read).length
  return NextResponse.json({ notifications: data ?? [], unread_count })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipient_id, media_item_id, message } = await req.json()

  if (!recipient_id || !media_item_id) {
    return NextResponse.json({ error: 'recipient_id et media_item_id sont requis' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Verify friendship (accepted, in either direction)
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${recipient_id}),` +
      `and(requester_id.eq.${recipient_id},addressee_id.eq.${user.id})`
    )
    .eq('status', 'accepted')
    .maybeSingle()

  if (!friendship) {
    return NextResponse.json({ error: 'Vous devez être amis pour partager' }, { status: 403 })
  }

  // Fetch media item (must belong to sender)
  const { data: item } = await supabase
    .from('media_items')
    .select('id, title, type, poster_url, rating, ratings_json')
    .eq('id', media_item_id)
    .eq('user_id', user.id)
    .single()

  if (!item) return NextResponse.json({ error: 'Média introuvable' }, { status: 404 })

  // Fetch sender display name
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  // Compute average rating
  let rating: number | null = null
  if (item.ratings_json) {
    const vals = Object.values(item.ratings_json as Record<string, { rating: number }>)
      .map(v => v.rating)
      .filter(r => r > 0)
    if (vals.length > 0) rating = vals.reduce((a, b) => a + b, 0) / vals.length
  } else if (item.rating) {
    rating = item.rating
  }

  const payload = {
    sender_id: user.id,
    sender_name: senderProfile?.display_name ?? 'Un ami',
    media_title: item.title,
    media_type: item.type,
    poster_url: item.poster_url ?? null,
    rating,
    message: message ?? null,
  }

  const { data: notif, error } = await supabase
    .from('notifications')
    .insert({ user_id: recipient_id, type: 'share', payload })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(notif, { status: 201 })
}
