import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'
import AmbientGlow from '@/components/detail/AmbientGlow'
import StatusBadge from '@/components/ui/StatusBadge'
import SharedNotesEditor from '@/components/detail/SharedNotesEditor'
import CoopStatusActions from '@/components/detail/CoopStatusActions'
import CoopLeaveButton from '@/components/detail/CoopLeaveButton'
import CoopInviteButton from '@/components/detail/CoopInviteButton'
import type { MediaStatus } from '@/lib/types'

export default async function SharedCapsulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const supabase = createServerClient()

  const { data: myMembership } = await supabase
    .from('shared_capsule_members')
    .select('*')
    .eq('capsule_id', id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership) notFound()

  const { data: capsule } = await supabase
    .from('shared_capsules')
    .select('*')
    .eq('id', id)
    .single()

  if (!capsule) notFound()

  const { data: members } = await supabase
    .from('shared_capsule_members')
    .select('*')
    .eq('capsule_id', id)

  const userIds = (members ?? []).map(m => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
  const enrichedMembers = (members ?? []).map(m => ({ ...m, profile: profileMap[m.user_id] ?? null }))

  return (
    <div className="min-h-screen">
      <div className="fixed top-0 left-0 right-0 z-10 px-4" style={{ paddingTop: '3rem' }}>
        <Link
          href="/library"
          className="glass rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36 }}
        >
          <ArrowLeft size={18} />
        </Link>
      </div>

      <div className="relative">
        <AmbientGlow color={capsule.dominant_color} />
        <div className="relative" style={{ height: 200 }}>
          {capsule.poster_url ? (
            <img
              src={capsule.poster_url}
              alt={capsule.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-4xl font-bold"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }}
            >
              {capsule.title[0]}
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.9) 100%)' }}
          />
        </div>
      </div>

      <div className="px-4 relative z-10 pb-28" style={{ marginTop: '-2rem' }}>
        <div className="mb-5">
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Jeu · Co-op</p>
          <h1 className="text-2xl font-bold tracking-tight mb-3">{capsule.title}</h1>
        </div>

        <div className="glass rounded-[20px] p-4 mb-4">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Joueurs
          </p>
          <div className="flex flex-col gap-3">
            {enrichedMembers.map(m => (
              <div key={m.user_id} className="flex items-center gap-3">
                {m.profile?.avatar_url ? (
                  <img
                    src={m.profile.avatar_url}
                    alt={m.profile.display_name}
                    className="rounded-full"
                    style={{ width: 32, height: 32, objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                  >
                    {m.profile?.display_name?.[0] ?? '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.user_id === user.id ? 'Toi' : (m.profile?.display_name ?? 'Ami')}
                  </p>
                </div>
                <StatusBadge status={m.status as MediaStatus} />
              </div>
            ))}
          </div>
        </div>

        <CoopInviteButton capsuleId={id} memberIds={userIds} />

        <CoopStatusActions capsuleId={id} currentStatus={myMembership.status as MediaStatus} />

        <SharedNotesEditor capsuleId={id} initialNotes={capsule.shared_notes} />

        {myMembership.personal_notes && (
          <div className="glass rounded-[20px] p-4 mb-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Mes notes perso
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {myMembership.personal_notes}
            </p>
          </div>
        )}

        <CoopLeaveButton capsuleId={id} />
      </div>
    </div>
  )
}
