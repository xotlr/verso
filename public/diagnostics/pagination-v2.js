/**
 * Pagination Alignment Diagnostic v2
 *
 * Focuses on what matters: Is content properly contained within page frames?
 *
 * Usage: Copy and paste into browser console while viewing a screenplay
 */

(function() {
  'use strict';

  const PAGE_HEIGHT = 1056;  // 11" at 96dpi
  const PAGE_GAP = 40;
  const TOP_MARGIN = 96;     // 1" top margin
  const BOTTOM_MARGIN = 96;  // 1" bottom margin
  const CONTENT_AREA = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN; // 864px

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║        PAGINATION ALIGNMENT DIAGNOSTIC v2                        ║
║        Focus: Content within Frame Bounds                        ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Get elements
  const framesContainer = document.querySelector('.pm-page-frames-container');
  const contentLayer = document.querySelector('.pm-editor-pages');
  const prosemirror = document.querySelector('.ProseMirror');

  if (!framesContainer || !contentLayer || !prosemirror) {
    console.error('❌ Could not find required elements. Make sure you are in discrete mode.');
    return;
  }

  // Get all frames and content elements
  const frames = Array.from(framesContainer.querySelectorAll('.pm-page-frame'));
  const contentElements = Array.from(prosemirror.querySelectorAll('[class*="pm-"]:not(.pm-page-break-container):not(.pm-first-page-margin):not(.pm-page-bottom):not(.pm-page-gap):not(.pm-page-top)'));
  const breakContainers = Array.from(prosemirror.querySelectorAll('.pm-page-break-container'));

  // Get transform scale
  const contentTransform = window.getComputedStyle(contentLayer).transform;
  const scaleMatch = contentTransform.match(/matrix\(([^,]+)/);
  const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

  console.log(`┌──────────────────────────────────────────────────────────────────┐
│ 1. SETUP                                                         │
└──────────────────────────────────────────────────────────────────┘`);
  console.log(`  Pages: ${frames.length}`);
  console.log(`  Content elements: ${contentElements.length}`);
  console.log(`  Break decorations: ${breakContainers.length}`);
  console.log(`  Scale: ${scale.toFixed(4)}x`);
  console.log(`  Expected: ${PAGE_HEIGHT}px pages, ${PAGE_GAP}px gaps, ${TOP_MARGIN}px margins`);

  // Get frame positions (unscaled)
  const frameData = frames.map((frame, i) => {
    const style = frame.style;
    const top = parseFloat(style.top) || 0;
    return {
      pageNumber: i + 1,
      top: top,
      bottom: top + PAGE_HEIGHT,
      contentTop: top + TOP_MARGIN,
      contentBottom: top + PAGE_HEIGHT - BOTTOM_MARGIN,
    };
  });

  // Get content element positions relative to ProseMirror container
  const prosemirrorRect = prosemirror.getBoundingClientRect();

  function getUnscaledPosition(element) {
    const rect = element.getBoundingClientRect();
    // Convert to unscaled coordinates relative to prosemirror
    const top = (rect.top - prosemirrorRect.top) / scale;
    const bottom = (rect.bottom - prosemirrorRect.top) / scale;
    return { top, bottom, height: bottom - top };
  }

  // Assign each content element to a frame
  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ 2. CONTENT-TO-FRAME MAPPING                                      │
└──────────────────────────────────────────────────────────────────┘`);

  const pageContents = frameData.map(() => []);
  const orphanedContent = [];
  const overflowingContent = [];

  contentElements.forEach(el => {
    const pos = getUnscaledPosition(el);
    const className = el.className.split(' ').find(c => c.startsWith('pm-')) || 'unknown';

    // Find which frame this element belongs to
    let assignedFrame = null;
    for (let i = 0; i < frameData.length; i++) {
      const frame = frameData[i];
      // Element is in this frame if its center is within frame bounds
      const center = (pos.top + pos.bottom) / 2;
      if (center >= frame.top && center < frame.bottom) {
        assignedFrame = i;
        break;
      }
    }

    if (assignedFrame !== null) {
      const frame = frameData[assignedFrame];
      const overflow = {
        top: pos.top < frame.contentTop ? frame.contentTop - pos.top : 0,
        bottom: pos.bottom > frame.contentBottom ? pos.bottom - frame.contentBottom : 0,
      };

      pageContents[assignedFrame].push({
        element: el,
        className,
        pos,
        overflow,
      });

      if (overflow.top > 1 || overflow.bottom > 1) {  // 1px tolerance
        overflowingContent.push({
          page: assignedFrame + 1,
          className,
          overflow,
          pos,
        });
      }
    } else {
      orphanedContent.push({ className, pos });
    }
  });

  // Report content distribution
  const contentByPage = pageContents.map((contents, i) => ({
    page: i + 1,
    elements: contents.length,
    firstTop: contents.length > 0 ? contents[0].pos.top : null,
    lastBottom: contents.length > 0 ? contents[contents.length - 1].pos.bottom : null,
  }));

  console.log(`  Content distribution by page:`);
  contentByPage.slice(0, 10).forEach(p => {
    if (p.elements > 0) {
      console.log(`    Page ${p.page}: ${p.elements} elements`);
    }
  });
  if (contentByPage.length > 10) {
    console.log(`    ... (${contentByPage.length - 10} more pages)`);
  }

  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ 3. FRAME BOUNDARY ALIGNMENT                                      │
└──────────────────────────────────────────────────────────────────┘`);

  let perfectPages = 0;
  let minorIssues = 0;
  let majorIssues = 0;

  frameData.forEach((frame, i) => {
    const contents = pageContents[i];
    if (contents.length === 0) return;

    const firstContent = contents[0];
    const lastContent = contents[contents.length - 1];

    const topGap = firstContent.pos.top - frame.contentTop;
    const bottomGap = frame.contentBottom - lastContent.pos.bottom;

    const topOk = topGap >= -2 && topGap <= 16;  // Allow small variance
    const bottomOk = bottomGap >= -2;  // Content should not overflow bottom

    let status = '✓';
    if (!topOk || !bottomOk) {
      if (Math.abs(topGap) > 50 || bottomGap < -50) {
        status = '✗';
        majorIssues++;
      } else {
        status = '~';
        minorIssues++;
      }
    } else {
      perfectPages++;
    }

    if (i < 10 || status !== '✓') {
      console.log(`  ${status} Page ${frame.pageNumber}: Top gap=${topGap.toFixed(0)}px, Bottom gap=${bottomGap.toFixed(0)}px`);
    }
  });

  if (frameData.length > 10 && majorIssues === 0 && minorIssues < 5) {
    console.log(`  ... (${frameData.length - 10} more pages with similar alignment)`);
  }

  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ 4. OVERFLOW DETECTION                                            │
└──────────────────────────────────────────────────────────────────┘`);

  if (overflowingContent.length === 0) {
    console.log(`  ✓ No content overflows frame boundaries`);
  } else {
    console.log(`  ⚠️  ${overflowingContent.length} elements overflow frame boundaries:`);
    overflowingContent.slice(0, 10).forEach(item => {
      const desc = item.overflow.top > 0
        ? `overflows TOP by ${item.overflow.top.toFixed(0)}px`
        : `overflows BOTTOM by ${item.overflow.bottom.toFixed(0)}px`;
      console.log(`    Page ${item.page}: ${item.className} ${desc}`);
    });
    if (overflowingContent.length > 10) {
      console.log(`    ... (${overflowingContent.length - 10} more)`);
    }
  }

  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ 5. DECORATION HEIGHT ANALYSIS                                    │
└──────────────────────────────────────────────────────────────────┘`);

  const decorationHeights = breakContainers.map(container => {
    const pos = getUnscaledPosition(container);
    const pageBottom = container.querySelector('.pm-page-bottom');
    const pageGap = container.querySelector('.pm-page-gap');
    const pageTop = container.querySelector('.pm-page-top');

    return {
      total: pos.height,
      bottom: pageBottom ? getUnscaledPosition(pageBottom).height : 0,
      gap: pageGap ? getUnscaledPosition(pageGap).height : 0,
      top: pageTop ? getUnscaledPosition(pageTop).height : 0,
      wasmPixelY: container.style.getPropertyValue('--wasm-pixel-y'),
    };
  });

  if (decorationHeights.length > 0) {
    const avgTotal = decorationHeights.reduce((s, d) => s + d.total, 0) / decorationHeights.length;
    const avgBottom = decorationHeights.reduce((s, d) => s + d.bottom, 0) / decorationHeights.length;
    const avgGap = decorationHeights.reduce((s, d) => s + d.gap, 0) / decorationHeights.length;
    const avgTop = decorationHeights.reduce((s, d) => s + d.top, 0) / decorationHeights.length;

    console.log(`  Average decoration heights:`);
    console.log(`    pm-page-bottom: ${avgBottom.toFixed(1)}px (variable, fills remaining page)`);
    console.log(`    pm-page-gap:    ${avgGap.toFixed(1)}px (expected: ${PAGE_GAP}px)`);
    console.log(`    pm-page-top:    ${avgTop.toFixed(1)}px (expected: ${TOP_MARGIN}px)`);
    console.log(`    Total average:  ${avgTotal.toFixed(1)}px`);

    // Check for issues
    if (Math.abs(avgGap - PAGE_GAP) > 2) {
      console.log(`  ⚠️  Gap height mismatch: ${avgGap.toFixed(1)}px vs expected ${PAGE_GAP}px`);
    }
    if (Math.abs(avgTop - TOP_MARGIN) > 2) {
      console.log(`  ⚠️  Top margin mismatch: ${avgTop.toFixed(1)}px vs expected ${TOP_MARGIN}px`);
    }
  }

  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ 6. CUMULATIVE DRIFT CHECK                                        │
└──────────────────────────────────────────────────────────────────┘`);

  // Check if content drifts over time (cumulative error)
  const drifts = [];
  frameData.forEach((frame, i) => {
    const contents = pageContents[i];
    if (contents.length === 0) return;

    const expectedContentStart = frame.contentTop;
    const actualContentStart = contents[0].pos.top;
    const drift = actualContentStart - expectedContentStart;
    drifts.push({ page: i + 1, drift });
  });

  if (drifts.length >= 2) {
    const firstDrift = drifts[0]?.drift || 0;
    const lastDrift = drifts[drifts.length - 1]?.drift || 0;
    const driftGrowth = lastDrift - firstDrift;
    const driftPerPage = driftGrowth / (drifts.length - 1);

    console.log(`  First page drift:  ${firstDrift.toFixed(1)}px`);
    console.log(`  Last page drift:   ${lastDrift.toFixed(1)}px`);
    console.log(`  Total drift growth: ${driftGrowth.toFixed(1)}px over ${drifts.length} pages`);
    console.log(`  Drift per page:    ${driftPerPage.toFixed(2)}px`);

    if (Math.abs(driftPerPage) < 0.5) {
      console.log(`  ✓ No cumulative drift detected`);
    } else if (Math.abs(driftPerPage) < 2) {
      console.log(`  ~ Minor cumulative drift (${driftPerPage.toFixed(2)}px/page)`);
    } else {
      console.log(`  ✗ Significant cumulative drift detected!`);
    }
  }

  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ 7. SUMMARY                                                       │
└──────────────────────────────────────────────────────────────────┘`);

  const totalPages = frameData.length;
  const pagesWithContent = pageContents.filter(p => p.length > 0).length;

  console.log(`  Pages analyzed: ${pagesWithContent}/${totalPages}`);
  console.log(`  Perfect alignment: ${perfectPages} pages`);
  console.log(`  Minor issues: ${minorIssues} pages`);
  console.log(`  Major issues: ${majorIssues} pages`);
  console.log(`  Content overflow: ${overflowingContent.length} elements`);

  const score = ((perfectPages + minorIssues * 0.5) / pagesWithContent * 100).toFixed(1);
  console.log(`
  ALIGNMENT SCORE: ${score}%
  `);

  if (majorIssues === 0 && overflowingContent.length === 0) {
    console.log(`  ✓ PASS: Content is properly contained within page frames`);
  } else if (majorIssues <= 2) {
    console.log(`  ~ ACCEPTABLE: Minor alignment issues detected`);
  } else {
    console.log(`  ✗ FAIL: Significant alignment issues need fixing`);
  }

  console.log(`
╚══════════════════════════════════════════════════════════════════╝
`);

  // Return data for further analysis
  return {
    frames: frameData,
    pageContents,
    overflowingContent,
    decorationHeights,
    drifts,
    score: parseFloat(score),
  };
})();
