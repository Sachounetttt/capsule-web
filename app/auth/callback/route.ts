import { createSessionClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createSessionClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // Upsert profile — covers users created before the trigger was fixed
  if (data.user) {
    const db = createServerClient()
    await db.from('profiles').upsert({
      id: data.user.id,
      display_name: data.user.user_metadata?.full_name ?? data.user.email ?? 'Utilisateur',
      avatar_url: data.user.user_metadata?.avatar_url ?? null,
    }, { onConflict: 'id', ignoreDuplicates: true })
  }

  return NextResponse.redirect(`${origin}/`)
}
