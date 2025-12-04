'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

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
  const { data: session } = useSession()
  const [invites, setInvites] = useState<ProjectRoleInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchInvites = useCallback(async () => {
    if (!session?.user?.email) {
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/project-role-invites')
      if (res.ok) {
        const data = await res.json()
        setInvites(data)
      }
    } catch (error) {
      console.error('Failed to fetch project role invites:', error)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.email])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  const acceptInvite = async (token: string) => {
    try {
      const res = await fetch(`/api/project-role-invites/${token}`, { method: 'POST' })
      if (res.ok) {
        await fetchInvites()
        return { success: true }
      }
      const data = await res.json()
      return { success: false, error: data.error }
    } catch {
      return { success: false, error: 'Failed to accept invite' }
    }
  }

  const declineInvite = async (token: string) => {
    try {
      const res = await fetch(`/api/project-role-invites/${token}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchInvites()
        return { success: true }
      }
      const data = await res.json()
      return { success: false, error: data.error }
    } catch {
      return { success: false, error: 'Failed to decline invite' }
    }
  }

  return {
    invites,
    isLoading,
    acceptInvite,
    declineInvite,
    refresh: fetchInvites,
    count: invites.length
  }
}
