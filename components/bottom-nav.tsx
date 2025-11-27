'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useSettings } from '@/contexts/settings-context';
import {
  Home,
  Sun,
  Moon,
  Monitor,
  LayoutTemplate,
  Settings,
  PanelRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  onSettingsClick: () => void;
}

export function BottomNav({ onSettingsClick }: BottomNavProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { settings, updateLayoutSettings } = useSettings();
  const layoutMode = settings.layout.layoutMode;
  const isSidebarCollapsed = settings.layout.sidebarCollapsed;

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const toggleLayoutMode = () => {
    updateLayoutSettings({
      layoutMode: layoutMode === 'modern' ? 'classic' : 'modern'
    });
  };

  const toggleSidebar = () => {
    updateLayoutSettings({ sidebarCollapsed: !isSidebarCollapsed });
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-5 w-5" />;
    if (theme === 'dark') return <Moon className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {/* Home */}
        <button
          onClick={() => router.push('/')}
          className="flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg hover:bg-accent transition-colors min-w-[56px]"
        >
          <Home className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Home</span>
        </button>

        {/* Theme */}
        <button
          onClick={cycleTheme}
          className="flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg hover:bg-accent transition-colors min-w-[56px]"
        >
          {getThemeIcon()}
          <span className="text-[10px] text-muted-foreground capitalize">{theme}</span>
        </button>

        {/* Layout Mode */}
        <button
          onClick={toggleLayoutMode}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg hover:bg-accent transition-colors min-w-[56px]",
            layoutMode === 'modern' && "text-primary"
          )}
        >
          <LayoutTemplate className="h-5 w-5" />
          <span className="text-[10px] text-muted-foreground capitalize">{layoutMode}</span>
        </button>

        {/* Sidebar Toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg hover:bg-accent transition-colors min-w-[56px]",
            !isSidebarCollapsed && "text-primary"
          )}
        >
          <PanelRight className="h-5 w-5" />
          <span className="text-[10px] text-muted-foreground">Panel</span>
        </button>

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg hover:bg-accent transition-colors min-w-[56px]"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Settings</span>
        </button>
      </div>
    </nav>
  );
}
