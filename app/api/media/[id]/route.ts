import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import type { MediaItem } from '@/lib/types'

async function verifyOwnership(supabase: ReturnType<typeof createServerClient>, id: string, userId: string) {
  const { data } = await supabase
    .from('media_items')
    .select('id')
    .eq('id', id)
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

  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  if (!(await verifyOwnership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const body = await req.json() as Partial<MediaItem>
  const updates = { ...body } as Record<string, unknown>
  delete updates.id
  delete updates.date_added
  delete updates.user_id

  const { data, error } = await supabase
    .from('media_items')
    .update(updates)
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

  if (!(await verifyOwnership(supabase, id, user.id))) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const { error } = await supabase
    .from('media_items')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
