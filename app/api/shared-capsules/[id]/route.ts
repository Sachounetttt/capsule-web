import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

async function verifyMembership(
  supabase: ReturnType<typeof createServerClient>,
  capsuleId: string,
  userId: string
) {
  const { data } = await supabase
    .from('shared_capsule_members')
    .select('id')
    .eq('capsule_id', capsuleId)
    .eq('user_id', userId)
    .single()
  return !!data
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  if (!(await verifyMembership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const { data: capsule, error } = await supabase
    .from('shared_capsules')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !capsule) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  const { data: members } = await supabase
    .from('shared_capsule_members')
    .select('*')
    .eq('capsule_id', id)

  const userIds = (members ?? []).map(m => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  return NextResponse.json({
    ...capsule,
    members: (members ?? []).map(m => ({ ...m, profile: profileMap[m.user_id] ?? null })),
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  if (!(await verifyMembership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const { shared_notes } = await req.json() as { shared_notes: string }

  const { data, error } = await supabase
    .from('shared_capsules')
    .update({ shared_notes })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
