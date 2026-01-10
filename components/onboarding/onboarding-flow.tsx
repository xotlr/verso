'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { onboardingSteps, type OnboardingStep } from '@/lib/voice/features/onboarding/guide-content';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronRight, ChevronLeft, FileText, Keyboard, Type, Sparkles, CheckCircle2 } from 'lucide-react';

// ============================================================================
// STEP ICONS
// ============================================================================

const stepIcons: Record<string, React.ReactNode> = {
  welcome: <FileText className="h-8 w-8" />,
  'scene-heading': <Type className="h-8 w-8" />,
  'tab-toggle': <Keyboard className="h-8 w-8" />,
  autocomplete: <Sparkles className="h-8 w-8" />,
  done: <CheckCircle2 className="h-8 w-8" />,
};

// ============================================================================
// STEP INDICATOR
// ============================================================================

function StepIndicator({
  steps,
  currentIndex,
  onStepClick,
}: {
  steps: OnboardingStep[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <button
          key={step.id}
          onClick={() => onStepClick?.(index)}
          disabled={!onStepClick}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-300',
            index === currentIndex
              ? 'w-6 bg-primary'
              : index < currentIndex
                ? 'bg-primary/60'
                : 'bg-muted-foreground/30',
            onStepClick && 'cursor-pointer hover:bg-primary/80'
          )}
          aria-label={`Go to step ${index + 1}: ${step.title}`}
        />
      ))}
    </div>
  );
}

// ============================================================================
// STEP CONTENT
// ============================================================================

function StepContent({
  step,
  isFirst,
  isLast,
}: {
  step: OnboardingStep;
  isFirst: boolean;
  isLast: boolean;
}) {
  const icon = stepIcons[step.id] || <FileText className="h-8 w-8" />;

  return (
    <div className="flex flex-col items-center text-center px-6 py-8">
      {/* Icon */}
      <div
        className={cn(
          'p-4 rounded-2xl mb-6 transition-colors',
          isLast ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'
        )}
      >
        {icon}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold tracking-tight mb-3">{step.title}</h2>

      {/* Description */}
      <p className="text-muted-foreground text-base max-w-sm leading-relaxed">
        {step.description}
      </p>

      {/* Keyboard hint for tab-toggle step */}
      {step.id === 'tab-toggle' && (
        <div className="mt-6 flex items-center gap-3">
          <kbd className="px-3 py-2 bg-muted border border-border rounded-lg text-sm font-mono font-medium">
            Tab
          </kbd>
          <span className="text-muted-foreground text-sm">to switch elements</span>
        </div>
      )}

      {/* Scene heading hint */}
      {step.id === 'scene-heading' && (
        <div className="mt-6 p-4 bg-muted/50 border border-border rounded-lg">
          <code className="text-sm font-mono text-foreground">INT. COFFEE SHOP - DAY</code>
        </div>
      )}

      {/* Autocomplete hint */}
      {step.id === 'autocomplete' && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono bg-muted px-2 py-1 rounded">SAR</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-mono bg-primary/10 text-primary px-2 py-1 rounded">SARAH</span>
        </div>
      )}
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
  onCreateScreenplay?: () => void;
}

export function OnboardingFlow({
  open,
  onOpenChange,
  onComplete,
  onCreateScreenplay,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = onboardingSteps;
  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete?.();
      onOpenChange(false);
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  }, [isLast, onComplete, onOpenChange, steps.length]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSkip = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleAction = useCallback(() => {
    if (step.action === 'New Screenplay' && onCreateScreenplay) {
      onCreateScreenplay();
      onOpenChange(false);
    } else if (step.action === 'Start Writing') {
      onComplete?.();
      onOpenChange(false);
    }
  }, [step.action, onCreateScreenplay, onComplete, onOpenChange]);

  // Reset step when dialog opens
  React.useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header - minimal */}
        <DialogHeader className="sr-only">
          <DialogTitle>Getting Started</DialogTitle>
        </DialogHeader>

        {/* Content */}
        <StepContent step={step} isFirst={isFirst} isLast={isLast} />

        {/* Footer */}
        <div className="px-6 pb-6 space-y-4">
          {/* Step indicator */}
          <StepIndicator
            steps={steps}
            currentIndex={currentStep}
            onStepClick={setCurrentStep}
          />

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Back or Skip */}
            {isFirst ? (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}

            {/* Right: Action or Next */}
            {step.action ? (
              <Button onClick={handleAction} className="gap-2">
                {step.action}
                {!isLast && <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2">
                {isLast ? 'Done' : 'Next'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
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
