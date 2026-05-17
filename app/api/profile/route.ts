import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, string> = {}

  if (body.display_name !== undefined) {
    if (typeof body.display_name !== 'string' || body.display_name.trim().length === 0) {
      return NextResponse.json({ error: 'display_name invalide' }, { status: 400 })
    }
    updates.display_name = body.display_name.trim()
  }

  if (body.avatar_url !== undefined) {
    updates.avatar_url = body.avatar_url
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
