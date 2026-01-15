'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Beaker, RotateCcw, Play, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OnboardingFlow, useOnboarding } from '@/components/onboarding/onboarding-flow';
import { getContextualGreeting } from '@/lib/voice/features/greeting/strategies';
import { clearHistory as clearGreetingHistory } from '@/lib/voice/features/greeting/history';
import { getEmptyState, type EmptyStateResource } from '@/lib/voice/features/empty-states';
import type { GreetingCategory, GreetingContext } from '@/lib/voice/features/greeting/types';
import { toast } from 'sonner';

/**
 * Development-only panel for testing voice systems.
 * Only renders in development mode, client-side only to avoid hydration mismatches.
 *
 * Features:
 * - Trigger onboarding flow
 * - Reset onboarding state
 * - Test greeting categories
 * - Preview empty states
 * - Clear greeting history
 */
export function VoiceDevPanel() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showOnboardingPreview, setShowOnboardingPreview] = useState(false);

  // Only mount on client to prevent hydration mismatch from Radix IDs
  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render in development and after client mount
  if (process.env.NODE_ENV !== 'development' || !mounted) {
    return null;
  }

  return (
    <>
      {/* Onboarding preview - rendered outside Sheet for z-index */}
      <OnboardingFlow
        open={showOnboardingPreview}
        onOpenChange={setShowOnboardingPreview}
        onComplete={() => {
          setShowOnboardingPreview(false);
          toast.success('Onboarding completed');
        }}
      />

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 shadow-lg',
              'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20',
              'text-purple-500'
            )}
            title="Voice Dev Panel"
          >
            <Beaker className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-purple-500" />
              Voice Dev Panel
            </SheetTitle>
            <SheetDescription>
              Test greetings, onboarding, and voice features
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="onboarding" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
              <TabsTrigger value="greetings">Greetings</TabsTrigger>
              <TabsTrigger value="empty">Empty States</TabsTrigger>
            </TabsList>

            <TabsContent value="onboarding" className="space-y-4 mt-4">
              <OnboardingTab onShowPreview={() => setShowOnboardingPreview(true)} />
            </TabsContent>

            <TabsContent value="greetings" className="space-y-4 mt-4">
              <GreetingsTab />
            </TabsContent>

            <TabsContent value="empty" className="space-y-4 mt-4">
              <EmptyStatesTab />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ============================================================================
// ONBOARDING TAB
// ============================================================================

function OnboardingTab({ onShowPreview }: { onShowPreview: () => void }) {
  const {
    hasCompletedOnboarding,
    resetOnboarding,
  } = useOnboarding();

  const handleReset = useCallback(() => {
    resetOnboarding();
    toast.success('Onboarding reset - will show on next page load');
  }, [resetOnboarding]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border bg-card">
        <h3 className="font-medium mb-2">Onboarding Status</h3>
        <div className="flex items-center gap-2 text-sm">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              hasCompletedOnboarding ? 'bg-green-500' : 'bg-yellow-500'
            )}
          />
          <span className="text-muted-foreground">
            {hasCompletedOnboarding ? 'Completed' : 'Not completed'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={onShowPreview} className="gap-2">
          <Play className="h-4 w-4" />
          Preview Onboarding
        </Button>

        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset Onboarding State
        </Button>
      </div>

      <div className="p-4 rounded-lg border bg-muted/50 text-sm text-muted-foreground">
        <p>
          <strong>Tip:</strong> Reset clears the localStorage flag so onboarding
          will show automatically on next page load for new users.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// GREETINGS TAB
// ============================================================================

const GREETING_CATEGORIES: GreetingCategory[] = [
  'LEGENDARY',
  'NEARLY_LEGENDARY',
  'ON_FIRE',
  'RETURNING_CHAMP',
  'COMEBACK_KID',
  'GHOST_SHORT',
  'GHOST_MEDIUM',
  'GHOST_LONG',
  'STREAK_BROKEN',
  'MILESTONE_WORDS',
  'MILESTONE_SCREENPLAYS',
  'GOAL_PROGRESS',
  'CRUSHING_IT',
  'SLACKING',
  'CREATOR_NOT_WRITER',
  'FIRST_TIME',
  'SCREENPLAY_REFERENCE',
  'GENRE_BASED',
  'WEEKEND_WARRIOR',
  'TIME_BASED',
  'NAME_EASTER_EGG',
  'REFRESH_ADDICT',
];

function GreetingsTab() {
  const [testResults, setTestResults] = useState<
    Array<{ category: GreetingCategory; text: string }>
  >([]);
  const [selectedCategory, setSelectedCategory] = useState<GreetingCategory | 'all'>('all');

  const generateTestGreetings = useCallback(() => {
    const results: Array<{ category: GreetingCategory; text: string }> = [];

    // Generate greetings for different scenarios
    const scenarios: Array<{ context: Partial<GreetingContext>; label: string }> = [
      { context: { currentStreak: 7, longestStreak: 10 }, label: 'LEGENDARY' },
      { context: { currentStreak: 6, longestStreak: 10 }, label: 'NEARLY_LEGENDARY' },
      { context: { currentStreak: 4, longestStreak: 10 }, label: 'ON_FIRE' },
      { context: { screenplayCount: 0, totalWordsAllTime: 0 }, label: 'FIRST_TIME' },
      { context: { lastEditedGenre: 'thriller' }, label: 'GENRE_BASED' },
    ];

    for (const scenario of scenarios) {
      const context: GreetingContext = {
        userName: 'Dev User',
        screenplayCount: 5,
        wordsThisWeek: 500,
        wordsToday: 100,
        totalWordsAllTime: 3000,
        lastEditedGenre: null,
        currentStreak: 0,
        longestStreak: 0,
        dailyGoal: 500,
        lastWriteDate: null,
        recentGreetings: [],
        recentCategories: [],
        sessionSeed: Math.random() * 10000,
        mounted: true,
        ...scenario.context,
      };

      const result = getContextualGreeting(context);
      results.push({ category: result.category, text: result.text });
    }

    setTestResults(results);
    toast.success(`Generated ${results.length} test greetings`);
  }, []);

  const clearHistory = useCallback(() => {
    clearGreetingHistory();
    toast.success('Greeting history cleared');
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={generateTestGreetings} className="gap-2 flex-1">
          <RefreshCw className="h-4 w-4" />
          Generate Test Greetings
        </Button>
        <Button variant="outline" onClick={clearHistory} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Clear History
        </Button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Test Results</h3>
          <div className="space-y-2">
            {testResults.map((result, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border bg-card text-sm"
              >
                <div className="font-mono text-xs text-muted-foreground mb-1">
                  {result.category}
                </div>
                <div className="font-medium">{result.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-lg border bg-muted/50 text-sm text-muted-foreground">
        <p className="mb-2">
          <strong>Categories ({GREETING_CATEGORIES.length}):</strong>
        </p>
        <div className="flex flex-wrap gap-1">
          {GREETING_CATEGORIES.map((cat) => (
            <span
              key={cat}
              className="px-2 py-0.5 rounded bg-background text-xs font-mono"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATES TAB
// ============================================================================

const EMPTY_STATE_RESOURCES: EmptyStateResource[] = [
  'screenplays',
  'projects',
  'series',
  'seasons',
  'episodes',
  'teams',
  'characters',
  'scenes',
  'notes',
  'shots',
  'locations',
  'connections',
  'stacks',
  'activity',
  'versions',
  'photos',
  'groups',
  'resources',
  'applications',
  'metrics',
];

function EmptyStatesTab() {
  const [selectedResource, setSelectedResource] = useState<EmptyStateResource>('screenplays');
  const [previewState, setPreviewState] = useState<{
    title: string;
    description: string;
    action?: string;
  } | null>(null);

  const generatePreview = useCallback(() => {
    const state = getEmptyState(selectedResource, 'owner', [], Date.now());
    setPreviewState(state);
  }, [selectedResource]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Resource Type</label>
        <select
          value={selectedResource}
          onChange={(e) => setSelectedResource(e.target.value as EmptyStateResource)}
          className="w-full p-2 rounded-md border bg-background text-sm"
        >
          {EMPTY_STATE_RESOURCES.map((resource) => (
            <option key={resource} value={resource}>
              {resource}
            </option>
          ))}
        </select>
      </div>

      <Button onClick={generatePreview} className="gap-2 w-full">
        <Sparkles className="h-4 w-4" />
        Generate Empty State
      </Button>

      {previewState && (
        <div className="p-4 rounded-lg border bg-card space-y-2">
          <div className="font-semibold">{previewState.title}</div>
          <div className="text-sm text-muted-foreground">
            {previewState.description}
          </div>
          {previewState.action && (
            <Button size="sm" variant="outline" className="mt-2">
              {previewState.action}
            </Button>
          )}
        </div>
      )}

      <div className="p-4 rounded-lg border bg-muted/50 text-sm text-muted-foreground">
        <p>
          <strong>Resources:</strong> {EMPTY_STATE_RESOURCES.length} types
        </p>
        <p className="mt-1">
          Each resource has 4+ variants for variety.
        </p>
      </div>
    </div>
  );
}
