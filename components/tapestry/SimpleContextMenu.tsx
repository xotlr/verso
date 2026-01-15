'use client';

/**
 * Simple context menu for tapestry canvas.
 */

interface SimpleContextMenuProps {
  x: number;
  y: number;
  items: Array<{ label: string; action: () => void; destructive?: boolean }>;
  onClose: () => void;
}

export function SimpleContextMenu({ x, y, items, onClose }: SimpleContextMenuProps) {
  return (
    <div
      className="fixed bg-popover border border-border rounded-md shadow-lg py-1 z-50 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className={`w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${
            item.destructive ? 'text-destructive' : 'text-foreground'
          }`}
          onClick={() => {
            item.action();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export type { SimpleContextMenuProps };
