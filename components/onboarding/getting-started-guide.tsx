'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  heroContent,
  introContent,
  guideSections,
  shortcuts,
  closingContent,
  eliminatedContent,
  type GuideSection,
} from '@/lib/voice/features/onboarding/guide-content';
import { Keyboard, ArrowRight, Check } from 'lucide-react';

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function ContentBlock({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <p key={i} className="text-sm text-foreground/90 leading-relaxed">
          {line}
        </p>
      ))}
    </div>
  );
}

function CodeExample({ code, caption }: { code: string; caption?: string }) {
  return (
    <div className="my-4">
      <pre className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm overflow-x-auto whitespace-pre">
        {code}
      </pre>
      {caption && (
        <p className="text-xs text-muted-foreground mt-2 italic">{caption}</p>
      )}
    </div>
  );
}

function TipBox({ tip }: { tip: string }) {
  return (
    <div className="flex gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg mt-4">
      <span className="text-primary text-sm font-medium shrink-0">Tip:</span>
      <p className="text-sm text-foreground/80">{tip}</p>
    </div>
  );
}

function GuideSection({ section }: { section: GuideSection }) {
  return (
    <section className="py-8 border-b border-border/50 last:border-0">
      <SectionHeader title={section.title} subtitle={section.subtitle} />
      <ContentBlock lines={section.content} />
      {section.example && (
        <CodeExample code={section.example.after} caption={section.example.caption} />
      )}
      {section.tip && <TipBox tip={section.tip} />}
    </section>
  );
}

// ============================================================================
// SHORTCUTS TABLE
// ============================================================================

function ShortcutsSection() {
  return (
    <section className="py-8 border-b border-border/50">
      <SectionHeader title="Shortcuts" subtitle="The essentials" />
      <div className="grid gap-2 mt-4">
        {shortcuts.map((shortcut, i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <kbd className="inline-flex items-center justify-center min-w-[80px] px-2 py-1 bg-muted border border-border rounded text-xs font-mono font-medium">
              {shortcut.shortcut}
            </kbd>
            <span className="text-sm text-foreground/80">{shortcut.description}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// ELIMINATED SECTION (differentiator)
// ============================================================================

function EliminatedSection() {
  return (
    <section className="py-8 border-b border-border/50">
      <SectionHeader title={eliminatedContent.headline} />
      <div className="grid gap-3 mt-4">
        {eliminatedContent.items.map((item, i) => (
          <div key={i} className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground line-through w-32">{item.removed}</span>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
            <span className="text-foreground font-medium">{item.replaced}</span>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground mt-6 italic">
        {eliminatedContent.closer}
      </p>
    </section>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface GettingStartedGuideProps {
  variant?: 'full' | 'compact';
  showHero?: boolean;
  showEliminated?: boolean;
  className?: string;
}

export function GettingStartedGuide({
  variant = 'full',
  showHero = true,
  showEliminated = true,
  className,
}: GettingStartedGuideProps) {
  const isCompact = variant === 'compact';

  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      {/* Hero */}
      {showHero && (
        <header className="text-center py-12 border-b border-border/50">
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            {heroContent.headline}
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            {heroContent.subheadline}
          </p>
        </header>
      )}

      {/* Intro */}
      {!isCompact && (
        <section className="py-8 border-b border-border/50">
          <ContentBlock lines={introContent.hook} />
          <p className="text-sm font-medium text-primary mt-4">
            {introContent.promise}
          </p>
        </section>
      )}

      {/* Guide Sections */}
      {guideSections.map((section) => (
        <GuideSection key={section.id} section={section} />
      ))}

      {/* Shortcuts */}
      <ShortcutsSection />

      {/* What we eliminated */}
      {showEliminated && <EliminatedSection />}

      {/* Closing */}
      <section className="py-12 text-center">
        <h2 className="text-2xl font-bold tracking-tight mb-4">
          {closingContent.headline}
        </h2>
        <div className="space-y-1 text-muted-foreground mb-6">
          {closingContent.lines.map((line, i) => (
            <p key={i} className="text-sm">{line}</p>
          ))}
        </div>
        <p className="text-lg font-medium text-foreground">
          {closingContent.cta}
        </p>
      </section>
    </div>
  );
}

// ============================================================================
// COMPACT REFERENCE CARD (for quick help)
// ============================================================================

export function QuickReferenceCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 bg-card border border-border rounded-lg', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Keyboard className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Quick Reference</h3>
      </div>
      <div className="space-y-2">
        {shortcuts.slice(0, 4).map((shortcut, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{shortcut.description}</span>
            <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded font-mono">
              {shortcut.shortcut}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
