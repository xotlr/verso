'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageUpload } from '@/components/image-upload'
import { Loader2, Image as ImageIcon, User, Link as LinkIcon, Eye } from 'lucide-react'
import { toast } from 'sonner'

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
}

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserProfile
  onSave: (user: Partial<UserProfile>) => void
}

export function EditProfileDialog({
  open,
  onOpenChange,
  user,
  onSave,
}: EditProfileDialogProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user.name || '',
    image: user.image || '',
    banner: user.banner || '',
    bio: user.bio || '',
    title: user.title || '',
    location: user.location || '',
    website: user.website || '',
    twitter: user.twitter || '',
    linkedin: user.linkedin || '',
    imdb: user.imdb || '',
    isPublic: user.isPublic,
  })

  const handleChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

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
      onSave(updatedUser)
      onOpenChange(false)
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Customize your profile to let others know who you are
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="images" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="images" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Images</span>
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Info</span>
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Links</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="space-y-6 mt-6">
            {/* Banner */}
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <ImageUpload
                value={formData.banner || undefined}
                onChange={(url) => handleChange('banner', url || '')}
                bucket="banners"
                userId={session?.user?.id || user.id}
                aspectRatio="banner"
                placeholder="Drop a banner image (3:1 ratio recommended)"
              />
            </div>

            {/* Avatar */}
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-start gap-4">
                <ImageUpload
                  value={formData.image || undefined}
                  onChange={(url) => handleChange('image', url || '')}
                  bucket="avatars"
                  userId={session?.user?.id || user.id}
                  aspectRatio="square"
                  className="w-32"
                  placeholder="Upload avatar"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Square image recommended. This will be shown on your profile and in hover cards.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="info" className="space-y-4 mt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title / Role</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Screenwriter, Director, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {formData.bio.length}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="City, Country"
              />
            </div>
          </TabsContent>

          <TabsContent value="links" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://yoursite.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter / X</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">
                  @
                </span>
                <Input
                  id="twitter"
                  value={formData.twitter}
                  onChange={(e) => handleChange('twitter', e.target.value.replace('@', ''))}
                  placeholder="username"
                  className="rounded-l-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">
                  linkedin.com/in/
                </span>
                <Input
                  id="linkedin"
                  value={formData.linkedin}
                  onChange={(e) => handleChange('linkedin', e.target.value)}
                  placeholder="username"
                  className="rounded-l-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imdb">IMDb</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">
                  imdb.com/name/
                </span>
                <Input
                  id="imdb"
                  value={formData.imdb}
                  onChange={(e) => handleChange('imdb', e.target.value)}
                  placeholder="nm1234567"
                  className="rounded-l-none"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public-profile">Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to view your profile and projects
                </p>
              </div>
              <Switch
                id="public-profile"
                checked={formData.isPublic}
                onCheckedChange={(checked) => handleChange('isPublic', checked)}
              />
            </div>
          </TabsContent>
        </Tabs>

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
