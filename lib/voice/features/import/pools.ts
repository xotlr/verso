/**
 * Import Quip Pools
 * All copy for the import experience
 */

// Known movie/show titles with custom quips
export const knownTitles: Record<string, string[]> = {
  // Classic Cinema
  'casablanca': [
    "Here's looking at you, script.",
    "Of all the imports, in all the towns, in all the world...",
    "This is the beginning of a beautiful screenplay.",
  ],
  'citizen kane': ["Rosebud.", "The greatest film ever made, apparently."],
  'the graduate': ["Mrs. Robinson, you're trying to import a screenplay.", "Plastics. Wait, wrong advice."],
  'chinatown': ["Forget it Jake, it's Chinatown.", "She's my sister AND my daughter! ...sorry, wrong script."],
  'apocalypse now': ["I love the smell of imports in the morning.", "The horror... the horror... of writer's block."],
  'goodfellas': ["Funny how?", "As far back as I can remember, I always wanted to import screenplays."],
  'shawshank': ["Get busy writing, or get busy dying.", "Hope is a good thing, maybe the best of things."],
  'psycho': ["We all go a little mad sometimes.", "Mother isn't quite herself today."],
  'vertigo': ["Dizzy from all these revisions?"],
  'rashomon': ["Everyone has their own version of this story."],
  'sunset boulevard': ["Alright Mr. DeMille, I'm ready for my close-up."],

  // 80s/90s Classics
  'blade runner': ["I've seen things you people wouldn't believe.", "Time to die... I mean, time to edit.", "More human than human."],
  'breakfast club': ["Don't you forget about this script.", "We're all pretty bizarre. Some of us are just better at hiding it."],
  'ferris bueller': ["Bueller? Bueller? Bueller?", "Life moves pretty fast. Better import this now."],
  'groundhog day': ["Importing this again? It's groundhog day.", "I got you, babe."],
  'princess bride': ["As you wish.", "Inconceivable!", "Have fun storming the castle."],
  'big lebowski': ["The Dude abides.", "That's just, like, your opinion, man."],
  'fargo': ["Oh yah, you betcha.", "Funny-lookin' little screenplay."],
  'pulp fiction': ["Say 'what' again.", "Royale with cheese.", "That's a tasty screenplay."],
  'reservoir dogs': ["Are you gonna bark all day, or are you gonna bite?"],
  'clerks': ["I'm not even supposed to be here today."],
  'office space': ["Yeah, if you could just import that, that'd be great.", "Looks like somebody's got a case of the Mondays."],
  'american beauty': ["This is my first time importing. Please be gentle."],
  'fight club': ["The first rule is: you don't talk about this screenplay.", "I am Jack's imported script."],
  'boogie nights': ["I'm a star. I'm a star. I'm a star."],

  // Spielberg/Lucas Era
  'star wars': ["A long time ago, in a galaxy far, far away...", "I've got a bad feeling about this.", "Do or do not. There is no try."],
  'jaws': ["You're gonna need a bigger monitor.", "We're gonna need a bigger screenplay."],
  'jurassic': ["Life finds a way.", "Clever girl."],
  'indiana jones': ["It belongs in a museum! Or Verso.", "Snakes. Why'd it have to be snakes?"],
  'e.t.': ["E.T. phone home... and import screenplay.", "Ouch."],
  'close encounters': ["This means something."],
  'schindler': ["The list is an absolute good."],
  'raiders': ["It's not the years, honey, it's the mileage."],

  // Sci-Fi Classics
  'matrix': ["There is no spoon.", "Welcome to the real world.", "Whoa."],
  'back to the future': ["Great Scott!", "Where we're going, we don't need roads.", "This is heavy."],
  'terminator': ["I'll be back... to edit this.", "Come with me if you want to write."],
  'alien': ["In space, no one can hear you rewrite.", "Get away from her, you screenplay!"],
  'aliens': ["Game over, man. Game over."],
  '2001': ["I'm sorry Dave, I'm afraid I can't import that.", "My God, it's full of pages."],
  'arrival': ["Language is the first weapon."],
  'her': ["The heart is not like a box that gets filled up."],
  'ex machina': ["One day the AIs are going to look back on us."],
  'children of men': ["Tomorrow's another day."],

  // Superhero Films
  'batman': ["I'm Batman.", "It's not who I am underneath, but what I do that defines me.", "Why so serious?"],
  'dark knight': ["Why so serious?", "You either die a hero...", "Some men just want to watch the world burn."],
  'spider': ["With great power comes great responsibility.", "Pizza time."],
  'avengers': ["Avengers... assemble!", "I can do this all day."],
  'iron man': ["I am Iron Man.", "Genius, billionaire, playboy, philanthropist."],
  'infinity war': ["I don't feel so good...", "Perfectly balanced, as all things should be."],
  'endgame': ["Whatever it takes.", "I am inevitable."],
  'black panther': ["Wakanda forever."],
  'deadpool': ["Maximum effort."],
  'logan': ["So this is what it feels like."],
  'watchmen': ["Who watches the watchmen?"],

  // Fantasy/Adventure
  'lord of the rings': ["One screenplay to rule them all.", "You shall not pass... without reading this.", "My precious..."],
  'hobbit': ["In a hole in the ground there lived a hobbit."],
  'harry potter': ["You're a screenwriter, Harry.", "After all this time? Always."],
  'labyrinth': ["You remind me of the babe."],
  'willow': ["Out of the way, Peck!"],
  'neverending story': ["Say my name!"],
  'game of thrones': ["Winter is coming.", "You know nothing.", "A Lannister always pays his debts."],
  'witch': ["Wouldst thou like to live deliciously?"],

  // Horror
  'shining': ["Here's Johnny!", "All work and no play makes Jack a dull boy."],
  'exorcist': ["The power of Christ compels you!"],
  'halloween': ["It was the boogeyman."],
  'scream': ["Do you like scary movies?", "What's your favorite scary movie?"],
  'get out': ["The Sunken Place."],
  'hereditary': ["I am your mother!"],
  'midsommar': ["It's nice that we all agree."],
  'babadook': ["You can't get rid of the Babadook."],
  'conjuring': ["Based on a true story. This better not be."],
  'sinister': ["Don't watch the tapes."],
  'ring': ["Seven days."],

  // Comedy
  'airplane': ["Surely you can't be serious. I am serious. And don't call me Shirley.", "I picked the wrong week to quit importing screenplays."],
  'anchorman': ["I'm kind of a big deal.", "60% of the time, it works every time."],
  'superbad': ["I am McLovin."],
  'hot fuzz': ["For the greater good."],
  'shaun of the dead': ["You've got red on you."],
  'bridesmaids': ["Help me, I'm poor."],
  'tropic thunder': ["I'm a dude playing a dude disguised as another dude."],
  'zoolander': ["But why male models?"],
  'dumb and dumber': ["So you're telling me there's a chance."],
  'this is spinal tap': ["These go to eleven."],
  'step brothers': ["Did we just become best friends?"],
  'mean girls': ["Stop trying to make fetch happen.", "On Wednesdays we wear pink."],

  // Action/Thriller
  'die hard': ["Yippee-ki-yay.", "Welcome to the party, pal."],
  'mission impossible': ["Your mission, should you choose to accept it..."],
  'bourne': ["I don't know who I am."],
  'john wick': ["Yeah, I'm thinking I'm back.", "People keep asking if I'm back."],
  'mad max': ["What a lovely day!", "Witness me!"],
  'lethal weapon': ["I'm too old for this."],
  'speed': ["Pop quiz, hotshot."],
  'heat': ["Don't let yourself get attached to anything."],
  'godfather': ["I'm gonna make him an offer he can't refuse.", "Leave the gun, take the cannoli."],
  'scarface': ["Say hello to my little friend!"],
  'departed': ["Maybe. Maybe not. Maybe go fuck yourself."],
  'no country': ["What's the most you ever lost on a coin toss?", "Call it."],

  // Drama
  'inception': ["We need to go deeper.", "Is this a dream?"],
  'social network': ["A million dollars isn't cool. You know what's cool? A billion dollars."],
  'there will be blood': ["I drink your milkshake!", "I've abandoned my boy!"],
  'whiplash': ["Not quite my tempo."],
  'network': ["I'm mad as hell and I'm not gonna take this anymore!"],
  'magnolia': ["We may be through with the past, but the past ain't through with us."],
  'american psycho': ["I have to return some videotapes."],
  'moonlight': ["Who is you?"],
  'la la land': ["Here's to the ones who dream."],
  'birdman': ["A thing is a thing, not what is said of that thing."],

  // Animated
  'toy story': ["To infinity and beyond!", "You've got a friend in Verso."],
  'frozen': ["Let it go.", "The cold never bothered me anyway."],
  'shrek': ["Somebody once told me...", "Ogres are like onions."],
  'finding nemo': ["Just keep swimming."],
  'incredibles': ["Where is my super suit?"],
  'ratatouille': ["Anyone can cook. Anyone can write."],
  'wall-e': ["WALL-E."],
  'spirited away': ["Once you've met someone you never really forget them."],
  'spider-verse': ["Anyone can wear the mask."],

  // Recent/Modern
  'everything everywhere': ["Everything Everywhere All At Once. That's a lot.", "Multiversal import detected."],
  'oppenheimer': ["Now I am become Death, destroyer of writer's block.", "I am become screenwriter."],
  'barbie': ["Hi Barbie!", "I'm just Ken."],
  'dune': ["The spice must flow.", "Fear is the mind-killer."],
  'parasite': ["So metaphorical."],
  'joker': ["You wouldn't get it.", "How about another joke, Murray?"],
  'knives out': ["It's a weird case from the start."],
  'marriage story': ["I fall in love with you every day."],
  'uncut gems': ["I disagree!"],
  'promising young woman': ["What are you doing?"],

  // TV Shows
  'breaking bad': ["I am the one who knocks.", "Say my name.", "Yeah, science!"],
  'better call saul': ["It's all good, man."],
  'sopranos': ["Waste management consultant."],
  'wire': ["All in the game, yo.", "You come at the king, you best not miss."],
  'mad men': ["Make it simple, but significant."],
  'succession': ["I'm a cog built to fit only this machine.", "If it is to be said, so it be, so it is."],
  'office': ["That's what she said.", "Identity theft is not a joke, Jim."],
  'parks and rec': ["Treat yo self."],
  'atlanta': ["Paper Boi."],
  'barry': ["Starting now."],
  'fleabag': ["It'll pass."],
  'ted lasso': ["Believe."],
  'stranger things': ["Friends don't lie.", "Mornings are for coffee and contemplation."],
  'black mirror': ["Be right back."],
  'crown': ["Heavy is the head that wears the crown."],
  'handmaid': ["Nolite te bastardes carborundorum."],
  'westworld': ["These violent delights have violent ends."],
  'true detective': ["Time is a flat circle."],
  'big fish': ["Big Fish. Tim Burton mode."],

  // Franchises
  'fast and furious': ["I live my life a quarter mile at a time.", "Family."],
  'fast and the furious': ["I live my life a quarter mile at a time."],
  'bond': ["Bond. James Bond.", "Shaken, not stirred."],
  'pirates of the caribbean': ["Why is the rum always gone?", "This is the day you will always remember."],
  'pirates': ["But you have heard of me."],
  'ghostbusters': ["Who you gonna call?", "I ain't afraid of no ghost."],
  'titanic': ["I'm the king of the world!", "Draw me like one of your French girls."],
  'forrest gump': ["Life is like a box of chocolates.", "Run, Forrest, run!"],
  'wizard of oz': ["We're not in Kansas anymore.", "There's no place like home."],
};

// Pattern-based quips
export const patternQuips = {
  // File naming quirks
  finalFinal: [
    "FINAL_FINAL_FINAL. We've all been there.",
    "How many finals is that now?",
    "This is it. The final final. Until the next one.",
    "Final final. Uh huh. Sure.",
  ],
  copyCopy: [
    "Copy of Copy. The recursion is real.",
    "Ah, the numbered versions. Classic.",
    "File management is hard.",
    "Someone's been busy with duplicates.",
  ],
  versionNumbers: [
    "Version control? Never heard of her.",
    "High version number. Commitment.",
    "That's a lot of versions.",
  ],
  datedFilename: [
    "Dated filename. Organized. I like it.",
    "Someone uses dates. Professional.",
  ],

  // Title structure
  allCaps: [
    "ALL CAPS. Got it, you're serious.",
    "No need to shout.",
    "Caps lock is on. Just so you know.",
  ],
  allLowercase: [
    "all lowercase. bold choice.",
    "no caps. minimalist. respect.",
  ],
  question: ["Good question.", "Is it though?", "Asking the real questions."],
  exclamation: ["Enthusiasm noted!", "Exclamation point. You mean business."],
  colon: ["Colon in the title. Ambitious.", "Subtitle and everything."],

  // Sequel patterns
  part2: [
    "Part 2. Empire Strikes Back energy.",
    "The sequel. Usually better, right?",
    "Part 2. The sequel no one asked for?",
  ],
  part3: ["Part 3. The trilogy completes.", "Third installment. Godfather vibes."],
  returns: ["They always come back.", "The return. Classic sequel title.", "Can't stay away, huh?"],
  yearInTitle: ["Year in the title. Sci-fi or historical?", "Very specific year choice."],

  // Content/genre markers
  untitled: [
    "No title yet. Relatable.",
    "Untitled. The perfectionist's choice.",
    "Ah yes, the classic 'Untitled.'",
    "Untitled. The hardest part is naming it.",
  ],
  pilot: [
    "Pilot episode. Series incoming.",
    "A pilot. Big things start small.",
    "Pilot script. Fingers crossed for Season 2.",
  ],
  episode: ["Another episode. The saga continues.", "Episode import complete."],
  draft: ["Draft mode. This is where the magic happens.", "Every masterpiece starts as a draft."],
  revision: ["Revision. Making it better.", "Polish that gem."],
  finalDraft: ["Final Draft. The software or the status?", "Exporting from Final Draft. Welcome home."],
  shortFilm: ["Short film. Tight and focused.", "Short and sweet."],
  feature: ["Feature length. The real deal."],

  // Genre keywords
  horror: ["Horror script. Spooky.", "Time to scare some people."],
  comedy: ["Comedy. Make 'em laugh.", "Comedy gold incoming."],
  romance: ["Romance. Love is in the air.", "A love story. Classic."],
  thriller: ["Thriller. Edge of your seat stuff.", "Suspense. Keep us guessing."],
  documentary: ["Documentary. Truth is stranger than fiction.", "Doc script. Based on a true story?"],
  musical: ["Musical. Cue the orchestra.", "Break into song!"],
  western: ["Western. Howdy, partner.", "This town ain't big enough..."],
  scifi: ["Sci-fi. The future is now.", "Science fiction. Space, probably."],
  fantasy: ["Fantasy. Magic awaits.", "Once upon a time..."],
  action: ["Action. Explosions incoming.", "Action script. Here we go."],
  noir: ["Noir. Dark and moody.", "Film noir. Shadowy."],
  heist: ["Heist script. One last job.", "The perfect crime. On paper."],
  biopic: ["Biopic. Based on a true story.", "Someone's life story. Heavy."],
  zombie: ["Zombies. Again? Sure, why not.", "The dead rise. Original."],
  vampire: ["Vampires. Do they sparkle?", "Vampire script. Timeless."],
  crime: ["Whodunit.", "Crime drama. The game is afoot."],
  timeTravel: ["Time travel. Paradoxes incoming.", "Time travel. Just don't step on any butterflies."],
  holiday: ["Holiday script. 'Tis the season.", "Christmas movie. Hallmark or Die Hard?"],

  // Pretentious markers
  pretentiousLatin: ["Fancy title. Someone went to film school.", "Latin. Classy."],
  pretentiousPhilosophical: ["Philosophical. Deep.", "That's... quite a word choice."],
};

// Generic fallback quips
export const genericQuips = {
  templates: [
    (title: string) => `"${title}" just landed.`,
    (title: string) => `"${title}" incoming.`,
    (title: string) => `Nice. "${title}" is ready.`,
    (title: string) => `Welcome, "${title}."`,
    (title: string) => `"${title}" has entered the chat.`,
    (title: string) => `Fresh script: "${title}."`,
    (title: string) => `"${title}." Let's see what we've got.`,
    (title: string) => `Importing "${title}"...`,
    (title: string) => `"${title}." Cool.`,
    (title: string) => `Got it. "${title}."`,
    (title: string) => `"${title}." Here we go.`,
    (title: string) => `Alright, "${title}."`,
    (title: string) => `"${title}." Interesting.`,
    (title: string) => `"${title}" is in.`,
  ],
};

// Special cases for edge cases
export const specialCaseQuips = {
  longTitle: [
    "That's... quite a title. Brevity tomorrow.",
    "Long title. You had things to say.",
    "Lot of words in that title.",
  ],
  shortTitle: [
    "One word. Bold.",
    "Short title. Minimal. Respect.",
    "Concise. Nice.",
  ],
  justNumber: [
    "Just a number. Mysterious.",
    "A number. That's it?",
  ],
};
