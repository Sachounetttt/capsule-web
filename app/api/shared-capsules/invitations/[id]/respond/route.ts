import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { accepted } = await req.json() as { accepted: boolean }

  const supabase = createServerClient()

  const { data: invitation } = await supabase
    .from('shared_capsule_invitations')
    .select('*')
    .eq('id', id)
    .eq('invitee_id', user.id)
    .eq('status', 'pending')
    .single()

  if (!invitation) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })

  const newStatus = accepted ? 'accepted' : 'declined'

  await supabase
    .from('shared_capsule_invitations')
    .update({ status: newStatus })
    .eq('id', id)

  if (accepted) {
    // Defensive check: don't insert if already a member
    const { data: existingMember } = await supabase
      .from('shared_capsule_members')
      .select('id')
      .eq('capsule_id', invitation.capsule_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existingMember) {
      await supabase.from('shared_capsule_members').insert({
        capsule_id: invitation.capsule_id,
        user_id: user.id,
        status: 'inProgress',
      })
    }

    const [{ data: capsule }, { data: accepterProfile }] = await Promise.all([
      supabase.from('shared_capsules').select('title').eq('id', invitation.capsule_id).single(),
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    ])

    await supabase.from('notifications').insert({
      user_id: invitation.inviter_id,
      type: 'coop_accepted',
      payload: {
        accepter_id: user.id,
        accepter_name: accepterProfile?.display_name ?? 'Un ami',
        capsule_id: invitation.capsule_id,
        capsule_title: capsule?.title ?? '',
      },
    })
  }

  return NextResponse.json({ status: newStatus })
}
