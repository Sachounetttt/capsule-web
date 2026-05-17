import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import type { MediaStatus } from '@/lib/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const body = await req.json() as {
    status?: MediaStatus
    personal_rating?: number
    personal_notes?: string
  }

  const allowed: Record<string, unknown> = {}
  if (body.status !== undefined) allowed.status = body.status
  if (body.personal_rating !== undefined) allowed.personal_rating = body.personal_rating
  if (body.personal_notes !== undefined) allowed.personal_notes = body.personal_notes

  const { data, error } = await supabase
    .from('shared_capsule_members')
    .update(allowed)
    .eq('capsule_id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  return NextResponse.json(data)
}
