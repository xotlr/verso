'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DisplayScaleSlider, ReduceMotionToggle } from '@/components/ui/accessibility-controls';
import { cn } from '@/lib/utils';
import type { InterfaceSettings, EditorSettings, AccessibilityFont } from '@/types/settings';

interface AccessibilitySectionProps {
  interfaceSettings: InterfaceSettings;
  editorSettings: EditorSettings;
  updateInterfaceSettings: (settings: Partial<InterfaceSettings>) => void;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
}

export function AccessibilitySection({
  interfaceSettings,
  editorSettings,
  updateInterfaceSettings,
  updateEditorSettings,
}: AccessibilitySectionProps) {
  const fontOptions: { value: AccessibilityFont; label: string }[] = [
    { value: 'default', label: 'Default' },
    { value: 'sans', label: 'Sans' },
    { value: 'system', label: 'System' },
    { value: 'dyslexic', label: 'Dyslexic' },
    { value: 'courier', label: 'Courier' },
  ];

  const getAppFontStyle = (value: AccessibilityFont): React.CSSProperties => {
    switch (value) {
      case 'sans':
        return { fontFamily: 'Inter, system-ui, sans-serif' };
      case 'system':
        return { fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' };
      case 'dyslexic':
        return { fontFamily: 'OpenDyslexic, system-ui, sans-serif' };
      case 'courier':
        return { fontFamily: 'Courier Prime, Courier New, monospace' };
      default:
        return { fontFamily: 'Inter, system-ui, sans-serif' };
    }
  };

  return (
    <div className="space-y-6">
      {/* App Font Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">App Font</CardTitle>
          <CardDescription>Font for buttons, menus, and UI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {fontOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateInterfaceSettings({ appFont: opt.value })}
                className={cn(
                  "p-2.5 rounded-lg border-2 text-center transition-all",
                  interfaceSettings.appFont === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div
                  className="text-xl font-medium mb-0.5"
                  style={getAppFontStyle(opt.value)}
                >
                  aA
                </div>
                <div className="text-[10px] text-muted-foreground">{opt.label}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Display Scale Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Display Scale</CardTitle>
          <CardDescription>Adjust the size of the entire app</CardDescription>
        </CardHeader>
        <CardContent>
          <DisplayScaleSlider
            value={interfaceSettings.displayScale ?? 1.0}
            onChange={(value) => updateInterfaceSettings({ displayScale: value })}
          />
        </CardContent>
      </Card>

      {/* Text Readability Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Text Readability</CardTitle>
          <CardDescription>Adjust screenplay text in the editor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Text Contrast</label>
                <span className="text-xs text-muted-foreground ml-2">Editor only</span>
              </div>
              <span className="text-sm text-muted-foreground tabular-nums">{editorSettings.textContrast}%</span>
            </div>
            <Slider
              value={[editorSettings.textContrast]}
              onValueChange={([value]) => updateEditorSettings({ textContrast: value })}
              min={15}
              max={35}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Lower = darker screenplay text. Higher = lighter text (easier on eyes).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Motion & Contrast Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Motion & Contrast</CardTitle>
          <CardDescription>App-wide accessibility preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReduceMotionToggle
            checked={interfaceSettings.reduceMotion}
            onCheckedChange={(checked) => updateInterfaceSettings({ reduceMotion: checked })}
          />

          <div className="flex items-center justify-between py-0.5">
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">High Contrast</label>
                <span className="text-xs text-muted-foreground">Entire app</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Increases contrast between text and backgrounds
              </p>
            </div>
            <Switch
              checked={interfaceSettings.highContrast}
              onCheckedChange={(checked) => updateInterfaceSettings({
                highContrast: checked as boolean
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interface Elements Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Editor Interface</CardTitle>
          <CardDescription>Show or hide elements in the screenplay editor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-0.5">
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Show Stats Bar</label>
                <span className="text-xs text-muted-foreground">Editor only</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Word count and page statistics at the bottom of the editor
              </p>
            </div>
            <Switch
              checked={interfaceSettings.showStatsBar}
              onCheckedChange={(checked) => updateInterfaceSettings({
                showStatsBar: checked as boolean
              })}
            />
          </div>

          <div className="flex items-center justify-between py-0.5">
            <div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Show Page Numbers</label>
                <span className="text-xs text-muted-foreground">Editor only</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Page numbers on the right side of each page
              </p>
            </div>
            <Switch
              checked={interfaceSettings.showPageNumbers}
              onCheckedChange={(checked) => updateInterfaceSettings({
                showPageNumbers: checked as boolean
              })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
