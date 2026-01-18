'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ThemePreset, UIFont, ScreenplayFont, HeaderFont, themeMetadata, themePresets } from '@/types/settings';
import type { VisualSettings, PetalPalette } from '@/types/settings';

const ALL_THEME_PRESETS: ThemePreset[] = [
  'verso', 'paper', 'spirited', 'sterling', 'koe', 'supernatural',
  'apollo', 'zoltraak', 'akira', 'mr-robot',
  'howl', 'the-office', 'maelle', 'limitless', 'pluto'
];

interface AppearanceSectionProps {
  settings: VisualSettings;
  updateVisualSettings: (settings: Partial<VisualSettings>) => void;
  setThemePreset: (preset: ThemePreset) => void;
}

export function AppearanceSection({
  settings,
  updateVisualSettings,
  setThemePreset,
}: AppearanceSectionProps) {
  const [isDark, setIsDark] = React.useState(() => {
    // Initialize with correct value on client
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  React.useEffect(() => {
    // Watch for theme changes
    const checkDark = () => document.documentElement.classList.contains('dark');
    const observer = new MutationObserver(() => {
      setIsDark(checkDark());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6">
      {/* Theme Preset Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {ALL_THEME_PRESETS.map((preset) => (
              <ThemePreview
                key={preset}
                preset={preset}
                selected={settings.themePreset === preset}
                onClick={() => setThemePreset(preset)}
                isDark={isDark}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Typography Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Typography</CardTitle>
          <CardDescription>Customize fonts and text sizing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">UI Font</label>
              <Select
                value={settings.uiFont}
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
                  <SelectItem value="plus-jakarta">Plus Jakarta Sans</SelectItem>
                  <SelectItem value="space-grotesk">Space Grotesk</SelectItem>
                  <SelectItem value="dot-gothic">DotGothic16</SelectItem>
                  <SelectItem value="audiowide">Audiowide</SelectItem>
                  <SelectItem value="oxanium">Oxanium</SelectItem>
                  <SelectItem value="chakra-petch">Chakra Petch</SelectItem>
                  <SelectItem value="sixtyfour">Sixtyfour</SelectItem>
                  <SelectItem value="doto">Doto</SelectItem>
                  <SelectItem value="special-elite">Special Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Header Font</label>
              <Select
                value={settings.headerFont || 'default'}
                onValueChange={(value) => updateVisualSettings({ headerFont: value as HeaderFont })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="badeen-display">Badeen Display</SelectItem>
                  <SelectItem value="bonheur-royale">Bonheur Royale</SelectItem>
                  <SelectItem value="fraunces">Fraunces</SelectItem>
                  <SelectItem value="bodoni-moda">Bodoni Moda</SelectItem>
                  <SelectItem value="plaster">Plaster</SelectItem>
                  <SelectItem value="montserrat">Montserrat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Screenplay Font</label>
              <Select
                value={settings.screenplayFont}
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
              <span className="text-sm text-muted-foreground tabular-nums">{settings.fontSize}pt</span>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([value]) => updateVisualSettings({ fontSize: value })}
              min={12}
              max={18}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Border radius and animation settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Border Radius</label>
              <span className="text-sm text-muted-foreground tabular-nums">{settings.borderRadius}px</span>
            </div>
            <Slider
              value={[settings.borderRadius]}
              onValueChange={([value]) => updateVisualSettings({ borderRadius: value })}
              min={0}
              max={16}
              step={1}
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Animation Speed</label>
              <span className="text-sm text-muted-foreground tabular-nums">{settings.animationSpeed}s</span>
            </div>
            <Slider
              value={[settings.animationSpeed]}
              onValueChange={([value]) => updateVisualSettings({ animationSpeed: value })}
              min={0.1}
              max={0.5}
              step={0.05}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cursor Effect Card */}
      <CursorSettingsCard settings={settings} updateVisualSettings={updateVisualSettings} />

      {/* Petals Ambient Effect Card */}
      <PetalsSettingsCard settings={settings} updateVisualSettings={updateVisualSettings} />
    </div>
  );
}

interface ThemePreviewProps {
  preset: ThemePreset;
  selected: boolean;
  onClick: () => void;
  isDark: boolean;
}

// Map uiFont values to CSS font families
const fontFamilyMap: Record<string, string> = {
  'inter': 'Inter, system-ui, sans-serif',
  'sf-pro': '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  'geist': 'Geist, system-ui, sans-serif',
  'geist-mono': '"Geist Mono", ui-monospace, monospace',
  'ibm-plex': '"IBM Plex Sans", system-ui, sans-serif',
  'plus-jakarta': '"Plus Jakarta Sans", system-ui, sans-serif',
  'space-grotesk': '"Space Grotesk", system-ui, sans-serif',
  'dot-gothic': 'DotGothic16, system-ui, sans-serif',
  'audiowide': 'Audiowide, system-ui, sans-serif',
  'oxanium': 'Oxanium, system-ui, sans-serif',
  'chakra-petch': '"Chakra Petch", system-ui, sans-serif',
  'sixtyfour': 'Sixtyfour, system-ui, sans-serif',
  'doto': 'Doto, system-ui, sans-serif',
  'special-elite': '"Special Elite", system-ui, sans-serif',
  'syne': 'Syne, system-ui, sans-serif',
  'poiret-one': '"Poiret One", system-ui, sans-serif',
};

function ThemePreview({ preset, selected, onClick, isDark }: ThemePreviewProps) {
  const theme = themePresets[preset];
  const colors = isDark ? theme.darkColors : theme.lightColors;

  // Get colors for current mode
  const bg = `hsl(${colors?.background || (isDark ? '0 0% 10%' : '0 0% 95%')})`;
  const page = `hsl(${colors?.page || (isDark ? '0 0% 12%' : '0 0% 100%')})`;
  const fg = `hsl(${colors?.foreground || (isDark ? '0 0% 80%' : '0 0% 20%')})`;
  const primary = `hsl(${colors?.primary || (isDark ? '0 0% 90%' : '0 0% 15%')})`;
  const card = `hsl(${colors?.card || (isDark ? '0 0% 12%' : '0 0% 98%')})`;

  // Get border radius (scale down for preview)
  const radius = theme.borderRadius ?? 8;
  const scaledRadius = Math.max(1, Math.round(radius / 2));

  // Get font family
  const uiFont = theme.uiFont ?? 'inter';
  const fontFamily = fontFamilyMap[uiFont] || 'system-ui, sans-serif';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5"
    >
      <div
        className={cn(
          "w-full aspect-[4/3] border-2 overflow-hidden transition-all flex relative",
          selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
        )}
        style={{ backgroundColor: bg, borderRadius: `${scaledRadius + 2}px` }}
      >
        {/* Sidebar */}
        <div
          className="w-5 h-full"
          style={{
            backgroundColor: card,
            borderTopLeftRadius: `${scaledRadius}px`,
            borderBottomLeftRadius: `${scaledRadius}px`,
          }}
        >
          <div className="w-2 h-1 mt-2 mx-auto" style={{ backgroundColor: fg, opacity: 0.4, borderRadius: `${scaledRadius}px` }} />
          <div className="w-3 h-0.5 mt-1 mx-auto" style={{ backgroundColor: fg, opacity: 0.3, borderRadius: `${scaledRadius}px` }} />
          <div className="w-2 h-0.5 mt-1 mx-auto" style={{ backgroundColor: fg, opacity: 0.3, borderRadius: `${scaledRadius}px` }} />
        </div>
        {/* Main area with page */}
        <div className="flex-1 p-1.5 flex items-center justify-center">
          {/* Page */}
          <div
            className="w-full h-full flex flex-col items-center justify-center p-1"
            style={{ backgroundColor: page, borderRadius: `${scaledRadius}px` }}
          >
            {/* Font preview - use CSS variable to override app font */}
            <span
              className="text-[11px] font-medium leading-none font-preview"
              style={{ color: fg, '--preview-font': fontFamily } as React.CSSProperties}
            >
              Aa
            </span>
            {/* Text lines */}
            <div className="mt-1 w-full flex flex-col items-center gap-0.5">
              <div className="h-[1.5px] w-8" style={{ backgroundColor: fg, opacity: 0.5, borderRadius: `${scaledRadius}px` }} />
              <div className="h-[1.5px] w-6" style={{ backgroundColor: fg, opacity: 0.4, borderRadius: `${scaledRadius}px` }} />
              <div className="h-[1.5px] w-7" style={{ backgroundColor: fg, opacity: 0.3, borderRadius: `${scaledRadius}px` }} />
            </div>
          </div>
        </div>
        {/* Primary accent button */}
        <div
          className="absolute bottom-1 right-1 w-3 h-2"
          style={{ backgroundColor: primary, borderRadius: `${scaledRadius}px` }}
        />
      </div>
      <span
        className={cn(
          "text-xs",
          selected ? "text-foreground font-medium" : "text-muted-foreground"
        )}
        style={{
          fontFamily,
          fontStyle: themeMetadata[preset].style === 'italic' ? 'italic' : undefined,
          textTransform: themeMetadata[preset].style === 'uppercase' ? 'uppercase'
            : themeMetadata[preset].style === 'lowercase' ? 'lowercase'
            : undefined,
        }}
      >
        {themeMetadata[preset].name}
      </span>
    </button>
  );
}

interface CursorSettingsCardProps {
  settings: VisualSettings;
  updateVisualSettings: (settings: Partial<VisualSettings>) => void;
}

function CursorSettingsCard({ settings, updateVisualSettings }: CursorSettingsCardProps) {
  return (
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
                  cursor: { ...settings.cursor, mode: mode.value as 'native' | 'line' | 'block' | 'underscore' }
                })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  settings.cursor.mode === mode.value
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
            value={settings.cursor.blinkStyle}
            onValueChange={(value) => updateVisualSettings({
              cursor: { ...settings.cursor, blinkStyle: value as 'none' | 'blink' | 'smooth' | 'expand' }
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
            Blink Speed: {settings.cursor.blinkSpeed}ms
          </label>
          <Slider
            value={[settings.cursor.blinkSpeed]}
            onValueChange={([value]) => updateVisualSettings({
              cursor: { ...settings.cursor, blinkSpeed: value }
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
          <Switch
            checked={settings.cursor.glowEnabled}
            onCheckedChange={(checked) => updateVisualSettings({
              cursor: { ...settings.cursor, glowEnabled: checked as boolean }
            })}
          />
        </div>

        {/* Glow Intensity - only show when glow is enabled */}
        {settings.cursor.glowEnabled && (
          <div>
            <label className="text-sm font-medium mb-3 block">
              Glow Intensity: {Math.round(settings.cursor.glowIntensity * 100)}%
            </label>
            <Slider
              value={[settings.cursor.glowIntensity]}
              onValueChange={([value]) => updateVisualSettings({
                cursor: { ...settings.cursor, glowIntensity: value }
              })}
              min={0.1}
              max={1}
              step={0.1}
            />
          </div>
        )}

        {/* Cursor Width - only for line cursor */}
        {settings.cursor.mode === 'line' && (
          <div>
            <label className="text-sm font-medium mb-3 block">
              Cursor Width: {settings.cursor.width}px
            </label>
            <Slider
              value={[settings.cursor.width]}
              onValueChange={([value]) => updateVisualSettings({
                cursor: { ...settings.cursor, width: value }
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
          <Switch
            checked={settings.cursor.color !== null}
            onCheckedChange={(checked) => updateVisualSettings({
              cursor: { ...settings.cursor, color: checked ? '24 60% 50%' : null }
            })}
          />
        </div>

        {/* Color Input - only show when custom color is enabled */}
        {settings.cursor.color !== null && (
          <div>
            <label className="text-sm font-medium mb-3 block">
              Cursor Color (HSL)
            </label>
            <Input
              value={settings.cursor.color}
              onChange={(e) => updateVisualSettings({
                cursor: { ...settings.cursor, color: e.target.value }
              })}
              placeholder="e.g., 195 70% 52%"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Format: hue saturation% lightness%</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PetalsSettingsCardProps {
  settings: VisualSettings;
  updateVisualSettings: (settings: Partial<VisualSettings>) => void;
}

const PETAL_PALETTES: { value: PetalPalette; label: string; desc: string }[] = [
  { value: 'primary', label: 'Primary', desc: 'Theme primary color' },
  { value: 'sakura', label: 'Sakura', desc: 'Cherry blossom pink' },
  { value: 'rose', label: 'Rose', desc: 'Deep romantic red' },
  { value: 'gold', label: 'Gold', desc: 'Art Deco gold' },
  { value: 'autumn', label: 'Autumn', desc: 'Warm falling leaves' },
  { value: 'snow', label: 'Snow', desc: 'Winter white' },
  { value: 'blossom', label: 'Blossom', desc: 'Spring flowers' },
  { value: 'blood', label: 'Blood', desc: 'Crimson dramatic' },
];

function PetalsSettingsCard({ settings, updateVisualSettings }: PetalsSettingsCardProps) {
  const petals = settings.petals ?? { enabled: false, palette: 'sakura' as PetalPalette, intensity: 60 };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Petals</CardTitle>
        <CardDescription>Ambient falling petal effect</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Enable Petals</label>
            <p className="text-xs text-muted-foreground">Show tranquil falling petals</p>
          </div>
          <Switch
            checked={petals.enabled}
            onCheckedChange={(checked) => updateVisualSettings({
              petals: { ...petals, enabled: checked as boolean }
            })}
          />
        </div>

        {/* Only show additional settings when enabled */}
        {petals.enabled && (
          <>
            {/* Palette Selection */}
            <div>
              <label className="text-sm font-medium mb-3 block">Palette</label>
              <Select
                value={petals.palette}
                onValueChange={(value) => updateVisualSettings({
                  petals: { ...petals, palette: value as PetalPalette }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select palette" />
                </SelectTrigger>
                <SelectContent>
                  {PETAL_PALETTES.map((palette) => (
                    <SelectItem key={palette.value} value={palette.value}>
                      {palette.label} — {palette.desc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Intensity Slider */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                Intensity: {petals.intensity ?? 60}
              </label>
              <Slider
                value={[petals.intensity ?? 60]}
                onValueChange={([value]) => updateVisualSettings({
                  petals: { ...petals, intensity: value }
                })}
                min={20}
                max={120}
                step={5}
              />
              <p className="text-xs text-muted-foreground mt-1">Number of petals</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
