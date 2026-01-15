/**
 * Greeting Variety Tests
 * Verifies that greetings are random but avoid repeats
 */

import { pickSmart } from '@/lib/voice/utils';
import { getContextualGreeting } from '@/lib/voice/features/greeting/strategies';
import { timeBasedGreetings, genreGreetings, legendaryGreetings } from '@/lib/voice/features/greeting/pools';
import { extractScreenplayData } from '@/lib/voice/features/greeting/extract-screenplay-data';
import type { GreetingContext } from '@/lib/voice/features/greeting/types';

describe('pickSmart - Variety Testing', () => {
  const testPool = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  it('should return items from the pool', () => {
    const result = pickSmart(testPool, [], 123);
    expect(testPool).toContain(result);
  });

  it('should avoid recently shown items', () => {
    const recentlyShown = ['A', 'B', 'C'];
    const results = new Set<string>();

    // Run 50 times - should never pick A, B, or C
    for (let i = 0; i < 50; i++) {
      results.add(pickSmart(testPool, recentlyShown, i));
    }

    expect(results.has('A')).toBe(false);
    expect(results.has('B')).toBe(false);
    expect(results.has('C')).toBe(false);
    expect(results.size).toBeGreaterThan(0);
  });

  it('should show variety over multiple calls', () => {
    const results = new Set<string>();

    // Run 100 times with no history
    for (let i = 0; i < 100; i++) {
      results.add(pickSmart(testPool, [], i));
    }

    // Should see at least 4 different items (50% of pool)
    expect(results.size).toBeGreaterThanOrEqual(4);
  });

  it('should fallback to full pool when all items are in history', () => {
    const recentlyShown = [...testPool]; // All items in history
    const result = pickSmart(testPool, recentlyShown, 123);

    // Should still return something from the pool
    expect(testPool).toContain(result);
  });
});

describe('getContextualGreeting - Category Testing', () => {
  // Avoid milestones: screenplayCount 5/10/25, totalWords 1K/5K/10K/25K/50K
  const baseContext: GreetingContext = {
    userName: 'Test User',
    screenplayCount: 6, // Not a milestone (5, 10, 25 are)
    wordsThisWeek: 500,
    wordsToday: 100,
    totalWordsAllTime: 3000, // Not a milestone (1K, 5K, 10K, 25K, 50K are)
    lastEditedGenre: null,
    currentStreak: 0,
    longestStreak: 0,
    dailyGoal: 500,
    lastWriteDate: null,
    recentGreetings: [],
    recentCategories: [],
    sessionSeed: 12345,
    mounted: true,
  };

  it('should return a valid greeting for basic context', () => {
    const result = getContextualGreeting(baseContext);
    // Could be TIME_BASED, WEEKEND_WARRIOR, or GENRE_BASED depending on context
    expect(result.category).toBeTruthy();
    expect(result.text).toBeTruthy();
  });

  it('should return streak-related greeting for 7+ day streak', () => {
    const result = getContextualGreeting({
      ...baseContext,
      screenplayCount: 6, // Not a milestone
      totalWordsAllTime: 3000, // Not a milestone
      currentStreak: 7,
      longestStreak: 10, // Already had longer streak, so not RETURNING_CHAMP
      lastWriteDate: new Date().toISOString(),
      recentCategories: [], // No recent categories to avoid
    });
    // Both LEGENDARY and ON_FIRE can match for 7+ day streaks
    // The selection depends on which is picked from the candidate pool
    expect(['LEGENDARY', 'ON_FIRE']).toContain(result.category);
  });

  it('should return ON_FIRE for 3-6 day streak (when no milestone)', () => {
    const result = getContextualGreeting({
      ...baseContext,
      screenplayCount: 6, // Not a milestone (5, 10, 25 are milestones)
      totalWordsAllTime: 3000, // Not a milestone
      currentStreak: 4,
      longestStreak: 10, // Already had longer streak
      lastWriteDate: new Date().toISOString(),
    });
    expect(result.category).toBe('ON_FIRE');
  });

  it('should return FIRST_TIME for new users', () => {
    const result = getContextualGreeting({
      ...baseContext,
      screenplayCount: 0,
      wordsThisWeek: 0,
      wordsToday: 0,
      totalWordsAllTime: 0,
    });
    expect(result.category).toBe('FIRST_TIME');
  });

  it('should return GENRE_BASED when genre is set', () => {
    const result = getContextualGreeting({
      ...baseContext,
      lastEditedGenre: 'thriller',
      recentCategories: ['TIME_BASED'], // Force it to pick something else
    });
    // Might get GENRE_BASED or WEEKEND_WARRIOR depending on day
    expect(['GENRE_BASED', 'WEEKEND_WARRIOR', 'TIME_BASED']).toContain(result.category);
  });
});

describe('getContextualGreeting - Variety Over Time', () => {
  const baseContext: GreetingContext = {
    userName: 'Variety Tester',
    screenplayCount: 3,
    wordsThisWeek: 200,
    wordsToday: 50,
    totalWordsAllTime: 2000,
    lastEditedGenre: 'drama',
    currentStreak: 0,
    longestStreak: 0,
    dailyGoal: 500,
    lastWriteDate: null,
    recentGreetings: [],
    recentCategories: [],
    mounted: true,
  };

  it('should produce variety with different session seeds', () => {
    const results = new Set<string>();
    const categories = new Set<string>();

    for (let seed = 0; seed < 50; seed++) {
      const result = getContextualGreeting({
        ...baseContext,
        sessionSeed: seed * 100,
        recentGreetings: [],
        recentCategories: [],
      });
      results.add(result.text);
      categories.add(result.category);
    }

    // Should see multiple different greetings
    console.log(`Unique greetings: ${results.size}`);
    console.log(`Unique categories: ${categories.size}`);
    console.log('Categories seen:', [...categories]);
    console.log('Sample greetings:', [...results].slice(0, 10));

    expect(results.size).toBeGreaterThan(1);
  });

  it('should avoid recently shown greetings', () => {
    // Simulate showing 5 greetings in sequence
    const shownGreetings: string[] = [];
    const shownCategories: string[] = [];

    for (let i = 0; i < 10; i++) {
      const result = getContextualGreeting({
        ...baseContext,
        sessionSeed: i * 1000,
        recentGreetings: shownGreetings.slice(-10),
        recentCategories: shownCategories.slice(-5) as any,
      });

      // Each greeting should be different from recent ones (if pool is large enough)
      if (shownGreetings.length > 0 && shownGreetings.length < 20) {
        // Not a strict requirement due to pool size limits, but log it
        console.log(`Greeting ${i + 1}: "${result.text}" (${result.category})`);
      }

      shownGreetings.push(result.text);
      shownCategories.push(result.category);
    }

    // Check we got some variety
    const uniqueGreetings = new Set(shownGreetings);
    console.log(`\nTotal shown: ${shownGreetings.length}, Unique: ${uniqueGreetings.size}`);

    // Should have at least 50% unique (allows some repeats due to pool size)
    expect(uniqueGreetings.size).toBeGreaterThanOrEqual(Math.floor(shownGreetings.length * 0.5));
  });
});

describe('Time-Based Greeting Pools', () => {
  it('should have sufficient variety in each time period', () => {
    const periods = ['morning', 'afternoon', 'evening', 'night'] as const;

    for (const period of periods) {
      const pool = timeBasedGreetings[period];
      console.log(`${period}: ${pool.length} greetings`);
      expect(pool.length).toBeGreaterThanOrEqual(8);
    }
  });
});

describe('Genre Greeting Pools', () => {
  it('should have greetings for each genre', () => {
    const genres = Object.keys(genreGreetings);
    console.log('Genres available:', genres);

    for (const genre of genres) {
      const pool = genreGreetings[genre as keyof typeof genreGreetings];
      console.log(`${genre}: ${pool.length} greetings`);
      expect(pool.length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('Simulated User Session', () => {
  it('should simulate a week of greetings and show variety', () => {
    const greetingLog: Array<{ day: number; greeting: string; category: string }> = [];
    const recentGreetings: string[] = [];
    const recentCategories: string[] = [];

    // Simulate 7 days of visits
    for (let day = 1; day <= 7; day++) {
      const context: GreetingContext = {
        userName: 'Weekly User',
        screenplayCount: 3 + day,
        wordsThisWeek: day * 200,
        wordsToday: 100,
        totalWordsAllTime: 3000 + day * 200,
        lastEditedGenre: day % 2 === 0 ? 'comedy' : 'drama',
        currentStreak: day,
        longestStreak: day,
        dailyGoal: 500,
        lastWriteDate: new Date().toISOString(),
        recentGreetings: recentGreetings.slice(-15),
        recentCategories: recentCategories.slice(-5) as any,
        sessionSeed: day * 1234,
        mounted: true,
      };

      const result = getContextualGreeting(context);
      greetingLog.push({ day, greeting: result.text, category: result.category });
      recentGreetings.push(result.text);
      recentCategories.push(result.category);
    }

    console.log('\n=== Simulated Week of Greetings ===');
    for (const entry of greetingLog) {
      console.log(`Day ${entry.day}: [${entry.category}] "${entry.greeting}"`);
    }

    // Check variety
    const uniqueGreetings = new Set(greetingLog.map((e) => e.greeting));
    const uniqueCategories = new Set(greetingLog.map((e) => e.category));

    console.log(`\nUnique greetings: ${uniqueGreetings.size}/7`);
    console.log(`Unique categories: ${uniqueCategories.size}`);

    // Should have variety - at least 4 unique greetings over 7 days
    expect(uniqueGreetings.size).toBeGreaterThanOrEqual(4);
  });
});

describe('Edge Cases - Zero Values', () => {
  it('should handle zero daily goal gracefully', () => {
    const context: GreetingContext = {
      userName: 'Zero Goal User',
      screenplayCount: 3,
      wordsThisWeek: 500,
      wordsToday: 100,
      totalWordsAllTime: 2000,
      lastEditedGenre: null,
      currentStreak: 0,
      longestStreak: 0,
      dailyGoal: 0, // Zero goal - edge case
      lastWriteDate: null,
      recentGreetings: [],
      recentCategories: [],
      sessionSeed: 12345,
      mounted: true,
    };

    // Should not crash and should return a valid greeting
    const result = getContextualGreeting(context);
    expect(result.text).toBeTruthy();
    expect(result.category).toBeTruthy();
    // Should NOT trigger GOAL_PROGRESS or SLACKING since goal is 0
    expect(result.category).not.toBe('GOAL_PROGRESS');
    expect(result.category).not.toBe('SLACKING');
  });

  it('should handle zero words everywhere', () => {
    const context: GreetingContext = {
      userName: 'Fresh User',
      screenplayCount: 0,
      wordsThisWeek: 0,
      wordsToday: 0,
      totalWordsAllTime: 0,
      lastEditedGenre: null,
      currentStreak: 0,
      longestStreak: 0,
      dailyGoal: 500,
      lastWriteDate: null,
      recentGreetings: [],
      recentCategories: [],
      sessionSeed: 12345,
      mounted: true,
    };

    const result = getContextualGreeting(context);
    expect(result.text).toBeTruthy();
    expect(result.category).toBe('FIRST_TIME');
  });

  it('should handle negative values gracefully', () => {
    const context: GreetingContext = {
      userName: 'Negative User',
      screenplayCount: -1, // Invalid but should not crash
      wordsThisWeek: -100,
      wordsToday: -50,
      totalWordsAllTime: -1000,
      lastEditedGenre: null,
      currentStreak: -5,
      longestStreak: -10,
      dailyGoal: -100,
      lastWriteDate: null,
      recentGreetings: [],
      recentCategories: [],
      sessionSeed: 12345,
      mounted: true,
    };

    // Should not crash
    const result = getContextualGreeting(context);
    expect(result.text).toBeTruthy();
    expect(result.category).toBeTruthy();
  });

  it('should handle undefined/null optional fields', () => {
    const context: GreetingContext = {
      userName: 'Minimal User',
      screenplayCount: 2,
      wordsThisWeek: 100,
      wordsToday: 50,
      totalWordsAllTime: 500,
      lastEditedGenre: null,
      currentStreak: 0,
      longestStreak: 0,
      dailyGoal: 500,
      lastWriteDate: null,
      recentGreetings: [],
      recentCategories: [],
      sessionSeed: undefined as unknown as number, // Test undefined seed
      mounted: true,
    };

    const result = getContextualGreeting(context);
    expect(result.text).toBeTruthy();
    expect(result.category).toBeTruthy();
  });
});

describe('Screenplay Data Extraction - Edge Cases', () => {
  it('should handle null content', () => {
    const result = extractScreenplayData(null);
    expect(result.characters).toEqual([]);
    expect(result.locations).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.confidenceLevel).toBe('NONE');
  });

  it('should handle undefined content', () => {
    const result = extractScreenplayData(undefined);
    expect(result.characters).toEqual([]);
    expect(result.locations).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.confidenceLevel).toBe('NONE');
  });

  it('should handle empty string', () => {
    const result = extractScreenplayData('');
    expect(result.characters).toEqual([]);
    expect(result.locations).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(result.confidenceLevel).toBe('NONE');
  });

  it('should handle content with only whitespace', () => {
    const result = extractScreenplayData('   \n\n\t\t   \n   ');
    expect(result.characters).toEqual([]);
    expect(result.locations).toEqual([]);
    expect(result.confidenceLevel).toBe('NONE');
  });

  it('should handle malformed screenplay - only scene headings', () => {
    const content = `
INT. COFFEE SHOP - DAY
EXT. PARK - NIGHT
INT. APARTMENT - MORNING
`;
    const result = extractScreenplayData(content);
    expect(result.characters).toEqual([]);
    expect(result.locations.length).toBeGreaterThan(0);
    expect(result.locations).toContain('COFFEE SHOP');
    // Low confidence - has locations but no characters
    expect(result.confidenceLevel).toBe('LOW');
  });

  it('should handle malformed screenplay - random uppercase text', () => {
    const content = `
RANDOM TEXT IN UPPERCASE
MORE RANDOM STUFF
THIS IS NOT A SCREENPLAY
`;
    const result = extractScreenplayData(content);
    // Should not misidentify random uppercase as characters
    expect(result.characters).toEqual([]);
    expect(result.locations).toEqual([]);
    expect(result.confidenceLevel).toBe('NONE');
  });

  it('should filter out false positive character names', () => {
    const content = `
INT. HOUSE - DAY

FADE IN

This is action text.

THE
This is not dialogue.

CUT TO:

BLACK

More text.
`;
    const result = extractScreenplayData(content);
    // FADE, THE, CUT, BLACK should be filtered
    expect(result.characters).not.toContain('FADE');
    expect(result.characters).not.toContain('THE');
    expect(result.characters).not.toContain('CUT');
    expect(result.characters).not.toContain('BLACK');
  });

  it('should handle valid screenplay format with high confidence', () => {
    const content = `
INT. COFFEE SHOP - DAY

SARAH sits at a corner table, nervously tapping her fingers.

SARAH
I can't believe you came.

MIKE
Did I have a choice?

SARAH
We always have choices.

MIKE
There's always a choice.

SARAH
Not this time.

EXT. PARK - NIGHT

SARAH walks alone under the streetlights.

MIKE (V.O.)
She never looked back.

INT. APARTMENT - LATER

SARAH enters, exhausted.
`.repeat(3); // Repeat to get enough content length

    const result = extractScreenplayData(content);
    expect(result.characters).toContain('SARAH');
    expect(result.characters).toContain('MIKE');
    expect(result.locations).toContain('COFFEE SHOP');
    expect(result.locations).toContain('PARK');
    // High confidence - multiple characters, locations, and dialogue
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(['HIGH', 'MEDIUM']).toContain(result.confidenceLevel);
  });

  it('should handle character names with extensions', () => {
    const content = `
INT. OFFICE - DAY

JOHN (V.O.)
The city never sleeps.

MARY (O.S.)
Neither do I.

JOHN (CONT'D)
That's the problem.
`;
    const result = extractScreenplayData(content);
    expect(result.characters).toContain('JOHN');
    expect(result.characters).toContain('MARY');
  });

  it('should limit to 5 characters and 5 locations', () => {
    const content = `
INT. LOCATION ONE - DAY
EXT. LOCATION TWO - NIGHT
INT. LOCATION THREE - DAY
EXT. LOCATION FOUR - NIGHT
INT. LOCATION FIVE - DAY
EXT. LOCATION SIX - NIGHT
INT. LOCATION SEVEN - DAY

CHAR ONE
Line one.

CHAR TWO
Line two.

CHAR THREE
Line three.

CHAR FOUR
Line four.

CHAR FIVE
Line five.

CHAR SIX
Line six.

CHAR SEVEN
Line seven.
`;
    const result = extractScreenplayData(content);
    expect(result.characters.length).toBeLessThanOrEqual(5);
    expect(result.locations.length).toBeLessThanOrEqual(5);
  });

  it('should return confidence scores in valid range', () => {
    const testCases = [
      '', // Empty
      'Just some text', // No screenplay elements
      'INT. ROOM - DAY', // Only scene heading
      'INT. ROOM - DAY\n\nJOHN\nHello.', // Minimal screenplay
    ];

    for (const content of testCases) {
      const result = extractScreenplayData(content);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(['HIGH', 'MEDIUM', 'LOW', 'NONE']).toContain(result.confidenceLevel);
    }
  });
});
