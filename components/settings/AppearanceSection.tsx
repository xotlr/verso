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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ThemePreset, UIFont, ScreenplayFont, themeMetadata } from '@/types/settings';
import type { VisualSettings } from '@/types/settings';

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
  return (
    <div className="space-y-6">
      {/* Theme Preset Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Theme Preset</CardTitle>
          <CardDescription>Choose a visual theme for your workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Essential Themes */}
          <ThemeGroup
            label="Essential"
            presets={['verso', 'paper']}
            currentPreset={settings.themePreset}
            onSelect={setThemePreset}
          />

          {/* Vintage Themes */}
          <ThemeGroup
            label="Vintage"
            presets={['matcha', 'neovictorian']}
            currentPreset={settings.themePreset}
            onSelect={setThemePreset}
          />

          {/* Genre Themes */}
          <ThemeGroup
            label="Genre"
            presets={['romance', 'horror']}
            currentPreset={settings.themePreset}
            onSelect={setThemePreset}
          />

          {/* Premium Themes */}
          <ThemeGroup
            label="Premium"
            presets={['mission-control', 'cyberpunk', 'typewriter', 'screenplay-classic', 'sepia', 'midnight', 'studio', 'belle-epoque', 'faerun']}
            currentPreset={settings.themePreset}
            onSelect={setThemePreset}
          />
        </CardContent>
      </Card>

      {/* Typography Card */}
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
    </div>
  );
}

interface ThemeGroupProps {
  label: string;
  presets: ThemePreset[];
  currentPreset: ThemePreset;
  onSelect: (preset: ThemePreset) => void;
}

function ThemeGroup({ label, presets, currentPreset, onSelect }: ThemeGroupProps) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onSelect(preset)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              currentPreset === preset
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
          <Checkbox
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
          <Checkbox
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
