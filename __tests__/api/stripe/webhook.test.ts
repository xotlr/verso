import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create chainable mock for Supabase
const createMockSupabaseChain = () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  }
  return chain
}

const mockFrom = vi.fn((_table?: string) => createMockSupabaseChain())

// Mock dependencies
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'stripe-signature') return 'test_signature'
      return null
    }),
  })),
}))

vi.mock('@/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerActionClient: vi.fn(() => Promise.resolve({
    from: mockFrom,
  })),
}))

vi.mock('@/lib/stripe-helpers', () => ({
  updateTeamSubscription: vi.fn(),
  cancelTeamSubscription: vi.fn(),
}))

import { POST } from '@/app/api/stripe/webhook/route'
import { getStripe } from '@/lib/stripe'
import { headers } from 'next/headers'
import { cancelTeamSubscription } from '@/lib/stripe-helpers'

const mockGetStripe = vi.mocked(getStripe)
const mockHeaders = vi.mocked(headers)
const mockCancelTeamSubscription = vi.mocked(cancelTeamSubscription)

// Helper to create mock request
function createWebhookRequest(body: string = '{}') {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body,
  })
}

describe('POST /api/stripe/webhook', () => {
  let mockStripe: ReturnType<typeof getStripe>

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock Stripe instance
    mockStripe = {
      webhooks: {
        constructEvent: vi.fn(),
      },
      subscriptions: {
        retrieve: vi.fn(),
      },
    } as unknown as ReturnType<typeof getStripe>

    mockGetStripe.mockReturnValue(mockStripe)

    // Setup default env
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_secret')
  })

  it('returns 400 when signature is missing', async () => {
    mockHeaders.mockResolvedValue({
      get: vi.fn(() => null),
    } as never)

    const response = await POST(createWebhookRequest())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('No signature')
  })

  it('returns 500 when webhook secret is not configured', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')

    mockHeaders.mockResolvedValue({
      get: vi.fn((key: string) => key === 'stripe-signature' ? 'sig' : null),
    } as never)

    const response = await POST(createWebhookRequest())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Webhook secret not configured')
  })

  it('returns 400 for invalid signature', async () => {
    mockHeaders.mockResolvedValue({
      get: vi.fn((key: string) => key === 'stripe-signature' ? 'invalid_sig' : null),
    } as never)

    ;(mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const response = await POST(createWebhookRequest())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid signature')
  })

  it('skips duplicate events (idempotency)', async () => {
    mockHeaders.mockResolvedValue({
      get: vi.fn((key: string) => key === 'stripe-signature' ? 'valid_sig' : null),
    } as never)

    const mockEvent = {
      id: 'evt_duplicate',
      type: 'checkout.session.completed',
      data: { object: {} },
    }

    ;(mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)

    // Mock finding a duplicate event
    mockFrom.mockImplementation((table?: string) => {
      const chain = createMockSupabaseChain()
      if (table === 'ProcessedWebhookEvent') {
        chain.single = vi.fn().mockResolvedValue({ data: { id: 'evt_duplicate' }, error: null })
      }
      return chain
    })

    const response = await POST(createWebhookRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.duplicate).toBe(true)
  })

  describe('checkout.session.completed', () => {
    it('handles user checkout completion', async () => {
      mockHeaders.mockResolvedValue({
        get: vi.fn((key: string) => key === 'stripe-signature' ? 'valid_sig' : null),
      } as never)

      const mockEvent = {
        id: 'evt_checkout',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            customer: 'cus_test',
            subscription: 'sub_test',
            metadata: {
              userId: 'user-1',
              plan: 'PRO',
            },
          },
        },
      }

      ;(mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)
      ;(mockStripe.subscriptions.retrieve as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub_test',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        items: { data: [{ price: { id: 'price_pro' } }] },
      })

      // Mock: no duplicate event found
      mockFrom.mockImplementation(() => {
        const chain = createMockSupabaseChain()
        chain.single = vi.fn().mockResolvedValue({ data: null, error: null })
        return chain
      })

      const response = await POST(createWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
    })
  })

  describe('customer.subscription.deleted', () => {
    it('cancels team subscription', async () => {
      mockHeaders.mockResolvedValue({
        get: vi.fn((key: string) => key === 'stripe-signature' ? 'valid_sig' : null),
      } as never)

      const mockEvent = {
        id: 'evt_team_deleted',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_team',
            customer: 'cus_team',
            metadata: {
              type: 'team',
              teamId: 'team-1',
            },
          },
        },
      }

      ;(mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)

      // Mock: no duplicate event found
      mockFrom.mockImplementation(() => {
        const chain = createMockSupabaseChain()
        chain.single = vi.fn().mockResolvedValue({ data: null, error: null })
        return chain
      })

      const response = await POST(createWebhookRequest())

      expect(response.status).toBe(200)
      expect(mockCancelTeamSubscription).toHaveBeenCalledWith('team-1')
    })
  })

  it('handles unrecognized event types gracefully', async () => {
    mockHeaders.mockResolvedValue({
      get: vi.fn((key: string) => key === 'stripe-signature' ? 'valid_sig' : null),
    } as never)

    const mockEvent = {
      id: 'evt_unknown',
      type: 'unknown.event.type',
      data: { object: {} },
    }

    ;(mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)

    // Mock: no duplicate event found
    mockFrom.mockImplementation(() => {
      const chain = createMockSupabaseChain()
      chain.single = vi.fn().mockResolvedValue({ data: null, error: null })
      return chain
    })

    const response = await POST(createWebhookRequest())

    expect(response.status).toBe(200)
  })
})
