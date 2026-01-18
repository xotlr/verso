'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { PeopleTab } from './PeopleTab'
import { LinkTab } from './LinkTab'
import type {
  ShareRole,
  LinkPermission,
  ShareUser,
  Share,
  PendingInvite,
  ShareLink,
} from './types'
import { getExpirationDate } from './types'

type ResourceType = 'screenplay' | 'project' | 'series'

interface ShareDialogEnhancedProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceId: string
  resourceTitle: string
  resourceType: ResourceType
  // Legacy props for backwards compatibility
  screenplayId?: string
  screenplayTitle?: string
}

export function ShareDialogEnhanced({
  open,
  onOpenChange,
  resourceId: propResourceId,
  resourceTitle: propResourceTitle,
  resourceType: propResourceType = 'screenplay',
  // Legacy support
  screenplayId,
  screenplayTitle,
}: ShareDialogEnhancedProps) {
  // Support legacy props
  const resourceId = propResourceId || screenplayId!
  const resourceTitle = propResourceTitle || screenplayTitle!
  const resourceType = propResourceType

  // Helper to get API URLs based on resource type
  const getApiUrl = (endpoint: 'shares' | 'share') => {
    const basePath = {
      screenplay: 'screenplays',
      project: 'projects',
      series: 'series',
    }[resourceType]
    return `/api/${basePath}/${resourceId}/${endpoint}`
  }

  // Link-based sharing is only supported for screenplays currently
  const supportsLinkSharing = resourceType === 'screenplay'

  // User sharing state
  const [owner, setOwner] = useState<ShareUser | null>(null)
  const [shares, setShares] = useState<Share[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [selectedRole, setSelectedRole] = useState<ShareRole>('VIEWER')
  const [emailInput, setEmailInput] = useState('')
  const [isLoadingShares, setIsLoadingShares] = useState(true)
  const [isSavingShare, setIsSavingShare] = useState(false)

  // Link sharing state
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [linkPermission, setLinkPermission] = useState<LinkPermission>('VIEW')
  const [linkExpiration, setLinkExpiration] = useState('never')
  const [isLoadingLink, setIsLoadingLink] = useState(true)
  const [isSavingLink, setIsSavingLink] = useState(false)
  const [copied, setCopied] = useState(false)

  // Load data when dialog opens
  useEffect(() => {
    if (open && resourceId) {
      fetchShares()
      if (supportsLinkSharing) {
        fetchShareLink()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resourceId])

  const fetchShares = async () => {
    setIsLoadingShares(true)
    try {
      const response = await fetch(getApiUrl('shares'))
      if (response.ok) {
        const data = await response.json()
        setOwner(data.owner)
        setShares(data.shares || [])
        setPendingInvites(data.pendingInvites || [])
      }
    } catch (error) {
      console.error('Error fetching shares:', error)
    } finally {
      setIsLoadingShares(false)
    }
  }

  const fetchShareLink = async () => {
    if (!supportsLinkSharing) return

    setIsLoadingLink(true)
    try {
      const response = await fetch(getApiUrl('share'))
      if (response.ok) {
        const data = await response.json()
        setShareLink(data.shareLink || null)
        if (data.shareLink) {
          setLinkPermission(data.shareLink.permission)
        }
      }
    } catch (error) {
      console.error('Error fetching share link:', error)
    } finally {
      setIsLoadingLink(false)
    }
  }

  // User sharing handlers
  const handleUserSelect = async (user: ShareUser) => {
    setIsSavingShare(true)
    try {
      const response = await fetch(getApiUrl('shares'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: selectedRole }),
      })

      if (response.ok) {
        const share = await response.json()
        setShares((prev) => [share, ...prev])
        toast.success(`Shared with ${user.name || user.email}`)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to share')
      }
    } catch (error) {
      console.error('Error creating share:', error)
      toast.error('Failed to share')
    } finally {
      setIsSavingShare(false)
    }
  }

  const handleEmailInvite = async () => {
    if (!emailInput.trim() || !emailInput.includes('@')) {
      toast.error('Please enter a valid email')
      return
    }

    setIsSavingShare(true)
    try {
      const response = await fetch(getApiUrl('shares'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim(), role: selectedRole }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.type === 'invite') {
          setPendingInvites((prev) => [data.invite, ...prev])
          toast.success(`Invite sent to ${emailInput}`)
        } else {
          setShares((prev) => [data, ...prev])
          toast.success(`Shared with ${emailInput}`)
        }
        setEmailInput('')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to invite')
      }
    } catch (error) {
      console.error('Error sending invite:', error)
      toast.error('Failed to send invite')
    } finally {
      setIsSavingShare(false)
    }
  }

  const updateShareRole = async (shareId: string, newRole: ShareRole) => {
    try {
      const response = await fetch(`${getApiUrl('shares')}/${shareId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        setShares((prev) => prev.map((s) => (s.id === shareId ? { ...s, role: newRole } : s)))
        toast.success('Permission updated')
      }
    } catch (error) {
      console.error('Error updating share:', error)
      toast.error('Failed to update permission')
    }
  }

  const removeShare = async (shareId: string) => {
    try {
      const response = await fetch(`${getApiUrl('shares')}/${shareId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setShares((prev) => prev.filter((s) => s.id !== shareId))
        setPendingInvites((prev) => prev.filter((i) => i.id !== shareId))
        toast.success('Access removed')
      }
    } catch (error) {
      console.error('Error removing share:', error)
      toast.error('Failed to remove access')
    }
  }

  // Link sharing handlers
  const createShareLink = async () => {
    if (!supportsLinkSharing) return

    setIsSavingLink(true)
    try {
      const response = await fetch(getApiUrl('share'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permission: linkPermission,
          expiresAt: getExpirationDate(linkExpiration),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setShareLink(data.shareLink)
        toast.success('Share link created')
      }
    } catch (error) {
      console.error('Error creating share link:', error)
      toast.error('Failed to create link')
    } finally {
      setIsSavingLink(false)
    }
  }

  const updateShareLink = async (permission: LinkPermission) => {
    if (!shareLink || !supportsLinkSharing) return

    setIsSavingLink(true)
    try {
      const response = await fetch(getApiUrl('share'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission }),
      })

      if (response.ok) {
        const data = await response.json()
        setShareLink(data.shareLink)
      }
    } catch (error) {
      console.error('Error updating share link:', error)
    } finally {
      setIsSavingLink(false)
    }
  }

  const revokeShareLink = async () => {
    if (!supportsLinkSharing) return

    setIsSavingLink(true)
    try {
      const response = await fetch(getApiUrl('share'), {
        method: 'DELETE',
      })

      if (response.ok) {
        setShareLink(null)
        toast.success('Link revoked')
      }
    } catch (error) {
      console.error('Error revoking share link:', error)
    } finally {
      setIsSavingLink(false)
    }
  }

  const copyLink = async () => {
    if (!shareLink?.url) return
    await navigator.clipboard.writeText(shareLink.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied')
  }

  const refreshLink = async () => {
    await revokeShareLink()
    await createShareLink()
  }

  const existingUserIds = [owner?.id, ...shares.map((s) => s.user.id)].filter(Boolean) as string[]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share &quot;{resourceTitle}&quot;</DialogTitle>
          <DialogDescription>
            {supportsLinkSharing
              ? 'Share with specific people or create a shareable link'
              : 'Share with specific people'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="people" className="w-full">
          {supportsLinkSharing ? (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="people" className="gap-2">
                <Users className="h-4 w-4" />
                People
              </TabsTrigger>
              <TabsTrigger value="link" className="gap-2">
                <Link2 className="h-4 w-4" />
                Link
              </TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="people" className="gap-2">
                <Users className="h-4 w-4" />
                People
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="people" className="mt-4">
            <PeopleTab
              owner={owner}
              shares={shares}
              pendingInvites={pendingInvites}
              selectedRole={selectedRole}
              emailInput={emailInput}
              isLoadingShares={isLoadingShares}
              isSavingShare={isSavingShare}
              existingUserIds={existingUserIds}
              onRoleChange={setSelectedRole}
              onEmailChange={setEmailInput}
              onUserSelect={handleUserSelect}
              onEmailInvite={handleEmailInvite}
              onUpdateRole={updateShareRole}
              onRemoveShare={removeShare}
            />
          </TabsContent>

          {supportsLinkSharing && (
            <TabsContent value="link" className="mt-4">
              <LinkTab
                shareLink={shareLink}
                linkPermission={linkPermission}
                linkExpiration={linkExpiration}
                isLoadingLink={isLoadingLink}
                isSavingLink={isSavingLink}
                copied={copied}
                onPermissionChange={setLinkPermission}
                onExpirationChange={setLinkExpiration}
                onCreateLink={createShareLink}
                onUpdateLink={updateShareLink}
                onRevokeLink={revokeShareLink}
                onCopyLink={copyLink}
                onRefreshLink={refreshLink}
              />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
