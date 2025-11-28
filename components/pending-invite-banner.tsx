'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTeam } from '@/contexts/team-context'

interface TeamInvite {
  id: string
  token: string
  email: string
  role: 'ADMIN' | 'MEMBER'
  expiresAt: string
  team: {
    id: string
    name: string
    logo: string | null
    description: string | null
    _count: { members: number }
  }
  inviter: {
    id: string
    name: string | null
    image: string | null
  }
}

export function PendingInviteBanner() {
  const { refreshTeams } = useTeam()
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingInvite, setProcessingInvite] = useState<string | null>(null)

  useEffect(() => {
    fetchInvites()
  }, [])

  const fetchInvites = async () => {
    try {
      const response = await fetch('/api/invites')
      if (response.ok) {
        const data = await response.json()
        setInvites(data)
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async (invite: TeamInvite) => {
    setProcessingInvite(invite.id)
    try {
      const response = await fetch(`/api/invites/${invite.token}/accept`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept invite')
      }

      toast.success(`Welcome to ${invite.team.name}!`)

      // Remove the accepted invite from the list
      setInvites((prev) => prev.filter((i) => i.id !== invite.id))

      // Refresh the teams list
      await refreshTeams()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept invite')
    } finally {
      setProcessingInvite(null)
    }
  }

  const handleDecline = async (invite: TeamInvite) => {
    setProcessingInvite(invite.id)
    try {
      const response = await fetch(`/api/invites/${invite.token}/accept`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to decline invite')
      }

      toast.success('Invite declined')

      setInvites((prev) => prev.filter((i) => i.id !== invite.id))
    } catch {
      toast.error('Failed to decline invite')
    } finally {
      setProcessingInvite(null)
    }
  }

  if (isLoading || invites.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {invites.map((invite) => {
        const initials = invite.team.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        return (
          <Card key={invite.id} className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 rounded-lg">
                <AvatarImage src={invite.team.logo || undefined} className="rounded-lg" />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">
                      You&apos;ve been invited to join{' '}
                      <span className="text-primary">{invite.team.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Invited by {invite.inviter.name || 'someone'} as{' '}
                      {invite.role === 'ADMIN' ? 'an Admin' : 'a Member'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => handleDecline(invite)}
                    disabled={processingInvite === invite.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {invite.team._count.members} member{invite.team._count.members !== 1 ? 's' : ''}
                  </div>
                  {invite.team.description && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      &bull; {invite.team.description}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(invite)}
                    disabled={processingInvite === invite.id}
                  >
                    {processingInvite === invite.id ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDecline(invite)}
                    disabled={processingInvite === invite.id}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
