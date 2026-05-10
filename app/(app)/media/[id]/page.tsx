import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import PosterHero from '@/components/detail/PosterHero'
import AmbientGlow from '@/components/detail/AmbientGlow'
import StatusBadge from '@/components/ui/StatusBadge'
import StarRating from '@/components/ui/StarRating'
import type { MediaStatus, CriterionValue } from '@/lib/types'

const typeLabel: Record<string, string> = {
  movie: 'Film',
  tvshow: 'Série',
  book: 'Livre',
  game: 'Jeu',
}

const CRITERION_LABELS: Record<string, string> = {
  histoire: 'Histoire',
  realisation: 'Réalisation',
  acteurs: 'Acteurs',
  musique: 'Musique',
  rythme: 'Rythme',
  ecriture: 'Écriture',
  personnages: 'Personnages',
  univers: 'Univers',
  graphisme: 'Graphisme',
  gameplay: 'Gameplay',
  leveldesign: 'Level Design',
}

export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServerClient()
  const { data: item } = await supabase
    .from('media_items')
    .select('*')
    .eq('id', id)
    .single()

  if (!item) notFound()

  const ratingsJson = item.ratings_json as Record<string, CriterionValue> | null
  const filledCriteria = ratingsJson
    ? Object.entries(ratingsJson).filter(
        ([, v]) => v.rating > 0 || (v.review && v.review.trim().length > 0)
      )
    : []

  return (
    <div className="min-h-screen">
      {/* Back button */}
      <div className="fixed top-0 left-0 right-0 z-10 px-4" style={{ paddingTop: '3rem' }}>
        <Link
          href="/library"
          className="glass rounded-full flex items-center justify-center"
          style={{ width: 36, height: 36 }}
        >
          <ArrowLeft size={18} />
        </Link>
      </div>

      {/* Hero poster */}
      <div className="relative">
        <AmbientGlow color={item.dominant_color} />
        <PosterHero
          posterUrl={item.poster_url}
          title={item.title}
          itemId={item.id}
          dominantColor={item.dominant_color}
        />
      </div>

      {/* Content */}
      <div className="px-4 relative z-10" style={{ marginTop: '-2rem' }}>
        {/* Title + meta */}
        <div className="mb-4">
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {typeLabel[item.type]}
            {item.year ? ` · ${item.year}` : ''}
            {item.director ? ` · ${item.director}` : ''}
            {item.author ? ` · ${item.author}` : ''}
            {item.developer ? ` · ${item.developer}` : ''}
          </p>
          <h1 className="text-2xl font-bold tracking-tight mb-3">{item.title}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={item.status as MediaStatus} />
            {item.rating && !ratingsJson ? <StarRating value={item.rating} readonly /> : null}
            {item.community_rating != null && (
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                {(item.community_rating as number).toFixed(1)} · {item.community_rating_source}
              </span>
            )}
          </div>
        </div>

        {/* Extra metadata */}
        {(item.seasons_watched != null || item.total_seasons != null || item.pages != null || item.genre || item.platform) && (
          <div className="glass rounded-[20px] p-4 mb-4 flex flex-wrap gap-4">
            {item.genre && <MetaInfo label="Genre" value={item.genre} />}
            {item.platform && <MetaInfo label="Plateforme" value={item.platform} />}
            {item.seasons_watched != null && (
              <MetaInfo label="Saisons vues" value={String(item.seasons_watched)} />
            )}
            {item.total_seasons != null && (
              <MetaInfo label="Saisons totales" value={String(item.total_seasons)} />
            )}
            {item.pages != null && <MetaInfo label="Pages" value={String(item.pages)} />}
          </div>
        )}

        {/* Criteria ratings */}
        {filledCriteria.length > 0 && (
          <div className="glass rounded-[20px] p-4 mb-4 flex flex-col gap-4">
            <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Notes
            </p>
            {filledCriteria.map(([key, v]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">
                    {CRITERION_LABELS[key] ?? key}
                  </span>
                  {v.rating > 0 && <StarRating value={v.rating} readonly />}
                </div>
                {v.review && v.review.trim().length > 0 && (
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {v.review}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Free notes */}
        {item.notes && (
          <div className="glass rounded-[20px] p-4 mb-4">
            <p
              className="text-xs uppercase tracking-widest mb-2"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Commentaire
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {item.notes}
            </p>
          </div>
        )}

        {/* Back link */}
        <Link
          href="/library"
          className="glass rounded-[12px] py-3 flex items-center justify-center gap-2 text-sm font-medium mb-4"
        >
          <ArrowLeft size={16} />
          Retour à la bibliothèque
        </Link>
      </div>
    </div>
  )
}

function MetaInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
