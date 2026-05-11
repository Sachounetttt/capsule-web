// app/api/users/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''

  const supabase = createServerClient()

  const query = supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .neq('id', user.id)
    .limit(20)

  if (q.length >= 2) query.ilike('display_name', `%${q}%`)

  const { data } = await query

  return NextResponse.json(data ?? [])
}
