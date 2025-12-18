'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Monitor, Layout, Type, Accessibility, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/settings-context';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditorSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ icon, title, children }: SettingsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
      <div className="space-y-3 pl-6">
        {children}
      </div>
    </div>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label className="text-sm text-foreground">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Procreate-inspired settings panel.
 * Slides out from the left toolbar with categories for Interface, Layout, Editor, and Accessibility.
 */
export function EditorSettingsPanel({
  open,
  onOpenChange,
}: EditorSettingsPanelProps) {
  const {
    settings,
    updateInterfaceSettings,
    updateLayoutSettings,
    updateEditorSettings,
    resetSettings,
  } = useSettings();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <motion.div
        className={cn(
          'absolute left-full top-1/2 ml-3 z-50',
          'w-72 bg-background',
          'rounded-2xl border border-border/50',
          'shadow-2xl shadow-black/20',
          'overflow-hidden'
        )}
        initial={{ opacity: 0, x: -12, y: '-50%' }}
        animate={{ opacity: 1, x: 0, y: '-50%' }}
        exit={{ opacity: 0, x: -12, y: '-50%' }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 30,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-sm font-medium">Editor Settings</span>
          <button
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-6">
            {/* Interface Section */}
            <SettingsSection
              icon={<Monitor className="h-4 w-4" />}
              title="Interface"
            >
              <SettingsRow
                label="Show stats bar"
                description="Word count and page info"
              >
                <Switch
                  checked={settings.interface.showStatsBar}
                  onCheckedChange={(checked) =>
                    updateInterfaceSettings({ showStatsBar: checked })
                  }
                />
              </SettingsRow>

              <SettingsRow
                label="Show page numbers"
                description="Display page numbers in editor"
              >
                <Switch
                  checked={settings.interface.showPageNumbers}
                  onCheckedChange={(checked) =>
                    updateInterfaceSettings({ showPageNumbers: checked })
                  }
                />
              </SettingsRow>
            </SettingsSection>

            {/* Layout Section */}
            <SettingsSection
              icon={<Layout className="h-4 w-4" />}
              title="Layout"
            >
              <SettingsRow
                label="Toolbar position"
                description="Left or right-hand mode"
              >
                <Select
                  value={settings.layout.toolbarPosition}
                  onValueChange={(value: 'left' | 'right') =>
                    updateLayoutSettings({ toolbarPosition: value })
                  }
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </SettingsRow>

              <SettingsRow
                label="Scroll mode"
                description="Discrete pages or continuous scroll"
              >
                <Select
                  value={settings.editor.scrollMode}
                  onValueChange={(value: 'discrete' | 'continuous') =>
                    updateEditorSettings({ scrollMode: value })
                  }
                >
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discrete">Discrete</SelectItem>
                    <SelectItem value="continuous">Continuous</SelectItem>
                  </SelectContent>
                </Select>
              </SettingsRow>
            </SettingsSection>

            {/* Editor Section */}
            <SettingsSection
              icon={<Type className="h-4 w-4" />}
              title="Editor"
            >
              <SettingsRow
                label="Typewriter mode"
                description="Keep cursor centered vertically"
              >
                <Switch
                  checked={settings.editor.typewriterMode}
                  onCheckedChange={(checked) =>
                    updateEditorSettings({ typewriterMode: checked })
                  }
                />
              </SettingsRow>

              <SettingsRow
                label="Focus line highlight"
                description="Highlight current line"
              >
                <Switch
                  checked={settings.editor.focusLineHighlight}
                  onCheckedChange={(checked) =>
                    updateEditorSettings({ focusLineHighlight: checked })
                  }
                />
              </SettingsRow>

              <div className="space-y-2">
                <Label className="text-sm text-foreground">
                  Text contrast
                </Label>
                <Slider
                  value={[settings.editor.textContrast]}
                  onValueChange={([value]) =>
                    updateEditorSettings({ textContrast: value })
                  }
                  min={15}
                  max={35}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {settings.editor.textContrast}% lightness
                </p>
              </div>
            </SettingsSection>

            {/* Accessibility Section */}
            <SettingsSection
              icon={<Accessibility className="h-4 w-4" />}
              title="Accessibility"
            >
              <SettingsRow
                label="Reduce motion"
                description="Minimize animations"
              >
                <Switch
                  checked={settings.interface.reduceMotion}
                  onCheckedChange={(checked) =>
                    updateInterfaceSettings({ reduceMotion: checked })
                  }
                />
              </SettingsRow>

              <SettingsRow
                label="High contrast"
                description="Increase visual contrast"
              >
                <Switch
                  checked={settings.interface.highContrast}
                  onCheckedChange={(checked) =>
                    updateInterfaceSettings({ highContrast: checked })
                  }
                />
              </SettingsRow>
            </SettingsSection>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/50">
          <button
            onClick={resetSettings}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 rounded-lg hover:bg-accent/50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to defaults
          </button>
        </div>
      </motion.div>
    </>
  );
}
