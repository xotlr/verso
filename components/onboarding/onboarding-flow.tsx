'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import { useSettings } from '@/contexts/settings-context';
import { ThemePreset, themeMetadata, themePresets } from '@/types/settings';

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingStep {
  id: string;
  label: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'usecase', label: 'Use Case' },
  { id: 'theme', label: 'Theme' },
  { id: 'accessibility', label: 'Comfort' },
  { id: 'shortcuts', label: 'Tips' },
  { id: 'done', label: 'Done' },
];

// ============================================================================
// USE CASES
// ============================================================================

const USE_CASES = [
  { id: 'feature', label: 'Feature Film' },
  { id: 'tv', label: 'TV / Streaming' },
  { id: 'short', label: 'Short Film' },
  { id: 'stage', label: 'Stage Play' },
  { id: 'music-video', label: 'Music Video' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'student', label: 'Student' },
  { id: 'exploring', label: 'Just Looking' },
] as const;

type UseCase = typeof USE_CASES[number]['id'];

// ============================================================================
// STEP INDICATOR (horizontal tabs style)
// ============================================================================

function StepIndicator({
  steps,
  currentIndex,
  onStepClick,
}: {
  steps: OnboardingStep[];
  currentIndex: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-2" role="tablist">
      {steps.map((step, index) => (
        <button
          key={step.id}
          onClick={() => onStepClick(index)}
          className={cn(
            'h-2 rounded-full transition-all',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none',
            index === currentIndex
              ? 'w-6 bg-primary'
              : index < currentIndex
                ? 'w-2 bg-primary/50 hover:bg-primary/70'
                : 'w-2 bg-muted hover:bg-muted-foreground/30'
          )}
          role="tab"
          aria-selected={index === currentIndex}
          aria-label={`Go to step ${index + 1}: ${step.label}`}
        />
      ))}
    </div>
  );
}

// ============================================================================
// WELCOME STEP
// ============================================================================

function WelcomeStep({
  displayName,
  setDisplayName,
}: {
  displayName: string;
  setDisplayName: (name: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Welcome to Verso</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Screenwriting software that gets out of your way.
        </p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">
          What should we call you?
        </label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="h-10"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Used for greetings and comments.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// USE CASE STEP
// ============================================================================

function UseCaseStep({
  selectedUseCases,
  setSelectedUseCases,
}: {
  selectedUseCases: UseCase[];
  setSelectedUseCases: (useCases: UseCase[]) => void;
}) {
  const toggleUseCase = (id: UseCase) => {
    setSelectedUseCases(
      selectedUseCases.includes(id)
        ? selectedUseCases.filter((c) => c !== id)
        : [...selectedUseCases, id]
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">What are you working on?</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Select all that apply.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {USE_CASES.map((useCase) => (
          <button
            key={useCase.id}
            onClick={() => toggleUseCase(useCase.id)}
            className={cn(
              'px-3 py-2 rounded-md text-xs text-left transition-colors border',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
              selectedUseCases.includes(useCase.id)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-pressed={selectedUseCases.includes(useCase.id)}
          >
            {useCase.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// THEME STEP
// ============================================================================

const POPULAR_THEMES: ThemePreset[] = [
  'verso', 'paper', 'spirited', 'akira', 'mr-robot', 'apollo', 'howl', 'limitless', 'sterling',
];

function ThemeStep({
  selectedTheme,
  setSelectedTheme,
}: {
  selectedTheme: ThemePreset;
  setSelectedTheme: (theme: ThemePreset) => void;
}) {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  React.useEffect(() => {
    const checkDark = () => document.documentElement.classList.contains('dark');
    const observer = new MutationObserver(() => setIsDark(checkDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Pick a theme</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          You can change this anytime in Settings.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {POPULAR_THEMES.map((preset) => (
          <ThemePreviewCard
            key={preset}
            preset={preset}
            selected={selectedTheme === preset}
            onClick={() => setSelectedTheme(preset)}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
}

function ThemePreviewCard({
  preset,
  selected,
  onClick,
  isDark,
}: {
  preset: ThemePreset;
  selected: boolean;
  onClick: () => void;
  isDark: boolean;
}) {
  const theme = themePresets[preset];
  const colors = isDark ? theme.darkColors : theme.lightColors;
  const meta = themeMetadata[preset];

  const bg = `hsl(${colors?.background || (isDark ? '0 0% 10%' : '0 0% 95%')})`;
  const page = `hsl(${colors?.page || (isDark ? '0 0% 12%' : '0 0% 100%')})`;
  const fg = `hsl(${colors?.foreground || (isDark ? '0 0% 80%' : '0 0% 20%')})`;
  const primary = `hsl(${colors?.primary || (isDark ? '0 0% 90%' : '0 0% 15%')})`;

  const radius = theme.borderRadius ?? 8;
  const scaledRadius = Math.max(2, Math.round(radius / 3));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'relative group text-left',
            'rounded-md border transition-all',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
            selected
              ? 'border-primary ring-1 ring-primary/30'
              : 'border-border hover:border-primary/50'
          )}
          aria-pressed={selected}
          aria-label={meta.name}
        >
          {/* Mini editor preview */}
          <div
            className="aspect-[4/3] overflow-hidden flex"
            style={{ backgroundColor: bg, borderRadius: `${scaledRadius}px` }}
          >
            {/* Sidebar hint */}
            <div className="w-3 h-full opacity-40" style={{ backgroundColor: fg }} />
            {/* Page area */}
            <div className="flex-1 p-1.5 flex items-center justify-center">
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-0.5"
                style={{ backgroundColor: page, borderRadius: `${scaledRadius - 1}px` }}
              >
                <div className="h-[2px] w-5 rounded-sm" style={{ backgroundColor: fg, opacity: 0.4 }} />
                <div className="h-[2px] w-3 rounded-sm" style={{ backgroundColor: fg, opacity: 0.25 }} />
                <div className="h-[2px] w-4 rounded-sm" style={{ backgroundColor: fg, opacity: 0.15 }} />
              </div>
            </div>
            {/* Accent dot */}
            <div
              className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: primary }}
            />
          </div>
          {/* Label */}
          <div className="px-2 py-1.5 border-t border-border/50">
            <span
              className={cn(
                'text-[10px] block truncate',
                selected ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}
              style={{
                fontStyle: meta.style === 'italic' ? 'italic' : undefined,
                textTransform: meta.style === 'uppercase' ? 'uppercase' : meta.style === 'lowercase' ? 'lowercase' : undefined,
              }}
            >
              {meta.name}
            </span>
          </div>
          {/* Selected check */}
          {selected && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
              <Check className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {meta.name}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// ACCESSIBILITY STEP
// ============================================================================

const FONT_SIZES = [
  { value: 14, label: 'Default' },
  { value: 16, label: 'Large' },
  { value: 18, label: 'Larger' },
] as const;

function AccessibilityStep({
  reduceMotion,
  setReduceMotion,
  fontSize,
  setFontSize,
}: {
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  fontSize: number;
  setFontSize: (v: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Make it yours</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Adjust for comfort. Change anytime in Settings.
        </p>
      </div>

      {/* Reduce motion toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
        <div>
          <p className="text-sm font-medium">Reduce motion</p>
          <p className="text-xs text-muted-foreground">Less animation throughout</p>
        </div>
        <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
      </div>

      {/* Font size selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Text size</p>
        <div className="grid grid-cols-3 gap-2">
          {FONT_SIZES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFontSize(value)}
              className={cn(
                'p-2 rounded-md border text-xs transition-colors',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                fontSize === value
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={fontSize === value}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SHORTCUTS STEP (editor-like tips)
// ============================================================================

function ShortcutsStep() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Two things to know</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          That's really it.
        </p>
      </div>

      <div className="space-y-2">
        {/* Tip 1 */}
        <div className="p-3 rounded-lg border border-border/50 bg-card/50">
          <div className="flex items-start gap-3">
            <code className="shrink-0 px-2 py-1 rounded bg-muted text-[11px] font-mono font-medium">
              INT.
            </code>
            <div className="min-w-0">
              <p className="text-sm font-medium">Scene headings</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Type <code className="text-[10px] bg-muted px-1 rounded">INT.</code> or <code className="text-[10px] bg-muted px-1 rounded">EXT.</code> to start a scene. Auto-formatted.
              </p>
            </div>
          </div>
        </div>

        {/* Tip 2 */}
        <div className="p-3 rounded-lg border border-border/50 bg-card/50">
          <div className="flex items-start gap-3">
            <kbd className="shrink-0 px-2 py-1 rounded bg-muted text-[11px] font-mono font-medium">
              Tab
            </kbd>
            <div className="min-w-0">
              <p className="text-sm font-medium">Toggle elements</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Action → Character → Parenthetical. Just keep pressing Tab.
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">?</kbd> anytime for more shortcuts.
      </p>
    </div>
  );
}

// ============================================================================
// DONE STEP
// ============================================================================

function DoneStep({ displayName }: { displayName: string }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">
          {displayName ? `Ready, ${displayName}` : "You're ready"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          No menus. No formatting modes. Just write.
        </p>
      </div>

      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground font-mono">
          FADE IN:
        </p>
        <p className="text-xs text-muted-foreground font-mono mt-2 pl-4">
          INT. YOUR IMAGINATION - DAY
        </p>
        <p className="text-xs text-muted-foreground font-mono mt-2 pl-4">
          The cursor blinks. Waiting.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface OnboardingFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function OnboardingFlow({
  open,
  onOpenChange,
  onComplete,
}: OnboardingFlowProps) {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [displayName, setDisplayName] = useState('');
  const [selectedUseCases, setSelectedUseCases] = useState<UseCase[]>([]);
  const { setThemePreset, settings, updateInterfaceSettings, updateVisualSettings } = useSettings();
  const initialThemeRef = useRef(settings.visual.themePreset);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>(settings.visual.themePreset);

  const steps = ONBOARDING_STEPS;
  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  // Apply theme immediately when selected
  useEffect(() => {
    if (selectedTheme !== settings.visual.themePreset) {
      setThemePreset(selectedTheme);
    }
  }, [selectedTheme, setThemePreset, settings.visual.themePreset]);

  const savePreferences = useCallback(async () => {
    // Save display name
    if (displayName.trim()) {
      localStorage.setItem('verso-display-name', displayName.trim());

      // Also update user profile if logged in
      if (session?.user?.id) {
        try {
          await fetch(`/api/users/${session.user.id}/settings-profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: displayName.trim() }),
          });
        } catch (e) {
          // Silently fail - localStorage is the fallback
        }
      }
    }

    // Save use cases
    if (selectedUseCases.length > 0) {
      localStorage.setItem('verso-use-cases', JSON.stringify(selectedUseCases));
    }
  }, [displayName, selectedUseCases, session?.user?.id]);

  const handleNext = useCallback(() => {
    setDirection('forward');
    if (isLast) {
      savePreferences();
      onComplete?.();
      onOpenChange(false);
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  }, [isLast, onComplete, onOpenChange, steps.length, savePreferences]);

  const handlePrev = useCallback(() => {
    setDirection('back');
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSkip = useCallback(() => {
    savePreferences();
    onComplete?.();
    onOpenChange(false);
  }, [onComplete, onOpenChange, savePreferences]);

  const handleStepClick = useCallback((index: number) => {
    setDirection(index > currentStep ? 'forward' : 'back');
    setCurrentStep(index);
  }, [currentStep]);

  // Enter key to advance
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleNext]);

  // Reset only when dialog opens (not when theme changes!)
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setDirection('forward');
      setSelectedTheme(initialThemeRef.current);

      // Load existing preferences
      const savedName = localStorage.getItem('verso-display-name');
      if (savedName) setDisplayName(savedName);

      const savedUseCases = localStorage.getItem('verso-use-cases');
      if (savedUseCases) {
        try {
          setSelectedUseCases(JSON.parse(savedUseCases));
        } catch {
          setSelectedUseCases([]);
        }
      }
    }
  }, [open]);

  const renderStep = () => {
    switch (step.id) {
      case 'welcome':
        return <WelcomeStep displayName={displayName} setDisplayName={setDisplayName} />;
      case 'usecase':
        return <UseCaseStep selectedUseCases={selectedUseCases} setSelectedUseCases={setSelectedUseCases} />;
      case 'theme':
        return <ThemeStep selectedTheme={selectedTheme} setSelectedTheme={setSelectedTheme} />;
      case 'accessibility':
        return (
          <AccessibilityStep
            reduceMotion={settings.interface.reduceMotion}
            setReduceMotion={(v) => updateInterfaceSettings({ reduceMotion: v })}
            fontSize={settings.visual.fontSize}
            setFontSize={(v) => updateVisualSettings({ fontSize: v })}
          />
        );
      case 'shortcuts':
        return <ShortcutsStep />;
      case 'done':
        return <DoneStep displayName={displayName} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="sr-only">
          <DialogTitle>Getting Started</DialogTitle>
        </DialogHeader>

        {/* Breadcrumb header */}
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StepIndicator steps={steps} currentIndex={currentStep} onStepClick={handleStepClick} />
            <span className="text-[10px] text-muted-foreground">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors focus-visible:text-foreground focus-visible:underline focus-visible:outline-none"
          >
            Skip
          </button>
        </div>

        {/* Content with animation */}
        <div className="p-4 sm:p-6">
          <div
            key={step.id}
            className={cn(
              'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200',
              direction === 'forward' ? 'motion-safe:slide-in-from-right-2' : 'motion-safe:slide-in-from-left-2'
            )}
          >
            {renderStep()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 flex items-center justify-between gap-2">
          {/* Left: Back button */}
          <div className="flex items-center">
            {!isFirst ? (
              <Button variant="ghost" size="sm" onClick={handlePrev} className="h-8 px-2">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>

          {/* Right: Next/Done with Enter hint */}
          <Button onClick={handleNext} size="sm" className="h-8 gap-1.5">
            {isLast ? 'Start Writing' : 'Continue'}
            {!isLast && <span className="text-xs opacity-60">↵</span>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// HOOK FOR MANAGING ONBOARDING STATE
// ============================================================================

const ONBOARDING_STORAGE_KEY = 'verso-onboarding-completed';

export function useOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    if (typeof window === 'undefined') return true; // SSR: assume completed
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  });

  const [showOnboarding, setShowOnboarding] = useState(false);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setHasCompletedOnboarding(false);
  }, []);

  const startOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  return {
    hasCompletedOnboarding,
    showOnboarding,
    setShowOnboarding,
    completeOnboarding,
    resetOnboarding,
    startOnboarding,
  };
}
