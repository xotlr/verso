'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import useSWR from 'swr';
import { Download, Upload, RotateCcw, Palette, Type, Keyboard, LogOut, Accessibility, CreditCard, User, Users, Clapperboard } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { downloadFile, createFileInput, readFileAsText } from '@/lib/dom-utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { ProfileSection, UserProfile } from './ProfileSection';
import { AppearanceSection } from './AppearanceSection';
import { EditorSection } from './EditorSection';
import { KeyboardSection } from './KeyboardSection';
import { AccessibilitySection } from './AccessibilitySection';
import { BillingSection } from './BillingSection';
import { TeamsSection } from './TeamsSection';
import { ShotlistSection } from './ShotlistSection';

interface SettingsContentProps {
  defaultTab?: string;
  onDone?: () => void;
  showDoneButton?: boolean;
}

const NAV_ITEMS = [
  { value: 'profile', icon: User, label: 'Profile' },
  { value: 'appearance', icon: Palette, label: 'Appearance' },
  { value: 'editor', icon: Type, label: 'Editor' },
  { value: 'shotlist', icon: Clapperboard, label: 'Shotlist' },
  { value: 'accessibility', icon: Accessibility, label: 'Accessibility' },
  { value: 'shortcuts', icon: Keyboard, label: 'Shortcuts' },
  { value: 'billing', icon: CreditCard, label: 'Billing' },
  { value: 'teams', icon: Users, label: 'Teams' },
] as const;

export function SettingsContent({ defaultTab = 'profile', onDone, showDoneButton = false }: SettingsContentProps) {
  // Ensure we don't use 'account' as default since it no longer exists
  const initialTab = defaultTab === 'account' ? 'profile' : defaultTab;
  const { data: session, update: updateSession } = useSession();
  const {
    settings,
    updateVisualSettings,
    updateEditorSettings,
    updateInterfaceSettings,
    updateShotlistSettings,
    setThemePreset,
    resetSettings,
    exportSettings,
    importSettings,
  } = useSettings();

  const [activeTab, setActiveTab] = useState(initialTab);

  // SWR fetcher
  const fetcher = (url: string) => fetch(url).then(res => res.ok ? res.json() : null);

  // Fetch profile with SWR for instant cached renders
  const { data: profileData, isLoading: swrLoading, mutate: mutateProfile } = useSWR(
    session?.user?.id ? `/api/users/${session.user.id}/settings-profile` : null,
    fetcher,
    {
      revalidateOnFocus: false, // Don't revalidate while user is editing
      dedupingInterval: 30000,
    }
  );

  // Local profile state for form editing
  const [profile, setProfile] = useState<UserProfile>({
    name: session?.user?.name || '',
    username: '',
    title: '',
    bio: '',
    avatar: session?.user?.image || null,
    banner: null,
    isPublic: true,
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Sync SWR data to local state when it loads
  useEffect(() => {
    if (profileData) {
      setProfile({
        name: profileData.name || '',
        username: profileData.username || '',
        title: profileData.title || '',
        bio: profileData.bio || '',
        avatar: profileData.image || null,
        banner: profileData.banner || null,
        isPublic: profileData.isPublic ?? true,
      });
      if (profileData.username) {
        setUsernameStatus('available');
      }
    }
  }, [profileData]);

  // Username check state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const usernameTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get current user plan
  const currentPlan = ((session?.user as { plan?: string })?.plan || 'FREE').toUpperCase();

  // Loading state: SWR loading and no cached data
  const isLoadingProfile = swrLoading && !profileData;

  const checkUsername = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }

    setUsernameStatus('checking');
    setUsernameError(null);

    try {
      const response = await fetch('/api/users/username/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();

      if (data.available) {
        setUsernameStatus('available');
        setUsernameError(null);
      } else {
        setUsernameStatus(data.error?.includes('taken') ? 'taken' : 'invalid');
        setUsernameError(data.error || 'Username not available');
      }
    } catch {
      setUsernameStatus('idle');
      setUsernameError('Failed to check username');
    }
  };

  const handleUsernameChange = (value: string) => {
    setProfile(p => ({ ...p, username: value }));

    // Clear any pending check
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current);
    }

    // Debounce the check
    usernameTimeoutRef.current = setTimeout(() => {
      checkUsername(value);
    }, 500);
  };

  const handleSaveProfile = async () => {
    if (!session?.user?.id) return;
    setIsSavingProfile(true);
    try {
      const response = await fetch(`/api/users/${session.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          username: profile.username || null,
          title: profile.title,
          bio: profile.bio,
          image: profile.avatar,
          banner: profile.banner,
          isPublic: profile.isPublic,
        }),
      });
      if (response.ok) {
        toast.success('Profile saved');
        // Update SWR cache with new profile data
        await mutateProfile();
        // Refresh the session to update cached user data (avatar, name, username, etc.)
        // Pass the updated data to ensure the JWT callback receives it
        await updateSession({
          user: {
            ...session?.user,
            image: profile.avatar,
            name: profile.name,
            username: profile.username || null,
          }
        });
      } else {
        throw new Error('Failed to save');
      }
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleExport = () => {
    const json = exportSettings();
    downloadFile(json, 'verso-settings.json', 'application/json');
  };

  const handleImport = () => {
    createFileInput('.json', async (file) => {
      const json = await readFileAsText(file);
      if (importSettings(json)) {
        toast.success('Settings imported successfully!');
      } else {
        toast.error('Failed to import settings. Please check the file format.');
      }
    });
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Mobile: Vertical list navigation */}
        <div className="md:hidden space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.value}
              onClick={() => setActiveTab(item.value)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === item.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Desktop: Left sidebar navigation - sticky */}
        <aside className="hidden md:flex flex-col w-48 shrink-0 sticky top-0 self-start">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === item.value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Actions - in sidebar */}
          <div className="mt-6 pt-4 border-t space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={handleImport}
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={resetSettings}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          {/* Sign Out - red */}
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </aside>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          {/* Profile Settings */}
          <TabsContent value="profile" className="m-0">
            <ProfileSection
              profile={profile}
              setProfile={setProfile}
              session={session}
              isLoadingProfile={isLoadingProfile}
              isSavingProfile={isSavingProfile}
              usernameStatus={usernameStatus}
              usernameError={usernameError}
              onUsernameChange={handleUsernameChange}
              onSaveProfile={handleSaveProfile}
              currentPlan={currentPlan}
            />
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="m-0">
            <AppearanceSection
              settings={settings.visual}
              updateVisualSettings={updateVisualSettings}
              setThemePreset={setThemePreset}
            />
          </TabsContent>

          {/* Editor Settings */}
          <TabsContent value="editor" className="m-0">
            <EditorSection
              settings={settings.editor}
              updateEditorSettings={updateEditorSettings}
            />
          </TabsContent>

          {/* Shotlist Settings */}
          <TabsContent value="shotlist" className="m-0">
            <ShotlistSection
              settings={settings.shotlist}
              updateShotlistSettings={updateShotlistSettings}
            />
          </TabsContent>

          {/* Accessibility Settings */}
          <TabsContent value="accessibility" className="m-0">
            <AccessibilitySection
              interfaceSettings={settings.interface}
              editorSettings={settings.editor}
              updateInterfaceSettings={updateInterfaceSettings}
              updateEditorSettings={updateEditorSettings}
            />
          </TabsContent>

          {/* Shortcuts Settings */}
          <TabsContent value="shortcuts" className="m-0">
            <KeyboardSection />
          </TabsContent>

          {/* Billing Settings */}
          <TabsContent value="billing" className="m-0">
            <BillingSection currentPlan={currentPlan} />
          </TabsContent>

          {/* Teams Settings */}
          <TabsContent value="teams" className="m-0">
            <TeamsSection />
          </TabsContent>
        </div>
      </div>

      {/* Footer - Done button and mobile actions */}
      <div className="mt-6 pt-6 flex flex-wrap items-center justify-between gap-3 md:justify-end">
        {/* Mobile: Show export/import/reset */}
        <div className="flex items-center gap-2 md:hidden">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={resetSettings} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
        {showDoneButton && onDone && (
          <Button onClick={onDone} className="gap-2">
            Done
          </Button>
        )}
      </div>

      {/* Sign Out - Mobile only (desktop has it in sidebar) */}
      <div className="mt-6 pt-6 md:hidden">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </Tabs>
  );
}

// Re-export types and components for external use
export { type UserProfile } from './ProfileSection';
export { ProfileSection } from './ProfileSection';
export { AppearanceSection } from './AppearanceSection';
export { EditorSection } from './EditorSection';
export { AccessibilitySection } from './AccessibilitySection';
export { KeyboardSection } from './KeyboardSection';
export { BillingSection } from './BillingSection';
export { TeamsSection } from './TeamsSection';
export { ShotlistSection } from './ShotlistSection';
