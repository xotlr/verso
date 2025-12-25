'use client'

import { useState, useCallback } from 'react'

interface DialogState {
  /** Whether an async operation is in progress */
  isLoading: boolean
  /** Current error message, if any */
  error: string | null
  /** Manually set loading state (for custom control flows) */
  setIsLoading: (loading: boolean) => void
  /** Manually set an error message */
  setError: (error: string | null) => void
  /** Execute an async function with automatic loading/error handling */
  execute: <T>(fn: () => Promise<T>) => Promise<T | null>
  /** Reset error and loading state */
  reset: () => void
}

/**
 * Hook for managing common dialog state patterns (loading, error handling).
 * Reduces boilerplate in dialog components.
 *
 * @example
 * ```tsx
 * const { isLoading, error, execute } = useDialogState()
 *
 * const handleSubmit = async () => {
 *   const result = await execute(async () => {
 *     const res = await fetch('/api/...')
 *     if (!res.ok) throw new Error('Failed')
 *     return res.json()
 *   })
 *   if (result) onSuccess()
 * }
 * ```
 */
export function useDialogState(): DialogState {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fn()
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An error occurred'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setIsLoading(false)
  }, [])

  return { isLoading, error, setIsLoading, setError, execute, reset }
}
