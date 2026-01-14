'use client'

import { useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSafeFetch, useAbortSignal } from './use-safe-fetch'

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
 * Uses useSafeFetch for automatic abort on unmount.
 */
export function useInvites<T>(config: InviteConfig) {
  const { apiPath, acceptPath, declinePath, acceptMethod = 'POST' } = config
  const { data: session } = useSession()
  const getAbortSignal = useAbortSignal()

  // Only fetch when session is available
  const shouldFetch = !!session?.user?.email

  const { data, isLoading, refetch } = useSafeFetch<T[]>(
    shouldFetch ? apiPath : null,
    { initialData: [] }
  )

  const invites = data ?? []

  const acceptInvite = useCallback(async (token: string): Promise<InviteResult> => {
    try {
      const signal = getAbortSignal()
      const res = await fetch(acceptPath(token), { method: acceptMethod, signal })
      if (res.ok) {
        refetch()
        return { success: true }
      }
      const responseData = await res.json().catch(() => ({}))
      return { success: false, error: responseData.error || 'Failed to accept invite' }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: 'Request cancelled' }
      }
      return { success: false, error: 'Failed to accept invite' }
    }
  }, [acceptPath, acceptMethod, getAbortSignal, refetch])

  const declineInvite = useCallback(async (token: string): Promise<InviteResult> => {
    try {
      const signal = getAbortSignal()
      const res = await fetch(declinePath(token), { method: 'DELETE', signal })
      if (res.ok) {
        refetch()
        return { success: true }
      }
      const responseData = await res.json().catch(() => ({}))
      return { success: false, error: responseData.error || 'Failed to decline invite' }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, error: 'Request cancelled' }
      }
      return { success: false, error: 'Failed to decline invite' }
    }
  }, [declinePath, getAbortSignal, refetch])

  return {
    invites,
    isLoading,
    acceptInvite,
    declineInvite,
    refresh: refetch,
    count: invites.length
  }
}
