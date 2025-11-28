'use client';

import React, { useState } from 'react';
import { Download, Upload, RotateCcw, Palette, Type, Layout, FileDown, Keyboard } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useSettings } from '@/contexts/settings-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ThemePreset, UIFont, ScreenplayFont, SidebarPosition, ToolbarPosition, themeMetadata } from '@/types/settings';
import { downloadFile, createFileInput, readFileAsText } from '@/lib/dom-utils';
import { toast } from 'sonner';

interface SettingsContentProps {
  defaultTab?: string;
  onDone?: () => void;
  showDoneButton?: boolean;
}

export function SettingsContent({ defaultTab = 'visual', onDone, showDoneButton = false }: SettingsContentProps) {
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
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-1 gap-1 flex-shrink-0">
          <TabsTrigger value="visual" className="gap-2 rounded-md">
            <Palette className="h-4 w-4" />
            Visual
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-2 rounded-md">
            <Type className="h-4 w-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="layout" className="gap-2 rounded-md">
            <Layout className="h-4 w-4" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2 rounded-md">
            <FileDown className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-2 rounded-md">
            <Keyboard className="h-4 w-4" />
            Shortcuts
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Visual Settings */}
          <TabsContent value="visual" className="py-6 space-y-6 m-0">
            <div>
              <h3 className="text-lg font-semibold mb-4">Theme Preset</h3>

              {/* Classic Themes */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Classic</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['minimal', 'warm', 'midnight', 'paper'] as ThemePreset[]).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setThemePreset(preset)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
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
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Genre</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['noir', 'romance', 'western', 'sci-fi'] as ThemePreset[]).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setThemePreset(preset)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Custom</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => setThemePreset('custom')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
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

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Typography</h3>
              <div>
                <label className="text-sm font-medium mb-2 block">UI Font</label>
                <Select
                  value={settings.visual.uiFont}
                  onValueChange={(value) => updateVisualSettings({ uiFont: value as UIFont })}
                >
                  <SelectTrigger>
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
                <label className="text-sm font-medium mb-2 block">Screenplay Font</label>
                <Select
                  value={settings.visual.screenplayFont}
                  onValueChange={(value) => updateVisualSettings({ screenplayFont: value as ScreenplayFont })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="courier-prime">Courier Prime</SelectItem>
                    <SelectItem value="courier-new">Courier New</SelectItem>
                    <SelectItem value="courier-final-draft">Courier Final Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">
                  UI Font Size: {settings.visual.fontSize}pt
                </label>
                <Slider
                  value={[settings.visual.fontSize]}
                  onValueChange={([value]) => updateVisualSettings({ fontSize: value })}
                  min={12}
                  max={18}
                  step={1}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Appearance</h3>
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Border Radius: {settings.visual.borderRadius}px
                </label>
                <Slider
                  value={[settings.visual.borderRadius]}
                  onValueChange={([value]) => updateVisualSettings({ borderRadius: value })}
                  min={0}
                  max={16}
                  step={1}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">
                  Animation Speed: {settings.visual.animationSpeed}s
                </label>
                <Slider
                  value={[settings.visual.animationSpeed]}
                  onValueChange={([value]) => updateVisualSettings({ animationSpeed: value })}
                  min={0.1}
                  max={0.5}
                  step={0.05}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Frosted Glass Effect</label>
                <Checkbox
                  checked={settings.visual.useGlassEffect}
                  onCheckedChange={(checked) => updateVisualSettings({ useGlassEffect: checked as boolean })}
                />
              </div>
            </div>

            {/* Cursor Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cursor Effect</h3>

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
          </TabsContent>

          {/* Editor Settings */}
          <TabsContent value="editor" className="py-6 space-y-6 m-0">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Auto-Save</h3>
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Interval: {settings.editor.autoSaveInterval === 0 ? 'Disabled' : `${settings.editor.autoSaveInterval}s`}
                </label>
                <Slider
                  value={[settings.editor.autoSaveInterval]}
                  onValueChange={([value]) => updateEditorSettings({ autoSaveInterval: value })}
                  min={0}
                  max={120}
                  step={10}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Formatting</h3>
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

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Display</h3>
              {[
                { key: 'showLineNumbers', label: 'Show Line Numbers' },
                { key: 'showPageBreaks', label: 'Show Page Breaks' },
                { key: 'enableSnippets', label: 'Enable Snippets' },
                { key: 'enableAutocomplete', label: 'Enable Autocomplete' },
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

            <div>
              <label className="text-sm font-medium mb-2 block">Tab Behavior</label>
              <Select
                value={settings.editor.tabBehavior}
                onValueChange={(value) => updateEditorSettings({ tabBehavior: value as 'indent' | 'next-field' | 'autocomplete' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select behavior" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indent">Indent</SelectItem>
                  <SelectItem value="next-field">Next Field</SelectItem>
                  <SelectItem value="autocomplete">Autocomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Layout Settings */}
          <TabsContent value="layout" className="py-6 space-y-6 m-0">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sidebar</h3>
              <div className="grid grid-cols-3 gap-3">
                {(['left', 'right', 'hidden'] as SidebarPosition[]).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => updateLayoutSettings({ sidebarPosition: pos })}
                    className={`p-3 rounded-lg border-2 transition-all capitalize ${
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

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Toolbar</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['top', 'bottom', 'floating', 'hidden'] as ToolbarPosition[]).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => updateLayoutSettings({ toolbarPosition: pos })}
                    className={`p-3 rounded-lg border-2 transition-all capitalize ${
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

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">View Options</h3>
              {[
                { key: 'distractionFreeMode', label: 'Distraction Free Mode' },
                { key: 'compactMode', label: 'Compact Mode' },
                { key: 'showStats', label: 'Show Statistics' },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between">
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
          <TabsContent value="export" className="py-6 space-y-6 m-0">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Default Format</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {['pdf', 'fdx', 'fountain', 'txt', 'html'].map((format) => (
                  <button
                    key={format}
                    onClick={() => updateExportSettings({ defaultFormat: format as 'pdf' | 'fdx' | 'fountain' | 'txt' | 'html' })}
                    className={`p-3 rounded-lg border-2 transition-all uppercase text-sm font-medium ${
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

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Page Setup</h3>
              <div className="grid grid-cols-3 gap-3">
                {['letter', 'a4', 'legal'].map((size) => (
                  <button
                    key={size}
                    onClick={() => updateExportSettings({ paperSize: size as 'letter' | 'a4' | 'legal' })}
                    className={`p-3 rounded-lg border-2 transition-all uppercase text-sm font-medium ${
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

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Options</h3>
              {[
                { key: 'showSceneNumbers', label: 'Show Scene Numbers' },
                { key: 'revisionColors', label: 'Revision Colors' },
                { key: 'includeWatermark', label: 'Include Watermark' },
                { key: 'includeHeader', label: 'Include Header' },
                { key: 'includeFooter', label: 'Include Footer' },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between">
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
                <label className="text-sm font-medium mb-2 block">Watermark Text</label>
                <Input
                  value={settings.export.watermarkText}
                  onChange={(e) => updateExportSettings({ watermarkText: e.target.value })}
                  placeholder="DRAFT"
                />
              </div>
            )}
          </TabsContent>

          {/* Shortcuts */}
          <TabsContent value="shortcuts" className="py-6 m-0">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Customize keyboard shortcuts for common actions. Use &quot;Mod&quot; for Cmd (Mac) / Ctrl (Windows).
              </p>
              <div className="grid gap-3">
                {Object.entries(settings.shortcuts).map(([action, shortcut]) => (
                  <div key={action} className="flex items-center justify-between py-2 border-b border-border">
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
        </div>
      </Tabs>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-6 border-t border-border mt-6 flex-shrink-0">
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
