'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
import { Settings, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/image-upload'

interface ProjectData {
  id: string
  name: string
  description: string | null
  banner: string | null
  logo: string | null
  teamId: string | null
}

interface ProjectSettingsDialogProps {
  project: ProjectData
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
  onDelete?: () => void
}

export function ProjectSettingsDialog({
  project,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: ProjectSettingsDialogProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('general')

  // General settings state
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [banner, setBanner] = useState<string | undefined>(project.banner || undefined)
  const [logo, setLogo] = useState<string | undefined>(project.logo || undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSaveGeneral = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          banner: banner || null,
          logo: logo || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      toast.success('Project settings saved')
      onUpdate?.()
    } catch {
      toast.error('Failed to update project settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      toast.success('Project deleted')
      onOpenChange(false)
      onDelete?.()
      router.push('/projects')
    } catch {
      toast.error('Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="danger" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Danger Zone</span>
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Images Section */}
            {session?.user?.id && (
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
                  <Label>Project Logo</Label>
                  <p className="text-xs text-muted-foreground">Square image works best</p>
                  <ImageUpload
                    value={logo}
                    onChange={setLogo}
                    bucket="project-assets"
                    userId={session.user.id}
                    aspectRatio="square"
                    className="w-32"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the project..."
                rows={3}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveGeneral} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger" className="mt-4">
            <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-destructive">Delete Project</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete this project. Screenplays in this project will become standalone
                    and won&apos;t be deleted. This action cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="mt-3">
                        Delete Project
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the project &quot;{project.name}&quot;.
                          Screenplays will become standalone and won&apos;t be deleted.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete Project'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
