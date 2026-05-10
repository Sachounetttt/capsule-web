import { buildMovieResult, buildTVResult, buildBookResult, buildGameResult } from '@/lib/search'

describe('search result builders', () => {
  it('buildMovieResult extrait les bons champs', () => {
    const raw = {
      title: 'Inception',
      release_date: '2010-07-16',
      poster_path: '/path.jpg',
    }
    const result = buildMovieResult(raw)
    expect(result.title).toBe('Inception')
    expect(result.year).toBe(2010)
    expect(result.poster_url).toBe('https://image.tmdb.org/t/p/w500/path.jpg')
  })

  it('buildMovieResult gère poster_path null', () => {
    const result = buildMovieResult({ title: 'Test', poster_path: null })
    expect(result.poster_url).toBeUndefined()
  })

  it('buildBookResult extrait les bons champs', () => {
    const raw = {
      title: 'Dune',
      author_name: ['Frank Herbert'],
      number_of_pages_median: 412,
      cover_i: 9876,
    }
    const result = buildBookResult(raw)
    expect(result.author).toBe('Frank Herbert')
    expect(result.pages).toBe(412)
    expect(result.poster_url).toBe('https://covers.openlibrary.org/b/id/9876-M.jpg')
  })
})

describe('buildGameResult', () => {
  it('extrait name, released et background_image', () => {
    const raw = {
      name: 'Elden Ring',
      released: '2022-02-25',
      background_image: 'https://media.rawg.io/elden.jpg',
    }
    const result = buildGameResult(raw)
    expect(result.title).toBe('Elden Ring')
    expect(result.year).toBe(2022)
    expect(result.poster_url).toBe('https://media.rawg.io/elden.jpg')
  })

  it('gère background_image null', () => {
    const result = buildGameResult({ name: 'Test', released: null, background_image: null })
    expect(result.poster_url).toBeUndefined()
    expect(result.year).toBeUndefined()
  })
})

describe('community_rating extraction', () => {
  it('buildMovieResult extrait vote_average comme community_rating TMDB', () => {
    const raw = {
      title: 'Inception',
      release_date: '2010-07-16',
      poster_path: '/path.jpg',
      vote_average: 8.8,
    }
    const result = buildMovieResult(raw)
    expect(result.community_rating).toBe(8.8)
    expect(result.community_rating_source).toBe('TMDB')
  })

  it('buildMovieResult gère vote_average absent', () => {
    const result = buildMovieResult({ title: 'Test', release_date: null, poster_path: null })
    expect(result.community_rating).toBeUndefined()
  })

  it('buildGameResult extrait rating comme community_rating RAWG', () => {
    const raw = {
      name: 'Elden Ring',
      released: '2022-02-25',
      background_image: 'https://media.rawg.io/elden.jpg',
      rating: 4.47,
    }
    const result = buildGameResult(raw)
    expect(result.community_rating).toBe(4.47)
    expect(result.community_rating_source).toBe('RAWG')
  })

  it('buildGameResult gère rating absent', () => {
    const result = buildGameResult({ name: 'Test', released: null, background_image: null })
    expect(result.community_rating).toBeUndefined()
  })
})
