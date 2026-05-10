import { NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createSessionClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
