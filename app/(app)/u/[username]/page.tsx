'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Edit,
  FolderOpen,
  FileText,
  ExternalLink,
  Camera,
  AtSign,
  Play,
  MapPin,
  Calendar,
  Globe,
} from 'lucide-react'
import { EditProfileDialog } from '@/components/edit-profile-dialog'
import { ConnectButton } from '@/components/connect-button'
import {
  ProfileBanner,
  ProfileAvatar,
  ProfileStats,
  ProfileSocialLinks,
  ProfileAvailability,
  ProfileRolesBadges,
  ProfileTrustBadges,
  ProfileFeaturedProject,
  ProfileCredits,
  ProfileReplayShowcase,
  ProfileInfluences,
  ProfileGear,
  ProfileLanguages,
  ProfileResponseRate,
} from '@/components/profile'
import type { UserProfile, Availability, ResponseRate } from '@/types/profile'
import { format } from 'date-fns'

// Extended UserProfile type for API response (includes projects/screenplays)
interface UserProfileResponse extends Omit<UserProfile, 'verifiedBadges'> {
  // Legacy fields for backwards compatibility
  bio?: string | null
  title?: string | null
  interests?: string[]
  skills?: string[]
  // API returns these as separate fields
  emailVerified?: boolean
  imdbLinked?: boolean
  projects: Array<{
    id: string
    name: string
    description: string | null
    coverImage: string | null
    createdAt: string
    _count: { screenplays: number }
  }>
  screenplays: Array<{
    id: string
    title: string
    synopsis: string | null
    timelapseShareId: string | null
    createdAt: string
    updatedAt: string
  }>
}

export default function UsernameProfilePage() {
  const params = useParams()
  const { data: session } = useSession()
  const [user, setUser] = useState<UserProfileResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const username = params.username as string
  const isOwnProfile = user ? session?.user?.id === user.id : false

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/users/by-username/${username}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('User not found')
          } else if (response.status === 403) {
            setError('This profile is private')
          } else {
            setError('Failed to load profile')
          }
          return
        }
        const data = await response.json()
        setUser(data)
      } catch {
        setError('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [username])

  // Dispatch user name to header breadcrumb
  useEffect(() => {
    if (user) {
      window.dispatchEvent(new CustomEvent('screenplay-title-update', {
        detail: { title: user.name || 'Anonymous' }
      }))
    }
  }, [user])

  const handleProfileUpdate = (updatedUser: Partial<UserProfileResponse>) => {
    if (user) {
      setUser({ ...user, ...updatedUser })
    }
  }

  if (isLoading) {
    return <ProfileSkeleton />
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h1 className="text-2xl font-semibold text-foreground">{error || 'User not found'}</h1>
        <Button asChild variant="outline">
          <Link href="/home">Go Home</Link>
        </Button>
      </div>
    )
  }

  // Normalize data - support both new and legacy fields
  const displayOneLiner = user.oneLiner || user.bio || null
  const displayRoles = user.roles?.length > 0 ? user.roles : (user.skills || [])
  const displayInfluences = user.influences?.length > 0 ? user.influences : (user.interests?.slice(0, 3) || [])
  const availability = (user.availability || 'NOT_LOOKING') as Availability
  const responseRate = (user.responseRate || 'UNKNOWN') as ResponseRate

  return (
    <div className="min-h-screen">
      {/* Banner with edit overlay for owner */}
      <div className="relative group">
        <ProfileBanner
          userId={user.id}
          bannerUrl={user.banner}
          height="lg"
        />
        {isOwnProfile && (
          <button
            onClick={() => setEditDialogOpen(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera className="h-8 w-8 text-white" />
          </button>
        )}
      </div>

      {/* Profile Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="relative mb-6">
          {/* Avatar - positioned to overlap banner */}
          <div className="-mt-16 sm:-mt-[68px] mb-3 relative w-fit group/avatar">
            <ProfileAvatar
              userId={user.id}
              imageUrl={user.image}
              name={user.name}
              email={user.email}
              size="lg"
            />
            {isOwnProfile && (
              <button
                onClick={() => setEditDialogOpen(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-md cursor-pointer"
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
            )}
          </div>

          {/* Name, Username, Availability, Edit Button */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-2">
              {/* Name row with availability */}
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {user.name || 'Anonymous'}
                </h1>
                <ProfileAvailability availability={availability} />
                {user.plan !== 'FREE' && (
                  <Badge variant="secondary" className="text-xs">
                    {user.plan}
                  </Badge>
                )}
              </div>

              {/* Username */}
              {user.username && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AtSign className="h-3.5 w-3.5" />
                  {user.username}
                </p>
              )}

              {/* One-liner */}
              {displayOneLiner && (
                <p className="text-base text-foreground/80 max-w-lg">
                  &ldquo;{displayOneLiner}&rdquo;
                </p>
              )}

              {/* Role badges */}
              <ProfileRolesBadges roles={displayRoles} className="pt-1" />
            </div>

            {/* Edit Button or Connect Button */}
            {isOwnProfile ? (
              <Button
                onClick={() => setEditDialogOpen(true)}
                variant="outline"
                className="rounded-full px-5 font-semibold shrink-0"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit profile
              </Button>
            ) : user ? (
              <ConnectButton userId={user.id} className="rounded-full px-5 shrink-0" />
            ) : null}
          </div>
        </div>

        {/* Meta Info Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
          {user.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {user.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Joined {format(new Date(user.createdAt), 'MMMM yyyy')}
          </span>
          {user.reelUrl && (
            <a
              href={user.reelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Play className="h-3.5 w-3.5" />
              View Reel
            </a>
          )}
          {user.website && (
            <a
              href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Globe className="h-3.5 w-3.5" />
              Website
            </a>
          )}
        </div>

        {/* Trust badges + Response rate */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <ProfileTrustBadges
            emailVerified={user.emailVerified || false}
            imdbLinked={Boolean(user.imdb)}
            projectsCompleted={user.projectsCompleted || 0}
          />
          <ProfileResponseRate responseRate={responseRate} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Featured Project, Credits, Showcase */}
          <div className="lg:col-span-2 space-y-6">
            {/* Featured Project */}
            {user.featuredProject && (
              <ProfileFeaturedProject project={user.featuredProject} />
            )}

            {/* Credits */}
            {user.credits && user.credits.length > 0 && (
              <ProfileCredits credits={user.credits} />
            )}

            {/* Replay Showcase */}
            {user.showcaseTimelapse && (
              <ProfileReplayShowcase timelapseShareId={user.showcaseTimelapse} />
            )}

            {/* Looking For */}
            {user.lookingFor && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Looking For
                </h3>
                <p className="text-sm text-foreground/80 bg-card rounded-lg border p-3">
                  {user.lookingFor}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Vibe Section */}
          <div className="space-y-4">
            <ProfileInfluences influences={displayInfluences} />
            {user.gear && <ProfileGear gear={user.gear} />}
            <ProfileLanguages languages={user.languages || []} />

            {/* Social Links */}
            <ProfileSocialLinks
              twitter={user.twitter}
              linkedin={user.linkedin}
              imdb={user.imdb}
            />

            {/* Stats */}
            <ProfileStats
              projectCount={user._count?.projects || 0}
              scriptCount={user._count?.screenplays || 0}
              className="pt-2"
            />
          </div>
        </div>

        {/* Projects/Scripts Tabs */}
        <Tabs defaultValue="projects" className="pb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="projects" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="scripts" className="gap-2">
              <FileText className="h-4 w-4" />
              Scripts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            {user.projects.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No projects yet"
                description={isOwnProfile ? "Create your first project to get started" : "This user hasn't created any public projects"}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {user.projects.map((project) => (
                  <Card key={project.id} className="group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg line-clamp-1">{project.name}</CardTitle>
                        <Link href={`/screenplay/${project.id}`}>
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

          <TabsContent value="scripts">
            {user.screenplays.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No scripts yet"
                description={isOwnProfile ? "Start writing your first screenplay" : "This user hasn't created any public scripts"}
              />
            ) : (
              <div className="space-y-3">
                {user.screenplays.map((script) => (
                  <Card key={script.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{script.title}</h3>
                        {script.synopsis && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {script.synopsis}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Updated {new Date(script.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Link href={`/screenplay/${script.id}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          Open
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Dialog */}
      {isOwnProfile && (
        <EditProfileDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          user={user as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSave={handleProfileUpdate as any}
        />
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

function ProfileSkeleton() {
  return (
    <div className="min-h-screen">
      <Skeleton className="h-48 md:h-52 w-full" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative mb-6">
          <div className="-mt-16 sm:-mt-[68px] mb-3">
            <Skeleton className="h-32 w-32 sm:h-[134px] sm:w-[134px] rounded-md" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        <div className="flex gap-4 mb-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
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
