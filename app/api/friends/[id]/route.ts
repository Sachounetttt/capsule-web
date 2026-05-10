// app/api/friends/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await req.json() as { action: 'accept' | 'reject' }

  if (!['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action doit être accept ou reject' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: friendship } = await supabase
    .from('friendships')
    .select('*')
    .eq('id', id)
    .eq('addressee_id', user.id)
    .eq('status', 'pending')
    .single()

  if (!friendship) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  }

  if (action === 'reject') {
    await supabase.from('friendships').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }

  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .eq('id', id)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .single()

  if (!friendship) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  await supabase.from('friendships').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
