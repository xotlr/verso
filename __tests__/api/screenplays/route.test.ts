import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies before importing route handlers
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    screenplay: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    teamMember: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
  RATE_LIMITS: {
    PROJECT_CREATE: { requests: 10, window: 60 },
  },
}))

vi.mock('@/lib/prosemirror/serialization', () => ({
  serializeForStorage: vi.fn(() => '{"type":"prosemirror","content":{"type":"doc"}}'),
  plainTextToProseMirror: vi.fn(() => ({
    toJSON: () => ({ type: 'doc', content: [] }),
  })),
}))

vi.mock('@/lib/prosemirror/schema', () => ({
  screenplaySchema: {
    nodeFromJSON: vi.fn(() => ({})),
  },
}))

vi.mock('@/lib/screenplay', () => ({
  initializeScreenplayContent: vi.fn(({ title }) => ({
    content: '{}',
    wordCount: 0,
    title,
  })),
  validateScreenplayCreationAccess: vi.fn(),
}))

import { GET, POST } from '@/app/api/screenplays/route'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { validateScreenplayCreationAccess } from '@/lib/screenplay'

// Cast through unknown to avoid complex mock typing - mocks are set up correctly
const mockAuth = auth as unknown as ReturnType<typeof vi.fn>
const mockPrisma = prisma as unknown as {
  screenplay: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn> };
  teamMember: { findUnique: ReturnType<typeof vi.fn> };
  project: { findUnique: ReturnType<typeof vi.fn> };
  activity: { create: ReturnType<typeof vi.fn> };
}
const mockRateLimit = rateLimit as unknown as ReturnType<typeof vi.fn>
const mockValidateAccess = validateScreenplayCreationAccess as unknown as ReturnType<typeof vi.fn>

describe('GET /api/screenplays', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/screenplays')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('returns screenplays for authenticated user', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    const mockScreenplays = [
      { id: 'sp-1', title: 'Test Screenplay', createdAt: new Date(), updatedAt: new Date() },
    ]

    mockPrisma.screenplay.findMany.mockResolvedValue(mockScreenplays as never)
    mockPrisma.screenplay.count.mockResolvedValue(1)

    const request = new NextRequest('http://localhost/api/screenplays')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.screenplays).toHaveLength(1)
    expect(data.total).toBe(1)
  })

  it('filters by standalone screenplays', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockPrisma.screenplay.findMany.mockResolvedValue([])
    mockPrisma.screenplay.count.mockResolvedValue(0)

    const request = new NextRequest('http://localhost/api/screenplays?standalone=true')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockPrisma.screenplay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          projectId: null,
        }),
      })
    )
  })

  it('filters by favorites', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockPrisma.screenplay.findMany.mockResolvedValue([])
    mockPrisma.screenplay.count.mockResolvedValue(0)

    const request = new NextRequest('http://localhost/api/screenplays?favorites=true')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(mockPrisma.screenplay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isFavorite: true,
        }),
      })
    )
  })

  it('respects pagination params', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockPrisma.screenplay.findMany.mockResolvedValue([])
    mockPrisma.screenplay.count.mockResolvedValue(100)

    const request = new NextRequest('http://localhost/api/screenplays?limit=10&offset=20')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockPrisma.screenplay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20,
      })
    )
    expect(data.hasMore).toBe(true)
  })

  it('caps limit at 100', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockPrisma.screenplay.findMany.mockResolvedValue([])
    mockPrisma.screenplay.count.mockResolvedValue(0)

    const request = new NextRequest('http://localhost/api/screenplays?limit=500')
    await GET(request)

    expect(mockPrisma.screenplay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    )
  })
})

describe('POST /api/screenplays', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRateLimit.mockResolvedValue({ success: true, resetAt: Date.now() + 60000 })
    mockValidateAccess.mockResolvedValue({ allowed: true })
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/screenplays', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('returns 429 when rate limited', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockRateLimit.mockResolvedValue({ success: false, resetAt: Date.now() + 30000 })

    const request = new NextRequest('http://localhost/api/screenplays', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Too many requests')
  })

  it('returns 400 for invalid input', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    const request = new NextRequest('http://localhost/api/screenplays', {
      method: 'POST',
      body: JSON.stringify({ title: '' }), // Empty title
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.error).toBeDefined()
  })

  it('creates screenplay successfully', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockPrisma.user.findUnique.mockResolvedValue({ plan: 'FREE' } as never)
    mockPrisma.screenplay.count.mockResolvedValue(0)
    mockPrisma.screenplay.create.mockResolvedValue({
      id: 'sp-new',
      title: 'My Screenplay',
      type: 'FILM',
      userId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)
    mockPrisma.activity.create.mockResolvedValue({} as never)

    const request = new NextRequest('http://localhost/api/screenplays', {
      method: 'POST',
      body: JSON.stringify({ title: 'My Screenplay' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.title).toBe('My Screenplay')
  })

  // Plan limits for standalone screenplays removed - unlimited for all plans

  it('verifies project access', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockValidateAccess.mockResolvedValue({
      allowed: false,
      error: 'Project not found',
      status: 404,
    })

    const request = new NextRequest('http://localhost/api/screenplays', {
      method: 'POST',
      body: JSON.stringify({ title: 'My Screenplay', projectId: 'nonexistent' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('not found')
  })

  it('creates TV screenplay with metadata', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    mockPrisma.user.findUnique.mockResolvedValue({ plan: 'PRO' } as never)
    mockPrisma.screenplay.count.mockResolvedValue(0)
    mockPrisma.screenplay.create.mockResolvedValue({
      id: 'sp-tv',
      title: 'Pilot Episode',
      type: 'TV',
      season: 1,
      episode: 1,
      userId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)
    mockPrisma.activity.create.mockResolvedValue({} as never)

    const request = new NextRequest('http://localhost/api/screenplays', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Pilot Episode',
        type: 'TV',
        season: 1,
        episode: 1,
        genre: 'Drama',
      }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.type).toBe('TV')
    expect(mockPrisma.screenplay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'TV',
          season: 1,
          episode: 1,
          genre: 'Drama',
        }),
      })
    )
  })
})
