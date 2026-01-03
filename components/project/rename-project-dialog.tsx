'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageUpload } from '@/components/image-upload';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RenameProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentName: string;
  currentDescription?: string | null;
  currentBanner?: string | null;
  userId: string;
  onSuccess?: () => void;
}

export function RenameProjectDialog({
  open,
  onOpenChange,
  projectId,
  currentName,
  currentDescription,
  currentBanner,
  userId,
  onSuccess,
}: RenameProjectDialogProps) {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription || '');
  const [banner, setBanner] = useState<string | undefined>(currentBanner || undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when dialog opens with new values
  useEffect(() => {
    if (open) {
      setName(currentName);
      setDescription(currentDescription || '');
      setBanner(currentBanner || undefined);
    }
  }, [open, currentName, currentDescription, currentBanner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = description.trim() || null;
    const newBanner = banner || null;
    const hasChanges =
      trimmedName !== currentName ||
      trimmedDescription !== (currentDescription || null) ||
      newBanner !== (currentBanner || null);

    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          description: trimmedDescription,
          banner: newBanner,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      toast.success('Project updated');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <form id="edit-project-form" onSubmit={handleSubmit} className="px-6 space-y-6">
            {/* Banner Upload */}
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <ImageUpload
                value={banner}
                onChange={setBanner}
                bucket="banners"
                userId={userId}
                aspectRatio="banner"
                placeholder="Drop a banner image or click to upload"
              />
            </div>

            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
                disabled={isLoading}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter project description (optional)"
                disabled={isLoading}
                rows={3}
                className="resize-none"
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-project-form"
            disabled={isLoading || !name.trim()}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
