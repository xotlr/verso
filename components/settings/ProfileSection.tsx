'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2, Globe, Lock, Eye, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/image-upload';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
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

// Tier-based badge colors
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
  if (isLoadingProfile) {
    return (
      <Card className="shrink-0 overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="shrink-0 overflow-hidden">
      {/* Banner - Full Width, No Bottom Rounding */}
      <div className="relative isolate">
        <ImageUpload
          value={profile.banner || undefined}
          onChange={(url) => setProfile(p => ({ ...p, banner: url || null }))}
          bucket="banners"
          userId={session?.user?.id || ''}
          aspectRatio="banner"
          className="h-28 sm:h-36 w-full rounded-t-lg rounded-b-none"
        />
      </div>

      {/* Content Area */}
      <div className="relative">
        {/* Avatar - Positioned at the overlap boundary (25% into banner) */}
        <div className="flex items-end gap-4 pt-0 px-4 sm:px-6 -mt-10 sm:-mt-12">
          <div className="shrink-0 relative rounded-xl ring-4 ring-card bg-card mb-4">
            <ImageUpload
              value={profile.avatar || undefined}
              onChange={(url) => setProfile(p => ({ ...p, avatar: url || null }))}
              bucket="avatars"
              userId={session?.user?.id || ''}
              aspectRatio="square"
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl"
              compact
            />
            {!profile.avatar && session?.user?.id && (
              <div className="absolute inset-0 pointer-events-none">
                <ProfileAvatar
                  userId={session.user.id}
                  imageUrl={null}
                  name={profile.name}
                  email={session.user.email}
                  size="md"
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl"
                />
              </div>
            )}
          </div>
          {/* Plan Badge */}
          {currentPlan && currentPlan !== 'FREE' && PLAN_BADGE_STYLES[currentPlan] && (
            <div className="mb-4">
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                PLAN_BADGE_STYLES[currentPlan]
              )}>
                {currentPlan}
              </span>
            </div>
          )}
        </div>
        <Card className="rounded-t-xl w-full">
          <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6 mt-8">
            {/* Form Fields */}
            <div className="space-y-4">
              {/* Name & Title Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wide mb-1.5 block text-muted-foreground">Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your name"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wide mb-1.5 block text-muted-foreground">Title</Label>
                  <Input
                    value={profile.title}
                    onChange={(e) => setProfile(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Screenwriter"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <Label className="text-xs font-medium uppercase tracking-wide mb-1.5 block text-muted-foreground">Username</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium select-none">
                    @
                  </span>
                  <Input
                    value={profile.username}
                    onChange={(e) => onUsernameChange(e.target.value.toLowerCase())}
                    placeholder="username"
                    className={cn(
                      "h-9 pl-7 pr-9",
                      usernameStatus === 'available' && "border-green-500/60 focus:border-green-500/60",
                      (usernameStatus === 'taken' || usernameStatus === 'invalid') && "border-red-500/60 focus:border-red-500/60"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {usernameStatus === 'available' && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {usernameError && (
                  <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                )}
                {profile.username && usernameStatus === 'available' && (
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    @{profile.username} is available
                  </p>
                )}
              </div>

              {/* Bio */}
              <div>
                <Label className="text-xs font-medium uppercase tracking-wide mb-1.5 block text-muted-foreground">Bio</Label>
                <Textarea
                  value={profile.bio}
                  onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                {/* Public/Private Pill Toggle */}
                <div
                  className="flex items-center bg-muted rounded-lg p-1 border border-border/60"
                  role="radiogroup"
                  aria-label="Profile visibility"
                >
                  <button
                    onClick={() => setProfile(p => ({ ...p, isPublic: true }))}
                    role="radio"
                    aria-checked={profile.isPublic}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      profile.isPublic
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Public
                  </button>
                  <button
                    onClick={() => setProfile(p => ({ ...p, isPublic: false }))}
                    role="radio"
                    aria-checked={!profile.isPublic}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      !profile.isPublic
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Private
                  </button>
                </div>
                <div className="flex items-center gap-2 sm:w-auto w-full">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-none"
                  >
                    <Link href={profile.username ? `/u/${profile.username}` : `/profile/${session?.user?.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                  </Button>
                  <Button
                    onClick={onSaveProfile}
                    disabled={isSavingProfile}
                    size="sm"
                    className="flex-1 sm:flex-none"
                  >
                    {isSavingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Profile
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Card>
  );
}
