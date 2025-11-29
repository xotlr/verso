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
import { Loader2, Image as ImageIcon, User, Link as LinkIcon, Eye, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  interests?: string[]
  skills?: string[]
  lookingFor?: string | null
}

const INTEREST_SUGGESTIONS = [
  'Horror', 'Sci-Fi', 'Drama', 'Comedy', 'Documentary',
  'Thriller', 'Action', 'Romance', 'Animation', 'Indie',
  'Crime', 'Mystery', 'Fantasy', 'Western', 'Musical',
]

const SKILL_SUGGESTIONS = [
  'Director', 'Writer', 'DOP', 'Editor', 'Producer',
  'Sound Designer', 'Colorist', 'VFX Artist', 'Actor', 'Composer',
  'Production Designer', 'Costume Designer', 'Gaffer', 'Assistant Director',
]

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
  const { data: session, update } = useSession()
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
    interests: user.interests || [],
    skills: user.skills || [],
    lookingFor: user.lookingFor || '',
  })
  const [newInterest, setNewInterest] = useState('')
  const [newSkill, setNewSkill] = useState('')

  const handleChange = (field: keyof typeof formData, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addInterest = (interest: string) => {
    const trimmed = interest.trim()
    if (trimmed && !formData.interests.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, interests: [...prev.interests, trimmed] }))
    }
    setNewInterest('')
  }

  const removeInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.filter((i) => i !== interest),
    }))
  }

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !formData.skills.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }))
    }
    setNewSkill('')
  }

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
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

      // Refresh session to update sidebar/navbar with new image/name
      await update()

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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="images" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Images</span>
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Info</span>
            </TabsTrigger>
            <TabsTrigger value="showcase" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Showcase</span>
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

          <TabsContent value="showcase" className="space-y-6 mt-6">
            {/* Interests */}
            <div className="space-y-3">
              <Label>Interests</Label>
              <p className="text-xs text-muted-foreground">
                Genres, movies, directors you love
              </p>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {formData.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="gap-1">
                    {interest}
                    <button
                      type="button"
                      onClick={() => removeInterest(interest)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addInterest(newInterest)
                    }
                  }}
                  placeholder="Type and press Enter..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addInterest(newInterest)}
                  disabled={!newInterest.trim()}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {INTEREST_SUGGESTIONS.filter(
                  (s) => !formData.interests.includes(s)
                )
                  .slice(0, 8)
                  .map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => addInterest(suggestion)}
                    >
                      + {suggestion}
                    </Button>
                  ))}
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-3">
              <Label>Skills & Roles</Label>
              <p className="text-xs text-muted-foreground">
                Your profession and expertise
              </p>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {formData.skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="gap-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addSkill(newSkill)
                    }
                  }}
                  placeholder="Type and press Enter..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSkill(newSkill)}
                  disabled={!newSkill.trim()}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {SKILL_SUGGESTIONS.filter((s) => !formData.skills.includes(s))
                  .slice(0, 8)
                  .map((suggestion) => (
                    <Button
                      key={suggestion}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => addSkill(suggestion)}
                    >
                      + {suggestion}
                    </Button>
                  ))}
              </div>
            </div>

            {/* Looking For */}
            <div className="space-y-2">
              <Label htmlFor="lookingFor">Looking For</Label>
              <p className="text-xs text-muted-foreground">
                Tell people what collaborators you need
              </p>
              <Textarea
                id="lookingFor"
                value={formData.lookingFor}
                onChange={(e) => handleChange('lookingFor', e.target.value)}
                placeholder="e.g., Looking for a DOP in LA for an indie horror feature..."
                rows={3}
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
