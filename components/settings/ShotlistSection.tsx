'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ShotlistSettings, ShotNumberFormat } from '@/types/settings';

interface ShotlistSectionProps {
  settings: ShotlistSettings;
  updateShotlistSettings: (settings: Partial<ShotlistSettings>) => void;
}

const NUMBER_FORMAT_OPTIONS: { value: ShotNumberFormat; label: string; example: string }[] = [
  { value: 'scene-shot', label: 'Scene.Shot', example: '14.1, 14.2, 14.3' },
  { value: 'scene-letter', label: 'Scene + Letter', example: '14A, 14B, 14C' },
  { value: 'sequential', label: 'Per-Scene Sequential', example: '1, 2, 3 (per scene)' },
  { value: 'global-sequential', label: 'Global Sequential', example: '1, 2, 3 (entire shotlist)' },
];

const SENSITIVITY_OPTIONS = [
  { value: 'strict', label: 'Strict', description: 'Only detect explicit shot indicators' },
  { value: 'normal', label: 'Normal', description: 'Balanced detection sensitivity' },
  { value: 'lenient', label: 'Lenient', description: 'Detect more potential shots' },
] as const;

export function ShotlistSection({ settings, updateShotlistSettings }: ShotlistSectionProps) {
  return (
    <div className="space-y-6">
      {/* Numbering Format Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Shot Numbering</CardTitle>
          <CardDescription>Configure how shots are numbered in your shotlist</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Numbering Format</Label>
            <Select
              value={settings.numberFormat}
              onValueChange={(value: ShotNumberFormat) =>
                updateShotlistSettings({ numberFormat: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUMBER_FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col items-start">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.example}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Industry standard is Scene.Shot format (e.g., 14.1, 14.2)
            </p>
          </div>

          {settings.numberFormat === 'sequential' && (
            <div className="flex items-center justify-between py-0.5">
              <div>
                <label className="text-sm font-medium">Show Scene Prefix</label>
                <p className="text-xs text-muted-foreground">
                  Display &quot;Scene 14 - Shot 1&quot; instead of just &quot;1&quot;
                </p>
              </div>
              <Switch
                checked={settings.showScenePrefix}
                onCheckedChange={(checked) =>
                  updateShotlistSettings({ showScenePrefix: checked as boolean })
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shot Detection Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Shot Detection</CardTitle>
          <CardDescription>Auto-detect shots from your screenplay text</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-0.5">
            <div>
              <label className="text-sm font-medium">Enable Detection</label>
              <p className="text-xs text-muted-foreground">
                Automatically detect shot indicators in your script
              </p>
            </div>
            <Switch
              checked={settings.detection.enabled}
              onCheckedChange={(checked) =>
                updateShotlistSettings({
                  detection: { ...settings.detection, enabled: checked as boolean },
                })
              }
            />
          </div>

          {settings.detection.enabled && (
            <>
              <div className="flex items-center justify-between py-0.5">
                <div>
                  <label className="text-sm font-medium">Show Suggestions</label>
                  <p className="text-xs text-muted-foreground">
                    Display detected shots as suggestions in the shotlist
                  </p>
                </div>
                <Switch
                  checked={settings.detection.showSuggestions}
                  onCheckedChange={(checked) =>
                    updateShotlistSettings({
                      detection: { ...settings.detection, showSuggestions: checked as boolean },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Detection Sensitivity</Label>
                <Select
                  value={settings.detection.patternSensitivity}
                  onValueChange={(value: 'strict' | 'normal' | 'lenient') =>
                    updateShotlistSettings({
                      detection: { ...settings.detection, patternSensitivity: value },
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENSITIVITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col items-start">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
