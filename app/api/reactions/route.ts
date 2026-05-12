import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

const VALID_EMOJIS = ['🔥', '👀', '✅', '😴']

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const itemIds = new URL(req.url).searchParams
    .get('item_ids')?.split(',').filter(Boolean) ?? []
  if (itemIds.length === 0) return NextResponse.json({})

  const supabase = createServerClient()

  // Récupérer les amis acceptés
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const friendIds = (friendships ?? []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )
  const allowedIds = [user.id, ...friendIds]

  // Réactions filtrées aux amis + soi
  const { data: reactions } = await supabase
    .from('reactions')
    .select('item_id, from_user_id, emoji')
    .in('item_id', itemIds)
    .in('from_user_id', allowedIds)

  // Profils pour les display_name
  const { data: profiles } = allowedIds.length > 0
    ? await supabase.from('profiles').select('id, display_name').in('id', allowedIds)
    : { data: [] }

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name]))

  // Grouper par item_id
  const result: Record<string, { from_user_id: string; emoji: string; display_name: string; is_mine: boolean }[]> = {}
  for (const id of itemIds) result[id] = []
  for (const r of reactions ?? []) {
    result[r.item_id]?.push({
      from_user_id: r.from_user_id,
      emoji: r.emoji,
      display_name: profileMap[r.from_user_id] ?? '?',
      is_mine: r.from_user_id === user.id,
    })
  }

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { item_id, emoji } = await req.json()
  if (!item_id || !VALID_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('reactions')
    .upsert({ item_id, from_user_id: user.id, emoji }, { onConflict: 'item_id,from_user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
