/**
 * Generates playful comments based on screenplay title during import.
 * Makes the import experience more fun and personalized.
 */

// Known movie/show titles with custom quips
const knownTitles: Record<string, string[]> = {
  'batman': [
    "Ooohhh a Batman script! 🦇",
    "The Dark Knight rises... into Verso",
    "Where does he get those wonderful toys?",
  ],
  'big fish': [
    "Big Fish! Tim Burton vibes incoming ✨",
    "Ooohhh Big Fish? You testing something?",
  ],
  'star wars': [
    "A long time ago, in a galaxy far far away...",
    "May the Force be with this screenplay",
    "I've got a good feeling about this one",
  ],
  'godfather': [
    "An offer we couldn't refuse",
    "Leave the gun, take the screenplay",
  ],
  'pulp fiction': [
    "What does Marcellus Wallace look like?",
    "That's a tasty screenplay!",
  ],
  'inception': [
    "We need to go deeper... into this script",
    "Is this a dream within a dream?",
  ],
  'jaws': [
    "We're gonna need a bigger editor",
    "Just when you thought it was safe to import...",
  ],
  'jurassic': [
    "Life finds a way... into Verso",
    "Clever girl, importing this",
  ],
  'matrix': [
    "Welcome to the real screenplay",
    "There is no spoon, only great dialogue",
  ],
  'titanic': [
    "I'm the king of the world! ...of screenwriting",
    "Draw me like one of your French screenplays",
  ],
  'wizard of oz': [
    "We're not in Kansas anymore",
    "There's no place like Verso",
  ],
  'back to the future': [
    "Great Scott! A new screenplay!",
    "Where we're going, we don't need... wait, we do need good scripts",
  ],
  'avengers': [
    "Avengers... assemble this screenplay!",
    "I could do this all day",
  ],
  'spider': [
    "With great power comes great screenwriting",
    "That's a friendly neighborhood screenplay",
  ],
  'lord of the rings': [
    "One screenplay to rule them all",
    "You shall not pass... without reading this first",
  ],
  'harry potter': [
    "You're a screenwriter, Harry!",
    "Mischief managed ✨",
  ],
  'frozen': [
    "Let it go... into production",
    "The cold never bothered this screenplay anyway",
  ],
  'toy story': [
    "To infinity and beyond! 🚀",
    "You've got a friend in Verso",
  ],
  'shrek': [
    "This screenplay is like an onion",
    "Somebody once told me this was a great script",
  ],
  'joker': [
    "You wouldn't get it...",
    "How about another screenplay, Murray?",
  ],
  'bond': [
    "Screenplay. Just screenplay.",
    "Shaken, not stirred... like this import",
  ],
  'alien': [
    "In space, no one can hear you screen... write",
    "Get away from her, you screenplay!",
  ],
  'terminator': [
    "I'll be back... to edit this",
    "Come with me if you want to write",
  ],
  'forrest gump': [
    "Life is like a box of screenplays",
    "Run, Forrest, run! ...to the editor",
  ],
  'die hard': [
    "Yippee-ki-yay! New screenplay!",
    "Now I have a screenplay. Ho ho ho.",
  ],
  'ghostbusters': [
    "Who ya gonna call? Verso!",
    "I ain't afraid of no screenplay",
  ],
  'pirates': [
    "Why is the screenplay gone?!",
    "This is the day you will always remember",
  ],
  'fight club': [
    "The first rule of this screenplay...",
    "I am Jack's imported script",
  ],
};

// Patterns to check for special responses
const patterns: Array<{ pattern: RegExp; quips: string[] }> = [
  {
    pattern: /untitled/i,
    quips: [
      "A mystery screenplay... intriguing 👀",
      "Untitled? The best ones start that way",
      "No title yet? We love a work in progress",
    ],
  },
  {
    pattern: /pilot/i,
    quips: [
      "A pilot episode! Big things incoming ✈️",
      "Pilot script! Here comes a new series",
      "Starting a series? Let's gooo",
    ],
  },
  {
    pattern: /episode\s*\d/i,
    quips: [
      "Another episode! The saga continues",
      "Episode import complete 📺",
    ],
  },
  {
    pattern: /draft/i,
    quips: [
      "Drafts are where the magic happens",
      "Every masterpiece starts as a draft",
    ],
  },
  {
    pattern: /revision|rev\s*\d/i,
    quips: [
      "Revision time! Making it even better",
      "Polish that gem! ✨",
    ],
  },
  {
    pattern: /short\s*(film)?/i,
    quips: [
      "Short and sweet! 🎬",
      "Great things come in small packages",
    ],
  },
  {
    pattern: /horror/i,
    quips: [
      "Ooh spooky! 👻",
      "Time to terrify some readers",
    ],
  },
  {
    pattern: /comedy/i,
    quips: [
      "Time to make 'em laugh!",
      "Comedy gold incoming 🎭",
    ],
  },
  {
    pattern: /romance|love/i,
    quips: [
      "Love is in the air... and in the script 💕",
      "A love story? How romantic!",
    ],
  },
  {
    pattern: /thriller|suspense/i,
    quips: [
      "Edge of our seats already!",
      "Thriller alert! 🔥",
    ],
  },
  {
    pattern: /documentary|doc\b/i,
    quips: [
      "Truth is stranger than fiction!",
      "Documentary vibes 🎥",
    ],
  },
  {
    pattern: /musical/i,
    quips: [
      "🎵 Break into song! 🎵",
      "Cue the orchestra!",
    ],
  },
  {
    pattern: /western/i,
    quips: [
      "Howdy, partner! 🤠",
      "This town ain't big enough...",
    ],
  },
  {
    pattern: /sci-?fi|science\s*fiction/i,
    quips: [
      "The future is now!",
      "Engaging warp drive 🚀",
    ],
  },
  {
    pattern: /fantasy/i,
    quips: [
      "Magic awaits ✨",
      "Once upon a time...",
    ],
  },
  {
    pattern: /action/i,
    quips: [
      "Lights, camera, ACTION!",
      "Explosions incoming 💥",
    ],
  },
];

// Generic quips when no specific match
const genericQuips = [
  (title: string) => `Ooohhh "${title}"! Let's see what we're working with`,
  (title: string) => `"${title}" just landed! 🎬`,
  (title: string) => `Nice! "${title}" is ready to edit`,
  (title: string) => `Welcome to Verso, "${title}"!`,
  (title: string) => `"${title}" has entered the chat`,
  (title: string) => `Fresh script alert: "${title}"`,
  (title: string) => `"${title}" looking good!`,
  (title: string) => `Ooh what's this? "${title}"!`,
  (title: string) => `"${title}" - love the sound of that`,
  (title: string) => `Importing "${title}"... vibes are immaculate`,
];

/**
 * Get a random item from an array
 */
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a playful comment based on the screenplay title.
 * @param title - The screenplay title
 * @returns A fun, contextual quip about the import
 */
export function getImportQuip(title: string): string {
  if (!title || title.trim() === '') {
    return "New screenplay imported! 🎬";
  }

  const normalizedTitle = title.toLowerCase().trim();

  // Check for known movie/show titles
  for (const [key, quips] of Object.entries(knownTitles)) {
    if (normalizedTitle.includes(key)) {
      return randomPick(quips);
    }
  }

  // Check for patterns
  for (const { pattern, quips } of patterns) {
    if (pattern.test(normalizedTitle)) {
      return randomPick(quips);
    }
  }

  // Fall back to generic quips
  const quipFn = randomPick(genericQuips);
  return quipFn(title);
}

/**
 * Generates a shorter quip suitable for toast notifications.
 * @param title - The screenplay title
 * @returns A concise, fun quip
 */
export function getImportQuipShort(title: string): string {
  const quip = getImportQuip(title);
  // If quip is too long for a toast, truncate intelligently
  if (quip.length > 60) {
    return quip.slice(0, 57) + '...';
  }
  return quip;
}
