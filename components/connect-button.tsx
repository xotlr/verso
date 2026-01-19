'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, UserPlus, Clock, UserCheck, ChevronDown, UserMinus, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ConnectionStatusResponse } from '@/app/api/connections/status/[userId]/route'

interface ConnectButtonProps {
  userId: string
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function ConnectButton({ userId, className, size = 'default' }: ConnectButtonProps) {
  const { data: session } = useSession()
  const [status, setStatus] = useState<ConnectionStatusResponse['status']>('none')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  // Don't show if not logged in or viewing own profile
  const shouldShow = session?.user?.id && session.user.id !== userId

  useEffect(() => {
    if (!shouldShow) {
      setIsLoading(false)
      return
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/connections/status/${userId}`)
        if (response.ok) {
          const data: ConnectionStatusResponse = await response.json()
          setStatus(data.status)
          setConnectionId(data.connectionId)
        }
      } catch (error) {
        console.error('Failed to fetch connection status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatus()
  }, [userId, shouldShow])

  if (!shouldShow) return null

  const handleConnect = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send request')
      }

      // If they had a pending request to us, accepting it returns 'accepted'
      if (data.message === 'Connection request accepted') {
        setStatus('connected')
        toast.success('You are now connected!')
      } else {
        setStatus('pending_sent')
        setConnectionId(data.connection.id)
        toast.success('Connection request sent')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send request')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAccept = async () => {
    if (!connectionId) return
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept')
      }

      setStatus('connected')
      toast.success('Connection accepted!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept request')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDecline = async () => {
    if (!connectionId) return
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DECLINED' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to decline')
      }

      setStatus('none')
      setConnectionId(null)
      toast.success('Request declined')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to decline request')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!connectionId) return
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel')
      }

      setStatus('none')
      setConnectionId(null)
      toast.success('Request cancelled')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel request')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveConnection = async () => {
    if (!connectionId) return
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove')
      }

      setStatus('none')
      setConnectionId(null)
      toast.success('Connection removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove connection')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <Button variant="outline" size={size} className={className} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  // Status: none - show Connect button
  if (status === 'none') {
    return (
      <Button
        onClick={handleConnect}
        disabled={isProcessing}
        size={size}
        className={cn('gap-2', className)}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Connect
      </Button>
    )
  }

  // Status: pending_sent - show Pending with cancel option
  if (status === 'pending_sent') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className={cn('gap-2', className)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Clock className="h-4 w-4" />
                Pending
                <ChevronDown className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCancelRequest} className="text-destructive">
            <X className="h-4 w-4 mr-2" />
            Cancel Request
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Status: pending_received - show Accept/Decline buttons
  if (status === 'pending_received') {
    return (
      <div className={cn('flex gap-2', className)}>
        <Button
          onClick={handleAccept}
          disabled={isProcessing}
          size={size}
          className="gap-2"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              Accept
            </>
          )}
        </Button>
        <Button
          onClick={handleDecline}
          disabled={isProcessing}
          variant="outline"
          size={size}
        >
          Decline
        </Button>
      </div>
    )
  }

  // Status: connected - show Connected with remove option
  if (status === 'connected') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className={cn('gap-2', className)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserCheck className="h-4 w-4 text-green-600" />
                Connected
                <ChevronDown className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleRemoveConnection} className="text-destructive">
            <UserMinus className="h-4 w-4 mr-2" />
            Remove Connection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return null
}
