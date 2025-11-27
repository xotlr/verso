'use client';

import React, { useState } from 'react';
import { Download, Upload, RotateCcw, Palette, Type, Layout, FileDown, Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { ThemePreset, UIFont, ScreenplayFont, SidebarPosition, ToolbarPosition } from '@/types/settings';
import { downloadFile, createFileInput, readFileAsText } from '@/lib/dom-utils';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
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

  const [activeTab, setActiveTab] = useState('visual');

  const handleExport = () => {
    const json = exportSettings();
    downloadFile(json, 'verso-settings.json', 'application/json');
  };

  const handleImport = () => {
    createFileInput('.json', async (file) => {
      const json = await readFileAsText(file);
      if (importSettings(json)) {
        alert('Settings imported successfully!');
      } else {
        alert('Failed to import settings. Please check the file format.');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border bg-card sticky top-0 z-10">
          <DialogTitle className="text-2xl">Settings</DialogTitle>
          <DialogDescription>Customize your writing experience</DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none bg-transparent px-6 py-2 border-b border-border gap-1">
              <TabsTrigger value="visual" className="gap-2">
                <Palette className="h-4 w-4" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="editor" className="gap-2">
                <Type className="h-4 w-4" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="layout" className="gap-2">
                <Layout className="h-4 w-4" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="export" className="gap-2">
                <FileDown className="h-4 w-4" />
                Export
              </TabsTrigger>
              <TabsTrigger value="shortcuts" className="gap-2">
                <Keyboard className="h-4 w-4" />
                Shortcuts
              </TabsTrigger>
            </TabsList>

            {/* Visual Settings */}
            <TabsContent value="visual" className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Theme Preset</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(['minimal', 'warm', 'midnight', 'paper', 'custom'] as ThemePreset[]).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setThemePreset(preset)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        settings.visual.themePreset === preset
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-sm font-medium capitalize">{preset}</div>
                    </button>
                  ))}
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
            </TabsContent>

            {/* Editor Settings */}
            <TabsContent value="editor" className="p-6 space-y-6">
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
            <TabsContent value="layout" className="p-6 space-y-6">
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
            <TabsContent value="export" className="p-6 space-y-6">
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
            <TabsContent value="shortcuts" className="p-6">
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
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-border bg-muted/30 sticky bottom-0">
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
            <Button onClick={onClose} className="gap-2">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
