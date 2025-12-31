'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 8;
      }
      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 8;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] bg-popover border border-border rounded-2xl shadow-md p-1 animate-in fade-in-0 zoom-in-95"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${index}`}
              className="-mx-1 my-1 h-px bg-border"
            />
          );
        }

        return (
          <button
            key={item.label}
            className={cn(
              'w-full px-2 py-1.5 text-left text-sm flex items-center gap-2 rounded-xl transition-colors outline-none',
              item.disabled
                ? 'text-muted-foreground cursor-not-allowed'
                : item.destructive
                  ? 'text-destructive hover:bg-destructive/10 focus:bg-destructive/10'
                  : 'text-popover-foreground hover:bg-accent focus:bg-accent focus:text-accent-foreground'
            )}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
