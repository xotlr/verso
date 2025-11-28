'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  Undo2,
  Redo2,
  Plus,
  Search,
  MoreHorizontal,
  Film,
  User,
  MessageSquare,
  Type,
  ArrowRight,
  Brackets,
  Users2,
  Save,
  History,
  FileDown,
  Zap,
  Bold,
  Italic,
  Underline,
  Hash,
  FileText,
  Maximize2,
  PanelRight,
  ZoomIn,
  ZoomOut,
  List,
} from 'lucide-react'

interface MobileEditorToolbarProps {
  // Undo/Redo
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean

  // Insert actions
  onInsertSceneHeading: () => void
  onInsertCharacter: () => void
  onInsertDialogue: () => void
  onInsertAction: () => void
  onInsertTransition: () => void
  onInsertParenthetical: () => void
  onInsertDualDialogue: () => void

  // Format actions
  onBold: () => void
  onItalic: () => void
  onUnderline: () => void
  onAutoFormat: () => void

  // Tools
  onSave: () => void
  onToggleFindReplace: () => void
  onToggleSceneNavigator: () => void
  onToggleVersionHistory?: () => void
  onTogglePanel?: () => void
  onToggleZenMode: () => void
  onExportPDF: () => void

  // View options
  onToggleLineNumbers: () => void
  onTogglePageBreaks: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  showLineNumbers: boolean
  showPageBreaks: boolean
  zoom: number

  // State
  isSaving?: boolean
  isPanelOpen?: boolean

  className?: string
}

/**
 * Mobile-friendly bottom toolbar for the screenplay editor
 *
 * Features:
 * - Fixed position at bottom
 * - 44x44px touch targets
 * - Sheets for grouped actions
 * - Primary actions always visible
 */
export function MobileEditorToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onInsertSceneHeading,
  onInsertCharacter,
  onInsertDialogue,
  onInsertAction,
  onInsertTransition,
  onInsertParenthetical,
  onInsertDualDialogue,
  onBold,
  onItalic,
  onUnderline,
  onAutoFormat,
  onSave,
  onToggleFindReplace,
  onToggleSceneNavigator,
  onToggleVersionHistory,
  onTogglePanel,
  onToggleZenMode,
  onExportPDF,
  onToggleLineNumbers,
  onTogglePageBreaks,
  onZoomIn,
  onZoomOut,
  showLineNumbers,
  showPageBreaks,
  zoom,
  isSaving,
  isPanelOpen,
  className,
}: MobileEditorToolbarProps) {
  const [insertSheetOpen, setInsertSheetOpen] = useState(false)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)

  return (
    <>
      {/* Fixed bottom toolbar */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 md:hidden',
          'bg-background border-t border-border',
          'safe-area-pb',
          className
        )}
      >
        <div className="flex items-center justify-around px-2 py-1">
          {/* Undo */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            className="h-11 w-11 rounded-xl"
            aria-label="Undo"
          >
            <Undo2 className="h-5 w-5" />
          </Button>

          {/* Redo */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            className="h-11 w-11 rounded-xl"
            aria-label="Redo"
          >
            <Redo2 className="h-5 w-5" />
          </Button>

          {/* Insert */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setInsertSheetOpen(true)}
            className="h-11 w-11 rounded-xl"
            aria-label="Insert element"
          >
            <Plus className="h-5 w-5" />
          </Button>

          {/* Find */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFindReplace}
            className="h-11 w-11 rounded-xl"
            aria-label="Find and replace"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* More */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMoreSheetOpen(true)}
            className="h-11 w-11 rounded-xl"
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Insert Sheet */}
      <Sheet open={insertSheetOpen} onOpenChange={setInsertSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader className="pb-4">
            <SheetTitle>Insert Element</SheetTitle>
            <SheetDescription>
              Add screenplay elements at the cursor
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3">
            <InsertButton
              icon={Film}
              label="Scene Heading"
              description="INT./EXT. location"
              onClick={() => {
                onInsertSceneHeading()
                setInsertSheetOpen(false)
              }}
            />
            <InsertButton
              icon={User}
              label="Character"
              description="Character name"
              onClick={() => {
                onInsertCharacter()
                setInsertSheetOpen(false)
              }}
            />
            <InsertButton
              icon={MessageSquare}
              label="Dialogue"
              description="Character speech"
              onClick={() => {
                onInsertDialogue()
                setInsertSheetOpen(false)
              }}
            />
            <InsertButton
              icon={Type}
              label="Action"
              description="Scene description"
              onClick={() => {
                onInsertAction()
                setInsertSheetOpen(false)
              }}
            />
            <InsertButton
              icon={ArrowRight}
              label="Transition"
              description="CUT TO, FADE OUT"
              onClick={() => {
                onInsertTransition()
                setInsertSheetOpen(false)
              }}
            />
            <InsertButton
              icon={Brackets}
              label="Parenthetical"
              description="(wryly)"
              onClick={() => {
                onInsertParenthetical()
                setInsertSheetOpen(false)
              }}
            />
            <InsertButton
              icon={Users2}
              label="Dual Dialogue"
              description="Side-by-side speech"
              onClick={() => {
                onInsertDualDialogue()
                setInsertSheetOpen(false)
              }}
            />
          </div>

          {/* Format section */}
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Format Selection
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onBold()
                  setInsertSheetOpen(false)
                }}
                className="flex-1 h-11"
              >
                <Bold className="h-4 w-4 mr-2" />
                Bold
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onItalic()
                  setInsertSheetOpen(false)
                }}
                className="flex-1 h-11"
              >
                <Italic className="h-4 w-4 mr-2" />
                Italic
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onUnderline()
                  setInsertSheetOpen(false)
                }}
                className="flex-1 h-11"
              >
                <Underline className="h-4 w-4 mr-2" />
                Underline
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* More Options Sheet */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>More Options</SheetTitle>
            <SheetDescription>
              Tools, view options, and settings
            </SheetDescription>
          </SheetHeader>

          {/* Save & Export */}
          <div className="space-y-2 mb-6">
            <p className="text-sm font-medium text-muted-foreground">
              Save & Export
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onSave()
                  setMoreSheetOpen(false)
                }}
                disabled={isSaving}
                className="h-11 justify-start"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              {onToggleVersionHistory && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onToggleVersionHistory()
                    setMoreSheetOpen(false)
                  }}
                  className="h-11 justify-start"
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  onExportPDF()
                  setMoreSheetOpen(false)
                }}
                className="h-11 justify-start"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onAutoFormat()
                  setMoreSheetOpen(false)
                }}
                className="h-11 justify-start"
              >
                <Zap className="h-4 w-4 mr-2" />
                Auto-format
              </Button>
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-2 mb-6">
            <p className="text-sm font-medium text-muted-foreground">Tools</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  onToggleSceneNavigator()
                  setMoreSheetOpen(false)
                }}
                className="h-11 justify-start"
              >
                <List className="h-4 w-4 mr-2" />
                Scenes
              </Button>
              {onTogglePanel && (
                <Button
                  variant={isPanelOpen ? 'secondary' : 'outline'}
                  onClick={() => {
                    onTogglePanel()
                    setMoreSheetOpen(false)
                  }}
                  className="h-11 justify-start"
                >
                  <PanelRight className="h-4 w-4 mr-2" />
                  Info Panel
                </Button>
              )}
            </div>
          </div>

          {/* View Options */}
          <div className="space-y-2 mb-6">
            <p className="text-sm font-medium text-muted-foreground">
              View Options
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={showLineNumbers ? 'secondary' : 'outline'}
                onClick={onToggleLineNumbers}
                className="h-11 justify-start"
              >
                <Hash className="h-4 w-4 mr-2" />
                Line Numbers
              </Button>
              <Button
                variant={showPageBreaks ? 'secondary' : 'outline'}
                onClick={onTogglePageBreaks}
                className="h-11 justify-start"
              >
                <FileText className="h-4 w-4 mr-2" />
                Page Breaks
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onToggleZenMode()
                  setMoreSheetOpen(false)
                }}
                className="h-11 justify-start"
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Zen Mode
              </Button>
            </div>
          </div>

          {/* Zoom */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Zoom: {zoom}%
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onZoomOut}
                disabled={zoom <= 50}
                className="flex-1 h-11"
              >
                <ZoomOut className="h-4 w-4 mr-2" />
                Zoom Out
              </Button>
              <Button
                variant="outline"
                onClick={onZoomIn}
                disabled={zoom >= 200}
                className="flex-1 h-11"
              >
                <ZoomIn className="h-4 w-4 mr-2" />
                Zoom In
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// Helper component for insert buttons
function InsertButton({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: React.ElementType
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border border-border',
        'hover:bg-accent hover:border-accent-foreground/20',
        'active:scale-[0.98] transition-all',
        'text-left'
      )}
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </button>
  )
}
