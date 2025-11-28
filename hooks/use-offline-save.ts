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

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'conflict' | 'offline'

interface ConflictData {
  localContent: string
  localTitle: string
  serverContent: string
  serverUpdatedAt: number
}

interface UseOfflineSaveOptions {
  screenplayId: string
  initialServerUpdatedAt?: number
  onConflict?: (data: ConflictData) => void
}

interface UseOfflineSaveReturn {
  save: (content: string, title?: string) => Promise<void>
  syncStatus: SyncStatus
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  forceSync: () => Promise<void>
  resolveConflict: (resolution: 'local' | 'server') => Promise<void>
  conflictData: ConflictData | null
  serverUpdatedAt: number | null
}

const MAX_SYNC_ATTEMPTS = 5

/**
 * Hook for local-first saving with offline support
 *
 * - Always saves to IndexedDB first
 * - Syncs to server when online
 * - Handles conflicts with optimistic locking
 * - Processes sync queue when coming back online
 */
export function useOfflineSave({
  screenplayId,
  initialServerUpdatedAt,
  onConflict,
}: UseOfflineSaveOptions): UseOfflineSaveReturn {
  const { isOnline, wasOffline, resetWasOffline } = useConnectionStatus()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [conflictData, setConflictData] = useState<ConflictData | null>(null)
  const [serverUpdatedAt, setServerUpdatedAt] = useState<number | null>(
    initialServerUpdatedAt ?? null
  )
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
        if (draft.syncStatus === 'conflict') {
          setSyncStatus('conflict')
        } else if (draft.syncStatus === 'pending') {
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

  // Save to server
  const saveToServer = useCallback(async (
    content: string,
    title: string,
    expectedUpdatedAt?: number
  ): Promise<{ success: boolean; updatedAt?: number; conflict?: boolean; serverContent?: string }> => {
    try {
      const response = await fetch(`/api/screenplays/${screenplayId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          title,
          expectedUpdatedAt,
        }),
      })

      if (response.status === 409) {
        // Conflict detected
        const data = await response.json()
        return {
          success: false,
          conflict: true,
          serverContent: data.serverContent,
          updatedAt: data.serverUpdatedAt,
        }
      }

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const data = await response.json()
      return {
        success: true,
        updatedAt: new Date(data.updatedAt).getTime(),
      }
    } catch (error) {
      console.error('Error saving to server:', error)
      return { success: false }
    }
  }, [screenplayId])

  // Process the sync queue
  const processSyncQueue = useCallback(async () => {
    if (!isMountedRef.current || isSyncing) return

    setIsSyncing(true)
    setSyncStatus('syncing')

    try {
      const queue = await getSyncQueue()
      const screenplayItems = queue.filter(item => item.screenplayId === screenplayId)

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
            item.payload.title || 'Untitled',
            serverUpdatedAt ?? undefined
          )

          if (result.success) {
            await removeSyncQueueItem(item.id)
            await updateDraftStatus(screenplayId, 'synced', result.updatedAt)
            if (result.updatedAt) {
              setServerUpdatedAt(result.updatedAt)
            }
          } else if (result.conflict) {
            // Handle conflict
            await updateDraftStatus(screenplayId, 'conflict', result.updatedAt)
            const draft = await getDraft(screenplayId)
            if (draft && result.serverContent) {
              setConflictData({
                localContent: draft.content,
                localTitle: draft.title,
                serverContent: result.serverContent,
                serverUpdatedAt: result.updatedAt || Date.now(),
              })
              onConflict?.({
                localContent: draft.content,
                localTitle: draft.title,
                serverContent: result.serverContent,
                serverUpdatedAt: result.updatedAt || Date.now(),
              })
            }
            setSyncStatus('conflict')
            break // Stop processing on conflict
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

      if (remaining.length === 0 && syncStatus !== 'conflict') {
        setSyncStatus('synced')
      }
    } catch (error) {
      console.error('Error processing sync queue:', error)
    } finally {
      if (isMountedRef.current) {
        setIsSyncing(false)
      }
    }
  }, [screenplayId, isSyncing, saveToServer, serverUpdatedAt, onConflict, syncStatus])

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
      serverUpdatedAt: serverUpdatedAt ?? undefined,
    }
    await saveDraft(draft)
    setSyncStatus('pending')

    // 2. If online, try server save immediately
    if (isOnline) {
      setIsSyncing(true)
      setSyncStatus('syncing')

      const result = await saveToServer(content, draftTitle, serverUpdatedAt ?? undefined)

      if (result.success) {
        await updateDraftStatus(screenplayId, 'synced', result.updatedAt)
        if (result.updatedAt) {
          setServerUpdatedAt(result.updatedAt)
        }
        if (isMountedRef.current) {
          setSyncStatus('synced')
          setIsSyncing(false)
        }
      } else if (result.conflict) {
        // Handle conflict
        await updateDraftStatus(screenplayId, 'conflict', result.updatedAt)
        if (result.serverContent) {
          setConflictData({
            localContent: content,
            localTitle: draftTitle,
            serverContent: result.serverContent,
            serverUpdatedAt: result.updatedAt || Date.now(),
          })
          onConflict?.({
            localContent: content,
            localTitle: draftTitle,
            serverContent: result.serverContent,
            serverUpdatedAt: result.updatedAt || Date.now(),
          })
        }
        if (isMountedRef.current) {
          setSyncStatus('conflict')
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
  }, [screenplayId, isOnline, saveToServer, serverUpdatedAt, onConflict])

  // Force sync (manual retry)
  const forceSync = useCallback(async () => {
    if (isOnline) {
      await processSyncQueue()
    }
  }, [isOnline, processSyncQueue])

  // Resolve conflict
  const resolveConflict = useCallback(async (resolution: 'local' | 'server') => {
    if (!conflictData) return

    if (resolution === 'local') {
      // Force overwrite server with local version
      const result = await saveToServer(conflictData.localContent, conflictData.localTitle)
      if (result.success) {
        await updateDraftStatus(screenplayId, 'synced', result.updatedAt)
        if (result.updatedAt) {
          setServerUpdatedAt(result.updatedAt)
        }
        // Clear the sync queue for this screenplay
        const queue = await getSyncQueue()
        for (const item of queue.filter(i => i.screenplayId === screenplayId)) {
          await removeSyncQueueItem(item.id)
        }
        setSyncStatus('synced')
        setConflictData(null)
        setPendingCount(0)
      }
    } else {
      // Use server version - handled by the caller who will update the editor content
      await updateDraftStatus(screenplayId, 'synced', conflictData.serverUpdatedAt)
      setServerUpdatedAt(conflictData.serverUpdatedAt)
      // Clear local draft and sync queue
      const queue = await getSyncQueue()
      for (const item of queue.filter(i => i.screenplayId === screenplayId)) {
        await removeSyncQueueItem(item.id)
      }
      setSyncStatus('synced')
      setConflictData(null)
      setPendingCount(0)
    }
  }, [conflictData, saveToServer, screenplayId])

  return {
    save,
    syncStatus,
    isOnline,
    isSyncing,
    pendingCount,
    forceSync,
    resolveConflict,
    conflictData,
    serverUpdatedAt,
  }
}
