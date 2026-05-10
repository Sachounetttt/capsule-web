import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import type { MediaItem } from '@/lib/types'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const wishlistParam = searchParams.get('wishlist')

  const wishlistFilter = wishlistParam === 'true' ? true
    : wishlistParam === 'all' ? null
    : false

  let query = supabase
    .from('media_items')
    .select('*')
    .eq('user_id', user.id)
    .order('date_added', { ascending: false })

  if (wishlistFilter !== null) query = query.eq('wishlist', wishlistFilter)
  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const body = await req.json() as Omit<MediaItem, 'id' | 'date_added'>

  if (!body.title || !body.type || !body.status) {
    return NextResponse.json({ error: 'title, type et status sont requis' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('media_items')
    .insert({ ...body, notes: body.notes ?? '', wishlist: body.wishlist ?? false, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
