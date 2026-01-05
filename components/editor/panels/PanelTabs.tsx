'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface PanelTab<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

interface PanelTabsProps<T extends string> {
  tabs: PanelTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  /** Show icons with labels (default: true) */
  showIcons?: boolean;
  /** Variant: 'default' for text tabs, 'icon' for icon-only with label below */
  variant?: 'default' | 'icon';
  className?: string;
}

/**
 * Unified tab navigation for panel sections.
 * Used by SettingsPanel (icon variant) and CharactersPanel (default variant).
 */
export function PanelTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  showIcons = true,
  variant = 'default',
  className,
}: PanelTabsProps<T>) {
  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center justify-around px-2 py-2 shrink-0', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
              'hover:bg-accent/50',
              activeTab === tab.id
                ? 'text-primary bg-accent/30'
                : 'text-muted-foreground'
            )}
            title={tab.label}
          >
            {tab.icon}
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1 px-3 py-2 shrink-0', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            'hover:bg-accent/50',
            activeTab === tab.id
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground'
          )}
        >
          {showIcons && tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
