import { Library, Clock } from 'lucide-react'
import StatCard from '@/components/home/StatCard'
import RecentScroll from '@/components/home/RecentScroll'
import SettingsSheet from '@/components/home/SettingsSheet'
import DiscoverClient from '@/components/home/DiscoverClient'
import WishlistPreview from '@/components/home/WishlistPreview'
import { createServerClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth'

export default async function HomePage() {
  const user = await getAuthUser()
  const supabase = createServerClient()
  const { data: items } = await supabase
    .from('media_items')
    .select('*')
    .eq('wishlist', false)
    .eq('user_id', user?.id ?? '')
    .order('date_added', { ascending: false })

  const all = items ?? []
  const total = all.length
  const inProgress = all.filter(i => i.status === 'inProgress').length
  const recent = all.slice(0, 6)

  // Section "Vos amis ont adoré"
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${user?.id ?? ''},addressee_id.eq.${user?.id ?? ''}`)
    .eq('status', 'accepted')

  const friendIds = (friendships ?? []).map(f =>
    f.requester_id === user?.id ? f.addressee_id : f.requester_id
  )

  const { data: friendItems } = friendIds.length > 0
    ? await supabase
        .from('media_items')
        .select('title, type, year, poster_url, rating')
        .in('user_id', friendIds)
        .gte('rating', 4)
        .eq('wishlist', false)
        .not('poster_url', 'is', null)
    : { data: [] }

  const myTitles = new Set(all.map(i => i.title.toLowerCase().trim()))
  const titleMap = new Map<string, { title: string; type: string; year?: number; poster_url: string; ratings: number[] }>()

  for (const item of friendItems ?? []) {
    const key = item.title.toLowerCase().trim()
    if (myTitles.has(key)) continue
    if (!titleMap.has(key)) {
      titleMap.set(key, { title: item.title, type: item.type, year: item.year, poster_url: item.poster_url, ratings: [] })
    }
    titleMap.get(key)!.ratings.push(item.rating)
  }

  const friendsLoved = [...titleMap.values()]
    .map(({ ratings, ...rest }) => ({ ...rest, avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 12)

  return (
    <div className="min-h-screen">
      <div
        className="fixed inset-0 -z-10 opacity-30"
        style={{
          background: 'linear-gradient(135deg, #7C3AED, #4F46E5, #0F0F14, #7C3AED)',
          backgroundSize: '400% 400%',
          animation: 'mesh-drift 12s ease infinite',
        }}
      />

      <div className="pb-4" style={{ paddingTop: '3.5rem' }}>
        <div className="flex items-center justify-between mb-6 px-4">
          <img src="/logocapsuleclean.png" alt="Capsule" style={{ height: 56, width: 'auto' }} />
          <SettingsSheet />
        </div>

        <div className="flex gap-3 mb-6 px-4">
          <StatCard label="Total" value={total} icon={<Library size={16} />} />
          <StatCard label="En cours" value={inProgress} icon={<Clock size={16} />} />
        </div>


        {recent.length > 0 && (
          <div className="mb-6">
            <h2
              className="text-sm font-semibold uppercase tracking-widest mb-3 px-4"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Récemment ajoutés
            </h2>
            <div className="px-4">
              <RecentScroll items={recent} />
            </div>
          </div>
        )}

        {friendsLoved.length > 0 && (
          <div className="mb-6">
            <h2
              className="text-sm font-semibold uppercase tracking-widest mb-3 px-4"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Vos amis ont adoré
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 px-4" style={{ scrollbarWidth: 'none' }}>
              {friendsLoved.map((item, i) => (
                <div key={i} className="flex-shrink-0" style={{ width: 112 }}>
                  <div className="glass rounded-[12px] overflow-hidden relative" style={{ width: 112, height: 160 }}>
                    <img
                      src={item.poster_url}
                      alt={item.title}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)', width: 112 }}>
                    {item.title}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {'⭐'.repeat(Math.round(item.avgRating))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <DiscoverClient />
        <WishlistPreview />
      </div>
    </div>
  )
}
