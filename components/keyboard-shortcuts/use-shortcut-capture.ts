import { useState, useCallback, useEffect } from 'react'
import type { ShortcutId } from '@/lib/shortcuts/shortcuts-config'
import { DEFAULT_SHORTCUTS } from '@/lib/shortcuts/shortcuts-config'
import { useShortcuts } from '@/lib/shortcuts/shortcuts-context'

export interface ShortcutCaptureState {
  shortcutId: ShortcutId | null
  keys: string[]
  conflict: ShortcutId | null
}

export function useShortcutCapture() {
  const { updateShortcut, resetShortcut, hasConflict } = useShortcuts()

  const [captureState, setCaptureState] = useState<ShortcutCaptureState>({
    shortcutId: null,
    keys: [],
    conflict: null,
  })

  const startCapture = useCallback((shortcutId: ShortcutId) => {
    if (!DEFAULT_SHORTCUTS[shortcutId].editable) return

    setCaptureState({
      shortcutId,
      keys: [],
      conflict: null,
    })
  }, [])

  const cancelCapture = useCallback(() => {
    setCaptureState({
      shortcutId: null,
      keys: [],
      conflict: null,
    })
  }, [])

  const forceOverride = useCallback(() => {
    if (captureState.shortcutId && captureState.keys.length > 0) {
      if (captureState.conflict) {
        resetShortcut(captureState.conflict)
      }
      updateShortcut(captureState.shortcutId, captureState.keys)
      cancelCapture()
    }
  }, [captureState, updateShortcut, resetShortcut, cancelCapture])

  useEffect(() => {
    if (!captureState.shortcutId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        cancelCapture()
        return
      }

      const keys: string[] = []

      if (e.metaKey || e.ctrlKey) keys.push('Mod')
      if (e.altKey) keys.push('Alt')
      if (e.shiftKey) keys.push('Shift')

      const isModifier = ['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)
      if (!isModifier) {
        let keyName = e.key
        if (keyName.length === 1) {
          keyName = keyName.toUpperCase()
        }
        keys.push(keyName)

        const conflictId = hasConflict(keys, captureState.shortcutId!)

        if (conflictId) {
          setCaptureState((prev) => ({
            ...prev,
            keys,
            conflict: conflictId,
          }))
        } else {
          updateShortcut(captureState.shortcutId!, keys)
          cancelCapture()
        }
      } else {
        setCaptureState((prev) => ({
          ...prev,
          keys,
          conflict: null,
        }))
      }
    }

    const handleKeyUp = () => {
      if (
        captureState.keys.length > 0 &&
        captureState.keys.every((k) => ['Mod', 'Alt', 'Shift'].includes(k))
      ) {
        setCaptureState((prev) => ({
          ...prev,
          keys: [],
        }))
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [captureState.shortcutId, captureState.keys, hasConflict, updateShortcut, cancelCapture])

  return {
    captureState,
    startCapture,
    cancelCapture,
    forceOverride,
  }
}
