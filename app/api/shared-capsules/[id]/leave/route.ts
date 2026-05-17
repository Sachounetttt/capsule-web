import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: capsuleId } = await params
  const supabase = createServerClient()

  // Verify user is a member
  const { data: membership } = await supabase
    .from('shared_capsule_members')
    .select('id')
    .eq('capsule_id', capsuleId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  // Remove the member row
  await supabase
    .from('shared_capsule_members')
    .delete()
    .eq('capsule_id', capsuleId)
    .eq('user_id', user.id)

  // If no members remain, delete the capsule too
  const { count } = await supabase
    .from('shared_capsule_members')
    .select('id', { count: 'exact', head: true })
    .eq('capsule_id', capsuleId)

  if (count === 0) {
    await supabase.from('shared_capsules').delete().eq('id', capsuleId)
  }

  return NextResponse.json({ ok: true })
}
