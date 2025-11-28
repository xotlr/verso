'use client'

import React, { useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Cloud,
  Smartphone,
  GitCompare,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import DiffMatchPatch from 'diff-match-patch'

interface ConflictData {
  localContent: string
  localTitle: string
  serverContent: string
  serverUpdatedAt: number
}

interface ConflictDialogProps {
  isOpen: boolean
  onClose: () => void
  conflictData: ConflictData | null
  onResolve: (resolution: 'local' | 'server', content: string) => void
}

/**
 * Conflict resolution dialog for offline sync conflicts
 *
 * Shows when local and server versions diverge, offering:
 * - "Use Server Version" - discard local, fetch latest
 * - "Keep My Version" - overwrite server with local
 * - "Compare" - side-by-side diff view
 */
export function ConflictDialog({
  isOpen,
  onClose,
  conflictData,
  onResolve,
}: ConflictDialogProps) {
  const [activeTab, setActiveTab] = useState<'choose' | 'compare'>('choose')

  const diff = useMemo(() => {
    if (!conflictData) return []

    const dmp = new DiffMatchPatch()
    const diffs = dmp.diff_main(conflictData.serverContent, conflictData.localContent)
    dmp.diff_cleanupSemantic(diffs)

    return diffs
  }, [conflictData])

  const stats = useMemo(() => {
    if (!conflictData) return { additions: 0, deletions: 0 }

    let additions = 0
    let deletions = 0

    diff.forEach(([op, text]) => {
      if (op === 1) {
        additions += text.length
      } else if (op === -1) {
        deletions += text.length
      }
    })

    return { additions, deletions }
  }, [diff, conflictData])

  if (!conflictData) return null

  const serverDate = new Date(conflictData.serverUpdatedAt)
  const localWordCount = conflictData.localContent.split(/\s+/).filter(Boolean).length
  const serverWordCount = conflictData.serverContent.split(/\s+/).filter(Boolean).length

  const handleResolve = (resolution: 'local' | 'server') => {
    const content = resolution === 'local' ? conflictData.localContent : conflictData.serverContent
    onResolve(resolution, content)
    onClose()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <AlertDialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg">
                Sync Conflict Detected
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                Someone else made changes while you were offline. Choose which version to keep.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'choose' | 'compare')} className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 pt-4 border-b">
            <TabsList className="mb-4">
              <TabsTrigger value="choose" className="gap-2">
                <Check className="h-4 w-4" />
                Choose Version
              </TabsTrigger>
              <TabsTrigger value="compare" className="gap-2">
                <GitCompare className="h-4 w-4" />
                Compare Changes
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="choose" className="flex-1 px-6 py-4 m-0 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Version Card */}
              <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Your Local Version</h3>
                    <p className="text-xs text-muted-foreground">Edited offline</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center justify-between">
                    <span>Word count:</span>
                    <Badge variant="secondary">{localWordCount.toLocaleString()}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-green-600">
                    <span>Characters added:</span>
                    <span>+{stats.additions.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-red-600">
                    <span>Characters removed:</span>
                    <span>-{stats.deletions.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-muted rounded p-3 mb-4 max-h-32 overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap break-words">
                    {conflictData.localContent.slice(0, 500)}
                    {conflictData.localContent.length > 500 && '...'}
                  </pre>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handleResolve('local')}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Keep My Version
                </Button>
              </div>

              {/* Server Version Card */}
              <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Cloud className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Server Version</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(serverDate, { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center justify-between">
                    <span>Word count:</span>
                    <Badge variant="secondary">{serverWordCount.toLocaleString()}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last saved:</span>
                    <span>{serverDate.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-muted rounded p-3 mb-4 max-h-32 overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap break-words">
                    {conflictData.serverContent.slice(0, 500)}
                    {conflictData.serverContent.length > 500 && '...'}
                  </pre>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleResolve('server')}
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  Use Server Version
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="compare" className="flex-1 m-0 overflow-hidden flex flex-col">
            <div className="px-6 py-2 border-b bg-muted/50 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-green-600">+{stats.additions.toLocaleString()} added</span>
                <span className="text-red-600">-{stats.deletions.toLocaleString()} removed</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleResolve('local')}>
                  Keep Local
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleResolve('server')}>
                  Use Server
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <pre className="font-mono text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {diff.map(([op, text], index) => {
                    if (op === 0) {
                      return (
                        <span key={index} className="text-foreground">
                          {text}
                        </span>
                      )
                    } else if (op === 1) {
                      // Addition (in local, not in server)
                      return (
                        <span
                          key={index}
                          className="bg-green-500/20 text-green-700 dark:text-green-400"
                        >
                          {text}
                        </span>
                      )
                    } else {
                      // Deletion (in server, not in local)
                      return (
                        <span
                          key={index}
                          className="bg-red-500/20 text-red-700 dark:text-red-400 line-through"
                        >
                          {text}
                        </span>
                      )
                    }
                  })}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="px-6 py-3 border-t bg-muted/50 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Your local changes are safely saved. You can always access them later.
          </p>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
