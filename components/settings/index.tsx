'use client';

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Download, Upload, RotateCcw, Palette, Type, Layout, Keyboard, LogOut } from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { downloadFile, createFileInput, readFileAsText } from '@/lib/dom-utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { ProfileSection, UserProfile } from './ProfileSection';
import { AppearanceSection } from './AppearanceSection';
import { EditorSection } from './EditorSection';
import { LayoutSection } from './LayoutSection';
import { KeyboardSection } from './KeyboardSection';
import { BillingSection } from './BillingSection';

interface SettingsContentProps {
  defaultTab?: string;
  onDone?: () => void;
  showDoneButton?: boolean;
}

const NAV_ITEMS = [
  { value: 'appearance', icon: Palette, label: 'Appearance' },
  { value: 'editor', icon: Type, label: 'Editor' },
  { value: 'layout', icon: Layout, label: 'Layout' },
  { value: 'shortcuts', icon: Keyboard, label: 'Shortcuts' },
] as const;

export function SettingsContent({ defaultTab = 'appearance', onDone, showDoneButton = false }: SettingsContentProps) {
  // Ensure we don't use 'account' as default since it no longer exists
  const initialTab = defaultTab === 'account' ? 'appearance' : defaultTab;
  const { data: session, update: updateSession } = useSession();
  const {
    settings,
    updateVisualSettings,
    updateEditorSettings,
    updateLayoutSettings,
    setThemePreset,
    resetSettings,
    exportSettings,
    importSettings,
  } = useSettings();

  const [activeTab, setActiveTab] = useState(initialTab);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    name: session?.user?.name || '',
    username: '',
    title: '',
    bio: '',
    avatar: session?.user?.image || null,
    banner: null,
    isPublic: true,
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Username check state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const usernameTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Get current user plan
  const currentPlan = ((session?.user as { plan?: string })?.plan || 'FREE').toUpperCase();

  // Fetch profile data on mount
  React.useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const fetchProfile = async () => {
    if (!session?.user?.id) return;
    setIsLoadingProfile(true);
    try {
      const response = await fetch(`/api/users/${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.name || '',
          username: data.username || '',
          title: data.title || '',
          bio: data.bio || '',
          avatar: data.image || null,
          banner: data.banner || null,
          isPublic: data.isPublic ?? true,
        });
        // If user has username, mark as available
        if (data.username) {
          setUsernameStatus('available');
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

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
    <div className="space-y-4">
      {/* Profile Section */}
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
      />

      {/* Settings Navigation & Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        {/* Mobile: Discord-style vertical list navigation */}
        <div className="md:hidden space-y-1 mb-4">
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

        {/* Desktop: Horizontal tabs */}
        <div className="hidden md:block pt-4 shrink-0">
          <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-1 gap-1">
            {NAV_ITEMS.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="gap-2 rounded-md text-xs sm:text-sm">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="py-5">
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

          {/* Layout Settings */}
          <TabsContent value="layout" className="m-0">
            <LayoutSection
              settings={settings.layout}
              updateLayoutSettings={updateLayoutSettings}
            />
          </TabsContent>

          {/* Shortcuts Settings */}
          <TabsContent value="shortcuts" className="m-0">
            <KeyboardSection />
          </TabsContent>
        </div>
      </Tabs>

      {/* Billing Section */}
      <div className="mt-8">
        <BillingSection currentPlan={currentPlan} />
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-6 border-t shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetSettings} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          {showDoneButton && onDone && (
            <Button onClick={onDone} className="gap-2">
              Done
            </Button>
          )}
        </div>
      </div>

      {/* Sign Out - Mobile only (desktop has it in sidebar) */}
      <div className="mt-6 pt-6 border-t md:hidden">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}

// Re-export types and components for external use
export { type UserProfile } from './ProfileSection';
export { ProfileSection } from './ProfileSection';
export { AppearanceSection } from './AppearanceSection';
export { EditorSection } from './EditorSection';
export { LayoutSection } from './LayoutSection';
export { KeyboardSection } from './KeyboardSection';
export { BillingSection } from './BillingSection';
