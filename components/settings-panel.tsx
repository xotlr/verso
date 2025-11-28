'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SettingsContent } from '@/components/settings-content';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border bg-card sticky top-0 z-10">
          <DialogTitle className="text-2xl">Settings</DialogTitle>
          <DialogDescription>Customize your writing experience</DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <SettingsContent onDone={onClose} showDoneButton />
        </div>
      </DialogContent>
    </Dialog>
  );
}
