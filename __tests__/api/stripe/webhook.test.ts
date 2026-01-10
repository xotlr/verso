import { describe, it, expect, vi, beforeEach } from 'vitest'

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

vi.mock('@/lib/prisma', () => ({
  prisma: {
    processedWebhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
    team: {
      update: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/stripe-helpers', () => ({
  updateTeamSubscription: vi.fn(),
  cancelTeamSubscription: vi.fn(),
}))

import { POST } from '@/app/api/stripe/webhook/route'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { cancelTeamSubscription } from '@/lib/stripe-helpers'

const mockGetStripe = vi.mocked(getStripe)
const mockPrisma = prisma as unknown as {
  processedWebhookEvent: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  user: {
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  team: {
    update: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
}
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
    mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue({ id: 'evt_duplicate' } as never)

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
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null)
      ;(mockStripe.subscriptions.retrieve as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub_test',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        items: { data: [{ price: { id: 'price_pro' } }] },
      })
      mockPrisma.user.update.mockResolvedValue({} as never)
      mockPrisma.processedWebhookEvent.create.mockResolvedValue({} as never)

      const response = await POST(createWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            plan: 'PRO',
            stripeCustomerId: 'cus_test',
            stripeSubscriptionId: 'sub_test',
          }),
        })
      )
    })

    it('handles team checkout completion', async () => {
      mockHeaders.mockResolvedValue({
        get: vi.fn((key: string) => key === 'stripe-signature' ? 'valid_sig' : null),
      } as never)

      const mockEvent = {
        id: 'evt_team_checkout',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_team',
            customer: 'cus_team',
            subscription: 'sub_team',
            metadata: {
              type: 'team',
              teamId: 'team-1',
            },
          },
        },
      }

      ;(mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null)
      ;(mockStripe.subscriptions.retrieve as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'sub_team',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        items: { data: [{ price: { id: 'price_team' } }] },
        metadata: { maxSeats: '20' },
      })
      mockPrisma.team.update.mockResolvedValue({} as never)
      mockPrisma.processedWebhookEvent.create.mockResolvedValue({} as never)

      const response = await POST(createWebhookRequest())

      expect(response.status).toBe(200)
      expect(mockPrisma.team.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'team-1' },
          data: expect.objectContaining({
            stripeCustomerId: 'cus_team',
            stripeSubscriptionId: 'sub_team',
            maxSeats: 20,
          }),
        })
      )
    })
  })

  describe('customer.subscription.updated', () => {
    it('updates user subscription', async () => {
      mockHeaders.mockResolvedValue({
        get: vi.fn((key: string) => key === 'stripe-signature' ? 'valid_sig' : null),
      } as never)

      const mockEvent = {
        id: 'evt_sub_update',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test',
            customer: 'cus_test',
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
            items: { data: [{ price: { id: 'price_plus' } }] },
            metadata: {
              userId: 'user-1',
              plan: 'PLUS',
            },
          },
        },
      }

      ;(mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null)
      mockPrisma.user.update.mockResolvedValue({} as never)
      mockPrisma.processedWebhookEvent.create.mockResolvedValue({} as never)

      const response = await POST(createWebhookRequest())

      expect(response.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            plan: 'PLUS',
          }),
        })
      )
    })

    it('downgrades to FREE when subscription is not active', async () => {
      mockHeaders.mockResolvedValue({
        get: vi.fn((key: string) => key === 'stripe-signature' ? 'valid_sig' : null),
      } as never)

      const mockEvent = {
        id: 'evt_sub_cancel',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test',
            customer: 'cus_test',
            status: 'canceled',
            current_period_end: Math.floor(Date.now() / 1000),
            items: { data: [{ price: { id: 'price_pro' } }] },
            metadata: {
              userId: 'user-1',
              plan: 'PRO',
            },
          },
        },
      }

      ;(mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null)
      mockPrisma.user.update.mockResolvedValue({} as never)
      mockPrisma.processedWebhookEvent.create.mockResolvedValue({} as never)

      const response = await POST(createWebhookRequest())

      expect(response.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'FREE',
          }),
        })
      )
    })
  })

  describe('customer.subscription.deleted', () => {
    it('cancels user subscription', async () => {
      mockHeaders.mockResolvedValue({
        get: vi.fn((key: string) => key === 'stripe-signature' ? 'valid_sig' : null),
      } as never)

      const mockEvent = {
        id: 'evt_sub_deleted',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test',
            customer: 'cus_test',
            metadata: {
              userId: 'user-1',
            },
          },
        },
      }

      ;(mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null)
      mockPrisma.user.update.mockResolvedValue({} as never)
      mockPrisma.processedWebhookEvent.create.mockResolvedValue({} as never)

      const response = await POST(createWebhookRequest())

      expect(response.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            plan: 'FREE',
            stripeSubscriptionId: null,
            stripePriceId: null,
          }),
        })
      )
    })

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
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null)
      mockPrisma.processedWebhookEvent.create.mockResolvedValue({} as never)

      const response = await POST(createWebhookRequest())

      expect(response.status).toBe(200)
      expect(mockCancelTeamSubscription).toHaveBeenCalledWith('team-1')
    })
  })

  describe('invoice events', () => {
    it('handles invoice.payment_succeeded - reactivates downgraded user', async () => {
      mockHeaders.mockResolvedValue({
        get: vi.fn((key: string) => key === 'stripe-signature' ? 'valid_sig' : null),
      } as never)

      const mockEvent = {
        id: 'evt_payment_success',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'inv_test',
            customer: 'cus_test',
            subscription: 'sub_test',
            subscription_details: {
              metadata: { plan: 'PRO' },
            },
            lines: {
              data: [{ period: { end: Math.floor(Date.now() / 1000) + 2592000 } }],
            },
          },
        },
      }

      ;(mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null)
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1', plan: 'FREE' } as never)
      mockPrisma.user.update.mockResolvedValue({} as never)
      mockPrisma.processedWebhookEvent.create.mockResolvedValue({} as never)

      const response = await POST(createWebhookRequest())

      expect(response.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            plan: 'PRO',
          }),
        })
      )
    })

    it('handles invoice.payment_failed', async () => {
      mockHeaders.mockResolvedValue({
        get: vi.fn((key: string) => key === 'stripe-signature' ? 'valid_sig' : null),
      } as never)

      const mockEvent = {
        id: 'evt_payment_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'inv_test',
            customer: 'cus_test',
            attempt_count: 2,
          },
        },
      }

      ;(mockStripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null)
      mockPrisma.processedWebhookEvent.create.mockResolvedValue({} as never)

      const response = await POST(createWebhookRequest())

      // Payment failure is logged but doesn't fail the webhook
      expect(response.status).toBe(200)
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
    mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null)
    mockPrisma.processedWebhookEvent.create.mockResolvedValue({} as never)

    const response = await POST(createWebhookRequest())

    expect(response.status).toBe(200)
  })
})
