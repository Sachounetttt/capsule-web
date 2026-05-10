import { createSessionClient } from './supabase/server'

export async function getAuthUser() {
  const supabase = await createSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
