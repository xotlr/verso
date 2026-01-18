/**
 * Greeting Pools
 * Collections of contextual greetings organized by category
 *
 * Voice: Like Caine but less unhinged. Casual. Dry. Sometimes weird. Never corporate.
 * Encouraged: "Nice." "Respect." "Let's go." "Classic." "Interesting." "Fair."
 * Avoid: "Amazing!" "You got this!" "Congratulations!" "Fantastic!"
 */

import type { Genre } from './types';
import type { TimePeriod } from '../../types';

// REFRESH_ADDICT greetings - escalating snark for compulsive refreshers
// Indexed by refresh count (2+)
export const refreshAddictGreetings: Record<number, string[]> = {
  2: [
    "Back already?",
    "Miss us?",
    "That was quick",
  ],
  3: [
    "Still here?",
    "You again",
    "Checking in?",
  ],
  4: [
    "Refreshing doesn't write the screenplay",
    "The page isn't changing",
    "Still the same Verso",
  ],
  5: [
    "We get it",
    "The refresh button isn't a writing tool",
    "This is becoming a pattern",
  ],
  6: [
    "At this point, just write something",
    "The blank page is still there. Waiting",
    "Refresh count: concerning",
  ],
  7: [
    "Okay. This is a lot",
    "Are you procrastinating?",
    "The screenplay isn't going to write itself",
  ],
  8: [
    "...",
    "We're worried about you",
    "This is now a cry for help",
  ],
};

// GREETING_POKE responses - when user keeps clicking on the greeting
// Escalating confusion/exasperation
export const greetingPokeResponses: Record<number, string[]> = {
  1: [
    "Yes?",
    "Hi",
    "Can I help you?",
    "Hello",
  ],
  2: [
    "Still me",
    "What",
    "You clicked again",
    "Yep",
  ],
  3: [
    "Why are you clicking this",
    "It's just a greeting",
    "This isn't a button",
    "What do you expect to happen",
  ],
  4: [
    "Stop",
    "Please",
    "This is weird",
    "What are you doing",
  ],
  5: [
    "Okay seriously",
    "This is a greeting, not a game",
    "You're making this awkward",
    "There's nothing here",
  ],
  6: [
    "...",
    "Are you okay?",
    "Should I be concerned?",
    "This is a lot",
  ],
  7: [
    "I'm just text",
    "There's no secret here",
    "You're scaring me",
    "Wtf",
  ],
  8: [
    "Fine. You win. There's nothing",
    "Congratulations on your persistence I guess",
    "Achievement unlocked: clicked a greeting 8 times",
    "Go write something instead",
  ],
};

// GHOST greetings - scaled by days absent (3-4 days)
export const ghostGreetingsShort = [
  "Oh, so you DO remember this exists",
  "The prodigal writer returns",
  "Well well well",
  "Back from hiatus",
  "Look who remembered they have a screenplay",
  "CUT TO: You, finally",
  "There you are",
  "The scripts were asking about you",
];

// GHOST greetings (5-6 days absent)
export const ghostGreetingsMedium = [
  "*blows dust off keyboard*",
  "The scripts were getting nervous",
  "Your characters staged an intervention",
  "INT. VERSO - DAY — You're back",
  "Production was on hold. You're cleared",
  "The blank pages held a vigil",
  "We were starting to worry",
  "Almost sent a search party",
];

// GHOST greetings (7+ days absent)
export const ghostGreetingsLong = [
  "It's been a while. A LONG while",
  "Your scripts almost called their agents",
  "The blank pages unionized",
  "Did you get lost?",
  "FADE IN on a very overdue return",
  "Principal photography resumes. Finally",
  "The hiatus is over",
  "Back from the dead. Classic",
];

// LEGENDARY greetings (7+ day streak)
export const legendaryGreetings = [
  "UNSTOPPABLE",
  "At this point you're just showing off",
  "Seven days. Ridiculous",
  "Legend. Absolute legend",
  "The Academy is watching",
  "This is getting absurd (complimentary)",
  "Making the rest of us look bad",
  "Peak performance. No notes",
  "Okay, now you're just flexing",
  "Put it in the trades",
];

// NEARLY_LEGENDARY greetings (6-day streak)
export const nearlyLegendaryGreetings = [
  "One more day for legendary",
  "Tomorrow you become a legend",
  "Six days. The finale approaches",
  "So close. One more",
  "Almost legendary",
  "The streak gods are watching",
  "Six down. One to go",
  "The home stretch",
];

// ON_FIRE greetings (3-6 day streak)
export const onFireGreetings = [
  "The streak continues",
  "Momentum",
  "Consistent. Nice",
  "Look at you",
  "Keep it moving",
  "Respect",
  "There's that discipline",
  "Rolling",
];

// RETURNING_CHAMP greetings
export const returningChampGreetings = [
  "New personal best",
  "This is your LONGEST STREAK EVER",
  "Personal record territory",
  "Historic. Put it in the trades",
  "The champion returns",
  "Career high",
  "Best streak yet",
];

// STREAK_BROKEN greetings
export const streakBrokenGreetings = [
  "The streak's gone. But you're here",
  "Yesterday happened. New scene",
  "We don't talk about yesterday",
  "Fresh start. Minimal judgment",
  "Counter reset. Talent didn't",
  "Day one again. Make it count",
  "Clean slate",
  "The sequel begins",
];

// CREATOR_NOT_WRITER greetings
export const creatorNotWriterGreetings = [
  "Another new screenplay? How about finishing one?",
  "I see you like the 'New' button",
  "Lots of FADE INs. Not many FADE OUTs",
  "Interesting strategy",
  "Your drafts are staging a mutiny",
  "Collection growing. Word count... less so",
  "More files than pages. Bold",
  "The new project smell is intoxicating, huh",
];

// CRUSHING_IT greetings
export const crushingItGreetings = [
  "Save some pages for the rest of us",
  "At this rate you'll wrap by Tuesday",
  "The keyboard needs a stunt double",
  "Writing rampage",
  "Production is ahead of schedule",
  "Slow down, Sorkin",
  "Someone's been busy",
  "The output is alarming (good alarming)",
];

// SLACKING greetings
export const slackingGreetings = [
  "Your daily goal filed a complaint",
  "The blank page is giving you a look",
  "Just a few words. That's the ask",
  "The cursor's been blinking for days",
  "Your characters called a meeting about you",
  "The page is right there",
  "Any time now",
  "We'll wait",
];

// FIRST_TIME greetings
export const firstTimeGreetings = [
  "FADE IN on a new writer",
  "Page one",
  "Here we go",
  "The cursor blinks. Go",
  "Your first screenplay awaits",
  "Welcome to the craft",
  "Every script starts somewhere",
  "Let's write something",
  "The blank page. Your move",
];

// COMEBACK_KID greetings
export const comebackKidGreetings = [
  "The comeback is real",
  "Back in production",
  "From hiatus to grind. Respect",
  "Redemption arc",
  "Back on set",
  "The sequel nobody expected",
  "Return of the writer",
  "Act two begins",
];

// MILESTONE_WORDS greetings
export const milestoneWordsGreetings: Record<number, string[]> = {
  1000: [
    "1,000 words. First milestone",
    "Four digits",
    "1K down",
    "First thousand. Nice",
    "That's a scene. Maybe two",
    "Crossed the 1K threshold",
    "First K in the bank",
    "A thousand words. Not bad",
  ],
  5000: [
    "5,000 words. Short film territory",
    "5K",
    "Solid chunk of work there",
    "Getting somewhere",
    "Half a short. Or a solid sequence",
    "5K words. That's commitment",
    "Five thousand. Momentum",
    "Officially not messing around",
  ],
  10000: [
    "10,000 words. Feature territory",
    "10K. Serious now",
    "Five digits",
    "That's a screenplay",
    "Ten thousand words of story",
    "Feature-length effort",
    "The big 10K",
    "A real body of work now",
  ],
  25000: [
    "25K words. Prolific",
    "25,000 words. Professional output",
    "Quarter-million characters",
    "That's real volume",
    "Twenty-five thousand words. Career mode",
    "Serious writer territory",
    "The output is concerning (complimentary)",
    "That's multiple features worth",
  ],
  50000: [
    "50,000 words. Career numbers",
    "50K. Most never get here",
    "Half a hundred thousand",
    "Legendary output",
    "Fifty thousand. Put it on the resume",
    "That's NaNoWriMo territory",
    "Half a hundred K",
    "Professional-grade volume",
  ],
};

// MILESTONE_SCREENPLAYS greetings
export const milestoneScreenplaysGreetings: Record<number, string[]> = {
  5: [
    "5 screenplays. Portfolio territory",
    "Halfway to double digits",
    "Five scripts",
    "Proper collection now",
    "A handful of stories",
    "The collection grows",
    "Five down. Many more to go",
    "That's a real portfolio",
  ],
  10: [
    "DOUBLE DIGITS. 10 screenplays",
    "10 scripts. This is your thing",
    "Ten stories",
    "Officially prolific",
    "Double digit screenplays",
    "The ten screenplay club",
    "That's a decade of ideas",
    "Ten scripts. Respect",
  ],
  25: [
    "25 screenplays",
    "Quarter-century of scripts",
    "25 stories told",
    "That's a body of work",
    "Twenty-five. Veteran status",
    "A quarter hundred scripts",
    "Career-level output",
    "The archive grows legendary",
  ],
};

// GENRE_BASED greetings
export const genreGreetings: Record<Genre, string[]> = {
  thriller: [
    "Ratchet up the tension",
    "Your thriller awaits",
    "Keep them guessing",
    "The clock is ticking",
    "Raise the stakes",
    "Plot twist time",
    "Trust no one",
    "Hitchcock energy",
    "Something's not right. Write that",
    "The tension builds",
  ],
  comedy: [
    "Make 'em laugh",
    "Comedy's hard",
    "Land those jokes",
    "Timing",
    "Set up. Beat. Payoff",
    "Wilder energy",
    "Keep it snappy",
    "The comedic timing awaits",
    "Funny is hard. Respect",
    "Write something ridiculous",
  ],
  drama: [
    "The heavy lifting",
    "Make them feel something",
    "Subtext",
    "The quiet moments",
    "Every line earns its place",
    "Character work",
    "Go deep",
    "Oscar bait incoming",
    "The emotions won't write themselves",
    "Time for the real stuff",
  ],
  horror: [
    "Something wicked this way writes",
    "Time to terrify",
    "What lurks in the shadows?",
    "Dread builds slowly",
    "The monster's restless",
    "Carpenter vibes",
    "Make them check behind the door",
    "Slow burn or jump scare?",
    "Fear is the goal",
    "Creep them out",
  ],
  'sci-fi': [
    "Worlds await",
    "The future is unwritten",
    "Explore the cosmos",
    "What if?",
    "Build tomorrow",
    "High concept",
    "The rules of your universe",
    "Speculate wildly",
    "The unknown beckons",
    "Science. Fiction. Go",
  ],
  romance: [
    "Write some chemistry",
    "Will they or won't they?",
    "The meet-cute awaits",
    "Tension. Yearning",
    "Love is complicated",
    "Ephron energy",
    "The banter needs you",
    "Swoon material incoming",
    "Make them root for it",
    "The longing. Write it",
  ],
  action: [
    "Action sequences await",
    "Controlled chaos",
    "Keep it moving",
    "Set pieces",
    "Momentum",
    "The stunt coordinator approves",
    "Less talking. More explosions",
    "Big budget energy",
    "Choreograph some mayhem",
    "Things need to happen",
  ],
  fantasy: [
    "Worlds need building",
    "Create some wonder",
    "Dragons don't write themselves",
    "The lore awaits",
    "World-building day",
    "Myth and legend",
    "The quest continues",
    "Magic systems don't design themselves",
    "Build something impossible",
    "The realm needs you",
  ],
};

// WEEKEND_WARRIOR greetings
export const weekendWarriorGreetings = [
  "Weekend pages",
  "Saturday screenplay session",
  "The weekend belongs to the script",
  "No emails. Just scenes",
  "Weekend mode",
  "Two days. Use them",
  "The weekend grind",
  "Time to write",
];

// TIME_BASED greetings (fallback)
export const timeBasedGreetings: Record<TimePeriod, string[]> = {
  morning: [
    "FADE IN on a new day",
    "INT. YOUR DESK - MORNING",
    "Rise and write",
    "Morning pages",
    "Coffee's ready. Screenplay's waiting",
    "Fresh morning",
    "The early draft",
    "Morning. Let's work",
    "ACT ONE",
    "Call time",
    "A new day. A new scene",
    "Morning light. Fresh pages",
  ],
  afternoon: [
    "Afternoon. Prime hours",
    "Post-lunch productivity",
    "Midpoint",
    "ACT TWO energy",
    "The B-story needs you",
    "Momentum",
    "The conflict's building",
    "Prime time",
    "Plenty of day left",
    "The afternoon push",
    "Peak hours",
  ],
  evening: [
    "Evening pages",
    "Golden hour for dialogue",
    "ACT THREE",
    "The climax approaches",
    "Evening draft",
    "Resolution's in sight",
    "Wrap the day's scenes",
    "Last light. Write",
    "The evening push",
    "Before the day ends",
    "One more scene",
  ],
  night: [
    "Burning the midnight oil",
    "Night owl mode",
    "The late shift",
    "The best drafts happen now",
    "Quiet hours. Loud ideas",
    "When the world sleeps",
    "The graveyard shift",
    "Late night. No distractions",
    "Nocturnal productivity",
    "The night belongs to writers",
    "After midnight",
  ],
};

// SCREENPLAY_REFERENCE templates - personalized based on user's work
// Use {title}, {character}, {location} as placeholders
export const screenplayReferenceTemplates = {
  // Title-based (when we have a screenplay title)
  title: [
    'Back to "{title}"',
    '"{title}" awaits',
    'Where were we with "{title}"?',
    '"{title}" isn\'t going to write itself',
    'The "{title}" draft needs you',
    'Picking up "{title}"',
    '"{title}". Scene one. Action',
    'Previously on "{title}"...',
  ],
  // Character-based (when we have character names)
  character: [
    "{character}'s waiting",
    "What's {character} up to today?",
    "{character} needs dialogue",
    "Back to {character}'s story",
    "{character} has been quiet. Fix that",
    "Time to torture {character} a little",
    "{character}'s arc continues",
    "What happens to {character} next?",
  ],
  // Location-based (when we have locations)
  location: [
    "Back to {location}",
    "INT. {location} - NOW",
    "Return to {location}",
    "{location} awaits",
    "Scene: {location}. Action",
    "We left off at {location}",
  ],
  // Logline teases (when we have a logline)
  logline: [
    "The story continues",
    "Where were we?",
    "Back to the drama",
    "The plot thickens",
    "Act two problems",
  ],
};

// =============================================================================
// ACTIVITY-AWARE CONTEXTUAL GREETINGS
// =============================================================================

// WROTE_YESTERDAY - User wrote meaningful amount yesterday
// Uses {wordCount} and {title} placeholders
export const wroteYesterdayGreetings = [
  '{wordCount} words on "{title}" yesterday. Nice momentum',
  '"{title}" grew by {wordCount} words. Keep that energy',
  'Yesterday: {wordCount} words on "{title}". Today: ?',
  'You left "{title}" at {wordCount} words. Pick up where you left off',
  '"{title}" — {wordCount} words and counting',
  'Last session: {wordCount} words. "{title}" remembers',
  'The {wordCount}-word day. "{title}" noticed',
  '"{title}" at {wordCount}. More incoming?',
];

// CREATED_PROJECT - User created a new project recently
// Uses {projectName} placeholder
export const createdProjectGreetings = [
  '"{projectName}" is ready. What goes in first?',
  'New project: "{projectName}". Fresh start',
  '"{projectName}" exists now. Time to fill it',
  'Project created. "{projectName}" awaits its first draft',
  '"{projectName}" — the collection begins',
  'Fresh project. "{projectName}" needs scripts',
  '"{projectName}". Empty for now. Fix that',
  'The "{projectName}" era begins',
];

// WORKING_ON_SERIES - User has active series episode
// Uses {seriesTitle} and {title} (episode) placeholders
export const workingOnSeriesGreetings = [
  '"{seriesTitle}" — "{title}" is waiting',
  'Episode "{title}" of "{seriesTitle}". Where were we?',
  'Back to "{seriesTitle}"? "{title}" needs you',
  '"{title}" ({seriesTitle}) at {wordCount} words',
  '"{seriesTitle}" production continues. "{title}" up next',
  'The "{seriesTitle}" writers room is open',
  '"{title}" — part of the "{seriesTitle}" saga',
  'Previously on "{seriesTitle}"... now "{title}"',
];

// SPECIFIC_PROGRESS - Show specific word count on recent doc
// Uses {title} and {wordCount} placeholders
export const specificProgressGreetings = [
  '"{title}" — {wordCount} words and counting',
  '{wordCount} words into "{title}". What happens next?',
  '"{title}" sits at {wordCount} words. Add more',
  'Last seen: "{title}" at {wordCount} words',
  '"{title}". {wordCount} words deep',
  'Current progress: "{title}" — {wordCount}',
  '{wordCount} words. "{title}" continues',
  'The "{title}" draft: {wordCount} words',
];
