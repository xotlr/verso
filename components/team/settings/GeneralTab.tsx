'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { ImageUpload } from '@/components/image-upload';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TeamData } from './types';

interface GeneralTabProps {
  team: TeamData;
  isAdmin: boolean;
  isOwner: boolean;
  userId: string | undefined;
  onUpdate?: () => void;
  onClose: () => void;
}

export function GeneralTab({
  team,
  isAdmin,
  isOwner,
  userId,
  onUpdate,
  onClose,
}: GeneralTabProps) {
  const router = useRouter();
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || '');
  const [website, setWebsite] = useState(team.website || '');
  const [banner, setBanner] = useState<string | undefined>(team.banner || undefined);
  const [logo, setLogo] = useState<string | undefined>(team.logo || undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, website, banner: banner || null, logo: logo || null }),
      });

      if (!response.ok) {
        throw new Error('Failed to update team');
      }

      await response.json();
      toast.success('Team settings saved');
      onUpdate?.();
    } catch {
      toast.error('Failed to update team settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${team.id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Team deleted');
        onClose();
        router.push('/home');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete team');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete team');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Images Section */}
      {isAdmin && userId && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Banner Image</Label>
            <p className="text-xs text-muted-foreground">Recommended: 3:1 aspect ratio</p>
            <ImageUpload
              value={banner}
              onChange={setBanner}
              bucket="banners"
              userId={userId}
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
              userId={userId}
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
    </div>
  );
}
