'use client';

import React, { useState, useCallback, useEffect } from 'react';
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
import { ChevronLeft, Sun, Moon, Compass } from 'lucide-react';
import { PiFilmScript, PiFilmScriptFill } from 'react-icons/pi';
import { RiFolder6Line, RiFolder6Fill, RiStackLine, RiStackFill } from 'react-icons/ri';
import { useTheme } from '@/components/theme-provider';

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
  { id: 'tip', label: 'Tip' },
  { id: 'create', label: 'Create' },
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

export type CreateAction = 'screenplay' | 'project' | 'series' | 'explore';

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
  isDark,
  setIsDark,
}: {
  displayName: string;
  setDisplayName: (name: string) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
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

      <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
        <div className="flex items-center gap-3">
          {isDark ? (
            <Moon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Sun className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {isDark ? 'Dark mode' : 'Light mode'}
          </span>
        </div>
        <Switch checked={isDark} onCheckedChange={setIsDark} />
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
// TIP STEP (single quick tip)
// ============================================================================

function TipStep() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">One thing to know</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          That's really it.
        </p>
      </div>

      <div className="p-4 rounded-lg border border-border/50 bg-card/50">
        <div className="flex items-start gap-3">
          <code className="shrink-0 px-2 py-1 rounded bg-muted text-[11px] font-mono font-medium">
            INT.
          </code>
          <div className="min-w-0">
            <p className="text-sm font-medium">Scene headings</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Type <code className="text-[10px] bg-muted px-1 rounded">INT.</code> or <code className="text-[10px] bg-muted px-1 rounded">EXT.</code> to start a scene. Verso handles the formatting.
            </p>
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
// CREATE STEP (action-oriented final step)
// ============================================================================

const CREATE_OPTIONS: {
  id: CreateAction;
  label: string;
  icon: React.ElementType;
  activeIcon: React.ElementType;
}[] = [
  { id: 'screenplay', label: 'Screenplay', icon: PiFilmScript, activeIcon: PiFilmScriptFill },
  { id: 'project', label: 'Project', icon: RiFolder6Line, activeIcon: RiFolder6Fill },
  { id: 'series', label: 'Series', icon: RiStackLine, activeIcon: RiStackFill },
  { id: 'explore', label: 'Just exploring', icon: Compass, activeIcon: Compass },
];

function CreateStep({
  selectedAction,
  setSelectedAction,
}: {
  selectedAction: CreateAction | null;
  setSelectedAction: (action: CreateAction) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">What do you want to create?</h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          You can always change your mind later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {CREATE_OPTIONS.map((option) => {
          const isSelected = selectedAction === option.id;
          const Icon = isSelected ? option.activeIcon : option.icon;
          return (
            <button
              key={option.id}
              onClick={() => setSelectedAction(option.id)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium transition-colors border',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-pressed={isSelected}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {option.label}
            </button>
          );
        })}
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
  onAction?: (action: CreateAction) => void;
}

export function OnboardingFlow({
  open,
  onOpenChange,
  onComplete,
  onAction,
}: OnboardingFlowProps) {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [displayName, setDisplayName] = useState('');
  const [selectedUseCases, setSelectedUseCases] = useState<UseCase[]>([]);
  const [selectedAction, setSelectedAction] = useState<CreateAction | null>(null);
  const { theme, setTheme } = useTheme();

  // Derive dark mode state from theme
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const setIsDark = useCallback((dark: boolean) => {
    setTheme(dark ? 'dark' : 'light');
  }, [setTheme]);

  const steps = ONBOARDING_STEPS;
  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const savePreferences = useCallback(async () => {
    // Save to localStorage as fallback
    if (displayName.trim()) {
      localStorage.setItem('verso-display-name', displayName.trim());
    }
    if (selectedUseCases.length > 0) {
      localStorage.setItem('verso-use-cases', JSON.stringify(selectedUseCases));
    }

    // Save to Supabase if logged in
    if (session?.user?.id) {
      try {
        const payload: { name?: string; useCases?: string[] } = {};
        if (displayName.trim()) {
          payload.name = displayName.trim();
        }
        if (selectedUseCases.length > 0) {
          payload.useCases = selectedUseCases;
        }

        if (Object.keys(payload).length > 0) {
          await fetch(`/api/users/${session.user.id}/settings-profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      } catch {
        // Silently fail - localStorage is the fallback
      }
    }
  }, [displayName, selectedUseCases, session?.user?.id]);

  const handleNext = useCallback(() => {
    setDirection('forward');
    if (isLast) {
      savePreferences();
      onComplete?.();
      onOpenChange(false);
      // Trigger action after closing (delay to allow dialog to close)
      if (selectedAction && onAction) {
        setTimeout(() => onAction(selectedAction), 100);
      }
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  }, [isLast, onComplete, onOpenChange, steps.length, savePreferences, selectedAction, onAction]);

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

  // Reset only when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setDirection('forward');
      setSelectedAction(null);

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
        return (
          <WelcomeStep
            displayName={displayName}
            setDisplayName={setDisplayName}
            isDark={isDark}
            setIsDark={setIsDark}
          />
        );
      case 'usecase':
        return <UseCaseStep selectedUseCases={selectedUseCases} setSelectedUseCases={setSelectedUseCases} />;
      case 'tip':
        return <TipStep />;
      case 'create':
        return <CreateStep selectedAction={selectedAction} setSelectedAction={setSelectedAction} />;
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
            {isLast
              ? selectedAction === 'screenplay'
                ? 'Create Screenplay'
                : selectedAction === 'project'
                  ? 'Create Project'
                  : selectedAction === 'series'
                    ? 'Create Series'
                    : selectedAction === 'explore'
                      ? 'Start Exploring'
                      : 'Get Started'
              : 'Continue'}
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
