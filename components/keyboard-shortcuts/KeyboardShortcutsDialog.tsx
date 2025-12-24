'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ShortcutCategoryList } from './ShortcutCategoryList'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editable?: boolean
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
  editable = false,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          {editable && (
            <DialogDescription>
              Click on a shortcut to change it. Press Escape to cancel.
            </DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <ShortcutCategoryList editable={editable} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
