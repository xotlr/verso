'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Download, Upload, RotateCcw, Palette, Type, Layout, FileDown, Keyboard, User, CreditCard, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUpload } from '@/components/image-upload';
import { ThemePreset, UIFont, ScreenplayFont, SidebarPosition, ToolbarPosition, themeMetadata } from '@/types/settings';
import { downloadFile, createFileInput, readFileAsText } from '@/lib/dom-utils';
import { toast } from 'sonner';

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
  const { data: session } = useSession();
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

  const [activeTab, setActiveTab] = useState(defaultTab);

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
    if (session?.user?.id && activeTab === 'account') {
      fetchProfile();
    }
  }, [session?.user?.id, activeTab]);

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
      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to open billing portal');
      }
    } catch {
      toast.error('Failed to open billing portal');
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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-6 pt-4 shrink-0">
          <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-1 gap-1">
            <TabsTrigger value="appearance" className="gap-2 rounded-md text-xs sm:text-sm">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="editor" className="gap-2 rounded-md text-xs sm:text-sm">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Editor</span>
            </TabsTrigger>
            <TabsTrigger value="layout" className="gap-2 rounded-md text-xs sm:text-sm">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">Layout</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2 rounded-md text-xs sm:text-sm">
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </TabsTrigger>
            <TabsTrigger value="shortcuts" className="gap-2 rounded-md text-xs sm:text-sm">
              <Keyboard className="h-4 w-4" />
              <span className="hidden sm:inline">Keys</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2 rounded-md text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5">
          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-5 m-0">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Theme Preset</h3>

              {/* Classic Themes */}
              <div className="mb-3">
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
              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">Genre</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['noir', 'romance', 'western', 'sci-fi'] as ThemePreset[]).map((preset) => (
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

              {/* Custom Theme */}
              <div>
                <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">Custom</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => setThemePreset('custom')}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      settings.visual.themePreset === 'custom'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-sm font-medium">{themeMetadata.custom.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{themeMetadata.custom.subtitle}</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Typography</h3>
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
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Appearance</h3>
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

              <div className="flex items-center justify-between py-1">
                <label className="text-sm font-medium">Frosted Glass Effect</label>
                <Checkbox
                  checked={settings.visual.useGlassEffect}
                  onCheckedChange={(checked) => updateVisualSettings({ useGlassEffect: checked as boolean })}
                />
              </div>
            </div>

            {/* Cursor Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Cursor Effect</h3>

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
            </div>

            {/* Theme Temperature */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Color Temperature</h3>
              <p className="text-xs text-muted-foreground -mt-2 mb-2">
                Apply a subtle warm or cool filter to your theme
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'neutral', label: 'Neutral', desc: 'Original colors' },
                  { value: 'warm', label: 'Warm', desc: 'Amber tint' },
                  { value: 'cool', label: 'Cool', desc: 'Blue tint' },
                ].map((temp) => (
                  <button
                    key={temp.value}
                    onClick={() => updateVisualSettings({
                      themeTemperature: temp.value as 'neutral' | 'warm' | 'cool'
                    })}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      settings.visual.themeTemperature === temp.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="font-medium text-sm">{temp.label}</span>
                    <span className="block text-xs text-muted-foreground">{temp.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Editor Settings */}
          <TabsContent value="editor" className="space-y-5 m-0">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Auto-Save</h3>
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
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Formatting</h3>
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
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Display</h3>
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
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Autocomplete</h3>
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
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Reading Comfort</h3>

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
            </div>
          </TabsContent>

          {/* Layout Settings */}
          <TabsContent value="layout" className="space-y-5 m-0">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Sidebar</h3>
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
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Toolbar</h3>
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
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">View Options</h3>
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
            </div>
          </TabsContent>

          {/* Export Settings */}
          <TabsContent value="export" className="space-y-5 m-0">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Default Format</h3>
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
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Page Setup</h3>
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
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Options</h3>
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
            </div>

            {settings.export.includeWatermark && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Watermark Text</label>
                <Input
                  value={settings.export.watermarkText}
                  onChange={(e) => updateExportSettings({ watermarkText: e.target.value })}
                  placeholder="DRAFT"
                  className="h-9"
                />
              </div>
            )}
          </TabsContent>

          {/* Shortcuts */}
          <TabsContent value="shortcuts" className="space-y-3 m-0">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Keyboard Shortcuts</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Use &quot;Mod&quot; for Cmd (Mac) / Ctrl (Windows).
              </p>
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
            </div>
          </TabsContent>

          {/* Account */}
          <TabsContent value="account" className="space-y-5 m-0">
            {isLoadingProfile ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Profile Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Profile</h3>

                  {/* Banner */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Banner</Label>
                    <ImageUpload
                      value={profile.banner || undefined}
                      onChange={(url) => setProfile(p => ({ ...p, banner: url || null }))}
                      bucket="banners"
                      userId={session?.user?.id || ''}
                      aspectRatio="banner"
                      className="h-24 rounded-lg"
                    />
                  </div>

                  {/* Avatar & Name Row */}
                  <div className="flex gap-4 items-start">
                    <div className="shrink-0">
                      <Label className="text-sm font-medium mb-2 block">Avatar</Label>
                      <ImageUpload
                        value={profile.avatar || undefined}
                        onChange={(url) => setProfile(p => ({ ...p, avatar: url || null }))}
                        bucket="avatars"
                        userId={session?.user?.id || ''}
                        aspectRatio="square"
                        className="h-20 w-20 rounded-full"
                      />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-sm font-medium mb-1.5 block">Display Name</Label>
                        <Input
                          value={profile.name}
                          onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                          placeholder="Your name"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-1.5 block">Title</Label>
                        <Input
                          value={profile.title}
                          onChange={(e) => setProfile(p => ({ ...p, title: e.target.value }))}
                          placeholder="e.g., Screenwriter, Director"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Bio</Label>
                    <Textarea
                      value={profile.bio}
                      onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  {/* Public Profile Toggle */}
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <label className="text-sm font-medium">Public Profile</label>
                      <p className="text-xs text-muted-foreground">Allow others to see your profile</p>
                    </div>
                    <Checkbox
                      checked={profile.isPublic}
                      onCheckedChange={(checked) => setProfile(p => ({ ...p, isPublic: checked as boolean }))}
                    />
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {isSavingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Profile
                  </Button>
                </div>

                <Separator />

                {/* Billing Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Subscription & Billing</h3>

                  <div className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium">Current Plan</p>
                        <p className="text-xs text-muted-foreground">Manage your subscription</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {(session?.user as { plan?: string })?.plan?.toUpperCase() || 'FREE'}
                      </Badge>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManageBilling}
                      disabled={isLoadingBilling}
                      className="w-full gap-2"
                    >
                      {isLoadingBilling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Manage Billing
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>

      {/* Footer */}
      <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3">
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
