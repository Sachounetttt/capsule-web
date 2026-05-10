export type MediaType = 'movie' | 'tvshow' | 'game'
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
  platform?: string
  developer?: string
  community_rating?: number
  community_rating_source?: string
  ratings_json?: Record<string, CriterionValue>
  wishlist?: boolean
}

export interface SearchResult {
  title: string
  year?: number
  poster_url?: string
  genre?: string
  director?: string
  total_seasons?: number
  platform?: string
  developer?: string
  community_rating?: number
  community_rating_source?: string
}

export interface UserProfile {
  id: string
  display_name: string
  avatar_url?: string
  created_at: string
}

export type FriendshipStatus = 'pending' | 'accepted'

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  profile?: UserProfile
}

export interface FriendProfileSummary {
  profile: UserProfile
  stats: { movies: number; tvshows: number; games: number }
  recent: Pick<MediaItem, 'id' | 'title' | 'type' | 'year' | 'poster_url' | 'date_added'>[]
  favorites: Pick<MediaItem, 'id' | 'title' | 'type' | 'year' | 'poster_url'>[]
}
