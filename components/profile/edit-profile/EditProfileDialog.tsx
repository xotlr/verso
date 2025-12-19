'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2,
  Image as ImageIcon,
  User,
  Link as LinkIcon,
  Eye,
  Briefcase,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Credit, Availability } from '@/types/profile'
import type { UserProfile, ProfileFormData } from './types'
import { ImagesTab } from './ImagesTab'
import { CoreTab } from './CoreTab'
import { WorkTab } from './WorkTab'
import { VibeTab } from './VibeTab'
import { LinksTab } from './LinksTab'
import { PrivacyTab } from './PrivacyTab'

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserProfile
  onSave: (user: Partial<UserProfile>) => void
}

function createInitialFormData(user: UserProfile): ProfileFormData {
  return {
    name: user.name || '',
    username: user.username || '',
    image: user.image || '',
    banner: user.banner || '',
    location: user.location || '',
    website: user.website || '',
    twitter: user.twitter || '',
    linkedin: user.linkedin || '',
    imdb: user.imdb || '',
    isPublic: user.isPublic,
    oneLiner: user.oneLiner || user.bio?.slice(0, 100) || '',
    roles: user.roles || user.skills || [],
    reelUrl: user.reelUrl || '',
    availability: user.availability || 'NOT_LOOKING' as Availability,
    featuredProjectId: user.featuredProjectId || '',
    showcaseTimelapse: user.showcaseTimelapse || '',
    influences: user.influences || user.interests?.slice(0, 3) || [],
    lookingFor: user.lookingFor || '',
    gear: user.gear || '',
    languages: user.languages || [],
  }
}

export function EditProfileDialog({
  open,
  onOpenChange,
  user,
  onSave,
}: EditProfileDialogProps) {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<ProfileFormData>(() => createInitialFormData(user))
  const [credits, setCredits] = useState<Credit[]>(user.credits || [])

  // Username check state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
    user.username ? 'available' : 'idle'
  )
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const usernameTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Reset form when user changes
  useEffect(() => {
    setFormData(createInitialFormData(user))
    setCredits(user.credits || [])
  }, [user])

  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle')
      setUsernameError(null)
      return
    }

    setUsernameStatus('checking')
    setUsernameError(null)

    try {
      const response = await fetch('/api/users/username/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const data = await response.json()

      if (data.available) {
        setUsernameStatus('available')
        setUsernameError(null)
      } else {
        setUsernameStatus(data.error?.includes('taken') ? 'taken' : 'invalid')
        setUsernameError(data.error || 'Username not available')
      }
    } catch {
      setUsernameStatus('idle')
      setUsernameError('Failed to check username')
    }
  }, [])

  const handleUsernameChange = useCallback((value: string) => {
    const normalized = value.toLowerCase()
    setFormData((prev) => ({ ...prev, username: normalized }))

    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current)
    }

    usernameTimeoutRef.current = setTimeout(() => {
      checkUsername(normalized)
    }, 500)
  }, [checkUsername])

  const handleChange = useCallback((field: keyof ProfileFormData, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const updatedUser = await response.json()
      onSave({ ...updatedUser, credits })

      await update()

      onOpenChange(false)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const userId = session?.user?.id || user.id
  const tabProps = { formData, onChange: handleChange, user, userId }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make your profile glanceable - tight, focused, professional
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <Tabs defaultValue="images" className="mt-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="images" className="gap-1.5">
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Images</span>
              </TabsTrigger>
              <TabsTrigger value="core" className="gap-1.5">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Core</span>
              </TabsTrigger>
              <TabsTrigger value="work" className="gap-1.5">
                <Briefcase className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Work</span>
              </TabsTrigger>
              <TabsTrigger value="vibe" className="gap-1.5">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Vibe</span>
              </TabsTrigger>
              <TabsTrigger value="links" className="gap-1.5">
                <LinkIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Links</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-1.5">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Privacy</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="images">
              <ImagesTab {...tabProps} />
            </TabsContent>

            <TabsContent value="core">
              <CoreTab
                {...tabProps}
                usernameStatus={usernameStatus}
                usernameError={usernameError}
                onUsernameChange={handleUsernameChange}
              />
            </TabsContent>

            <TabsContent value="work">
              <WorkTab
                {...tabProps}
                credits={credits}
                onCreditsChange={setCredits}
              />
            </TabsContent>

            <TabsContent value="vibe">
              <VibeTab {...tabProps} />
            </TabsContent>

            <TabsContent value="links">
              <LinksTab {...tabProps} />
            </TabsContent>

            <TabsContent value="privacy">
              <PrivacyTab {...tabProps} />
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
