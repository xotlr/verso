// Template types for screenplay starting points

export type TemplateType = 'feature' | 'tv-sitcom' | 'tv-drama' | 'pilot' | 'stage' | 'short' | 'blank';

export interface Template {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  content: string;
  metadata: {
    format: string;
    pageCount?: number;
    actStructure?: string;
    features?: string[];
  };
  thumbnail?: string;
}

export const screenplayTemplates: Record<TemplateType, Template> = {
  'feature': {
    id: 'feature',
    name: 'Feature Film',
    description: 'Standard three-act feature film screenplay format',
    type: 'feature',
    metadata: {
      format: 'Feature Film',
      pageCount: 90-120,
      actStructure: '3-Act',
      features: ['Title page', 'Three-act structure', 'Scene headings'],
    },
    content: `



                                 TITLE OF SCREENPLAY


                                          by

                                     Author Name










                                    Draft Date


                                    Contact Info
                                    Phone Number
                                    Email Address









FADE IN:

INT. LOCATION - DAY

Action description. This is where you describe what's happening on screen. Keep it concise and visual.

                         CHARACTER NAME
         Dialogue goes here. Keep it natural and
         character-driven.

                         CHARACTER NAME (CONT'D)
         Continuing dialogue after an action line.

Another action line.

                         CHARACTER NAME
                    (parenthetical)
         Dialogue with a parenthetical direction.

EXT. ANOTHER LOCATION - NIGHT

More action.

CUT TO:

INT. NEW LOCATION - DAY

Action continues.

FADE OUT.


                                    THE END
`
  },

  'tv-sitcom': {
    id: 'tv-sitcom',
    name: 'TV Sitcom (Multi-Camera)',
    description: 'Multi-camera sitcom format with act breaks',
    type: 'tv-sitcom',
    metadata: {
      format: 'TV Sitcom',
      pageCount: 35-45,
      actStructure: '2-Act + Tag',
      features: ['Act breaks', 'TEASER', 'TAG', 'Scene numbers'],
    },
    content: `                            "EPISODE TITLE"

                                      by

                                  Writer Name


COLD OPEN

FADE IN:

INT. LIVING ROOM - DAY

ACTION DESCRIPTION IN ALL CAPS FOR MULTI-CAMERA FORMAT.

                    CHARACTER NAME
          DIALOGUE ALSO IN ALL CAPS.

                    ANOTHER CHARACTER
          MORE DIALOGUE.

CUT TO:

INT. KITCHEN - CONTINUOUS

MORE ACTION.

FADE OUT.

END OF COLD OPEN


                              ACT ONE

FADE IN:

INT. LOCATION - DAY

ACTION CONTINUES.

                    CHARACTER
          DIALOGUE.

FADE OUT.

END OF ACT ONE


                              ACT TWO

FADE IN:

INT. LOCATION - LATER

FINAL ACT ACTION.

FADE OUT.

END OF ACT TWO


                                 TAG

FADE IN:

INT. LOCATION - DAY

SHORT FINAL SCENE.

FADE OUT.

                                    END
`
  },

  'tv-drama': {
    id: 'tv-drama',
    name: 'TV Drama (Single-Camera)',
    description: 'One-hour drama format with act structure',
    type: 'tv-drama',
    metadata: {
      format: 'TV Drama',
      pageCount: 45-60,
      actStructure: '4-5 Act',
      features: ['Act breaks', 'TEASER', 'Scene numbers'],
    },
    content: `                              "EPISODE TITLE"

                            Episode Number (e.g., #101)

                                      by

                                  Writer Name


                                   TEASER

FADE IN:

INT. LOCATION - DAY

Action description.

                         CHARACTER NAME
         Dialogue.

CUT TO:

EXT. LOCATION - DAY

More action to establish the episode.

                                                      FADE OUT.

                             END OF TEASER


                                  ACT ONE

FADE IN:

INT. LOCATION - DAY

Action continues.

                         CHARACTER NAME
         Dialogue.

                                                      FADE OUT.

                              END OF ACT ONE


                                  ACT TWO

FADE IN:

INT. LOCATION - NIGHT

Story develops.

                                                      FADE OUT.

                              END OF ACT TWO


                                 ACT THREE

FADE IN:

INT. LOCATION - DAY

Tension builds.

                                                      FADE OUT.

                             END OF ACT THREE


                                  ACT FOUR

FADE IN:

INT. LOCATION - NIGHT

Resolution.

                                                      FADE OUT.

                              END OF ACT FOUR


                                    END
`
  },

  'pilot': {
    id: 'pilot',
    name: 'TV Pilot',
    description: 'Television pilot episode with TEASER structure',
    type: 'pilot',
    metadata: {
      format: 'TV Pilot',
      pageCount: 50-65,
      actStructure: 'TEASER + 4-5 Acts',
      features: ['World building', 'Character introductions', 'Series premise'],
    },
    content: `                           "SERIES TITLE"

                                 PILOT

                                      by

                                  Creator Name


                                   TEASER

FADE IN:

INT. MAIN LOCATION - DAY

Introduce your world. Establish tone, setting, and your protagonist.

                         MAIN CHARACTER
         Opening dialogue that hints at the
         character's voice and the show's tone.

This TEASER should hook the audience in 5-7 pages.

                                                      FADE OUT.

                             END OF TEASER


                                  ACT ONE

FADE IN:

INT. LOCATION - DAY

Introduce other main characters. Establish relationships and dynamics.

                         CHARACTER NAME
         Dialogue.

Present the pilot's main conflict or mystery.

                                                      FADE OUT.

                              END OF ACT ONE


                                  ACT TWO

FADE IN:

INT. LOCATION - LATER

Complicate the situation. Raise the stakes.

                         CHARACTER NAME
         Dialogue that reveals character depth.

First major turning point.

                                                      FADE OUT.

                              END OF ACT TWO


                                 ACT THREE

FADE IN:

INT. LOCATION - NIGHT

Characters face obstacles. Series mythology/world expands.

                         CHARACTER NAME
         Dialogue.

                                                      FADE OUT.

                             END OF ACT THREE


                                  ACT FOUR

FADE IN:

INT. LOCATION - LATER

Resolve the pilot's A-story while setting up series potential.

                         CHARACTER NAME
         Dialogue that hints at future episodes.

End on a moment that makes viewers want more.

                                                      FADE OUT.

                              END OF ACT FOUR


                                    END
`
  },

  'stage': {
    id: 'stage',
    name: 'Stage Play',
    description: 'Traditional stage play format',
    type: 'stage',
    metadata: {
      format: 'Stage Play',
      actStructure: '1-3 Act',
      features: ['Scene descriptions', 'Stage directions', 'Character list'],
    },
    content: `                              PLAY TITLE

                                      by

                                  Playwright Name


                            CHARACTERS
                            (in order of appearance)

CHARACTER ONE - Brief description (age, traits)
CHARACTER TWO - Brief description
CHARACTER THREE - Brief description


                            TIME AND PLACE

Time: Present day (or specify)
Place: Location description


                                  ACT ONE

                                 SCENE 1

                    (Setting description. Describe the stage,
                    furniture, doors, windows, etc.)

                    (AT RISE: Describe what's happening as
                    the curtain opens)

CHARACTER ONE
         (stage direction in parenthetical)
Dialogue begins here. Stage play dialogue is typically indented less than screenplay dialogue.

CHARACTER TWO
         (entering from stage left)
Response dialogue.

                    (Stage directions in the middle of dialogue
                    are set apart like this)

CHARACTER ONE
Continuing dialogue after a stage direction.

                                 SCENE 2

                    (New setting if needed, or SAME as previous)

Action and dialogue continue.

                                                      (CURTAIN)

                             END OF ACT ONE


                                  ACT TWO

                                 SCENE 1

                    (Setting description)

                    (AT RISE: Description)

Dialogue continues.

                                                      (CURTAIN)

                                    END
`
  },

  'short': {
    id: 'short',
    name: 'Short Film',
    description: 'Short film format (5-30 minutes)',
    type: 'short',
    metadata: {
      format: 'Short Film',
      pageCount: 5-30,
      actStructure: 'Simple 3-Act or 2-Act',
      features: ['Concise storytelling', 'Focused concept'],
    },
    content: `                              FILM TITLE

                                      by

                                  Writer Name




FADE IN:

INT. LOCATION - DAY

Action description. Short films require economy - every line matters.

                         CHARACTER NAME
         Dialogue should be minimal and impactful.

Focus on a single, clear concept or moment.

EXT. LOCATION - LATER

Visual storytelling is especially important in shorts.

                         CHARACTER NAME
         Brief dialogue.

Build to a clear climax or revelation.

INT. LOCATION - DAY

Resolution. Keep it tight and meaningful.

FADE OUT.


                                  THE END
`
  },

  'blank': {
    id: 'blank',
    name: 'Blank Screenplay',
    description: 'Start from scratch with basic formatting',
    type: 'blank',
    metadata: {
      format: 'Standard',
      features: ['Minimal template', 'Maximum flexibility'],
    },
    content: `FADE IN:

INT. LOCATION - DAY



FADE OUT.
`
  }
};
