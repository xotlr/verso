'use client'

import { useInvites } from './use-invites'

interface TeamInvite {
  id: string
  token: string
  email: string
  role: 'ADMIN' | 'MEMBER'
  expiresAt: string
  team: {
    id: string
    name: string
    logo: string | null
  }
  inviter: {
    id: string
    name: string | null
    image: string | null
  }
}

export function usePendingInvites() {
  return useInvites<TeamInvite>({
    apiPath: '/api/invites',
    acceptPath: (token) => `/api/invites/${token}/accept`,
    declinePath: (token) => `/api/invites/${token}`,
  })
}
