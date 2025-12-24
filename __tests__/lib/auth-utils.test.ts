import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before importing auth-utils
vi.mock('@/lib/prisma', () => ({
  prisma: {
    screenplay: {
      findUnique: vi.fn(),
    },
    teamMember: {
      findUnique: vi.fn(),
    },
    screenplayShare: {
      findUnique: vi.fn(),
    },
  },
}))

import { checkScreenplayAccess, requireScreenplayAccess, AuthorizationError, type ShareRole } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

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
    vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(null)

    const result = await checkScreenplayAccess('non-existent', 'any-user')

    expect(result.allowed).toBe(false)
    expect(result.error).toBe('Screenplay not found')
    expect(result.status).toBe(404)
  })

  it('should allow access for screenplay owner', async () => {
    vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(mockScreenplay as any)

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
    vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(screenplayWithTeam as any)
    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
      id: 'member-1',
      teamId: 'team-1',
      userId: 'team-member-id',
      role: 'MEMBER',
    } as any)

    const result = await checkScreenplayAccess('screenplay-1', 'team-member-id')

    expect(result.allowed).toBe(true)
    expect(result.isOwner).toBe(false)
  })

  it('should allow access for team member via project', async () => {
    const screenplayWithProject = {
      ...mockScreenplay,
      project: { teamId: 'project-team-1' },
    }
    vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(screenplayWithProject as any)
    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
      id: 'member-1',
      teamId: 'project-team-1',
      userId: 'team-member-id',
      role: 'MEMBER',
    } as any)

    const result = await checkScreenplayAccess('screenplay-1', 'team-member-id')

    expect(result.allowed).toBe(true)
    expect(result.isOwner).toBe(false)
  })

  it('should allow access for shared user with sufficient role', async () => {
    vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(mockScreenplay as any)
    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.screenplayShare.findUnique).mockResolvedValue({
      id: 'share-1',
      screenplayId: 'screenplay-1',
      userId: 'shared-user-id',
      role: 'EDITOR',
    } as any)

    const result = await checkScreenplayAccess('screenplay-1', 'shared-user-id', 'VIEWER')

    expect(result.allowed).toBe(true)
    expect(result.isOwner).toBe(false)
    expect(result.shareRole).toBe('EDITOR')
  })

  it('should deny access for shared user with insufficient role', async () => {
    vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(mockScreenplay as any)
    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.screenplayShare.findUnique).mockResolvedValue({
      id: 'share-1',
      screenplayId: 'screenplay-1',
      userId: 'shared-user-id',
      role: 'VIEWER',
    } as any)

    const result = await checkScreenplayAccess('screenplay-1', 'shared-user-id', 'EDITOR')

    expect(result.allowed).toBe(false)
    expect(result.error).toBe('Insufficient permissions')
    expect(result.status).toBe(403)
  })

  it('should deny access for user without any access', async () => {
    vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(mockScreenplay as any)
    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.screenplayShare.findUnique).mockResolvedValue(null)

    const result = await checkScreenplayAccess('screenplay-1', 'random-user-id')

    expect(result.allowed).toBe(false)
    expect(result.error).toBe('Access denied')
    expect(result.status).toBe(403)
  })

  describe('role hierarchy', () => {
    const roles: ShareRole[] = ['VIEWER', 'COMMENTER', 'EDITOR', 'ADMIN']

    it.each([
      ['ADMIN', 'VIEWER', true],
      ['ADMIN', 'COMMENTER', true],
      ['ADMIN', 'EDITOR', true],
      ['ADMIN', 'ADMIN', true],
      ['EDITOR', 'VIEWER', true],
      ['EDITOR', 'COMMENTER', true],
      ['EDITOR', 'EDITOR', true],
      ['EDITOR', 'ADMIN', false],
      ['COMMENTER', 'VIEWER', true],
      ['COMMENTER', 'COMMENTER', true],
      ['COMMENTER', 'EDITOR', false],
      ['VIEWER', 'VIEWER', true],
      ['VIEWER', 'COMMENTER', false],
    ] as [ShareRole, ShareRole, boolean][])(
      'should correctly evaluate %s role against %s required (expected: %s)',
      async (userRole, requiredRole, expectedAllowed) => {
        vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(mockScreenplay as any)
        vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.screenplayShare.findUnique).mockResolvedValue({
          id: 'share-1',
          screenplayId: 'screenplay-1',
          userId: 'shared-user-id',
          role: userRole,
        } as any)

        const result = await checkScreenplayAccess('screenplay-1', 'shared-user-id', requiredRole)

        expect(result.allowed).toBe(expectedAllowed)
      }
    )
  })
})

describe('requireScreenplayAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return screenplay data when access is allowed', async () => {
    vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(mockScreenplay as any)

    const result = await requireScreenplayAccess('screenplay-1', 'owner-user-id')

    expect(result.screenplay.id).toBe('screenplay-1')
    expect(result.isOwner).toBe(true)
  })

  it('should throw AuthorizationError when screenplay not found', async () => {
    vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(null)

    await expect(
      requireScreenplayAccess('non-existent', 'any-user')
    ).rejects.toThrow(AuthorizationError)

    await expect(
      requireScreenplayAccess('non-existent', 'any-user')
    ).rejects.toThrow('Screenplay not found')
  })

  it('should throw AuthorizationError when access denied', async () => {
    vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(mockScreenplay as any)
    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.screenplayShare.findUnique).mockResolvedValue(null)

    await expect(
      requireScreenplayAccess('screenplay-1', 'random-user')
    ).rejects.toThrow(AuthorizationError)

    await expect(
      requireScreenplayAccess('screenplay-1', 'random-user')
    ).rejects.toThrow('Access denied')
  })

  it('should include shareRole in result when access via share', async () => {
    vi.mocked(prisma.screenplay.findUnique).mockResolvedValue(mockScreenplay as any)
    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.screenplayShare.findUnique).mockResolvedValue({
      id: 'share-1',
      screenplayId: 'screenplay-1',
      userId: 'shared-user-id',
      role: 'EDITOR',
    } as any)

    const result = await requireScreenplayAccess('screenplay-1', 'shared-user-id')

    expect(result.shareRole).toBe('EDITOR')
    expect(result.isOwner).toBe(false)
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
