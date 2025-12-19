'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LayoutSettings } from '@/types/settings';

interface LayoutSectionProps {
  settings: LayoutSettings;
  updateLayoutSettings: (settings: Partial<LayoutSettings>) => void;
}

export function LayoutSection({ settings, updateLayoutSettings }: LayoutSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Editor Mode</CardTitle>
          <CardDescription>Switch between editor layouts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => updateLayoutSettings({ layoutMode: 'modern' })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                settings.layoutMode === 'modern'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-sm font-medium">Modern</div>
              <div className="text-xs text-muted-foreground mt-1">
                ProseMirror-based editor with WASM pagination
              </div>
            </button>
            <button
              onClick={() => updateLayoutSettings({ layoutMode: 'classic' })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                settings.layoutMode === 'classic'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-sm font-medium">Classic</div>
              <div className="text-xs text-muted-foreground mt-1">
                WYSIWYG page-based editor with JS pagination
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
