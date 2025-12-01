'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Download, Upload, RotateCcw, Palette, Type, Layout, FileDown, Keyboard, CreditCard, Loader2, ChevronRight, Globe, Lock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/image-upload';
import { ThemePreset, UIFont, ScreenplayFont, SidebarPosition, ToolbarPosition, themeMetadata } from '@/types/settings';
import { downloadFile, createFileInput, readFileAsText } from '@/lib/dom-utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SettingsContentProps {
  defaultTab?: string;
  onDone?: () => void;
  showDoneButton?: boolean;
}

interface UserProfile {
  name: string;
  title: string;
  bio: string;
  avatar: string | null;
  banner: string | null;
  isPublic: boolean;
}

export function SettingsContent({ defaultTab = 'appearance', onDone, showDoneButton = false }: SettingsContentProps) {
  // Ensure we don't use 'account' as default since it no longer exists
  const initialTab = defaultTab === 'account' ? 'appearance' : defaultTab;
  const { data: session, update: updateSession } = useSession();
  const {
    settings,
    updateVisualSettings,
    updateEditorSettings,
    updateLayoutSettings,
    updateExportSettings,
    setThemePreset,
    resetSettings,
    exportSettings,
    importSettings,
  } = useSettings();

  const [activeTab, setActiveTab] = useState(initialTab);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    name: session?.user?.name || '',
    title: '',
    bio: '',
    avatar: session?.user?.image || null,
    banner: null,
    isPublic: true,
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);

  // Fetch profile data on mount
  React.useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
    }
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
          title: data.title || '',
          bio: data.bio || '',
          avatar: data.image || null,
          banner: data.banner || null,
          isPublic: data.isPublic ?? true,
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
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
          title: profile.title,
          bio: profile.bio,
          image: profile.avatar,
          banner: profile.banner,
          isPublic: profile.isPublic,
        }),
      });
      if (response.ok) {
        toast.success('Profile saved');
        // Refresh the session to update cached user data (avatar, name, etc.)
        // Pass the updated data to ensure the JWT callback receives it
        await updateSession({
          user: {
            ...session?.user,
            image: profile.avatar,
            name: profile.name,
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

  const handleManageBilling = async () => {
    setIsLoadingBilling(true);
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'No billing account found') {
          toast.error('No subscription found. Subscribe to access billing.');
        } else {
          toast.error('Failed to open billing portal');
        }
        return;
      }

      window.location.href = data.url;
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setIsLoadingBilling(false);
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

  const navItems = [
    { value: 'appearance', icon: Palette, label: 'Appearance' },
    { value: 'editor', icon: Type, label: 'Editor' },
    { value: 'layout', icon: Layout, label: 'Layout' },
    { value: 'export', icon: FileDown, label: 'Export' },
    { value: 'shortcuts', icon: Keyboard, label: 'Shortcuts' },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Profile Section - Layered Banner Design */}
      <Card className="shrink-0 overflow-hidden">
        {isLoadingProfile ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
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
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        size="sm"
                        className="sm:w-auto w-full"
                      >
                        {isSavingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Profile
                      </Button>
                    </div>
                  </div>
                </CardContent>
                </Card>
            </div>
          </>
        )}
      </Card>

      {/* Settings Navigation & Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 mt-4">
        {/* Mobile: Discord-style vertical list navigation */}
        <div className="md:hidden space-y-1 mb-4">
          {navItems.map((item) => (
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
            {navItems.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="gap-2 rounded-md text-xs sm:text-sm">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-5">
          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6 m-0">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Theme Preset</CardTitle>
                <CardDescription>Choose a visual theme for your workspace</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Classic Themes */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">Classic</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(['minimal', 'warm', 'midnight', 'paper'] as ThemePreset[]).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setThemePreset(preset)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          settings.visual.themePreset === preset
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="text-sm font-medium">{themeMetadata[preset].name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{themeMetadata[preset].subtitle}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Genre Themes */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">Genre</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {(['noir', 'romance', 'fantasy', 'sci-fi', 'horror'] as ThemePreset[]).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setThemePreset(preset)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          settings.visual.themePreset === preset
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="text-sm font-medium">{themeMetadata[preset].name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{themeMetadata[preset].subtitle}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Typography</CardTitle>
                <CardDescription>Customize fonts and text sizing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">UI Font</label>
                    <Select
                      value={settings.visual.uiFont}
                      onValueChange={(value) => updateVisualSettings({ uiFont: value as UIFont })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inter">Inter</SelectItem>
                        <SelectItem value="sf-pro">SF Pro Display</SelectItem>
                        <SelectItem value="geist">Geist</SelectItem>
                        <SelectItem value="ibm-plex">IBM Plex Sans</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Screenplay Font</label>
                    <Select
                      value={settings.visual.screenplayFont}
                      onValueChange={(value) => updateVisualSettings({ screenplayFont: value as ScreenplayFont })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="courier-prime">Courier Prime</SelectItem>
                        <SelectItem value="courier-new">Courier New</SelectItem>
                        <SelectItem value="courier-final-draft">Courier Final Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">UI Font Size</label>
                    <span className="text-sm text-muted-foreground tabular-nums">{settings.visual.fontSize}pt</span>
                  </div>
                  <Slider
                    value={[settings.visual.fontSize]}
                    onValueChange={([value]) => updateVisualSettings({ fontSize: value })}
                    min={12}
                    max={18}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Border radius and animation settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Border Radius</label>
                    <span className="text-sm text-muted-foreground tabular-nums">{settings.visual.borderRadius}px</span>
                  </div>
                  <Slider
                    value={[settings.visual.borderRadius]}
                    onValueChange={([value]) => updateVisualSettings({ borderRadius: value })}
                    min={0}
                    max={16}
                    step={1}
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Animation Speed</label>
                    <span className="text-sm text-muted-foreground tabular-nums">{settings.visual.animationSpeed}s</span>
                  </div>
                  <Slider
                    value={[settings.visual.animationSpeed]}
                    onValueChange={([value]) => updateVisualSettings({ animationSpeed: value })}
                    min={0.1}
                    max={0.5}
                    step={0.05}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Cursor Effect</CardTitle>
                <CardDescription>Customize cursor appearance and behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cursor Mode */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Cursor Style</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { value: 'native', label: 'Native', desc: 'Browser default' },
                      { value: 'line', label: 'Line |', desc: 'Thin vertical' },
                      { value: 'block', label: 'Block \u258c', desc: 'Solid block' },
                      { value: 'underscore', label: 'Under _', desc: 'Underscore' },
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => updateVisualSettings({
                          cursor: { ...settings.visual.cursor, mode: mode.value as 'native' | 'line' | 'block' | 'underscore' }
                        })}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          settings.visual.cursor.mode === mode.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="font-medium text-sm">{mode.label}</span>
                        <span className="block text-xs text-muted-foreground">{mode.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Blink Style */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Blink Animation</label>
                  <Select
                    value={settings.visual.cursor.blinkStyle}
                    onValueChange={(value) => updateVisualSettings({
                      cursor: { ...settings.visual.cursor, blinkStyle: value as 'none' | 'blink' | 'smooth' | 'expand' }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blink style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Solid)</SelectItem>
                      <SelectItem value="blink">Standard Blink</SelectItem>
                      <SelectItem value="smooth">Smooth Fade</SelectItem>
                      <SelectItem value="expand">Expand Pulse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Blink Speed */}
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Blink Speed: {settings.visual.cursor.blinkSpeed}ms
                  </label>
                  <Slider
                    value={[settings.visual.cursor.blinkSpeed]}
                    onValueChange={([value]) => updateVisualSettings({
                      cursor: { ...settings.visual.cursor, blinkSpeed: value }
                    })}
                    min={400}
                    max={1000}
                    step={50}
                  />
                </div>

                {/* Glow Effect */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Glow Effect</label>
                    <p className="text-xs text-muted-foreground">Add subtle glow around cursor</p>
                  </div>
                  <Checkbox
                    checked={settings.visual.cursor.glowEnabled}
                    onCheckedChange={(checked) => updateVisualSettings({
                      cursor: { ...settings.visual.cursor, glowEnabled: checked as boolean }
                    })}
                  />
                </div>

                {/* Glow Intensity - only show when glow is enabled */}
                {settings.visual.cursor.glowEnabled && (
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Glow Intensity: {Math.round(settings.visual.cursor.glowIntensity * 100)}%
                    </label>
                    <Slider
                      value={[settings.visual.cursor.glowIntensity]}
                      onValueChange={([value]) => updateVisualSettings({
                        cursor: { ...settings.visual.cursor, glowIntensity: value }
                      })}
                      min={0.1}
                      max={1}
                      step={0.1}
                    />
                  </div>
                )}

                {/* Cursor Width - only for line cursor */}
                {settings.visual.cursor.mode === 'line' && (
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Cursor Width: {settings.visual.cursor.width}px
                    </label>
                    <Slider
                      value={[settings.visual.cursor.width]}
                      onValueChange={([value]) => updateVisualSettings({
                        cursor: { ...settings.visual.cursor, width: value }
                      })}
                      min={1}
                      max={4}
                      step={1}
                    />
                  </div>
                )}

                {/* Custom Color Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Custom Color</label>
                    <p className="text-xs text-muted-foreground">Use custom cursor color instead of theme</p>
                  </div>
                  <Checkbox
                    checked={settings.visual.cursor.color !== null}
                    onCheckedChange={(checked) => updateVisualSettings({
                      cursor: { ...settings.visual.cursor, color: checked ? '24 60% 50%' : null }
                    })}
                  />
                </div>

                {/* Color Input - only show when custom color is enabled */}
                {settings.visual.cursor.color !== null && (
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Cursor Color (HSL)
                    </label>
                    <Input
                      value={settings.visual.cursor.color}
                      onChange={(e) => updateVisualSettings({
                        cursor: { ...settings.visual.cursor, color: e.target.value }
                      })}
                      placeholder="e.g., 195 70% 52%"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Format: hue saturation% lightness%</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Editor Settings */}
          <TabsContent value="editor" className="space-y-6 m-0">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Auto-Save</CardTitle>
                <CardDescription>Configure automatic saving behavior</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Interval</label>
                    <span className="text-sm text-muted-foreground tabular-nums">{settings.editor.autoSaveInterval === 0 ? 'Off' : `${settings.editor.autoSaveInterval}s`}</span>
                  </div>
                  <Slider
                    value={[settings.editor.autoSaveInterval]}
                    onValueChange={([value]) => updateEditorSettings({ autoSaveInterval: value })}
                    min={0}
                    max={120}
                    step={10}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Formatting</CardTitle>
                <CardDescription>Text formatting options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'smartQuotes', label: 'Smart Quotes' },
                  { key: 'autoCapitalize', label: 'Auto-Capitalize' },
                  { key: 'spellCheck', label: 'Spell Check' },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <label className="text-sm font-medium">{setting.label}</label>
                    <Checkbox
                      checked={settings.editor[setting.key as keyof typeof settings.editor] as boolean}
                      onCheckedChange={(checked) => updateEditorSettings({ [setting.key]: checked as boolean })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Display</CardTitle>
                <CardDescription>Editor display preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'showLineNumbers', label: 'Show Line Numbers' },
                  { key: 'showPageBreaks', label: 'Show Page Breaks' },
                  { key: 'enableSnippets', label: 'Enable Snippets' },
                  { key: 'enableAutocomplete', label: 'Enable Autocomplete' },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between py-0.5">
                    <label className="text-sm font-medium">{setting.label}</label>
                    <Checkbox
                      checked={settings.editor[setting.key as keyof typeof settings.editor] as boolean}
                      onCheckedChange={(checked) => updateEditorSettings({ [setting.key]: checked as boolean })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Autocomplete</CardTitle>
                <CardDescription>AI-powered suggestions while typing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-0.5">
                  <div>
                    <label className="text-sm font-medium">Enable Suggestions</label>
                    <p className="text-xs text-muted-foreground">Show autocomplete suggestions while typing</p>
                  </div>
                  <Checkbox
                    checked={settings.editor.autocomplete.enabled}
                    onCheckedChange={(checked) => updateEditorSettings({
                      autocomplete: { ...settings.editor.autocomplete, enabled: checked as boolean }
                    })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Suggestion Delay</label>
                    <Select
                      value={settings.editor.autocomplete.delayMs.toString()}
                      onValueChange={(value) => updateEditorSettings({
                        autocomplete: { ...settings.editor.autocomplete, delayMs: parseInt(value) }
                      })}
                      disabled={!settings.editor.autocomplete.enabled}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select delay" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Immediate</SelectItem>
                        <SelectItem value="1000">1 second</SelectItem>
                        <SelectItem value="3000">3 seconds</SelectItem>
                        <SelectItem value="5000">5 seconds</SelectItem>
                        <SelectItem value="10000">10 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Tab Behavior</label>
                    <Select
                      value={settings.editor.tabBehavior}
                      onValueChange={(value) => updateEditorSettings({ tabBehavior: value as 'indent' | 'next-field' | 'autocomplete' })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select behavior" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indent">Indent</SelectItem>
                        <SelectItem value="next-field">Next Field</SelectItem>
                        <SelectItem value="autocomplete">Autocomplete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Reading Comfort</CardTitle>
                <CardDescription>Optimize text display for readability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Text Contrast */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Text Contrast</label>
                    <span className="text-sm text-muted-foreground tabular-nums">{settings.editor.textContrast}%</span>
                  </div>
                  <Slider
                    value={[settings.editor.textContrast]}
                    onValueChange={([value]) => updateEditorSettings({ textContrast: value })}
                    min={15}
                    max={35}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower = darker text (higher contrast). Higher = lighter text (easier on eyes).
                  </p>
                </div>

                {/* Line Height Density */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Line Height</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'compact', label: 'Compact', desc: '1.1' },
                      { value: 'normal', label: 'Normal', desc: '1.15' },
                      { value: 'relaxed', label: 'Relaxed', desc: '1.2' },
                    ].map((density) => (
                      <button
                        key={density.value}
                        onClick={() => updateEditorSettings({
                          lineHeightDensity: density.value as 'compact' | 'normal' | 'relaxed'
                        })}
                        className={`p-2.5 rounded-lg border-2 transition-all text-left ${
                          settings.editor.lineHeightDensity === density.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="font-medium text-sm">{density.label}</span>
                        <span className="block text-xs text-muted-foreground">{density.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Layout Settings */}
          <TabsContent value="layout" className="space-y-6 m-0">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Sidebar</CardTitle>
                <CardDescription>Sidebar position and visibility</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {(['left', 'right', 'hidden'] as SidebarPosition[]).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => updateLayoutSettings({ sidebarPosition: pos })}
                      className={`p-2.5 rounded-lg border-2 transition-all capitalize text-sm font-medium ${
                        settings.layout.sidebarPosition === pos
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Toolbar</CardTitle>
                <CardDescription>Toolbar position and behavior</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['top', 'bottom', 'floating', 'hidden'] as ToolbarPosition[]).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => updateLayoutSettings({ toolbarPosition: pos })}
                      className={`p-2.5 rounded-lg border-2 transition-all capitalize text-sm font-medium ${
                        settings.layout.toolbarPosition === pos
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">View Options</CardTitle>
                <CardDescription>Toggle display elements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'distractionFreeMode', label: 'Distraction Free Mode' },
                  { key: 'compactMode', label: 'Compact Mode' },
                  { key: 'showStats', label: 'Show Statistics' },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between py-0.5">
                    <label className="text-sm font-medium">{setting.label}</label>
                    <Checkbox
                      checked={settings.layout[setting.key as keyof typeof settings.layout] as boolean}
                      onCheckedChange={(checked) => updateLayoutSettings({ [setting.key]: checked as boolean })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Settings */}
          <TabsContent value="export" className="space-y-6 m-0">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Default Format</CardTitle>
                <CardDescription>Choose your preferred export format</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {['pdf', 'fdx', 'fountain', 'txt', 'html'].map((format) => (
                    <button
                      key={format}
                      onClick={() => updateExportSettings({ defaultFormat: format as 'pdf' | 'fdx' | 'fountain' | 'txt' | 'html' })}
                      className={`p-2 rounded-lg border-2 transition-all uppercase text-xs font-medium ${
                        settings.export.defaultFormat === format
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Page Setup</CardTitle>
                <CardDescription>Paper size for exports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {['letter', 'a4', 'legal'].map((size) => (
                    <button
                      key={size}
                      onClick={() => updateExportSettings({ paperSize: size as 'letter' | 'a4' | 'legal' })}
                      className={`p-2.5 rounded-lg border-2 transition-all uppercase text-sm font-medium ${
                        settings.export.paperSize === size
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Options</CardTitle>
                <CardDescription>Additional export settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'showSceneNumbers', label: 'Show Scene Numbers' },
                  { key: 'revisionColors', label: 'Revision Colors' },
                  { key: 'includeWatermark', label: 'Include Watermark' },
                  { key: 'includeHeader', label: 'Include Header' },
                  { key: 'includeFooter', label: 'Include Footer' },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between py-0.5">
                    <label className="text-sm font-medium">{setting.label}</label>
                    <Checkbox
                      checked={settings.export[setting.key as keyof typeof settings.export] as boolean}
                      onCheckedChange={(checked) => updateExportSettings({ [setting.key]: checked as boolean })}
                    />
                  </div>
                ))}

                {settings.export.includeWatermark && (
                  <div className="pt-2">
                    <label className="text-sm font-medium mb-1.5 block">Watermark Text</label>
                    <Input
                      value={settings.export.watermarkText}
                      onChange={(e) => updateExportSettings({ watermarkText: e.target.value })}
                      placeholder="DRAFT"
                      className="h-9"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shortcuts */}
          <TabsContent value="shortcuts" className="space-y-6 m-0">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Keyboard Shortcuts</CardTitle>
                <CardDescription>Use &quot;Mod&quot; for Cmd (Mac) / Ctrl (Windows)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1">
                  {Object.entries(settings.shortcuts).map(([action, shortcut]) => (
                    <div key={action} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <span className="text-sm font-medium capitalize">
                        {action.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {shortcut.replace('Mod', '⌘/Ctrl')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          </div>
        </ScrollArea>
      </Tabs>

      {/* Billing Section */}
      <Card className="mt-8 shrink-0">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Subscription</CardTitle>
          <CardDescription>Manage your billing and plan</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <button
            onClick={handleManageBilling}
            disabled={isLoadingBilling}
            className="w-full flex items-center justify-between p-3 -mx-3 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Current Plan</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {(session?.user as { plan?: string })?.plan?.toUpperCase() || 'FREE'}
              </Badge>
              {isLoadingBilling ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CardContent>
      </Card>

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
    </div>
  );
}
