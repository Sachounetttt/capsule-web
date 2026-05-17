import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { data: memberRows, error } = await supabase
    .from('shared_capsule_members')
    .select('status, personal_rating, personal_notes, joined_at, capsule_id, shared_capsules(*)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const capsuleIds = (memberRows ?? []).map(r => r.capsule_id)
  if (capsuleIds.length === 0) return NextResponse.json([])

  const { data: allMembers } = await supabase
    .from('shared_capsule_members')
    .select('capsule_id, user_id, status, personal_rating, joined_at')
    .in('capsule_id', capsuleIds)

  const memberUserIds = [...new Set((allMembers ?? []).map(m => m.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', memberUserIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const membersByCapsule: Record<string, typeof allMembers> = {}
  for (const m of allMembers ?? []) {
    if (!membersByCapsule[m.capsule_id]) membersByCapsule[m.capsule_id] = []
    membersByCapsule[m.capsule_id]!.push(m)
  }

  const result = (memberRows ?? []).map(r => ({
    ...(r.shared_capsules as Record<string, unknown>),
    my_status: r.status,
    my_rating: r.personal_rating,
    members: (membersByCapsule[r.capsule_id] ?? []).map(m => ({
      ...m,
      profile: profileMap[m.user_id] ?? null,
    })),
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, poster_url, rawg_id, dominant_color } = await req.json() as {
    title: string
    poster_url?: string
    rawg_id?: string
    dominant_color?: string
  }

  if (!title) return NextResponse.json({ error: 'title requis' }, { status: 400 })

  const supabase = createServerClient()

  const { data: capsule, error: capsuleError } = await supabase
    .from('shared_capsules')
    .insert({ title, poster_url, rawg_id, dominant_color, created_by: user.id })
    .select()
    .single()

  if (capsuleError) return NextResponse.json({ error: capsuleError.message }, { status: 500 })

  const { error: memberError } = await supabase
    .from('shared_capsule_members')
    .insert({ capsule_id: capsule.id, user_id: user.id, status: 'inProgress' })

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  return NextResponse.json(capsule, { status: 201 })
}
