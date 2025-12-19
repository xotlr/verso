'use client'

import { useState, useEffect, useCallback } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSimpleGradientStyle } from '@/lib/avatar-gradient'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_ICONS,
  type TeamAuditAction,
} from '@/lib/audit-log'

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
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <Settings className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Team actions will appear here
        </p>
      </div>
    )
  }

  return (
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
  )
}
