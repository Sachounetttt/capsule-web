import { Library, Clock } from 'lucide-react'
import StatCard from '@/components/home/StatCard'
import RecentScroll from '@/components/home/RecentScroll'
import SettingsSheet from '@/components/home/SettingsSheet'
import DiscoverClient from '@/components/home/DiscoverClient'
import WishlistPreview from '@/components/home/WishlistPreview'
import CapsuleLogo from '@/components/ui/CapsuleLogo'
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
        .select('title, type, year, poster_url, rating, ratings_json')
        .in('user_id', friendIds)
        .eq('wishlist', false)
        .not('poster_url', 'is', null)
    : { data: [] }

  function getAvgRating(item: { rating?: number | null; ratings_json?: Record<string, { rating: number }> | null }): number | null {
    if (item.ratings_json && Object.keys(item.ratings_json).length > 0) {
      const vals = Object.values(item.ratings_json).map(v => v.rating).filter(r => typeof r === 'number')
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    return item.rating ?? null
  }

  const myTitles = new Set(all.map(i => i.title.toLowerCase().trim()))
  const titleMap = new Map<string, { title: string; type: string; year?: number; poster_url: string; ratings: number[] }>()

  for (const item of friendItems ?? []) {
    const avg = getAvgRating(item)
    if (avg === null || avg < 4) continue
    const key = item.title.toLowerCase().trim()
    if (myTitles.has(key)) continue
    if (!titleMap.has(key)) {
      titleMap.set(key, { title: item.title, type: item.type, year: item.year ?? undefined, poster_url: item.poster_url, ratings: [] })
    }
    titleMap.get(key)!.ratings.push(avg)
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
          background: 'linear-gradient(135deg, #8a4dff, #4d8cff, #07070d, #8a4dff)',
          backgroundSize: '400% 400%',
          animation: 'mesh-drift 12s ease infinite',
        }}
      />

      <div className="pb-4" style={{ paddingTop: '3.5rem' }}>
        <div className="flex items-center justify-between mb-6 px-4">
          <CapsuleLogo width={110} height={50} />
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
                    {item.avgRating.toFixed(1).replace('.', ',')}/5
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
