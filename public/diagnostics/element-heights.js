/**
 * Element Height Diagnostic
 *
 * Measures actual CSS element heights vs expected (lines * 16px)
 * to identify where WASM and CSS diverge.
 */
(function() {
  'use strict';

  const LINE_HEIGHT = 16;

  console.log('=== ELEMENT HEIGHT DIAGNOSTIC ===\n');

  const prosemirror = document.querySelector('.ProseMirror');
  if (!prosemirror) {
    console.error('ProseMirror not found');
    return;
  }

  const contentLayer = document.querySelector('.pm-editor-pages');
  const contentTransform = window.getComputedStyle(contentLayer).transform;
  const scaleMatch = contentTransform.match(/matrix\(([^,]+)/);
  const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

  // Get all content elements
  const elements = Array.from(prosemirror.querySelectorAll(
    '.pm-scene-heading, .pm-action, .pm-character, .pm-dialogue, .pm-parenthetical, .pm-transition'
  ));

  console.log(`Analyzing ${elements.length} elements...\n`);

  // Analyze each element's height
  let totalDrift = 0;
  const issues = [];

  elements.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    const actualHeight = rect.height / scale;

    // Get computed styles
    const style = window.getComputedStyle(el);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);
    const borderTop = parseFloat(style.borderTopWidth);
    const borderBottom = parseFloat(style.borderBottomWidth);
    const marginTop = parseFloat(style.marginTop);
    const marginBottom = parseFloat(style.marginBottom);
    const lineHeight = parseFloat(style.lineHeight);

    // Content height (without padding)
    const contentHeight = actualHeight - paddingTop - paddingBottom - borderTop - borderBottom;

    // Expected: content should be a multiple of 16px
    const expectedLines = Math.ceil(contentHeight / LINE_HEIGHT);
    const expectedHeight = expectedLines * LINE_HEIGHT;
    const drift = contentHeight - expectedHeight;

    const className = el.className.split(' ').find(c => c.startsWith('pm-')) || 'unknown';

    // Total height including padding (what affects layout)
    const totalHeight = actualHeight;
    const expectedTotal = expectedHeight + paddingTop + paddingBottom;
    const totalDriftItem = totalHeight - expectedTotal;

    totalDrift += totalDriftItem;

    if (Math.abs(totalDriftItem) > 0.5) {
      issues.push({
        index: i,
        type: className,
        actualHeight: totalHeight.toFixed(1),
        expectedHeight: expectedTotal.toFixed(1),
        drift: totalDriftItem.toFixed(1),
        paddingTop: paddingTop.toFixed(0),
        paddingBottom: paddingBottom.toFixed(0),
        contentLines: expectedLines,
        lineHeight: lineHeight.toFixed(1),
      });
    }
  });

  console.log(`Total cumulative drift: ${totalDrift.toFixed(1)}px\n`);

  console.log(`Elements with height drift: ${issues.length}/${elements.length}\n`);

  // Show first 20 issues
  console.log('First 20 issues:');
  issues.slice(0, 20).forEach(issue => {
    console.log(`  [${issue.index}] ${issue.type}: ${issue.actualHeight}px (expected ${issue.expectedHeight}px) drift=${issue.drift}px`);
    console.log(`       paddingTop=${issue.paddingTop}px, lines=${issue.contentLines}, lineHeight=${issue.lineHeight}px`);
  });

  // Summary by element type
  console.log('\nDrift by element type:');
  const byType = {};
  issues.forEach(issue => {
    if (!byType[issue.type]) byType[issue.type] = { count: 0, totalDrift: 0 };
    byType[issue.type].count++;
    byType[issue.type].totalDrift += parseFloat(issue.drift);
  });
  Object.entries(byType).forEach(([type, data]) => {
    console.log(`  ${type}: ${data.count} elements, total drift=${data.totalDrift.toFixed(1)}px`);
  });

  return { issues, totalDrift, byType };
})();
