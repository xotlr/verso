'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { ConnectionRequestsPanel, ConnectionRequestsBadge } from '@/components/connection-requests-panel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  UserPlus,
  MoreVertical,
  UserMinus,
  MapPin,
  Search,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { getSimpleGradientStyle } from '@/lib/avatar-gradient'

interface ConnectedUser {
  connectionId: string
  connectedAt: string
  user: {
    id: string
    name: string | null
    username: string | null
    image: string | null
    title: string | null
    location: string | null
  }
}

export default function ConnectionsPage() {
  useSession() // Auth check
  const router = useRouter()
  const [connections, setConnections] = useState<ConnectedUser[]>([])
  const [filteredConnections, setFilteredConnections] = useState<ConnectedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [requestsPanelOpen, setRequestsPanelOpen] = useState(false)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchConnections()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConnections(connections)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredConnections(
        connections.filter(
          (conn) =>
            conn.user.name?.toLowerCase().includes(query) ||
            conn.user.username?.toLowerCase().includes(query) ||
            conn.user.title?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, connections])

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/connections')
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections)
        setFilteredConnections(data.connections)
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
      toast.error('Failed to load connections')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveConnection = async (connectionId: string) => {
    setRemovingIds((prev) => new Set([...prev, connectionId]))
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove connection')
      }

      setConnections((prev) =>
        prev.filter((conn) => conn.connectionId !== connectionId)
      )
      toast.success('Connection removed')
    } catch {
      toast.error('Failed to remove connection')
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(connectionId)
        return next
      })
    }
  }

  // Dispatch page title to header
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('screenplay-title-update', {
        detail: { title: 'Connections' },
      })
    )
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Connections
          </h1>
          <p className="text-muted-foreground mt-1">
            {connections.length} connection{connections.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setRequestsPanelOpen(true)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Requests
            <ConnectionRequestsBadge />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search connections..."
          className="pl-9"
        />
      </div>

      {/* Connections Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ConnectionSkeleton key={i} />
          ))}
        </div>
      ) : filteredConnections.length === 0 ? (
        searchQuery ? (
          <EmptyState
            icon={<Search className="h-8 w-8 text-muted-foreground" />}
            title="No connections found"
            description={`No connections match "${searchQuery}"`}
          />
        ) : (
          <EmptyState
            icon={<Users className="h-8 w-8 text-muted-foreground" />}
            title="No connections yet"
            description="Start connecting with other creators to grow your network"
            action={{
              label: 'Explore People',
              onClick: () => router.push('/explore?tab=people'),
              icon: <ExternalLink className="h-4 w-4" />,
            }}
          />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConnections.map((conn) => (
            <ConnectionCard
              key={conn.connectionId}
              connection={conn}
              isRemoving={removingIds.has(conn.connectionId)}
              onRemove={() => handleRemoveConnection(conn.connectionId)}
            />
          ))}
        </div>
      )}

      {/* Connection Requests Panel */}
      <ConnectionRequestsPanel
        open={requestsPanelOpen}
        onOpenChange={setRequestsPanelOpen}
        onRequestProcessed={fetchConnections}
      />
    </div>
  )
}

function ConnectionCard({
  connection,
  isRemoving,
  onRemove,
}: {
  connection: ConnectedUser
  isRemoving: boolean
  onRemove: () => void
}) {
  const { user } = connection
  const profileUrl = user.username ? `/u/${user.username}` : `/profile/${user.id}`

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Link href={profileUrl}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.image || ''} />
              <AvatarFallback
                className="text-white font-medium"
                style={getSimpleGradientStyle(user.id)}
              >
                {user.name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <Link
                  href={profileUrl}
                  className="font-medium hover:text-primary transition-colors truncate block"
                >
                  {user.name || 'Unknown'}
                </Link>
                {user.username && (
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isRemoving}
                  >
                    {isRemoving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={profileUrl}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onRemove}
                    className="text-destructive"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove Connection
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {user.title && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {user.title}
              </p>
            )}

            {user.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {user.location}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ConnectionSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
