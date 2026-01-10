'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GettingStartedGuide } from './getting-started-guide';

interface GettingStartedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GettingStartedDialog({
  open,
  onOpenChange,
}: GettingStartedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Getting Started</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
          <GettingStartedGuide
            variant="full"
            showHero={false}
            showEliminated={true}
            className="py-0"
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
