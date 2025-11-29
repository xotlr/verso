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
} from 'lucide-react'
import { EditProfileDialog } from '@/components/edit-profile-dialog'
import {
  ProfileBanner,
  ProfileAvatar,
  ProfileStats,
  ProfileMeta,
  ProfileSocialLinks,
  ProfileBento,
} from '@/components/profile'

interface UserProfile {
  id: string
  name: string | null
  email: string | null
  image: string | null
  banner: string | null
  bio: string | null
  title: string | null
  location: string | null
  website: string | null
  twitter: string | null
  linkedin: string | null
  imdb: string | null
  isPublic: boolean
  createdAt: string
  plan: string
  interests: string[]
  skills: string[]
  lookingFor: string | null
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
    createdAt: string
    updatedAt: string
  }>
  _count: {
    projects: number
    screenplays: number
  }
}

export default function ProfilePage() {
  const params = useParams()
  const { data: session } = useSession()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const userId = params.id as string
  const isOwnProfile = session?.user?.id === userId

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`)
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
  }, [userId])

  // Dispatch user name to header breadcrumb
  useEffect(() => {
    if (user) {
      window.dispatchEvent(new CustomEvent('screenplay-title-update', {
        detail: { title: user.name || 'Anonymous' }
      }))
    }
  }, [user])

  const handleProfileUpdate = (updatedUser: Partial<UserProfile>) => {
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

      {/* Profile Header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative mb-4">
          {/* Avatar - positioned to overlap banner by ~50% */}
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

          {/* Name, Title, and Edit Button row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {user.name || 'Anonymous'}
                </h1>
                {user.plan !== 'FREE' && (
                  <Badge variant="secondary" className="text-xs">
                    {user.plan}
                  </Badge>
                )}
              </div>
              {user.title && (
                <p className="text-base text-muted-foreground mt-0.5">{user.title}</p>
              )}
            </div>

            {/* Edit Button - Twitter-style pill button */}
            {isOwnProfile && (
              <Button
                onClick={() => setEditDialogOpen(true)}
                variant="outline"
                className="rounded-full px-5 font-semibold"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit profile
              </Button>
            )}
          </div>
        </div>

        {/* Bio & Info */}
        <div className="mb-8 space-y-4">
          {user.bio && (
            <p className="text-foreground/90 max-w-2xl">{user.bio}</p>
          )}

          {/* Meta Info */}
          <ProfileMeta
            location={user.location}
            website={user.website}
            createdAt={user.createdAt}
            size="md"
          />

          {/* Social Links */}
          <ProfileSocialLinks
            twitter={user.twitter}
            linkedin={user.linkedin}
            imdb={user.imdb}
          />

          {/* Stats */}
          <ProfileStats
            projectCount={user._count.projects}
            scriptCount={user._count.screenplays}
            className="pt-2"
          />
        </div>

        {/* Bento Blocks */}
        <ProfileBento
          interests={user.interests || []}
          skills={user.skills || []}
          lookingFor={user.lookingFor}
          isOwnProfile={isOwnProfile}
          onEdit={() => setEditDialogOpen(true)}
        />

        {/* Tabs */}
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
          user={user}
          onSave={handleProfileUpdate}
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
        <div className="relative mb-4">
          <div className="-mt-16 sm:-mt-[68px] mb-3">
            <Skeleton className="h-32 w-32 sm:h-[134px] sm:w-[134px] rounded-md" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
        </div>
        <div className="space-y-4 mb-8">
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-2/3 max-w-xl" />
          <div className="flex gap-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-5 pt-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
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
