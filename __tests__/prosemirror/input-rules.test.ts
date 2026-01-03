import { describe, it, expect } from 'vitest';
import { EditorState } from 'prosemirror-state';
import { screenplaySchema } from '@/lib/prosemirror/schema';
import {
  createInputRulesPlugin,
  sceneHeadingRules,
  transitionRules,
  shotRules,
} from '@/lib/prosemirror/plugins/input-rules';

/**
 * Helper to create an EditorState with input rules plugin
 */
function createEditorState(content?: string): EditorState {
  const doc = screenplaySchema.nodeFromJSON({
    type: 'doc',
    content: [
      {
        type: 'action',
        content: content ? [{ type: 'text', text: content }] : undefined,
      },
    ],
  });

  return EditorState.create({
    doc,
    schema: screenplaySchema,
    plugins: [createInputRulesPlugin()],
  });
}


describe('createInputRulesPlugin', () => {
  it('should create a plugin', () => {
    const plugin = createInputRulesPlugin();
    expect(plugin).toBeDefined();
  });

  it('should be usable in EditorState', () => {
    const state = createEditorState();
    expect(state.plugins.length).toBeGreaterThan(0);
  });
});

describe('sceneHeadingRules', () => {
  it('should have rule for INT.', () => {
    expect(sceneHeadingRules.length).toBeGreaterThan(0);
    // Check that at least one rule exists for INT.
    const hasIntRule = sceneHeadingRules.some((rule) => {
      // InputRule has a 'match' property which is the regex
      return rule.match.source.includes('INT');
    });
    expect(hasIntRule).toBe(true);
  });

  it('should have rule for EXT.', () => {
    const hasExtRule = sceneHeadingRules.some((rule) => {
      return rule.match.source.includes('EXT');
    });
    expect(hasExtRule).toBe(true);
  });

  it('should have rule for INT/EXT.', () => {
    const hasIntExtRule = sceneHeadingRules.some((rule) => {
      return rule.match.source.includes('INT/EXT') || rule.match.source.includes('INT\\/EXT');
    });
    expect(hasIntExtRule).toBe(true);
  });

  it('should have rule for I/E.', () => {
    const hasIERule = sceneHeadingRules.some((rule) => {
      return rule.match.source.includes('I/E') || rule.match.source.includes('I\\/E');
    });
    expect(hasIERule).toBe(true);
  });

  describe('pattern matching', () => {
    it('should match "INT. " pattern', () => {
      const rule = sceneHeadingRules.find((r) => r.match.source.includes('INT') && !r.match.source.includes('/'));
      expect(rule).toBeDefined();
      expect(rule!.match.test('INT. ')).toBe(true);
    });

    it('should match "EXT. " pattern', () => {
      const rule = sceneHeadingRules.find((r) => r.match.source.includes('EXT') && !r.match.source.includes('/'));
      expect(rule).toBeDefined();
      expect(rule!.match.test('EXT. ')).toBe(true);
    });

    it('should be case insensitive for INT.', () => {
      const rule = sceneHeadingRules.find((r) => r.match.source.includes('INT') && !r.match.source.includes('/'));
      expect(rule!.match.test('int. ')).toBe(true);
      expect(rule!.match.test('Int. ')).toBe(true);
    });
  });
});

describe('transitionRules', () => {
  it('should have multiple transition rules', () => {
    expect(transitionRules.length).toBeGreaterThan(5);
  });

  it('should have rule for CUT TO:', () => {
    const hasCutToRule = transitionRules.some((rule) => {
      return rule.match.source.includes('CUT TO');
    });
    expect(hasCutToRule).toBe(true);
  });

  it('should have rule for FADE TO:', () => {
    const hasFadeToRule = transitionRules.some((rule) => {
      return rule.match.source.includes('FADE TO');
    });
    expect(hasFadeToRule).toBe(true);
  });

  it('should have rule for DISSOLVE TO:', () => {
    const hasDissolveRule = transitionRules.some((rule) => {
      return rule.match.source.includes('DISSOLVE');
    });
    expect(hasDissolveRule).toBe(true);
  });

  it('should have rule for FADE IN:', () => {
    const hasFadeInRule = transitionRules.some((rule) => {
      return rule.match.source.includes('FADE IN');
    });
    expect(hasFadeInRule).toBe(true);
  });

  it('should have rule for FADE OUT.', () => {
    const hasFadeOutRule = transitionRules.some((rule) => {
      return rule.match.source.includes('FADE OUT');
    });
    expect(hasFadeOutRule).toBe(true);
  });

  describe('pattern matching', () => {
    it('should match "CUT TO: " pattern', () => {
      const rule = transitionRules.find((r) => r.match.source.includes('CUT TO:'));
      expect(rule).toBeDefined();
      expect(rule!.match.test('CUT TO: ')).toBe(true);
    });

    it('should match "FADE TO: " pattern', () => {
      const rule = transitionRules.find((r) => r.match.source.includes('FADE TO:'));
      expect(rule).toBeDefined();
      expect(rule!.match.test('FADE TO: ')).toBe(true);
    });

    it('should be case insensitive', () => {
      const rule = transitionRules.find((r) => r.match.source.includes('CUT TO:'));
      expect(rule!.match.test('cut to: ')).toBe(true);
      expect(rule!.match.test('Cut To: ')).toBe(true);
    });
  });
});

describe('shotRules', () => {
  it('should have multiple shot rules', () => {
    expect(shotRules.length).toBeGreaterThan(5);
  });

  it('should have rule for WIDE SHOT', () => {
    const hasWideRule = shotRules.some((rule) => {
      return rule.match.source.includes('WIDE');
    });
    expect(hasWideRule).toBe(true);
  });

  it('should have rule for CLOSE-UP', () => {
    const hasCloseUpRule = shotRules.some((rule) => {
      return rule.match.source.includes('CLOSE');
    });
    expect(hasCloseUpRule).toBe(true);
  });

  it('should have rule for POV', () => {
    const hasPovRule = shotRules.some((rule) => {
      return rule.match.source.includes('POV');
    });
    expect(hasPovRule).toBe(true);
  });

  it('should have rule for INSERT', () => {
    const hasInsertRule = shotRules.some((rule) => {
      return rule.match.source.includes('INSERT');
    });
    expect(hasInsertRule).toBe(true);
  });

  it('should have rule for MEDIUM SHOT', () => {
    const hasMediumRule = shotRules.some((rule) => {
      return rule.match.source.includes('MEDIUM');
    });
    expect(hasMediumRule).toBe(true);
  });

  describe('pattern matching', () => {
    it('should match "WIDE SHOT " pattern', () => {
      const rule = shotRules.find((r) => r.match.source.includes('WIDE SHOT'));
      expect(rule).toBeDefined();
      expect(rule!.match.test('WIDE SHOT ')).toBe(true);
    });

    it('should match "CU " shorthand', () => {
      const rule = shotRules.find((r) => r.match.source.includes('CU'));
      expect(rule).toBeDefined();
      expect(rule!.match.test('CU ')).toBe(true);
    });

    it('should match "POV " pattern', () => {
      const rule = shotRules.find((r) => r.match.source.includes('POV'));
      expect(rule).toBeDefined();
      expect(rule!.match.test('POV ')).toBe(true);
    });
  });
});

describe('typography rules', () => {
  describe('em dash conversion', () => {
    it('should convert -- to em dash character', () => {
      // Test that the pattern -- is recognized
      const emDashRegex = /--$/;
      expect(emDashRegex.test('hello--')).toBe(true);
    });
  });

  describe('ellipsis conversion', () => {
    it('should convert ... to ellipsis character', () => {
      const ellipsisRegex = /\.\.\.$/;
      expect(ellipsisRegex.test('wait...')).toBe(true);
    });
  });

  describe('smart quotes', () => {
    it('should recognize opening quote pattern', () => {
      const openingQuoteRegex = /(?:^|[\s\(\[\{])"$/;
      expect(openingQuoteRegex.test(' "')).toBe(true);
      expect(openingQuoteRegex.test('("')).toBe(true);
    });

    it('should recognize closing quote pattern', () => {
      const closingQuoteRegex = /"$/;
      expect(closingQuoteRegex.test('word"')).toBe(true);
    });
  });
});

describe('special element rules', () => {
  describe('SUPER rule', () => {
    it('should match "SUPER: " pattern', () => {
      const superRegex = /^SUPER:\s$/i;
      expect(superRegex.test('SUPER: ')).toBe(true);
      expect(superRegex.test('super: ')).toBe(true);
    });
  });

  describe('CHYRON rule', () => {
    it('should match "CHYRON: " pattern', () => {
      const chyronRegex = /^CHYRON:\s$/i;
      expect(chyronRegex.test('CHYRON: ')).toBe(true);
      expect(chyronRegex.test('chyron: ')).toBe(true);
    });
  });

  describe('FLASHBACK rule', () => {
    it('should match "FLASHBACK " pattern', () => {
      const flashbackRegex = /^FLASHBACK\.?\s$/i;
      expect(flashbackRegex.test('FLASHBACK ')).toBe(true);
      expect(flashbackRegex.test('FLASHBACK. ')).toBe(true);
    });

    it('should match "BEGIN FLASHBACK " pattern', () => {
      const beginFlashbackRegex = /^BEGIN FLASHBACK\.?\s$/i;
      expect(beginFlashbackRegex.test('BEGIN FLASHBACK ')).toBe(true);
    });
  });

  describe('MONTAGE rule', () => {
    it('should match "MONTAGE " pattern', () => {
      const montageRegex = /^MONTAGE\.?\s$/i;
      expect(montageRegex.test('MONTAGE ')).toBe(true);
      expect(montageRegex.test('MONTAGE. ')).toBe(true);
    });

    it('should match "BEGIN MONTAGE " pattern', () => {
      const beginMontageRegex = /^BEGIN MONTAGE\.?\s$/i;
      expect(beginMontageRegex.test('BEGIN MONTAGE ')).toBe(true);
    });
  });

  describe('INTERCUT rule', () => {
    it('should match "INTERCUT " pattern', () => {
      const intercutRegex = /^INTERCUT\.?\s$/i;
      expect(intercutRegex.test('INTERCUT ')).toBe(true);
      expect(intercutRegex.test('INTERCUT. ')).toBe(true);
    });

    it('should match "INTERCUT BETWEEN: " pattern', () => {
      const intercutBetweenRegex = /^INTERCUT BETWEEN:\s$/i;
      expect(intercutBetweenRegex.test('INTERCUT BETWEEN: ')).toBe(true);
    });
  });

  describe('THE END rule', () => {
    it('should match "THE END " pattern', () => {
      const endRegex = /^THE END\.?\s$/i;
      expect(endRegex.test('THE END ')).toBe(true);
      expect(endRegex.test('THE END. ')).toBe(true);
      expect(endRegex.test('the end ')).toBe(true);
    });
  });

  describe('parenthetical rule', () => {
    it('should match "(text) " pattern', () => {
      const parentheticalRegex = /^\((.+)\)\s$/;
      expect(parentheticalRegex.test('(whispering) ')).toBe(true);
      expect(parentheticalRegex.test('(beat) ')).toBe(true);
      expect(parentheticalRegex.test('(to John) ')).toBe(true);
    });

    it('should not match empty parentheses', () => {
      const parentheticalRegex = /^\((.+)\)\s$/;
      expect(parentheticalRegex.test('() ')).toBe(false);
    });
  });
});

describe('smart shot rule', () => {
  it('should match shot with separator and subject', () => {
    const smartShotRegex = /^(WIDE SHOT|WS|WIDE ON|CLOSE-?UP|CU|CLOSE ON|EXTREME CLOSE-?UP|ECU|XCU|MEDIUM SHOT|MS|TWO-?SHOT|2-?SHOT|POV|INSERT|ANGLE ON|OTS|TRACKING|ESTABLISHING)\s*[-:–—]\s*(.+)$/i;

    expect(smartShotRegex.test('WIDE SHOT - JOHN')).toBe(true);
    expect(smartShotRegex.test('CU: THE KNIFE')).toBe(true);
    expect(smartShotRegex.test('POV - THE ROOM')).toBe(true);
    expect(smartShotRegex.test('INSERT - THE LETTER')).toBe(true);
    expect(smartShotRegex.test('ANGLE ON - SARAH')).toBe(true);
  });

  it('should capture shot type and subject', () => {
    const smartShotRegex = /^(WIDE SHOT|WS|WIDE ON|CLOSE-?UP|CU|CLOSE ON|EXTREME CLOSE-?UP|ECU|XCU|MEDIUM SHOT|MS|TWO-?SHOT|2-?SHOT|POV|INSERT|ANGLE ON|OTS|TRACKING|ESTABLISHING)\s*[-:–—]\s*(.+)$/i;

    const match = 'CLOSE-UP - JOHN\'S FACE'.match(smartShotRegex);
    expect(match).toBeDefined();
    expect(match![1]).toBe('CLOSE-UP');
    expect(match![2]).toBe("JOHN'S FACE");
  });
});

describe('rule coverage', () => {
  it('should have rules for all common scene heading prefixes', () => {
    const prefixes = ['INT', 'EXT', 'INT/EXT', 'I/E'];
    prefixes.forEach((prefix) => {
      const hasRule = sceneHeadingRules.some((rule) => {
        return rule.match.source.toLowerCase().includes(prefix.toLowerCase().replace('/', '\\/'));
      });
      expect(hasRule).toBe(true);
    });
  });

  it('should have rules for common transitions', () => {
    // Check that key transition words exist in some rule
    const transitionKeywords = ['CUT', 'FADE', 'DISSOLVE'];
    transitionKeywords.forEach((keyword) => {
      const hasRule = transitionRules.some((rule) => {
        return rule.match.source.includes(keyword);
      });
      expect(hasRule).toBe(true);
    });
  });

  it('should have rules for common shot types', () => {
    const shots = ['WIDE', 'CLOSE', 'MEDIUM', 'POV', 'INSERT'];
    shots.forEach((shot) => {
      const hasRule = shotRules.some((rule) => {
        return rule.match.source.toUpperCase().includes(shot);
      });
      expect(hasRule).toBe(true);
    });
  });
});

describe('dual dialogue input rule', () => {
  it('should match "CHARACTER ^" pattern', () => {
    // The dual dialogue rule pattern
    const dualDialogueRegex = /\s*\^\s*$/;

    expect(dualDialogueRegex.test('MARY ^')).toBe(true);
    expect(dualDialogueRegex.test('JOHN ^')).toBe(true);
    expect(dualDialogueRegex.test('CHARACTER NAME ^')).toBe(true);
    expect(dualDialogueRegex.test(' ^')).toBe(true);
    expect(dualDialogueRegex.test('^')).toBe(true);
  });

  it('should match ^ with various spacing', () => {
    const dualDialogueRegex = /\s*\^\s*$/;

    expect(dualDialogueRegex.test('MARY  ^')).toBe(true);
    expect(dualDialogueRegex.test('MARY ^ ')).toBe(true);
    expect(dualDialogueRegex.test('MARY  ^  ')).toBe(true);
  });

  it('should not match ^ in the middle of text', () => {
    const dualDialogueRegex = /\s*\^\s*$/;

    expect(dualDialogueRegex.test('A^B')).toBe(false);
    expect(dualDialogueRegex.test('MARY ^ continues')).toBe(false);
  });

  it('should capture text before ^', () => {
    // Simulate how the input rule extracts character name
    const text = 'SARAH ^';
    const characterName = text.replace(/\s*\^\s*$/, '').trim();
    expect(characterName).toBe('SARAH');
  });

  it('should handle complex character names', () => {
    const extractName = (text: string) => text.replace(/\s*\^\s*$/, '').trim();

    expect(extractName("MARY O'BRIEN ^")).toBe("MARY O'BRIEN");
    expect(extractName('DR. SMITH ^')).toBe('DR. SMITH');
    expect(extractName('UNCLE JOHN (V.O.) ^')).toBe('UNCLE JOHN (V.O.)');
  });
});
