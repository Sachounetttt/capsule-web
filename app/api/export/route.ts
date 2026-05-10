import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .eq('user_id', user.id)
    .order('date_added', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const json = JSON.stringify(data, null, 2)
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="capsule-export-${date}.json"`,
    },
  })
}
