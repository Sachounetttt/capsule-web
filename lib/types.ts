export type MediaType = 'movie' | 'tvshow' | 'book' | 'game'
export type MediaStatus = 'completed' | 'inProgress' | 'dropped' | 'abandoned'
export type CriterionValue = { rating: number; review?: string }

export interface MediaItem {
  id: string
  type: MediaType
  title: string
  year?: number
  status: MediaStatus
  rating?: number
  notes: string
  date_added: string
  date_completed?: string
  poster_url?: string
  dominant_color?: string
  genre?: string
  director?: string
  seasons_watched?: number
  total_seasons?: number
  author?: string
  pages?: number
  isbn?: string
  platform?: string
  developer?: string
  ratings_json?: Record<string, CriterionValue>
  wishlist?: boolean
}

export interface SearchResult {
  title: string
  year?: number
  poster_url?: string
  genre?: string
  director?: string
  author?: string
  pages?: number
  total_seasons?: number
  isbn?: string
  platform?: string
  developer?: string
}
