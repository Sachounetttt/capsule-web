import { redirect } from 'next/navigation'
import { searchMovies, searchTV, searchGames } from '@/lib/search'

export default async function FindExternalPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { type } = await params
  const { q } = await searchParams

  if (!q || !['movie', 'tvshow', 'game'].includes(type)) {
    redirect('/')
  }

  let externalId: string | undefined

  if (type === 'movie') {
    const results = await searchMovies(q)
    externalId = results[0]?.external_id
  } else if (type === 'tvshow') {
    const results = await searchTV(q)
    externalId = results[0]?.external_id
  } else if (type === 'game') {
    const results = await searchGames(q)
    externalId = results[0]?.external_id
  }

  if (externalId) {
    redirect(`/external/${type}/${externalId}`)
  }

  // Fallback si l'API ne trouve rien
  redirect(`/add?q=${encodeURIComponent(q)}&type=${type}`)
}
