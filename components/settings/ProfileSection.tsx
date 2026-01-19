'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/components/providers/auth-provider';
import { Loader2, Globe, Lock, Eye, Check, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/image-upload';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface UserProfile {
  name: string;
  username: string;
  title: string;
  bio: string;
  avatar: string | null;
  banner: string | null;
  isPublic: boolean;
}

const PLAN_BADGE_STYLES: Record<string, string> = {
  PLUS: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
  PRO: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
  MAX: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
};

interface ProfileSectionProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  session: {
    user?: {
      id?: string;
      email?: string | null;
    };
  } | null;
  isLoadingProfile: boolean;
  isSavingProfile: boolean;
  usernameStatus: 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
  usernameError: string | null;
  onUsernameChange: (value: string) => void;
  onSaveProfile: () => Promise<void>;
  currentPlan?: string;
}

export const ProfileSection = React.memo(function ProfileSection({
  profile,
  setProfile,
  session,
  isLoadingProfile,
  isSavingProfile,
  usernameStatus,
  usernameError,
  onUsernameChange,
  onSaveProfile,
  currentPlan,
}: ProfileSectionProps) {
  const userId = session?.user?.id || '';

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Images row */}
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="space-y-2">
          <Label>Avatar</Label>
          <ImageUpload
            value={profile.avatar || undefined}
            onChange={(url) => setProfile(p => ({ ...p, avatar: url || null }))}
            bucket="avatars"
            userId={userId}
            aspectRatio="square"
            className="w-24 h-24"
            compact
          />
        </div>

        {/* Banner */}
        <div className="flex-1 space-y-2 min-w-0 overflow-hidden">
          <Label>Banner</Label>
          <div className="overflow-hidden rounded-lg">
            <ImageUpload
              value={profile.banner || undefined}
              onChange={(url) => setProfile(p => ({ ...p, banner: url || null }))}
              bucket="banners"
              userId={userId}
              aspectRatio="banner"
              className="h-24 w-full"
            />
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="name">Name</Label>
          {currentPlan && currentPlan !== 'FREE' && PLAN_BADGE_STYLES[currentPlan] && (
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
              PLAN_BADGE_STYLES[currentPlan]
            )}>
              {currentPlan}
            </span>
          )}
        </div>
        <Input
          id="name"
          value={profile.name}
          onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
          placeholder="Your name"
        />
      </div>

      {/* Username */}
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
          <Input
            id="username"
            value={profile.username}
            onChange={(e) => onUsernameChange(e.target.value.toLowerCase())}
            placeholder="username"
            className="pl-7"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === 'checking' && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {usernameStatus === 'available' && profile.username && (
              <Check className="h-4 w-4 text-green-500" />
            )}
            {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
        {usernameError && (
          <p className="text-xs text-red-500">{usernameError}</p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={profile.title}
          onChange={(e) => setProfile(p => ({ ...p, title: e.target.value }))}
          placeholder="e.g., Screenwriter"
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={profile.bio}
          onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
          placeholder="Tell us about yourself..."
          rows={3}
        />
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <Label>Profile visibility</Label>
        <div className="flex items-center bg-muted rounded-lg p-1 w-fit" role="radiogroup">
          <button
            onClick={() => setProfile(p => ({ ...p, isPublic: true }))}
            role="radio"
            aria-checked={profile.isPublic}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              profile.isPublic ? "bg-card shadow-sm" : "text-muted-foreground"
            )}
          >
            <Globe className="h-4 w-4" />
            Public
          </button>
          <button
            onClick={() => setProfile(p => ({ ...p, isPublic: false }))}
            role="radio"
            aria-checked={!profile.isPublic}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              !profile.isPublic ? "bg-card shadow-sm" : "text-muted-foreground"
            )}
          >
            <Lock className="h-4 w-4" />
            Private
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={onSaveProfile} disabled={isSavingProfile}>
          {isSavingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save changes
        </Button>
        <Button asChild variant="outline">
          <Link href={profile.username ? `/u/${profile.username}` : `/profile/${userId}`}>
            <Eye className="h-4 w-4 mr-2" />
            View profile
          </Link>
        </Button>
      </div>

      {/* Danger Zone */}
      <DeleteAccountSection />
    </div>
  );
});

function DeleteAccountSection() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmation !== 'DELETE MY ACCOUNT') {
      toast.error('Please type DELETE MY ACCOUNT to confirm');
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');

      // Sign out and redirect to home
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-12 pt-6 border-t border-destructive/20">
      <h3 className="text-lg font-medium text-destructive mb-2">Danger Zone</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Once you delete your account, there is no going back. All your screenplays, projects, and data will be permanently deleted.
      </p>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers, including:
              </span>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All screenplays and version history</li>
                <li>All projects and series</li>
                <li>Your profile and settings</li>
                <li>Team memberships</li>
              </ul>
              <span className="block pt-2">
                Type <strong>DELETE MY ACCOUNT</strong> to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETE MY ACCOUNT"
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmation('')}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={confirmation !== 'DELETE MY ACCOUNT' || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete my account'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
