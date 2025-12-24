'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useEditorPanel } from './EditorPanelContext';
import { Button } from '@/components/ui/button';
import { PanelRight, Film, Users, Clapperboard } from 'lucide-react';
import { CiStickyNote } from 'react-icons/ci';

interface EditorPanelTriggerProps {
  className?: string;
}

/**
 * Floating action button to open the editor panel on mobile.
 * Shows above the bottom navigation.
 */
export function EditorPanelTrigger({ className }: EditorPanelTriggerProps) {
  const { setMobileOpen, isMobile, activePanel } = useEditorPanel();

  // Only show on mobile
  if (!isMobile) return null;

  // Get icon based on active panel
  const getIcon = () => {
    switch (activePanel) {
      case 'scenes':
        return <Film className="h-5 w-5" />;
      case 'characters':
        return <Users className="h-5 w-5" />;
      case 'shotlist':
        return <Clapperboard className="h-5 w-5" />;
      case 'notes':
        return <CiStickyNote className="h-5 w-5" />;
      default:
        return <PanelRight className="h-5 w-5" />;
    }
  };

  return (
    <Button
      onClick={() => setMobileOpen(true)}
      size="icon"
      className={cn(
        'fixed z-40',
        'bottom-20 right-4', // Above bottom nav (h-16 = 64px)
        'h-14 w-14 rounded-full',
        'shadow-lg shadow-primary/20',
        'bg-primary text-primary-foreground',
        'hover:bg-primary/90',
        'touch-manipulation',
        'transition-transform active:scale-95',
        className
      )}
    >
      {getIcon()}
    </Button>
  );
}
