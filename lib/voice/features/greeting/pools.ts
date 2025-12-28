/**
 * Greeting Pools
 * Collections of contextual greetings organized by category
 */

import type { Genre } from './types';
import type { TimePeriod } from '../../types';

// GHOST greetings - scaled by days absent
export const ghostGreetingsShort = [
  "Oh, so you DO remember this exists",
  "The prodigal writer returns",
  "Well well well... look who decided to show up",
  "Back from the dead, I see",
  "The scripts were starting to worry",
];

export const ghostGreetingsMedium = [
  "I was starting to think you forgot how to type",
  "*blows dust off keyboard* Welcome back",
  "The scripts were getting lonely",
  "Almost filed a missing persons report",
  "The blank pages held a vigil",
];

export const ghostGreetingsLong = [
  "It's been a while. A LONG while.",
  "I was about to file a missing persons report",
  "The blank pages staged a protest. They're back now",
  "Did you get lost? For over a week?!",
  "The muse almost gave up on you",
  "Resurrection complete. Welcome back",
];

// LEGENDARY greetings (7+ day streak)
export const legendaryGreetings = [
  "UNSTOPPABLE!",
  "At this point you're just showing off",
  "Are you even human?!",
  "The writing gods have blessed you",
  "Legend. Absolute legend",
  "Writing machine activated",
  "They'll write legends about this streak",
  "Peak performance unlocked",
];

// NEARLY_LEGENDARY greetings (6-day streak)
export const nearlyLegendaryGreetings = [
  "One more day for legendary status!",
  "Tomorrow you become a legend",
  "6 days! The finish line is in sight",
  "So close to legendary you can taste it",
  "One more day. Just one. You got this",
  "The streak gods are watching",
];

// ON_FIRE greetings (3-6 day streak)
export const onFireGreetings = [
  "You're on FIRE",
  "The legend continues",
  "Streak mode: activated",
  "Unstoppable momentum",
  "Keep that fire burning",
  "The muse is obsessed with you",
];

// RETURNING_CHAMP greetings
export const returningChampGreetings = [
  "You've matched your personal best!",
  "This is your LONGEST STREAK EVER",
  "Historic moment. You're making history",
  "New personal record territory",
  "The champion has returned",
];

// STREAK_BROKEN greetings
export const streakBrokenGreetings = [
  "The streak... it's gone. But you're here now",
  "Yesterday happened. Today's a new day",
  "We don't talk about yesterday",
  "Starting fresh. No judgment. (Okay, a little judgment)",
  "The counter reset. Your talent didn't",
  "Back to day one. Let's make it count",
];

// CREATOR_NOT_WRITER greetings
export const creatorNotWriterGreetings = [
  "Another new screenplay? How about finishing one?",
  "I see you like the 'New Screenplay' button",
  "Creating is easy. Writing is the hard part",
  "Interesting strategy. Many files, zero words",
  "The 'new file' button fears you. Your current drafts miss you",
  "Collection growing, word count... not so much",
];

// CRUSHING_IT greetings
export const crushingItGreetings = [
  "Save some talent for the rest of us",
  "At this rate you'll finish by Tuesday",
  "The keyboard called. It needs a break",
  "Absolute writing rampage",
  "The productivity is off the charts",
  "Slow down, Shakespeare",
];

// SLACKING greetings
export const slackingGreetings = [
  "Your daily goal misses you",
  "The blank page is judging you (lovingly)",
  "Just a few words. That's all I ask",
  "The cursor has been blinking for days",
  "Your characters are waiting",
];

// FIRST_TIME greetings
export const firstTimeGreetings = [
  "Your blank page awaits",
  "Every great writer started here",
  "Chapter one begins now",
  "The cursor blinks with possibility",
  "Your first masterpiece awaits",
  "Welcome to the writer's life",
];

// COMEBACK_KID greetings
export const comebackKidGreetings = [
  "The comeback is REAL",
  "Look who's rebuilding their empire",
  "From ghost to grinder. Respect",
  "Back and better than ever",
  "Redemption arc in progress",
  "The return of a legend",
];

// MILESTONE_WORDS greetings
export const milestoneWordsGreetings: Record<number, string[]> = {
  1000: [
    "1,000 WORDS! Your first major milestone",
    "Four digits! 1K words down",
    "First thousand words complete",
  ],
  5000: [
    "5,000 words! That's a short film right there",
    "5K words and counting",
    "Halfway to a feature? Nice",
  ],
  10000: [
    "10,000 WORDS! Feature-length territory",
    "10K words. This is getting serious",
    "Five digits. Absolutely crushing it",
  ],
  25000: [
    "25K words?! You're writing a novel at this point",
    "25,000 words. Professional territory",
    "A quarter-million characters. Legendary",
  ],
  50000: [
    "50,000 WORDS! NaNoWriMo winner energy",
    "50K. Most writers never get here",
    "Half a hundred thousand words. Incredible",
  ],
};

// MILESTONE_SCREENPLAYS greetings
export const milestoneScreenplaysGreetings: Record<number, string[]> = {
  5: [
    "5 screenplays! You're building a portfolio",
    "Halfway to double digits",
    "Five scripts. A proper collection",
  ],
  10: [
    "DOUBLE DIGITS! 10 screenplays",
    "10 scripts. This is your calling",
    "A decade of stories. Impressive",
  ],
  25: [
    "25 screenplays?! You're prolific",
    "Quarter-century of scripts",
    "25 stories told. You're unstoppable",
  ],
};

// GENRE_BASED greetings
export const genreGreetings: Record<Genre, string[]> = {
  thriller: [
    "Time to build some tension",
    "Your thriller awaits",
    "Let's keep them on the edge of their seats",
    "Suspense mode: activated",
  ],
  comedy: [
    "Time to make 'em laugh",
    "Comedy gold incoming",
    "The jokes await your genius",
    "Ready to write something hilarious?",
  ],
  drama: [
    "Deep emotions await your pen",
    "Drama mode: engaged",
    "Time for some meaningful storytelling",
    "The stage is set for greatness",
  ],
  horror: [
    "Something wicked this way writes",
    "Fear awaits your words",
    "Time to terrify some readers",
    "The darkness calls",
  ],
  'sci-fi': [
    "Worlds await creation",
    "The future is unwritten",
    "Time to explore the cosmos",
    "Science fiction dreams await",
  ],
  romance: [
    "Love stories need you",
    "Hearts await your words",
    "Time to write some chemistry",
    "Romance is in the air",
  ],
  action: [
    "Action sequences await",
    "Time for some explosions",
    "Let's write some adrenaline",
    "The action never stops",
  ],
  fantasy: [
    "Magic awaits your imagination",
    "Fantastical worlds need building",
    "Time to create some wonder",
    "The realm awaits its chronicler",
  ],
};

// WEEKEND_WARRIOR greetings
export const weekendWarriorGreetings = [
  "Weekend writing mode activated",
  "Saturday screenplay session",
  "The weekend belongs to writers",
  "No emails, just scripts",
  "Weekend warrior checking in",
  "The best scripts are written on weekends",
];

// TIME_BASED greetings (fallback)
export const timeBasedGreetings: Record<TimePeriod, string[]> = {
  morning: [
    "FADE IN on a new day",
    "INT. YOUR DESK - MORNING",
    "Rise and write",
    "Morning muse reporting for duty",
    "Coffee's ready, screenplay's waiting",
    "Dawn of a new scene",
    "The early bird writes the script",
    "Fresh morning, fresh pages",
    "Good morning, wordsmith",
    "ACT ONE begins now",
    "Opening credits rolling",
  ],
  afternoon: [
    "Afternoon plot twist incoming",
    "Prime writing hours activated",
    "Post-lunch creativity surge",
    "Midpoint approaching",
    "ACT TWO energy",
    "The B-story develops",
    "Peak writing hours",
    "Momentum builds",
    "The conflict intensifies",
  ],
  evening: [
    "Evening pages await",
    "Golden hour for golden dialogue",
    "The evening draft calls",
    "ACT THREE territory",
    "The climax approaches",
    "Sunset scripting",
    "The evening muse awakens",
    "Resolution time",
    "Wrapping up the day's scenes",
  ],
  night: [
    "Burning the midnight oil",
    "Night owl mode: engaged",
    "The muse works late tonight",
    "The best scripts are written after midnight",
    "Late night legends are written now",
    "Quiet hours, loud ideas",
    "When the world sleeps, writers create",
    "The graveyard shift of creativity",
    "Nocturnal wordsmith activated",
  ],
};
