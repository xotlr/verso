'use client';

import React, { useState } from 'react';
import { Monitor, Layout, Type, Accessibility, RotateCcw, Sparkles } from 'lucide-react';
import { PanelHeader } from './PanelHeader';
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
import type { PageStyle } from '@/types/settings';

interface SettingsPanelProps {
  className?: string;
}

type SectionId = 'interface' | 'layout' | 'editor' | 'accessibility';

const sections: { id: SectionId; icon: React.ReactNode; label: string }[] = [
  { id: 'interface', icon: <Monitor className="h-4 w-4" />, label: 'Interface' },
  { id: 'layout', icon: <Layout className="h-4 w-4" />, label: 'Layout' },
  { id: 'editor', icon: <Type className="h-4 w-4" />, label: 'Editor' },
  { id: 'accessibility', icon: <Accessibility className="h-4 w-4" />, label: 'Access' },
];

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  comingSoon?: boolean;
}

function SettingsRow({ label, description, children, comingSoon }: SettingsRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", comingSoon && "opacity-50")}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-foreground">{label}</Label>
          {comingSoon && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
              <Sparkles className="h-2.5 w-2.5" />
              Soon
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className={comingSoon ? "pointer-events-none" : ""}>
        {children}
      </div>
    </div>
  );
}

/**
 * Settings panel for editor configuration.
 * Used in both desktop and mobile contexts.
 */
export function SettingsPanel({ className }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('interface');
  const {
    settings,
    updateInterfaceSettings,
    updateLayoutSettings,
    updateEditorSettings,
    resetSettings,
  } = useSettings();

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'interface':
        return (
          <div className="space-y-4">
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

            <SettingsRow
              label="Page style"
              description="Themed colors or plain off-white"
            >
              <Select
                value={settings.editor.pageStyle}
                onValueChange={(value: PageStyle) =>
                  updateEditorSettings({ pageStyle: value })
                }
              >
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="themed">Themed</SelectItem>
                  <SelectItem value="plain">Plain</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>
          </div>
        );

      case 'layout':
        return (
          <div className="space-y-4">
            <SettingsRow
              label={settings.layout.toolbarLayout === 'maelle' ? 'Maelle' : 'Verso'}
              description={settings.layout.toolbarLayout === 'maelle' ? 'Unified header' : 'Floating toolbars'}
            >
              <Switch
                checked={settings.layout.toolbarLayout === 'maelle'}
                onCheckedChange={(checked) =>
                  updateLayoutSettings({ toolbarLayout: checked ? 'maelle' : 'verso' })
                }
              />
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
          </div>
        );

      case 'editor':
        return (
          <div className="space-y-4">
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
              comingSoon
            >
              <Switch
                checked={settings.editor.focusLineHighlight}
                onCheckedChange={(checked) =>
                  updateEditorSettings({ focusLineHighlight: checked })
                }
              />
            </SettingsRow>

            <div className="space-y-2 opacity-50 pointer-events-none">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-foreground">
                  Text contrast
                </Label>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                  <Sparkles className="h-2.5 w-2.5" />
                  Soon
                </span>
              </div>
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
          </div>
        );

      case 'accessibility':
        return (
          <div className="space-y-4">
            <SettingsRow
              label="Reduce motion"
              description="Minimize animations"
              comingSoon
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
              comingSoon
            >
              <Switch
                checked={settings.interface.highContrast}
                onCheckedChange={(checked) =>
                  updateInterfaceSettings({ highContrast: checked })
                }
              />
            </SettingsRow>
          </div>
        );
    }
  };

  return (
    <div className={cn('flex flex-col overflow-hidden', className)}>
      <PanelHeader title="Settings" />

      {/* Section Tabs */}
      <div className="flex items-center justify-around px-2 py-2 border-b border-border shrink-0">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
              'hover:bg-accent/50',
              activeSection === section.id
                ? 'text-primary bg-accent/30'
                : 'text-muted-foreground'
            )}
            title={section.label}
          >
            {section.icon}
            <span className="text-[10px] font-medium">{section.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {renderSectionContent()}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        <button
          onClick={resetSettings}
          className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 rounded-lg hover:bg-accent/50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
