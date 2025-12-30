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
import type { EditorSettings } from '@/types/settings';

interface EditorSectionProps {
  settings: EditorSettings;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
}

export function EditorSection({ settings, updateEditorSettings }: EditorSectionProps) {
  return (
    <div className="space-y-6">
      {/* Autocomplete Card */}
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
              checked={settings.autocomplete.enabled}
              onCheckedChange={(checked) => updateEditorSettings({
                autocomplete: { ...settings.autocomplete, enabled: checked as boolean }
              })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Suggestion Delay</label>
            <Select
              value={settings.autocomplete.delayMs.toString()}
              onValueChange={(value) => updateEditorSettings({
                autocomplete: { ...settings.autocomplete, delayMs: parseInt(value) }
              })}
              disabled={!settings.autocomplete.enabled}
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
        </CardContent>
      </Card>

      {/* Reading Comfort Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Reading Comfort</CardTitle>
          <CardDescription>Optimize text display for readability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Text Contrast</label>
              <span className="text-sm text-muted-foreground tabular-nums">{settings.textContrast}%</span>
            </div>
            <Slider
              value={[settings.textContrast]}
              onValueChange={([value]) => updateEditorSettings({ textContrast: value })}
              min={15}
              max={35}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Lower = darker text (higher contrast). Higher = lighter text (easier on eyes).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Production Mode Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Production Mode</CardTitle>
          <CardDescription>Settings for production/shooting scripts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-0.5">
            <div>
              <label className="text-sm font-medium">Show Scene Numbers</label>
              <p className="text-xs text-muted-foreground">
                Display scene numbers next to scene headings
              </p>
            </div>
            <Checkbox
              checked={settings.showSceneNumbers ?? true}
              onCheckedChange={(checked) => updateEditorSettings({
                showSceneNumbers: checked as boolean
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Learning Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Learning Mode</CardTitle>
          <CardDescription>Helpful features for screenwriting beginners</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-0.5">
            <div>
              <label className="text-sm font-medium">Show Writing Tips</label>
              <p className="text-xs text-muted-foreground">
                Display contextual tips for each screenplay element
              </p>
            </div>
            <Checkbox
              checked={settings.showBeginnerTips ?? false}
              onCheckedChange={(checked) => updateEditorSettings({
                showBeginnerTips: checked as boolean
              })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
