'use client'

import { useInvites } from './use-invites'

interface ProjectRoleInvite {
  id: string
  token: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
  project: {
    id: string
    name: string
    logo: string | null
    banner: string | null
  }
  inviter: {
    id: string
    name: string | null
    image: string | null
  }
}

export function usePendingProjectRoleInvites() {
  return useInvites<ProjectRoleInvite>({
    apiPath: '/api/project-role-invites',
    acceptPath: (token) => `/api/project-role-invites/${token}`,
    declinePath: (token) => `/api/project-role-invites/${token}`,
  })
}
