import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ item_id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { item_id } = await params
  const supabase = createServerClient()

  await supabase
    .from('reactions')
    .delete()
    .eq('item_id', item_id)
    .eq('from_user_id', user.id)

  return NextResponse.json({ ok: true })
}
