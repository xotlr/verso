'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSimpleGradientStyle } from '@/lib/avatar-gradient'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Settings,
  Users,
  Mail,
  CreditCard,
  Loader2,
  Trash2,
  Crown,
  Shield,
  User as UserIcon,
  Clock,
  X,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/image-upload'
import { TeamAuditLog } from '@/components/team-audit-log'
import { Separator } from '@/components/ui/separator'

interface TeamMember {
  id: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

interface TeamInvite {
  id: string
  email: string
  role: 'ADMIN' | 'MEMBER'
  expiresAt: string
  inviter: {
    id: string
    name: string | null
    image: string | null
  }
}

interface TeamData {
  id: string
  name: string
  logo: string | null
  banner: string | null
  description: string | null
  website: string | null
  ownerId: string
  maxSeats: number
  members: TeamMember[]
  _count?: {
    members?: number
    invites?: number
  }
}

interface TeamSettingsDialogProps {
  team: TeamData
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
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

export function TeamSettingsDialog({
  team,
  open,
  onOpenChange,
  onUpdate,
}: TeamSettingsDialogProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('general')
  const [isDeleting, setIsDeleting] = useState(false)

  // General settings state
  const [name, setName] = useState(team.name)
  const [description, setDescription] = useState(team.description || '')
  const [website, setWebsite] = useState(team.website || '')
  const [banner, setBanner] = useState<string | undefined>(team.banner || undefined)
  const [logo, setLogo] = useState<string | undefined>(team.logo || undefined)
  const [isSaving, setIsSaving] = useState(false)

  // Members state
  const [members, setMembers] = useState<TeamMember[]>(team.members)
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null)

  // Invites state
  const [invites, setInvites] = useState<TeamInvite[]>([])
  const [isLoadingInvites, setIsLoadingInvites] = useState(false)
  const [isRevokingInvite, setIsRevokingInvite] = useState<string | null>(null)

  // Billing state
  const [isLoadingBilling, setIsLoadingBilling] = useState(false)

  const isOwner = session?.user?.id === team.ownerId
  const currentMember = members.find((m) => m.user.id === session?.user?.id)
  const isAdmin = currentMember?.role === 'ADMIN' || isOwner

  // Fetch invites when opening dialog
  useEffect(() => {
    if (open && isAdmin) {
      fetchInvites()
    }
  }, [open, isAdmin])

  const fetchInvites = async () => {
    setIsLoadingInvites(true)
    try {
      const response = await fetch(`/api/teams/${team.id}/invites`)
      if (response.ok) {
        const data = await response.json()
        setInvites(data)
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error)
    } finally {
      setIsLoadingInvites(false)
    }
  }

  const handleSaveGeneral = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, website, banner: banner || null, logo: logo || null }),
      })

      if (!response.ok) {
        throw new Error('Failed to update team')
      }

      await response.json()
      toast.success('Team settings saved')
      onUpdate?.()
    } catch {
      toast.error('Failed to update team settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
    setIsUpdatingRole(memberId)
    try {
      const response = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        throw new Error('Failed to update role')
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      )
      toast.success('Member role updated')
    } catch {
      toast.error('Failed to update member role')
    } finally {
      setIsUpdatingRole(null)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/teams/${team.id}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove member')
      }

      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      toast.success('Member removed from team')
    } catch {
      toast.error('Failed to remove member')
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    setIsRevokingInvite(inviteId)
    try {
      const response = await fetch(`/api/teams/${team.id}/invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to revoke invite')
      }

      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
      toast.success('Invite revoked')
    } catch {
      toast.error('Failed to revoke invite')
    } finally {
      setIsRevokingInvite(null)
    }
  }

  const handleManageBilling = async () => {
    setIsLoadingBilling(true)
    try {
      const response = await fetch(`/api/teams/${team.id}/billing/portal`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to open billing portal')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open billing portal')
      setIsLoadingBilling(false)
    }
  }

  const handleUpgrade = async () => {
    setIsLoadingBilling(true)
    try {
      // Use the team price ID from environment (monthly by default)
      const priceId = process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || ''

      if (!priceId) {
        toast.error('Team plan not configured. Contact support.')
        setIsLoadingBilling(false)
        return
      }

      const response = await fetch(`/api/teams/${team.id}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start checkout')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start checkout')
      setIsLoadingBilling(false)
    }
  }

  const handleDeleteTeam = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/teams/${team.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Team deleted')
        onOpenChange(false)
        router.push('/home')
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete team')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete team')
      setIsDeleting(false)
    }
  }

  const seatsUsed = members.length + invites.length
  const seatsAvailable = team.maxSeats - seatsUsed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
            </TabsTrigger>
            <TabsTrigger value="invites" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Invites</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Images Section */}
            {isAdmin && session?.user?.id && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Banner Image</Label>
                  <p className="text-xs text-muted-foreground">Recommended: 3:1 aspect ratio</p>
                  <ImageUpload
                    value={banner}
                    onChange={setBanner}
                    bucket="banners"
                    userId={session.user.id}
                    aspectRatio="banner"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Team Logo</Label>
                  <p className="text-xs text-muted-foreground">Square image works best</p>
                  <ImageUpload
                    value={logo}
                    onChange={setLogo}
                    bucket="team-assets"
                    userId={session.user.id}
                    aspectRatio="square"
                    className="w-32"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter team name"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about your team..."
                rows={3}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                disabled={!isAdmin}
              />
            </div>
            {isAdmin && (
              <div className="flex justify-end">
                <Button onClick={handleSaveGeneral} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            )}

            {/* Danger Zone - Owner only */}
            {isOwner && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-destructive">
                    Danger Zone
                  </h3>
                  <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Delete this team</p>
                        <p className="text-xs text-muted-foreground">
                          Permanently delete this team and all its data
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Team
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete &quot;{team.name}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                              <div>
                                <p>This action cannot be undone. This will permanently delete:</p>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>All team projects and screenplays</li>
                                  <li>All team members&apos; access</li>
                                  <li>All pending invitations</li>
                                </ul>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteTeam}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Team
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''} ({seatsUsed}/{team.maxSeats} seats used)
              </p>
            </div>
            <div className="space-y-3">
              {members.map((member) => {
                const RoleIcon = roleIcons[member.role]
                const isSelf = member.user.id === session?.user?.id
                const canManage = isOwner && member.role !== 'OWNER'

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.user.image || undefined} />
                        <AvatarFallback
                          className="text-white font-medium"
                          style={getSimpleGradientStyle(member.user.id)}
                        >
                          {member.user.name?.[0]?.toUpperCase() || member.user.email?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {member.user.name || 'Anonymous'}
                          {isSelf && (
                            <span className="text-muted-foreground ml-1">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'OWNER' ? (
                        <Badge variant="secondary" className="gap-1">
                          <RoleIcon className="h-3 w-3" />
                          Owner
                        </Badge>
                      ) : canManage ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              handleRoleChange(member.id, value as 'ADMIN' | 'MEMBER')
                            }
                            disabled={isUpdatingRole === member.id}
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="MEMBER">Member</SelectItem>
                            </SelectContent>
                          </Select>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove {member.user.name || member.user.email} from the team.
                                  They will lose access to all team projects.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <RoleIcon className="h-3 w-3" />
                          {roleLabels[member.role]}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites" className="mt-4">
            {isLoadingInvites ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No pending invites</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => {
                  const expiresAt = new Date(invite.expiresAt)
                  const isExpired = expiresAt < new Date()
                  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

                  return (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{invite.email}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {roleLabels[invite.role]}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {isExpired ? (
                                <span className="text-destructive">Expired</span>
                              ) : (
                                `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRevokeInvite(invite.id)}
                        disabled={isRevokingInvite === invite.id}
                      >
                        {isRevokingInvite === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4">
            {isAdmin ? (
              <TeamAuditLog teamId={team.id} />
            ) : (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Only admins can view activity logs
                </p>
              </div>
            )}
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="mt-4">
            <div className="space-y-6">
              {/* Seats Usage */}
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Seats</h4>
                  <span className="text-sm text-muted-foreground">
                    {seatsUsed} / {team.maxSeats} used
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all"
                    style={{ width: `${(seatsUsed / team.maxSeats) * 100}%` }}
                  />
                </div>
                {seatsAvailable <= 1 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {seatsAvailable === 0
                      ? "You've used all available seats. Upgrade to add more members."
                      : "Only 1 seat remaining."}
                  </p>
                )}
              </div>

              {/* Plan Info */}
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Current Plan</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {team.maxSeats <= 3 ? 'Free' : 'Team'} plan with {team.maxSeats} seats
                    </p>
                  </div>
                  {isOwner && team.maxSeats > 3 && (
                    <Button
                      variant="outline"
                      onClick={handleManageBilling}
                      disabled={isLoadingBilling}
                    >
                      {isLoadingBilling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Manage Billing
                    </Button>
                  )}
                </div>
              </div>

              {/* Upgrade CTA */}
              {team.maxSeats <= 3 && isOwner && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-medium">Need more seats?</h4>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Upgrade to the Team plan for up to 10 seats and additional features.
                  </p>
                  <Button onClick={handleUpgrade} disabled={isLoadingBilling}>
                    {isLoadingBilling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upgrade to Team
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
