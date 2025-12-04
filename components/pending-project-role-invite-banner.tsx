'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Film, X, Clapperboard, PenTool, Megaphone, Camera, Scissors, Music, Palette, Users, Headphones, User } from 'lucide-react'
import { getSimpleGradientStyle } from '@/lib/avatar-gradient'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface ProjectRoleInvite {
  id: string
  token: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
  project: {
    id: string
    name: string
    logo: string | null
    banner: string | null
  }
  inviter: {
    id: string
    name: string | null
    image: string | null
  }
}

// Role definitions matching ProjectRolesManager
const ROLE_DEFINITIONS: {
  value: string
  label: string
  icon: LucideIcon
  color: string
}[] = [
  { value: 'director', label: 'Director', icon: Clapperboard, color: 'text-red-500' },
  { value: 'writer', label: 'Writer', icon: PenTool, color: 'text-blue-500' },
  { value: 'producer', label: 'Producer', icon: Megaphone, color: 'text-amber-500' },
  { value: 'executive_producer', label: 'Exec. Producer', icon: Megaphone, color: 'text-amber-600' },
  { value: 'cinematographer', label: 'DP', icon: Camera, color: 'text-purple-500' },
  { value: 'editor', label: 'Editor', icon: Scissors, color: 'text-green-500' },
  { value: 'composer', label: 'Composer', icon: Music, color: 'text-pink-500' },
  { value: 'sound_designer', label: 'Sound Designer', icon: Headphones, color: 'text-cyan-500' },
  { value: 'production_designer', label: 'Production Designer', icon: Palette, color: 'text-orange-500' },
  { value: 'costume_designer', label: 'Costume Designer', icon: Palette, color: 'text-rose-500' },
  { value: 'casting_director', label: 'Casting Director', icon: Users, color: 'text-indigo-500' },
  { value: 'first_ad', label: '1st AD', icon: User, color: 'text-slate-500' },
  { value: 'line_producer', label: 'Line Producer', icon: User, color: 'text-emerald-500' },
  { value: 'other', label: 'Other', icon: User, color: 'text-gray-500' },
]

function getRoleDef(roleValue: string) {
  return ROLE_DEFINITIONS.find((r) => r.value === roleValue) || {
    value: roleValue,
    label: roleValue,
    icon: User,
    color: 'text-gray-500',
  }
}

export function PendingProjectRoleInviteBanner() {
  const router = useRouter()
  const [invites, setInvites] = useState<ProjectRoleInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingInvite, setProcessingInvite] = useState<string | null>(null)

  useEffect(() => {
    fetchInvites()
  }, [])

  const fetchInvites = async () => {
    try {
      const response = await fetch('/api/project-role-invites')
      if (response.ok) {
        const data = await response.json()
        setInvites(data)
      }
    } catch (error) {
      console.error('Failed to fetch project role invites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async (invite: ProjectRoleInvite) => {
    setProcessingInvite(invite.id)
    try {
      const response = await fetch(`/api/project-role-invites/${invite.token}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept invite')
      }

      await response.json()
      toast.success(`You're now the ${getRoleDef(invite.role).label} on ${invite.project.name}!`)

      // Remove the accepted invite from the list
      setInvites((prev) => prev.filter((i) => i.id !== invite.id))

      // Navigate to the project
      router.push(`/project/${invite.project.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept invite')
    } finally {
      setProcessingInvite(null)
    }
  }

  const handleDecline = async (invite: ProjectRoleInvite) => {
    setProcessingInvite(invite.id)
    try {
      const response = await fetch(`/api/project-role-invites/${invite.token}`, {
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
        const roleDef = getRoleDef(invite.role)
        const RoleIcon = roleDef.icon
        const initials = invite.project.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        return (
          <Card key={invite.id} className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 rounded-lg">
                <AvatarImage src={invite.project.logo || undefined} className="rounded-lg" />
                <AvatarFallback
                  className="rounded-lg text-white font-semibold"
                  style={getSimpleGradientStyle(invite.project.id)}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">
                      You&apos;ve been invited to join{' '}
                      <span className="text-primary">{invite.project.name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Invited by {invite.inviter.name || 'someone'} as{' '}
                      <span className={cn('inline-flex items-center gap-1', roleDef.color)}>
                        <RoleIcon className="h-3 w-3" />
                        {roleDef.label}
                      </span>
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
                  <Badge variant="secondary" className="text-xs">
                    <Film className="h-3 w-3 mr-1" />
                    Project
                  </Badge>
                  <Badge variant="outline" className={cn('text-xs', roleDef.color)}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {roleDef.label}
                  </Badge>
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
