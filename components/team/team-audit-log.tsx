'use client'

import { useState, useEffect, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSimpleGradientStyle } from '@/lib/ui/avatar-gradient'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Settings,
  Trash2,
  UserPlus,
  UserMinus,
  Shield,
  Mail,
  XCircle,
  CheckCircle,
  CreditCard,
  Loader2,
  ChevronDown,
  Download,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_ICONS,
  type TeamAuditAction,
} from '@/lib/audit-log/types'

interface AuditLogEntry {
  id: string
  action: TeamAuditAction
  targetType: string | null
  targetId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  actor: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

interface TeamAuditLogProps {
  teamId: string
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Settings,
  Trash2,
  UserPlus,
  UserMinus,
  Shield,
  Mail,
  XCircle,
  CheckCircle,
  CreditCard,
}

export function TeamAuditLog({ teamId }: TeamAuditLogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    setIsExporting(true)
    try {
      const url = new URL(`/api/teams/${teamId}/audit-log/export`, window.location.origin)
      url.searchParams.set('format', format)

      const response = await fetch(url.toString())
      if (!response.ok) {
        if (response.status === 403) {
          toast.error('You do not have permission to export audit logs')
          return
        }
        throw new Error('Export failed')
      }

      // Get filename from Content-Disposition header or generate one
      const disposition = response.headers.get('Content-Disposition')
      let filename = `audit-log.${format}`
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }

      // Download the file
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success(`Exported ${logs.length > 0 ? 'audit logs' : 'empty log'} as ${format.toUpperCase()}`)
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Failed to export audit logs')
    } finally {
      setIsExporting(false)
    }
  }, [teamId, logs.length])

  const fetchLogs = useCallback(async (cursor?: string) => {
    try {
      const url = new URL(`/api/teams/${teamId}/audit-log`, window.location.origin)
      if (cursor) url.searchParams.set('cursor', cursor)
      url.searchParams.set('limit', '20')

      const response = await fetch(url.toString())
      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to view audit logs')
          return
        }
        throw new Error('Failed to fetch audit logs')
      }

      const data = await response.json()

      if (cursor) {
        setLogs((prev) => [...prev, ...data.logs])
      } else {
        setLogs(data.logs)
      }
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
      setError('Failed to load audit logs')
    }
  }, [teamId])

  useEffect(() => {
    setIsLoading(true)
    fetchLogs().finally(() => setIsLoading(false))
  }, [fetchLogs])

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    await fetchLogs(nextCursor)
    setIsLoadingMore(false)
  }

  const getActionIcon = (action: TeamAuditAction) => {
    const iconName = AUDIT_ACTION_ICONS[action] || 'Settings'
    return iconMap[iconName] || Settings
  }

  const getActionLabel = (entry: AuditLogEntry) => {
    const baseLabel = AUDIT_ACTION_LABELS[entry.action] || entry.action

    // Add context from metadata if available
    if (entry.metadata) {
      const metadata = entry.metadata as Record<string, string>
      if (entry.action === 'member_added' && metadata.userName) {
        return `added ${metadata.userName} to the team`
      }
      if (entry.action === 'member_removed' && metadata.userName) {
        if (metadata.wasSelfRemoval) {
          return 'left the team'
        }
        return `removed ${metadata.userName} from the team`
      }
      if (entry.action === 'member_role_changed' && metadata.userName) {
        return `changed ${metadata.userName}'s role from ${metadata.oldRole} to ${metadata.newRole}`
      }
      if (entry.action === 'invite_sent' && metadata.email) {
        return `sent an invite to ${metadata.email}`
      }
      if (entry.action === 'invite_revoked' && metadata.email) {
        return `revoked invite for ${metadata.email}`
      }
    }

    return baseLabel
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="icon-large" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <Settings className="icon-large" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Team actions will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with export button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {logs.length} {logs.length === 1 ? 'event' : 'events'}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('json')}>
              <FileJson className="h-4 w-4 mr-2" />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
      {logs.map((entry, index) => {
        const Icon = getActionIcon(entry.action)
        const isLast = index === logs.length - 1

        return (
          <div key={entry.id} className="relative flex gap-3 pb-4">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
            )}

            {/* Icon */}
            <div className="relative flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center z-10">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start gap-2">
                <Avatar className="h-5 w-5 flex-shrink-0">
                  <AvatarImage src={entry.actor.image || undefined} />
                  <AvatarFallback
                    className="text-[10px] text-white font-medium"
                    style={getSimpleGradientStyle(entry.actor.id)}
                  >
                    {entry.actor.name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm">
                  <span className="font-medium">
                    {entry.actor.name || 'Unknown'}
                  </span>{' '}
                  <span className="text-muted-foreground">
                    {getActionLabel(entry)}
                  </span>
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-7">
                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        )
      })}

      {hasMore && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-2" />
            )}
            Load more
          </Button>
        </div>
      )}
      </div>
    </div>
  )
}
