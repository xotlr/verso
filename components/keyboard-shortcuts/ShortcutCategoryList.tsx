'use client'

import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import {
  ShortcutCategory,
  SHORTCUT_CATEGORIES,
  getShortcutsByCategory,
} from '@/lib/shortcuts/shortcuts-config'
import { useShortcuts } from '@/lib/shortcuts/shortcuts-context'
import { ShortcutRow } from './ShortcutRow'
import { useShortcutCapture } from './use-shortcut-capture'

interface ShortcutCategoryListProps {
  editable?: boolean
  showResetAll?: boolean
}

export function ShortcutCategoryList({
  editable = false,
  showResetAll = true,
}: ShortcutCategoryListProps) {
  const { shortcuts, resetShortcut, resetAllShortcuts, isCustomized } = useShortcuts()
  const { captureState, startCapture, cancelCapture, forceOverride } = useShortcutCapture()

  const groupedShortcuts = getShortcutsByCategory(shortcuts)

  const sortedCategories = (Object.keys(groupedShortcuts) as ShortcutCategory[]).sort(
    (a, b) => SHORTCUT_CATEGORIES[a].order - SHORTCUT_CATEGORIES[b].order
  )

  return (
    <div className="space-y-6">
      {sortedCategories.map((category) => {
        const categoryShortcuts = groupedShortcuts[category]
        if (categoryShortcuts.length === 0) return null

        return (
          <div key={category}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              {SHORTCUT_CATEGORIES[category].title}
            </h3>
            <div className="space-y-1 group">
              {categoryShortcuts.map((shortcut) => (
                <ShortcutRow
                  key={shortcut.id}
                  shortcutId={shortcut.id}
                  keys={shortcut.keys}
                  description={shortcut.description}
                  isEditable={shortcut.editable}
                  editable={editable}
                  customized={isCustomized(shortcut.id)}
                  captureState={captureState}
                  onStartCapture={startCapture}
                  onCancelCapture={cancelCapture}
                  onForceOverride={forceOverride}
                  onReset={resetShortcut}
                />
              ))}
            </div>
          </div>
        )
      })}

      {editable && showResetAll && (
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" size="sm" onClick={resetAllShortcuts} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset All to Defaults
          </Button>
        </div>
      )}
    </div>
  )
}
