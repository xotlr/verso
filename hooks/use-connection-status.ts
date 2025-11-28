'use client'

import { useState, useEffect, useCallback } from 'react'

interface ConnectionStatus {
  isOnline: boolean
  wasOffline: boolean
  lastOnlineAt: number | null
  resetWasOffline: () => void
}

/**
 * Hook to track online/offline connection status
 *
 * - isOnline: Current connection state
 * - wasOffline: True if user was offline and just came back online (for sync triggers)
 * - lastOnlineAt: Timestamp of last online state
 * - resetWasOffline: Call after handling the reconnection (e.g., after sync)
 */
export function useConnectionStatus(): ConnectionStatus {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null)

  const resetWasOffline = useCallback(() => {
    setWasOffline(false)
  }, [])

  useEffect(() => {
    // Initial state from navigator
    const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    setIsOnline(initialOnline)
    if (initialOnline) {
      setLastOnlineAt(Date.now())
    }

    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true) // Flag that we just came back online
      setLastOnlineAt(Date.now())
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline, lastOnlineAt, resetWasOffline }
}
