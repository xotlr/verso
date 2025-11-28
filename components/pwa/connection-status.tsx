'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Cloud, RefreshCw, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { type SyncStatus } from '@/hooks/use-offline-save'

interface ConnectionStatusProps {
  syncStatus: SyncStatus
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  onRetrySync?: () => void
  onResolveConflict?: () => void
  className?: string
}

/**
 * Visual indicator for offline/syncing status
 *
 * Shows only when:
 * - Offline (yellow/amber warning)
 * - Syncing (blue spinner)
 * - Has pending changes (subtle indicator)
 * - Has conflict (red warning)
 */
export function ConnectionStatus({
  syncStatus,
  isOnline,
  isSyncing,
  pendingCount,
  onRetrySync,
  onResolveConflict,
  className,
}: ConnectionStatusProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)

  // Show status when not synced or offline
  useEffect(() => {
    if (syncStatus === 'synced' && isOnline && !isSyncing) {
      // Hide after a brief delay when synced
      const timer = setTimeout(() => setIsVisible(false), 2000)
      return () => clearTimeout(timer)
    }
    setIsVisible(true)
  }, [syncStatus, isOnline, isSyncing])

  // Don't render if synced and online (after delay)
  if (!isVisible) {
    return null
  }

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        label: 'Offline',
        description: 'Changes saved locally',
        variant: 'warning' as const,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        borderColor: 'border-amber-300 dark:border-amber-700',
      }
    }

    if (syncStatus === 'conflict') {
      return {
        icon: AlertTriangle,
        label: 'Conflict',
        description: 'Server has newer changes',
        variant: 'destructive' as const,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        borderColor: 'border-red-300 dark:border-red-700',
      }
    }

    if (isSyncing || syncStatus === 'syncing') {
      return {
        icon: RefreshCw,
        label: 'Syncing',
        description: 'Saving to cloud...',
        variant: 'default' as const,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-300 dark:border-blue-700',
      }
    }

    if (syncStatus === 'pending' || pendingCount > 0) {
      return {
        icon: Cloud,
        label: 'Pending',
        description: `${pendingCount} change${pendingCount !== 1 ? 's' : ''} to sync`,
        variant: 'secondary' as const,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        borderColor: 'border-border',
      }
    }

    return {
      icon: Cloud,
      label: 'Synced',
      description: 'All changes saved',
      variant: 'outline' as const,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-300 dark:border-green-700',
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <TooltipProvider>
      <div
        className={cn(
          'fixed bottom-4 left-4 z-50 flex items-center gap-2 transition-all duration-300',
          hasInteracted ? 'opacity-100' : 'opacity-90',
          className
        )}
        onMouseEnter={() => setHasInteracted(true)}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-full border shadow-lg backdrop-blur-sm',
                config.bgColor,
                config.borderColor
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4',
                  config.color,
                  isSyncing && 'animate-spin'
                )}
              />
              <span className={cn('text-sm font-medium', config.color)}>
                {config.label}
              </span>
              {pendingCount > 0 && syncStatus !== 'conflict' && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p>{config.description}</p>
            {!isOnline && (
              <p className="text-xs text-muted-foreground mt-1">
                Your changes will sync when you&apos;re back online.
              </p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Action buttons */}
        {syncStatus === 'conflict' && onResolveConflict && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onResolveConflict}
            className="h-8 shadow-lg"
          >
            Resolve
          </Button>
        )}

        {isOnline && pendingCount > 0 && syncStatus !== 'syncing' && onRetrySync && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetrySync}
            className="h-8 shadow-lg"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync
          </Button>
        )}
      </div>
    </TooltipProvider>
  )
}
