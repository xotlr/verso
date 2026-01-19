import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create chainable mock for Supabase
const createMockSupabaseChain = (finalValue: unknown) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalValue),
  }
  return chain
}

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerActionClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}))

import { checkScreenplayAccess, requireScreenplayAccess, AuthorizationError, type ShareRole } from '@/lib/auth-utils'

const mockScreenplay = {
  id: 'screenplay-1',
  userId: 'owner-user-id',
  teamId: null,
  project: null,
  team: null,
}

describe('checkScreenplayAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return not found for non-existent screenplay', async () => {
    mockFrom.mockReturnValue(createMockSupabaseChain({ data: null, error: { code: 'PGRST116' } }))

    const result = await checkScreenplayAccess('non-existent', 'any-user')

    expect(result.allowed).toBe(false)
    expect(result.error).toBe('Screenplay not found')
    expect(result.status).toBe(404)
  })

  it('should allow access for screenplay owner', async () => {
    // First call: Screenplay lookup
    const screenplayChain = createMockSupabaseChain({ data: mockScreenplay, error: null })
    mockFrom.mockReturnValue(screenplayChain)

    const result = await checkScreenplayAccess('screenplay-1', 'owner-user-id')

    expect(result.allowed).toBe(true)
    expect(result.isOwner).toBe(true)
    expect(result.screenplay?.id).toBe('screenplay-1')
  })

  it('should allow access for team member', async () => {
    const screenplayWithTeam = {
      ...mockScreenplay,
      teamId: 'team-1',
    }

    // Mock different results based on table
    mockFrom.mockImplementation((table: string) => {
      if (table === 'Screenplay') {
        return createMockSupabaseChain({ data: screenplayWithTeam, error: null })
      }
      if (table === 'TeamMember') {
        return createMockSupabaseChain({
          data: { id: 'member-1', teamId: 'team-1', userId: 'team-member-id', role: 'MEMBER' },
          error: null
        })
      }
      return createMockSupabaseChain({ data: null, error: null })
    })

    const result = await checkScreenplayAccess('screenplay-1', 'team-member-id')

    expect(result.allowed).toBe(true)
    expect(result.isOwner).toBe(false)
  })

  it('should deny access for user without any access', async () => {
    // Mock: screenplay found, no team membership, no share
    mockFrom.mockImplementation((table: string) => {
      if (table === 'Screenplay') {
        return createMockSupabaseChain({ data: mockScreenplay, error: null })
      }
      return createMockSupabaseChain({ data: null, error: null })
    })

    const result = await checkScreenplayAccess('screenplay-1', 'random-user-id')

    expect(result.allowed).toBe(false)
    expect(result.error).toBe('Access denied')
    expect(result.status).toBe(403)
  })
})

describe('requireScreenplayAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return screenplay data when access is allowed', async () => {
    mockFrom.mockReturnValue(createMockSupabaseChain({ data: mockScreenplay, error: null }))

    const result = await requireScreenplayAccess('screenplay-1', 'owner-user-id')

    expect(result.screenplay.id).toBe('screenplay-1')
    expect(result.isOwner).toBe(true)
  })

  it('should throw AuthorizationError when screenplay not found', async () => {
    mockFrom.mockReturnValue(createMockSupabaseChain({ data: null, error: { code: 'PGRST116' } }))

    await expect(
      requireScreenplayAccess('non-existent', 'any-user')
    ).rejects.toThrow(AuthorizationError)
  })

  it('should throw AuthorizationError when access denied', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'Screenplay') {
        return createMockSupabaseChain({ data: mockScreenplay, error: null })
      }
      return createMockSupabaseChain({ data: null, error: null })
    })

    await expect(
      requireScreenplayAccess('screenplay-1', 'random-user')
    ).rejects.toThrow(AuthorizationError)
  })
})

describe('AuthorizationError', () => {
  it('should have correct name', () => {
    const error = new AuthorizationError('Test error')
    expect(error.name).toBe('AuthorizationError')
  })

  it('should have default code of NOT_MEMBER', () => {
    const error = new AuthorizationError('Test error')
    expect(error.code).toBe('NOT_MEMBER')
  })

  it('should accept custom code', () => {
    const error = new AuthorizationError('Not found', 'NOT_FOUND')
    expect(error.code).toBe('NOT_FOUND')
  })

  it('should be instanceof Error', () => {
    const error = new AuthorizationError('Test error')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AuthorizationError)
  })
})
