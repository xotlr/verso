import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies before importing route handlers
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    screenplay: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamMember: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-utils', () => ({
  checkScreenplayAccess: vi.fn(),
}))

import { GET, PUT, PATCH, DELETE } from '@/app/api/screenplays/[id]/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkScreenplayAccess } from '@/lib/auth-utils'

// Cast through unknown to avoid complex mock typing - mocks are set up correctly
const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockPrisma = prisma as unknown as {
  screenplay: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> }
  teamMember: { findUnique: ReturnType<typeof vi.fn> }
}
const mockCheckAccess = checkScreenplayAccess as unknown as ReturnType<typeof vi.fn>

function createRequest(method: string, body?: object) {
  return new NextRequest('http://localhost/api/screenplays/sp-1', {
    method,
    ...(body && { body: JSON.stringify(body) }),
  })
}

const mockParams = Promise.resolve({ id: 'sp-1' })

describe('GET /api/screenplays/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const response = await GET(createRequest('GET'), { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('returns 404 when screenplay not found', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockPrisma.screenplay.findUnique.mockResolvedValue(null)

    const response = await GET(createRequest('GET'), { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('not found')
  })

  it('returns 403 when user lacks access', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    // Screenplay exists but user is not owner, no shares, no team access
    mockPrisma.screenplay.findUnique.mockResolvedValue({
      id: 'sp-1',
      userId: 'other-user',
      shares: [],
      project: null,
      teamId: null,
    } as never)

    const response = await GET(createRequest('GET'), { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('denied')
  })

  it('returns screenplay and updates lastOpenedAt', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    const mockScreenplay = {
      id: 'sp-1',
      title: 'Test Screenplay',
      content: '{}',
      userId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      project: null,
      team: null,
      teamId: null,
      series: null,
      seasonRef: null,
      shares: [],
    }

    mockPrisma.screenplay.findUnique.mockResolvedValue(mockScreenplay as never)
    mockPrisma.screenplay.update.mockResolvedValue({ id: 'sp-1' } as never)

    const response = await GET(createRequest('GET'), { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('sp-1')
    expect(mockPrisma.screenplay.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sp-1' },
        data: expect.objectContaining({
          lastOpenedAt: expect.any(Date),
        }),
      })
    )
  })
})

describe('PUT /api/screenplays/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const response = await PUT(
      createRequest('PUT', { title: 'Updated' }),
      { params: mockParams }
    )

    expect(response.status).toBe(401)
  })

  it('returns 403 when user is not editor', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockCheckAccess.mockResolvedValue({
      allowed: false,
      error: 'Editor access required',
      status: 403,
    })

    const response = await PUT(
      createRequest('PUT', { title: 'Updated' }),
      { params: mockParams }
    )

    expect(response.status).toBe(403)
  })

  it('validates input schema', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockCheckAccess.mockResolvedValue({
      allowed: true,
      isOwner: true,
    })

    const response = await PUT(
      createRequest('PUT', { title: '' }), // Empty title invalid
      { params: mockParams }
    )

    expect(response.status).toBe(422)
  })

  it('updates screenplay successfully', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockCheckAccess.mockResolvedValue({
      allowed: true,
      isOwner: true,
    })

    const updatedScreenplay = {
      id: 'sp-1',
      title: 'Updated Title',
      genre: 'Drama',
      userId: 'user-1',
      updatedAt: new Date(),
    }

    mockPrisma.screenplay.update.mockResolvedValue(updatedScreenplay as never)

    const response = await PUT(
      createRequest('PUT', { title: 'Updated Title', genre: 'Drama' }),
      { params: mockParams }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.title).toBe('Updated Title')
  })

  it('rejects content over 5MB', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockCheckAccess.mockResolvedValue({
      allowed: true,
      isOwner: true,
    })

    // Create content larger than 5MB
    const largeContent = 'x'.repeat(6 * 1024 * 1024)

    const response = await PUT(
      createRequest('PUT', { content: largeContent }),
      { params: mockParams }
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('too large')
  })

  it('handles optimistic locking conflict', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockCheckAccess.mockResolvedValue({
      allowed: true,
      isOwner: true,
    })

    const currentTime = Date.now()
    mockPrisma.screenplay.findUnique.mockResolvedValue({
      updatedAt: new Date(currentTime + 1000), // Modified after client loaded
    } as never)

    const response = await PUT(
      createRequest('PUT', { title: 'Updated', expectedUpdatedAt: currentTime }),
      { params: mockParams }
    )
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toContain('modified')
  })
})

describe('PATCH /api/screenplays/[id]', () => {
  it('updates partial fields', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockCheckAccess.mockResolvedValue({
      allowed: true,
      isOwner: true,
    })

    mockPrisma.screenplay.update.mockResolvedValue({
      id: 'sp-1',
      logline: 'New logline',
    } as never)

    const response = await PATCH(
      createRequest('PATCH', { logline: 'New logline' }),
      { params: mockParams }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.logline).toBe('New logline')
  })
})

describe('DELETE /api/screenplays/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const response = await DELETE(createRequest('DELETE'), { params: mockParams })

    expect(response.status).toBe(401)
  })

  it('returns 403 when user is not owner', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockCheckAccess.mockResolvedValue({
      allowed: true,
      isOwner: false,
      shareRole: 'EDITOR',
    })

    const response = await DELETE(createRequest('DELETE'), { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('Only the owner')
  })

  it('deletes screenplay successfully', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockCheckAccess.mockResolvedValue({
      allowed: true,
      isOwner: true,
    })

    mockPrisma.screenplay.delete.mockResolvedValue({} as never)

    const response = await DELETE(createRequest('DELETE'), { params: mockParams })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockPrisma.screenplay.delete).toHaveBeenCalledWith({
      where: { id: 'sp-1' },
    })
  })
})
