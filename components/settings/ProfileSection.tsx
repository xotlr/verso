'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2, Globe, Lock, Eye, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/image-upload';
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

export function ProfileSection({
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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
    </div>
  );
}
