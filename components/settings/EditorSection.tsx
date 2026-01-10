'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { EditorSettings } from '@/types/settings';

interface EditorSectionProps {
  settings: EditorSettings;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
}

export function EditorSection({ settings, updateEditorSettings }: EditorSectionProps) {
  return (
    <div className="space-y-6">
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
            <Switch
              checked={settings.showSceneNumbers ?? true}
              onCheckedChange={(checked) => updateEditorSettings({
                showSceneNumbers: checked as boolean
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Writing Assists Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Writing Assists</CardTitle>
          <CardDescription>Text correction and formatting helpers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-0.5">
            <div>
              <label className="text-sm font-medium">Spellcheck</label>
              <p className="text-xs text-muted-foreground">
                Underline misspelled words
              </p>
            </div>
            <Switch
              checked={settings.spellcheck ?? true}
              onCheckedChange={(checked) => updateEditorSettings({
                spellcheck: checked as boolean
              })}
            />
          </div>
          <div className="flex items-center justify-between py-0.5">
            <div>
              <label className="text-sm font-medium">Auto-Capitalize</label>
              <p className="text-xs text-muted-foreground">
                Capitalize character names and scene headings
              </p>
            </div>
            <Switch
              checked={settings.autoCapitalize ?? true}
              onCheckedChange={(checked) => updateEditorSettings({
                autoCapitalize: checked as boolean
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
              <label className="text-sm font-medium">Show Placeholders</label>
              <p className="text-xs text-muted-foreground">
                Display ghost text hints in empty elements
              </p>
            </div>
            <Switch
              checked={settings.showPlaceholders ?? true}
              onCheckedChange={(checked) => updateEditorSettings({
                showPlaceholders: checked as boolean
              })}
            />
          </div>
          <div className="flex items-center justify-between py-0.5">
            <div>
              <label className="text-sm font-medium">Show Writing Tips</label>
              <p className="text-xs text-muted-foreground">
                Display contextual tips for each screenplay element
              </p>
            </div>
            <Switch
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
