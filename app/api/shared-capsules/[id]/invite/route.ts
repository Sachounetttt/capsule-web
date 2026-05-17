import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: capsuleId } = await params
  const { invitee_id } = await req.json() as { invitee_id: string }

  if (!invitee_id) return NextResponse.json({ error: 'invitee_id requis' }, { status: 400 })

  const supabase = createServerClient()

  // Verify inviter is a member
  const { data: myMembership } = await supabase
    .from('shared_capsule_members')
    .select('id')
    .eq('capsule_id', capsuleId)
    .eq('user_id', user.id)
    .single()

  if (!myMembership) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  // Verify friendship
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${invitee_id}),` +
      `and(requester_id.eq.${invitee_id},addressee_id.eq.${user.id})`
    )
    .eq('status', 'accepted')
    .maybeSingle()

  if (!friendship) {
    return NextResponse.json({ error: 'Vous devez être amis' }, { status: 403 })
  }

  // Check invitee not already a member
  const { data: existing } = await supabase
    .from('shared_capsule_members')
    .select('id')
    .eq('capsule_id', capsuleId)
    .eq('user_id', invitee_id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Déjà membre' }, { status: 409 })

  // Create invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('shared_capsule_invitations')
    .insert({ capsule_id: capsuleId, inviter_id: user.id, invitee_id })
    .select()
    .single()

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })

  // Fetch capsule + inviter profile for notification
  const [{ data: capsule }, { data: inviterProfile }] = await Promise.all([
    supabase.from('shared_capsules').select('title, poster_url').eq('id', capsuleId).single(),
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
  ])

  await supabase.from('notifications').insert({
    user_id: invitee_id,
    type: 'coop_invite',
    payload: {
      inviter_id: user.id,
      inviter_name: inviterProfile?.display_name ?? 'Un ami',
      capsule_id: capsuleId,
      capsule_title: capsule?.title ?? '',
      poster_url: capsule?.poster_url ?? null,
    },
  })

  return NextResponse.json(invitation, { status: 201 })
}
