'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Pencil, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEFAULT_SHORTCUTS, formatKeysAsArray } from '@/lib/shortcuts/shortcuts-config'
import type { ShortcutId } from '@/lib/shortcuts/shortcuts-config'
import type { ShortcutCaptureState } from './use-shortcut-capture'

interface ShortcutRowProps {
  shortcutId: ShortcutId
  keys: string[]
  description: string
  isEditable: boolean
  editable: boolean
  customized: boolean
  captureState: ShortcutCaptureState
  onStartCapture: (id: ShortcutId) => void
  onCancelCapture: () => void
  onForceOverride: () => void
  onReset: (id: ShortcutId) => void
}

export function ShortcutRow({
  shortcutId,
  keys,
  description,
  isEditable,
  editable,
  customized,
  captureState,
  onStartCapture,
  onCancelCapture,
  onForceOverride,
  onReset,
}: ShortcutRowProps) {
  const isCapturing = captureState.shortcutId === shortcutId

  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 px-2 -mx-2 rounded-md transition-colors',
        isCapturing && 'bg-accent',
        editable && isEditable && !isCapturing && 'hover:bg-muted/50 cursor-pointer'
      )}
      onClick={() => editable && isEditable && !isCapturing && onStartCapture(shortcutId)}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">{description}</span>
        {customized && !isCapturing && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Custom
          </Badge>
        )}
        {!isEditable && editable && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
            Locked
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isCapturing ? (
          <div className="flex items-center gap-2">
            {captureState.conflict ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    Used by &quot;{DEFAULT_SHORTCUTS[captureState.conflict].description}&quot;
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onForceOverride()
                  }}
                >
                  Replace
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancelCapture()
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 min-w-[120px] justify-end">
                  {captureState.keys.length > 0 ? (
                    formatKeysAsArray(captureState.keys).map((key, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <kbd className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground border border-primary rounded animate-pulse">
                          {key}
                        </kbd>
                        {i < captureState.keys.length - 1 && (
                          <span className="text-muted-foreground">+</span>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground animate-pulse">
                      Press keys...
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancelCapture()
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {formatKeysAsArray(keys).map((key, keyIndex) => (
                <span key={keyIndex} className="flex items-center gap-1">
                  <kbd className="px-2 py-1 text-xs font-medium bg-muted border border-border rounded">
                    {key}
                  </kbd>
                  {keyIndex < keys.length - 1 && <span className="text-muted-foreground">+</span>}
                </span>
              ))}
            </div>
            {editable && isEditable && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            {editable && customized && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onReset(shortcutId)
                }}
                title="Reset to default"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
