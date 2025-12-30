'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ElementType } from '@/lib/prosemirror';
import { Lightbulb } from 'lucide-react';

interface BeginnerTipsProps {
  currentElementType: ElementType;
  className?: string;
  show?: boolean;
}

/**
 * Helpful tips for each element type, designed for screenwriting beginners.
 */
const ELEMENT_TIPS: Record<ElementType, { title: string; tip: string; example?: string }> = {
  scene_heading: {
    title: 'Scene Heading (Slugline)',
    tip: 'Start with INT. (interior) or EXT. (exterior), followed by location and time of day.',
    example: 'INT. COFFEE SHOP - DAY',
  },
  action: {
    title: 'Action/Description',
    tip: 'Describe what we see and hear. Use present tense. Keep it visual and concise.',
    example: 'Sarah enters, brushing rain from her coat.',
  },
  character: {
    title: 'Character Name',
    tip: 'Type the speaking character\'s name in ALL CAPS. Add (V.O.) for voiceover or (O.S.) for off-screen.',
    example: 'SARAH (V.O.)',
  },
  dialogue: {
    title: 'Dialogue',
    tip: 'Write what the character says. Keep it natural and character-specific.',
    example: 'I didn\'t expect to see you here.',
  },
  parenthetical: {
    title: 'Parenthetical',
    tip: 'Brief acting direction or tone. Use sparingly—actors prefer to interpret themselves.',
    example: '(hesitant)',
  },
  transition: {
    title: 'Transition',
    tip: 'Visual transitions between scenes. Modern scripts rarely use these except for specific effect.',
    example: 'SMASH CUT TO:',
  },
  shot: {
    title: 'Shot',
    tip: 'Camera direction. Use sparingly in spec scripts—directors prefer to choose their own shots.',
    example: 'CLOSE ON - the letter in her hand',
  },
  super: {
    title: 'Super (Superimpose)',
    tip: 'Text that appears on screen, like location titles or time stamps.',
    example: 'SUPER: "Three Years Earlier"',
  },
  chyron: {
    title: 'Chyron',
    tip: 'Lower-third text, typically used for identifying people or places in documentaries.',
    example: 'CHYRON: "Dr. Jane Smith, Lead Researcher"',
  },
  flashback: {
    title: 'Flashback',
    tip: 'Indicates a scene taking place in the past. End with "END FLASHBACK" or "BACK TO PRESENT".',
    example: 'FLASHBACK - INT. CHILDHOOD HOME - 1995',
  },
  montage: {
    title: 'Montage',
    tip: 'A series of short scenes showing passage of time or thematic connection.',
    example: 'MONTAGE - TRAINING SEQUENCE',
  },
  intercut: {
    title: 'Intercut',
    tip: 'Cutting between two or more simultaneous scenes, often for phone conversations.',
    example: 'INTERCUT - PHONE CONVERSATION',
  },
  dual_dialogue: {
    title: 'Dual Dialogue',
    tip: 'Two characters speaking simultaneously, shown side by side.',
    example: 'Used for overlapping dialogue',
  },
  ending: {
    title: 'The End',
    tip: 'Marks the end of your screenplay. Centered and formatted automatically.',
    example: 'THE END',
  },
  title_page: {
    title: 'Title Page',
    tip: 'Include your screenplay title, your name, and contact information.',
    example: '',
  },
};

/**
 * BeginnerTips component - shows contextual writing tips for the current element type.
 */
export function BeginnerTips({ currentElementType, className, show = true }: BeginnerTipsProps) {
  if (!show) return null;

  const tip = ELEMENT_TIPS[currentElementType];
  if (!tip) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 right-4 z-30 max-w-xs',
        'p-3 rounded-lg',
        'bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg',
        'text-sm',
        'animate-in fade-in slide-in-from-right-2 duration-200',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div className="space-y-1.5">
          <p className="font-medium text-foreground">{tip.title}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">{tip.tip}</p>
          {tip.example && (
            <p className="text-xs font-mono bg-muted/50 px-2 py-1 rounded text-muted-foreground">
              {tip.example}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
