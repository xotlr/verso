'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useConnectionStatus } from './use-connection-status'
import {
  saveDraft,
  getDraft,
  updateDraftStatus,
  queueSync,
  getSyncQueue,
  removeSyncQueueItem,
  incrementSyncAttempt,
  type OfflineDraft,
} from '@/lib/pwa/offline-db'

// Debug logging for sync operations
const DEBUG_SYNC = true // Set to false in production

const logSync = (message: string, data?: any) => {
  if (DEBUG_SYNC) {
    console.log(`[Sync Debug] ${message}`, data || '')
  }
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline'

interface UseOfflineSaveOptions {
  screenplayId: string
}

interface UseOfflineSaveReturn {
  save: (content: string, title?: string) => Promise<void>
  syncStatus: SyncStatus
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  forceSync: () => Promise<void>
}

const MAX_SYNC_ATTEMPTS = 5

/**
 * Hook for local-first saving with offline support
 *
 * - Always saves to IndexedDB first
 * - Syncs to server when online (last-write-wins)
 * - Processes sync queue when coming back online
 */
export function useOfflineSave({
  screenplayId,
}: UseOfflineSaveOptions): UseOfflineSaveReturn {
  const { isOnline, wasOffline, resetWasOffline } = useConnectionStatus()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const localVersionRef = useRef(1)
  const isMountedRef = useRef(true)

  // Update sync status based on connection
  useEffect(() => {
    if (!isOnline) {
      setSyncStatus('offline')
    }
  }, [isOnline])

  // Load any existing draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      const draft = await getDraft(screenplayId)
      if (draft) {
        localVersionRef.current = draft.localVersion
        if (draft.syncStatus === 'pending') {
          setSyncStatus('pending')
        }
      }
    }
    loadDraft()
  }, [screenplayId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Save to server (last-write-wins model)
  const saveToServer = useCallback(async (
    content: string,
    title: string
  ): Promise<{ success: boolean; updatedAt?: number }> => {
    try {
      logSync('Starting server save', {
        screenplayId,
        contentLength: content.length,
      })

      const response = await fetch(`/api/screenplays/${screenplayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          title,
        }),
      })

      if (!response.ok) {
        // Enhanced error logging
        const errorBody = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorBody)
        } catch {
          errorData = { message: errorBody }
        }

        console.error('[Sync Error] Save failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: response.url,
        })

        // Show user-friendly error based on status
        if (response.status === 401 || response.status === 403) {
          // Authentication/permission error - don't retry
          throw new Error('Permission denied. Please log in again.')
        } else if (response.status >= 500) {
          // Server error - can retry
          throw new Error(`Server error (${response.status}). Will retry.`)
        } else {
          throw new Error(`Save failed: ${errorData.message || response.statusText}`)
        }
      }

      const data = await response.json()
      logSync('Server save successful', {
        updatedAt: new Date(data.updatedAt).getTime(),
      })
      return {
        success: true,
        updatedAt: new Date(data.updatedAt).getTime(),
      }
    } catch (error) {
      console.error('[Sync Error] Exception during save:', error)
      return { success: false }
    }
  }, [screenplayId])

  // Process the sync queue
  const processSyncQueue = useCallback(async () => {
    if (!isMountedRef.current || isSyncing) return

    logSync('Processing sync queue')
    setIsSyncing(true)
    setSyncStatus('syncing')

    try {
      const queue = await getSyncQueue()
      const screenplayItems = queue.filter(item => item.screenplayId === screenplayId)
      logSync(`Found ${screenplayItems.length} items in sync queue`)

      for (const item of screenplayItems) {
        if (!isMountedRef.current) break

        if (item.attempts >= MAX_SYNC_ATTEMPTS) {
          // Too many failed attempts, remove from queue
          await removeSyncQueueItem(item.id)
          continue
        }

        if (item.type === 'save' && item.payload.content) {
          const result = await saveToServer(
            item.payload.content,
            item.payload.title || 'Untitled'
          )

          if (result.success) {
            await removeSyncQueueItem(item.id)
            await updateDraftStatus(screenplayId, 'synced', result.updatedAt)
          } else {
            // Network error - increment attempts and retry later
            await incrementSyncAttempt(item.id)
          }
        }
      }

      // Update pending count
      const remainingQueue = await getSyncQueue()
      const remaining = remainingQueue.filter(item => item.screenplayId === screenplayId)
      setPendingCount(remaining.length)

      if (remaining.length === 0) {
        setSyncStatus('synced')
      }
    } catch (error) {
      console.error('Error processing sync queue:', error)
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false)
      }
    }
  }, [screenplayId, isSyncing, saveToServer])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      processSyncQueue()
      resetWasOffline()
    }
  }, [isOnline, wasOffline, processSyncQueue, resetWasOffline])

  // Main save function - local-first
  const save = useCallback(async (content: string, title?: string) => {
    const draftTitle = title || 'Untitled Screenplay'
    localVersionRef.current++

    // 1. Always save to IndexedDB first (local-first)
    const draft: OfflineDraft = {
      screenplayId,
      content,
      title: draftTitle,
      lastModified: Date.now(),
      syncStatus: 'pending',
      localVersion: localVersionRef.current,
    }
    await saveDraft(draft)
    setSyncStatus('pending')

    // 2. If online, try server save immediately
    if (isOnline) {
      setIsSyncing(true)
      setSyncStatus('syncing')

      const result = await saveToServer(content, draftTitle)

      if (result.success) {
        await updateDraftStatus(screenplayId, 'synced', result.updatedAt)
        if (isMountedRef.current) {
          setSyncStatus('synced')
          setIsSyncing(false)
        }
      } else {
        // Network error - queue for later
        await queueSync({
          type: 'save',
          screenplayId,
          payload: { content, title: draftTitle },
        })
        if (isMountedRef.current) {
          setSyncStatus('pending')
          setIsSyncing(false)
          setPendingCount(prev => prev + 1)
        }
      }
    } else {
      // Offline - queue for later sync
      await queueSync({
        type: 'save',
        screenplayId,
        payload: { content, title: draftTitle },
      })
      setSyncStatus('offline')
      setPendingCount(prev => prev + 1)
    }
  }, [screenplayId, isOnline, saveToServer])

  // Force sync (manual retry)
  const forceSync = useCallback(async () => {
    if (isOnline) {
      await processSyncQueue()
    }
  }, [isOnline, processSyncQueue])

  return {
    save,
    syncStatus,
    isOnline,
    isSyncing,
    pendingCount,
    forceSync,
  }
}
