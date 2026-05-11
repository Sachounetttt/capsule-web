import { Library, Clock } from 'lucide-react'
import StatCard from '@/components/home/StatCard'
import RecentScroll from '@/components/home/RecentScroll'
import SettingsSheet from '@/components/home/SettingsSheet'
import DiscoverClient from '@/components/home/DiscoverClient'
import WishlistPreview from '@/components/home/WishlistPreview'
import { createServerClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = createServerClient()
  const { data: items } = await supabase
    .from('media_items')
    .select('*')
    .eq('wishlist', false)
    .order('date_added', { ascending: false })

  const all = items ?? []
  const total = all.length
  const inProgress = all.filter(i => i.status === 'inProgress').length
  const recent = all.slice(0, 6)

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

        <DiscoverClient />
        <WishlistPreview />
      </div>
    </div>
  )
}
