import { getAuthUser } from '../auth'

jest.mock('../supabase/server', () => ({
  createServerClient: jest.fn(),
  createSessionClient: jest.fn(),
}))

import { createSessionClient } from '../supabase/server'

describe('getAuthUser', () => {
  it('returns user when session is valid', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' }
    ;(createSessionClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } })
      }
    })

    const user = await getAuthUser()
    expect(user).toEqual(mockUser)
  })

  it('returns null when no session exists', async () => {
    ;(createSessionClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } })
      }
    })

    const user = await getAuthUser()
    expect(user).toBeNull()
  })
})
