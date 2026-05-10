// app/api/users/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) return NextResponse.json([])

  const supabase = createServerClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `%${q}%`)
    .neq('id', user.id)
    .limit(10)

  return NextResponse.json(data ?? [])
}
