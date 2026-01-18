'use client';

import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// =============================================================================
// Display Scale Slider
// =============================================================================

export function DisplayScaleSlider({
  value,
  onChange,
  compact,
}: {
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}) {
  const percent = Math.round(value * 100);

  return (
    <div className={compact ? 'space-y-3' : 'space-y-2'}>
      <div className="flex items-center justify-between">
        {compact ? (
          <p className="text-sm font-medium">Interface scale</p>
        ) : (
          <div>
            <label className="text-sm font-medium">Interface Size</label>
            <span className="text-xs text-muted-foreground ml-2">Entire app</span>
          </div>
        )}
        <span className="text-sm text-muted-foreground tabular-nums">{percent}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0.8}
        max={compact ? 1.2 : 1.4}
        step={0.05}
      />
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Makes everything bigger or smaller — buttons, text, panels, and menus.
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Reduce Motion Toggle
// =============================================================================

export function ReduceMotionToggle({
  checked,
  onCheckedChange,
  compact,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
        <div>
          <p className="text-sm font-medium">Reduce motion</p>
          <p className="text-xs text-muted-foreground">Less animation throughout</p>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-0.5">
      <div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Reduce Motion</label>
          <span className="text-xs text-muted-foreground">Entire app</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Disables animations, transitions, and theme ambient effects
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// =============================================================================
// Text Size Selector
// =============================================================================

const TEXT_SIZES = [
  { value: 14, label: 'Default' },
  { value: 16, label: 'Large' },
  { value: 18, label: 'Larger' },
] as const;

export function TextSizeSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Text size</p>
      <div className="grid grid-cols-3 gap-1.5">
        {TEXT_SIZES.map((size) => (
          <button
            key={size.value}
            onClick={() => onChange(size.value)}
            className={cn(
              'px-2 py-2 rounded-md text-xs text-center transition-colors border',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              value === size.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-pressed={value === size.value}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
}
