'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface InviteConfig {
  /** Base API path for fetching invites (e.g., '/api/invites') */
  apiPath: string
  /** Path for accepting an invite. Receives token, returns full path */
  acceptPath: (token: string) => string
  /** Path for declining an invite. Receives token, returns full path */
  declinePath: (token: string) => string
  /** HTTP method for accept (default: 'POST') */
  acceptMethod?: 'POST' | 'PUT'
}

interface InviteResult {
  success: boolean
  error?: string
}

/**
 * Generic hook for managing invite lists (team invites, project role invites, etc.)
 * Provides fetch, accept, and decline functionality with consistent patterns.
 */
export function useInvites<T>(config: InviteConfig) {
  const { apiPath, acceptPath, declinePath, acceptMethod = 'POST' } = config
  const { data: session } = useSession()
  const [invites, setInvites] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchInvites = useCallback(async () => {
    if (!session?.user?.email) {
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(apiPath)
      if (res.ok) {
        const data = await res.json()
        setInvites(data)
      }
    } catch (error) {
      console.error(`Failed to fetch invites from ${apiPath}:`, error)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.email, apiPath])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  const acceptInvite = async (token: string): Promise<InviteResult> => {
    try {
      const res = await fetch(acceptPath(token), { method: acceptMethod })
      if (res.ok) {
        await fetchInvites()
        return { success: true }
      }
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data.error || 'Failed to accept invite' }
    } catch {
      return { success: false, error: 'Failed to accept invite' }
    }
  }

  const declineInvite = async (token: string): Promise<InviteResult> => {
    try {
      const res = await fetch(declinePath(token), { method: 'DELETE' })
      if (res.ok) {
        await fetchInvites()
        return { success: true }
      }
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data.error || 'Failed to decline invite' }
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
