'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyboardShortcutsList } from '@/components/keyboard-shortcuts';

export function KeyboardSection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Keyboard Shortcuts</CardTitle>
          <CardDescription>Customize your keyboard shortcuts. Click on any shortcut to change it.</CardDescription>
        </CardHeader>
        <CardContent>
          <KeyboardShortcutsList editable />
        </CardContent>
      </Card>
    </div>
  );
}
