/**
 * STRICT PAGINATION ENGINE
 *
 * Simulates a layout engine that measures text against US Letter constraints.
 * Handles:
 * - HTML tag stripping for accurate character counts
 * - Precise word wrapping
 * - Vertical rhythm (12pt lines)
 * - Orphan control (Scene Headings)
 * - Keep-with-next (Character + Dialogue)
 * - Automatic Scene Numbering
 */

import { ScriptBlock, BlockType, RenderedPage, FORMATTING_RULES, LINES_PER_PAGE } from './types';

// Strip HTML tags to get raw text length for measurement
const stripHtml = (html: string): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

// Measure how many lines a string takes when wrapped at maxChars
// Now handles stripped text to ignore bold/italic tags in calculation
const countLines = (htmlContent: string, maxChars: number): number => {
  const text = stripHtml(htmlContent);
  if (!text) return 1; // Empty block still takes 1 line height

  const words = text.split(' ');
  let lineCount = 1;
  let currentLineLength = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const wLen = w.length;

    // Determine space cost (1 char unless start of line)
    const spaceCost = currentLineLength === 0 ? 0 : 1;

    if (currentLineLength + spaceCost + wLen <= maxChars) {
      currentLineLength += spaceCost + wLen;
    } else {
      lineCount++;
      currentLineLength = wLen;
    }
  }
  return lineCount;
};

// Calculate the vertical cost (in lines) of a block
// Includes its top margin + its content height
const getBlockMetrics = (block: ScriptBlock) => {
  const rules = FORMATTING_RULES[block.type];

  // Non-printing blocks flag logic removed; relying on pre-filtering now
  if (rules.nonPrinting) {
    return { cost: 0, contentLines: 0, marginTop: 0 };
  }

  const contentLines = countLines(block.content, rules.maxCharsPerLine);

  // Top margin is defined in lines.
  const cost = rules.marginTopLines + contentLines;

  return { cost, contentLines, marginTop: rules.marginTopLines };
};

// Check if two blocks must stay together
const isGluePair = (first: ScriptBlock, second: ScriptBlock): boolean => {
  // Character must stick to Dialogue or Parenthetical
  if (first.type === BlockType.CHARACTER) {
    return second.type === BlockType.DIALOGUE || second.type === BlockType.PARENTHETICAL;
  }
  // Parenthetical must stick to Dialogue
  if (first.type === BlockType.PARENTHETICAL) {
    return second.type === BlockType.DIALOGUE;
  }
  return false;
};

// Pass to assign scene numbers strictly
export const assignSceneNumbers = (blocks: ScriptBlock[]): ScriptBlock[] => {
  let sceneCounter = 0;
  return blocks.map(block => {
    if (block.type === BlockType.SCENE_HEADING) {
      sceneCounter++;
      return { ...block, sceneNumber: sceneCounter };
    }
    return block;
  });
};

export const paginateScript = (rawBlocks: ScriptBlock[], showActs: boolean = true): RenderedPage[] => {
  // 0. Filter Acts if hidden
  const visibleBlocks = showActs
    ? rawBlocks
    : rawBlocks.filter(b => b.type !== BlockType.SECTION);

  // 1. Pre-process: Assign Scene Numbers (we do this on visible blocks, but technically
  // scene numbers shouldn't change just because Acts are hidden.
  // However, Acts are usually separate from scene numbering flow anyway.)
  const blocks = assignSceneNumbers(visibleBlocks);

  const pages: RenderedPage[] = [];
  let currentBlocks: ScriptBlock[] = [];
  let currentY = 0; // Current line on page (0-based)

  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    const metrics = getBlockMetrics(block);

    // Adjust metrics for top-of-page scenarios
    // If a block sits at line 0, it shouldn't have a top margin (visually)
    let actualCost = metrics.cost;
    if (currentY === 0) {
      actualCost -= metrics.marginTop;
    }

    // --- LOOKAHEAD / GLUE LOGIC ---
    let groupCost = actualCost;

    let nextIdx = i + 1;
    let currBlock = block;

    while (nextIdx < blocks.length) {
      const nextBlock = blocks[nextIdx];
      const nextMetrics = getBlockMetrics(nextBlock);

      if (isGluePair(currBlock, nextBlock)) {
        groupCost += nextMetrics.cost;
        currBlock = nextBlock;
        nextIdx++;
      } else {
        break;
      }
    }

    // --- BREAK DETECTION ---
    const spaceRemaining = LINES_PER_PAGE - currentY;
    let forceBreak = false;

    // 1. Does the whole group fit?
    if (groupCost > spaceRemaining) {
      forceBreak = true;
    }

    // 2. Orphan Control: Scene Heading
    // A Scene Heading should not fall on the last line, nor last 2 lines generally.
    if (!forceBreak && block.type === BlockType.SCENE_HEADING) {
      if (spaceRemaining - actualCost < 3) {
        forceBreak = true;
      }
    }

    if (forceBreak) {
      if (currentY > 0) {
        pages.push({
          pageNumber: pages.length + 1,
          blocks: [...currentBlocks],
          lineCount: currentY
        });
        currentBlocks = [];
        currentY = 0;
        // Don't increment i, process this block again on new page
        continue;
      }
    }

    currentBlocks.push(block);
    currentY += actualCost;
    i++;
  }

  if (currentBlocks.length > 0) {
    pages.push({
      pageNumber: pages.length + 1,
      blocks: currentBlocks,
      lineCount: currentY
    });
  }

  return pages;
};
