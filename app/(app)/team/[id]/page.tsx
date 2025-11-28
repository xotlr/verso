'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfileHoverCard, ProfileData } from '@/components/profile-hover-card'
import {
  Link as LinkIcon,
  Calendar,
  FolderOpen,
  Users,
  ExternalLink,
  Crown,
  Shield,
  User as UserIcon,
  UserPlus,
  Settings,
} from 'lucide-react'
import { TeamSettingsDialog } from '@/components/team-settings-dialog'
import { InviteMemberDialog } from '@/components/invite-member-dialog'

interface TeamProfile {
  id: string
  name: string
  banner: string | null
  logo: string | null
  description: string | null
  website: string | null
  isPublic: boolean
  createdAt: string
  ownerId: string
  maxSeats: number
  owner: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  members: Array<{
    id: string
    role: 'OWNER' | 'ADMIN' | 'MEMBER'
    user: {
      id: string
      name: string | null
      email: string | null
      image: string | null
      title: string | null
      createdAt: string
    }
  }>
  projects: Array<{
    id: string
    name: string
    description: string | null
    coverImage: string | null
    createdAt: string
    _count: { screenplays: number }
  }>
  _count: {
    members: number
    projects: number
    invites: number
  }
}

const roleIcons = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: UserIcon,
}

const roleLabels = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
}

export default function TeamPage() {
  const params = useParams()
  const { data: session } = useSession()
  const [team, setTeam] = useState<TeamProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const teamId = params.id as string
  const isOwner = session?.user?.id === team?.ownerId
  const currentMember = team?.members.find((m) => m.user.id === session?.user?.id)
  const isAdmin = isOwner || currentMember?.role === 'ADMIN'
  const isMember = !!currentMember || isOwner

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const response = await fetch(`/api/teams/${teamId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Team not found')
          } else if (response.status === 403) {
            setError('This team is private')
          } else {
            setError('Failed to load team')
          }
          return
        }
        const data = await response.json()
        setTeam(data)
      } catch {
        setError('Failed to load team')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTeam()
  }, [teamId])

  if (isLoading) {
    return <TeamSkeleton />
  }

  if (error || !team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h1 className="text-2xl font-semibold text-foreground">{error || 'Team not found'}</h1>
        <Button asChild variant="outline">
          <Link href="/home">Go Home</Link>
        </Button>
      </div>
    )
  }

  const initials = team.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const createdDate = new Date(team.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-accent/30 via-primary/20 to-accent/30 relative">
        {team.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={team.banner}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Team Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 sm:-mt-20 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            {/* Logo & Name */}
            <div className="flex items-end gap-4">
              <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-background shadow-xl rounded-xl">
                <AvatarImage src={team.logo || undefined} alt={team.name} className="rounded-xl" />
                <AvatarFallback className="text-3xl rounded-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {team.name}
                </h1>
                <p className="text-muted-foreground">
                  by {team.owner.name || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {isAdmin && (
              <div className="flex gap-2 self-start sm:self-end">
                <Button variant="outline" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
                <Button onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Description & Info */}
        <div className="mb-8 space-y-4">
          {team.description && (
            <p className="text-foreground/90 max-w-2xl">{team.description}</p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {team.website && (
              <a
                href={team.website.startsWith('http') ? team.website : `https://${team.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <LinkIcon className="h-4 w-4" />
                {team.website.replace(/^https?:\/\//, '').split('/')[0]}
              </a>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Created {createdDate}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-6 pt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{team._count.members}</p>
              <p className="text-sm text-muted-foreground">
                Members
                {isAdmin && team.maxSeats && (
                  <span className="text-muted-foreground/70"> / {team.maxSeats}</span>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{team._count.projects}</p>
              <p className="text-sm text-muted-foreground">Projects</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="projects" className="pb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="projects" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            {team.projects.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No projects yet"
                description={isMember ? "Create your first team project" : "This team hasn't created any projects yet"}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {team.projects.map((project) => (
                  <Card key={project.id} className="group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg line-clamp-1">{project.name}</CardTitle>
                        <Link href={`/editor/${project.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{project._count.screenplays} scripts</span>
                        <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.members.map((member) => {
                const RoleIcon = roleIcons[member.role]
                const userAsProfileData: ProfileData = {
                  ...member.user,
                  _count: { projects: 0, screenplays: 0 },
                }

                return (
                  <ProfileHoverCard key={member.id} user={userAsProfileData}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.user.image || undefined} />
                          <AvatarFallback>
                            {member.user.name?.[0] || member.user.email?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {member.user.name || 'Anonymous'}
                          </p>
                          {member.user.title && (
                            <p className="text-sm text-muted-foreground truncate">
                              {member.user.title}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <RoleIcon className="h-3 w-3" />
                          {roleLabels[member.role]}
                        </Badge>
                      </CardContent>
                    </Card>
                  </ProfileHoverCard>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {team && (
        <>
          <TeamSettingsDialog
            team={{
              id: team.id,
              name: team.name,
              logo: team.logo,
              description: team.description,
              website: team.website,
              ownerId: team.ownerId,
              maxSeats: team.maxSeats,
              members: team.members.map(m => ({
                id: m.id,
                role: m.role,
                user: {
                  id: m.user.id,
                  name: m.user.name,
                  email: m.user.email,
                  image: m.user.image,
                },
              })),
              _count: { members: team._count.members, invites: team._count.invites || 0 },
            }}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            onUpdate={() => {
              // Refetch team to get updated data
              fetch(`/api/teams/${team.id}`)
                .then((res) => res.json())
                .then((data) => setTeam(data))
                .catch(console.error)
            }}
          />
          <InviteMemberDialog
            teamId={team.id}
            teamName={team.name}
            seatsAvailable={team.maxSeats - team._count.members - (team._count.invites || 0)}
            maxSeats={team.maxSeats}
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            onInviteSent={() => {
              // Refetch team data to update invite count
              fetch(`/api/teams/${team.id}`)
                .then((res) => res.json())
                .then((data) => setTeam(data))
                .catch(console.error)
            }}
          />
        </>
      )}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  )
}

function TeamSkeleton() {
  return (
    <div className="min-h-screen">
      <Skeleton className="h-48 md:h-64 w-full" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 sm:-mt-20 mb-6">
          <div className="flex items-end gap-4">
            <Skeleton className="h-28 w-28 sm:h-36 sm:w-36 rounded-xl" />
            <div className="mb-2 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </div>
        <div className="space-y-4 mb-8">
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-2/3 max-w-xl" />
        </div>
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    </div>
  )
}
