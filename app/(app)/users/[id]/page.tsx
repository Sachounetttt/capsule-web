'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { FriendProfileSummary } from '@/lib/types'

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<FriendProfileSummary | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/users/${id}/profile`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(setData)
      .catch(() => setError(true))
  }, [id])

  if (error) {
    return (
      <div className="px-4 pt-20 text-center">
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Profil inaccessible.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 pt-20 text-center">
        <p style={{ color: 'rgba(255,255,255,0.3)' }}>Chargement...</p>
      </div>
    )
  }

  const { profile, stats, recent, favorites } = data

  return (
    <div className="px-4 pt-16 pb-8 flex flex-col gap-6 max-w-lg mx-auto">
      {/* Back button */}
      <button onClick={() => router.back()} className="flex items-center gap-2 pt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
        <ArrowLeft size={18} />
        <span className="text-sm">Retour</span>
      </button>

      {/* Header */}
      <div className="flex flex-col items-center gap-3">
        {profile.avatar_url
          ? <img src={profile.avatar_url} className="rounded-full" style={{ width: 72, height: 72 }} alt="" />
          : <div className="rounded-full" style={{ width: 72, height: 72, background: 'rgba(255,255,255,0.15)' }} />
        }
        <p className="text-xl font-bold">{profile.display_name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { label: 'Films', value: stats.movies },
          { label: 'Séries', value: stats.tvshows },
          { label: 'Jeux', value: stats.games },
        ] as const).map(({ label, value }) => (
          <div key={label} className="glass rounded-2xl p-3 flex flex-col items-center gap-1">
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Recent */}
      {recent.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Derniers ajouts
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {recent.map(item => (
              <div key={item.id} className="flex-shrink-0" style={{ width: 90 }}>
                {item.poster_url
                  ? <img src={item.poster_url} className="rounded-xl object-cover" style={{ width: 90, height: 130 }} alt={item.title} />
                  : <div className="rounded-xl" style={{ width: 90, height: 130, background: 'rgba(255,255,255,0.1)' }} />
                }
                <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Coups de coeur
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {favorites.map(item => (
              <div key={item.id} className="flex-shrink-0" style={{ width: 90 }}>
                {item.poster_url
                  ? <img src={item.poster_url} className="rounded-xl object-cover" style={{ width: 90, height: 130 }} alt={item.title} />
                  : <div className="rounded-xl" style={{ width: 90, height: 130, background: 'rgba(255,255,255,0.15)' }} />
                }
                <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Taste comparison */}
      {data.comparison && (
        <div className="flex flex-col gap-4">
          {/* Score */}
          <div className="glass rounded-2xl p-5 flex flex-col items-center gap-1">
            <span
              className="text-5xl font-bold"
              style={{
                color: data.comparison.score >= 65
                  ? '#4ADE80'
                  : data.comparison.score >= 35
                  ? '#FACC15'
                  : '#F87171'
              }}
            >
              {data.comparison.score}%
            </span>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              de goûts similaires
            </span>
          </div>

          {/* Common */}
          {data.comparison.common.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                En commun · {data.comparison.common.length}
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {data.comparison.common.map(item => (
                  <div key={item.id} className="flex-shrink-0" style={{ width: 90 }}>
                    {item.poster_url
                      ? <img src={item.poster_url} className="rounded-xl object-cover" style={{ width: 90, height: 130 }} alt={item.title} />
                      : <div className="rounded-xl" style={{ width: 90, height: 130, background: 'rgba(255,255,255,0.1)' }} />
                    }
                    <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* To discover */}
          {data.comparison.toDiscover.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                À découvrir chez {profile.display_name.split(' ')[0]}
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {data.comparison.toDiscover.map(item => (
                  <div key={item.id} className="flex-shrink-0" style={{ width: 90 }}>
                    {item.poster_url
                      ? <img src={item.poster_url} className="rounded-xl object-cover" style={{ width: 90, height: 130 }} alt={item.title} />
                      : <div className="rounded-xl" style={{ width: 90, height: 130, background: 'rgba(255,255,255,0.15)' }} />
                    }
                    <p className="text-xs mt-1 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
