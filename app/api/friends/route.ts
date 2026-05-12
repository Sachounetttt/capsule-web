// app/api/friends/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const [{ data: acceptedRaw }, { data: pendingRaw }, { data: sentRaw }] = await Promise.all([
    supabase.from('friendships').select('id, requester_id, addressee_id, status, created_at')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted'),
    supabase.from('friendships').select('id, requester_id, addressee_id, status, created_at')
      .eq('addressee_id', user.id)
      .eq('status', 'pending'),
    supabase.from('friendships').select('id, addressee_id')
      .eq('requester_id', user.id)
      .eq('status', 'pending'),
  ])

  // Collect all profile IDs to fetch in one query
  const profileIds = new Set<string>()
  for (const f of acceptedRaw ?? []) { profileIds.add(f.requester_id); profileIds.add(f.addressee_id) }
  for (const f of pendingRaw ?? []) { profileIds.add(f.requester_id) }
  for (const f of sentRaw ?? []) { profileIds.add(f.addressee_id) }

  const { data: profilesData } = profileIds.size > 0
    ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', [...profileIds])
    : { data: [] }

  const profiles = Object.fromEntries((profilesData ?? []).map(p => [p.id, p]))

  const friends = (acceptedRaw ?? []).map(f => ({
    id: f.id, status: f.status, created_at: f.created_at,
    profile: profiles[f.requester_id === user.id ? f.addressee_id : f.requester_id] ?? null,
  }))

  const pending = (pendingRaw ?? []).map(f => ({
    id: f.id, requester_id: f.requester_id, addressee_id: f.addressee_id,
    status: f.status, created_at: f.created_at,
    profile: profiles[f.requester_id] ?? null,
  }))

  const sent = (sentRaw ?? []).map(s => ({
    id: s.id, addressee_id: s.addressee_id,
    addressee: profiles[s.addressee_id] ?? null,
  }))

  return NextResponse.json({ friends, pending, sent })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { addressee_id } = await req.json()

  if (!addressee_id || addressee_id === user.id) {
    return NextResponse.json({ error: 'Invalid addressee_id' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id, status: 'pending' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Demande déjà envoyée ou utilisateur introuvable' }, { status: 409 })
  }

  return NextResponse.json(data, { status: 201 })
}
