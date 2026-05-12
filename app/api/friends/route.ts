// app/api/friends/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { data: accepted } = await supabase
    .from('friendships')
    .select(`
      id, requester_id, addressee_id, status, created_at,
      requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url),
      addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url)
    `)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const { data: pending } = await supabase
    .from('friendships')
    .select(`
      id, requester_id, addressee_id, status, created_at,
      requester:profiles!friendships_requester_id_fkey(id, display_name, avatar_url)
    `)
    .eq('addressee_id', user.id)
    .eq('status', 'pending')

  const { data: sent } = await supabase
    .from('friendships')
    .select(`
      id, addressee_id,
      addressee:profiles!friendships_addressee_id_fkey(id, display_name, avatar_url)
    `)
    .eq('requester_id', user.id)
    .eq('status', 'pending')

  const friends = (accepted ?? []).map((f: Record<string, unknown>) => ({
    id: f.id,
    status: f.status,
    created_at: f.created_at,
    profile: f.requester_id === user.id ? f.addressee : f.requester
  }))

  const normalizedPending = (pending ?? []).map((f: Record<string, unknown>) => ({
    id: f.id,
    requester_id: f.requester_id,
    addressee_id: f.addressee_id,
    status: f.status,
    created_at: f.created_at,
    profile: f.requester
  }))

  return NextResponse.json({ friends, pending: normalizedPending, sent: sent ?? [] })
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
