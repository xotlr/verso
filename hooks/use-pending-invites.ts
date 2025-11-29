'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

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
  const { data: session } = useSession()
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchInvites = useCallback(async () => {
    if (!session?.user?.email) {
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/invites')
      if (res.ok) {
        const data = await res.json()
        setInvites(data)
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.email])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  const acceptInvite = async (token: string) => {
    try {
      const res = await fetch(`/api/invites/${token}/accept`, { method: 'POST' })
      if (res.ok) {
        await fetchInvites()
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const declineInvite = async (token: string) => {
    try {
      const res = await fetch(`/api/invites/${token}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchInvites()
        return true
      }
      return false
    } catch {
      return false
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
