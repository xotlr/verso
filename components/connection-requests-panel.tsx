'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2,
  Check,
  X,
  MapPin,
  UserPlus,
  User as UserIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { getSimpleGradientStyle } from '@/lib/avatar-gradient'

interface ConnectionRequest {
  id: string
  createdAt: string
  user: {
    id: string
    name: string | null
    username: string | null
    image: string | null
    title: string | null
    location: string | null
    bio: string | null
  }
}

interface ConnectionRequestsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRequestProcessed?: () => void
}

export function ConnectionRequestsPanel({
  open,
  onOpenChange,
  onRequestProcessed,
}: ConnectionRequestsPanelProps) {
  const [requests, setRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      fetchRequests()
    }
  }, [open])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/connections/requests')
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests)
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (requestId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setProcessingIds((prev) => new Set([...prev, requestId]))
    try {
      const response = await fetch(`/api/connections/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update')
      }

      // Remove from list
      setRequests((prev) => prev.filter((req) => req.id !== requestId))

      toast.success(
        status === 'ACCEPTED'
          ? 'Connection accepted!'
          : 'Request declined'
      )
      onRequestProcessed?.()
    } catch (error) {
      console.error('Error updating request:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process request')
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Connection Requests
          </SheetTitle>
          <SheetDescription>
            People who want to connect with you
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="mt-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <RequestSkeleton key={i} />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No pending requests</p>
              <p className="text-sm text-muted-foreground mt-1">
                When someone wants to connect, they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  isProcessing={processingIds.has(request.id)}
                  onAccept={() => handleUpdateStatus(request.id, 'ACCEPTED')}
                  onDecline={() => handleUpdateStatus(request.id, 'DECLINED')}
                />
              ))}
            </div>
          )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function RequestCard({
  request,
  isProcessing,
  onAccept,
  onDecline,
}: {
  request: ConnectionRequest
  isProcessing: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  const profileUrl = request.user.username
    ? `/u/${request.user.username}`
    : `/profile/${request.user.id}`

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* User Info */}
      <div className="flex items-start gap-3">
        <Link href={profileUrl}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={request.user.image || ''} />
            <AvatarFallback
              className="text-sm text-white font-medium"
              style={getSimpleGradientStyle(request.user.id)}
            >
              {request.user.name?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={profileUrl}
            className="font-medium hover:text-primary transition-colors"
          >
            {request.user.name || 'Unknown'}
          </Link>
          {request.user.username && (
            <p className="text-xs text-muted-foreground">@{request.user.username}</p>
          )}
          {request.user.title && (
            <p className="text-sm text-muted-foreground truncate">
              {request.user.title}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            {request.user.location && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {request.user.location}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {request.user.bio && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {request.user.bio}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Accept
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onDecline}
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <X className="h-4 w-4 mr-1" />
              Decline
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function RequestSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </div>
  )
}

// Export a badge component for showing request count in navigation
export function ConnectionRequestsBadge() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/connections/requests')
        if (response.ok) {
          const data = await response.json()
          setCount(data.requests?.length || 0)
        }
      } catch {
        // Silently fail
      }
    }

    fetchCount()
    // Poll every minute
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [])

  if (count === 0) return null

  return (
    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
      {count > 9 ? '9+' : count}
    </Badge>
  )
}
