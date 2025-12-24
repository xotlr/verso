/**
 * Pagination Alignment Diagnostic v3
 *
 * Uses consistent coordinate system: measures both frames and content
 * via getBoundingClientRect relative to their common parent.
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
║        PAGINATION ALIGNMENT DIAGNOSTIC v3                        ║
║        Unified Coordinate System                                 ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Get containers
  const framesContainer = document.querySelector('.pm-page-frames-container');
  const contentLayer = document.querySelector('.pm-editor-pages');
  const prosemirror = document.querySelector('.ProseMirror');
  const scrollArea = document.querySelector('.pm-editor-scroll-area');

  if (!framesContainer || !contentLayer || !prosemirror) {
    console.error('Could not find required elements. Make sure you are in discrete mode.');
    return;
  }

  // Get CSS variables (from WASM)
  const computedRoot = getComputedStyle(document.documentElement);
  const wasmTopMargin = parseFloat(computedRoot.getPropertyValue('--wasm-top-margin')) || TOP_MARGIN;
  const wasmPageGap = parseFloat(computedRoot.getPropertyValue('--wasm-page-gap')) || PAGE_GAP;
  const wasmPageHeight = parseFloat(computedRoot.getPropertyValue('--wasm-page-height')) || PAGE_HEIGHT;

  // Get transform scale from content layer
  const contentTransform = window.getComputedStyle(contentLayer).transform;
  const scaleMatch = contentTransform.match(/matrix\(([^,]+)/);
  const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

  // Get container origins (using getBoundingClientRect for both)
  const framesContainerRect = framesContainer.getBoundingClientRect();
  const contentLayerRect = contentLayer.getBoundingClientRect();

  // Calculate offset between the two containers
  const containerOffset = (contentLayerRect.top - framesContainerRect.top) / scale;

  console.log(`┌──────────────────────────────────────────────────────────────────┐
│ 1. SETUP                                                         │
└──────────────────────────────────────────────────────────────────┘`);
  console.log(`  WASM CSS Variables:`);
  console.log(`    --wasm-top-margin:  ${wasmTopMargin}px`);
  console.log(`    --wasm-page-gap:    ${wasmPageGap}px`);
  console.log(`    --wasm-page-height: ${wasmPageHeight}px`);
  console.log(`  Scale: ${scale.toFixed(4)}x`);
  console.log(`  Container offset (content - frames): ${containerOffset.toFixed(1)}px`);

  // Get all frames and content elements
  const frames = Array.from(framesContainer.querySelectorAll('.pm-page-frame'));
  // Only select actual screenplay content elements, excluding decorations and UI elements
  const contentElements = Array.from(prosemirror.querySelectorAll(
    '.pm-scene-heading, .pm-action, .pm-character, .pm-dialogue, .pm-parenthetical, .pm-transition, .pm-shot, .pm-ending, .pm-title-page'
  ));
  const breakContainers = Array.from(prosemirror.querySelectorAll('.pm-page-break-container'));
  const firstPageMargin = prosemirror.querySelector('.pm-first-page-margin');

  console.log(`  Pages: ${frames.length}`);
  console.log(`  Content elements: ${contentElements.length}`);
  console.log(`  Break decorations: ${breakContainers.length}`);
  console.log(`  First page margin: ${firstPageMargin ? 'present' : 'missing'}`);

  // Measure first page margin height
  if (firstPageMargin) {
    const marginRect = firstPageMargin.getBoundingClientRect();
    const marginHeight = marginRect.height / scale;
    console.log(`  First page margin height: ${marginHeight.toFixed(1)}px (expected: ${wasmTopMargin}px)`);
  }

  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ 2. FRAME POSITIONS (via style.top)                               │
└──────────────────────────────────────────────────────────────────┘`);

  // Get frame positions from inline styles (WASM-calculated)
  const frameData = frames.map((frame, i) => {
    const top = parseFloat(frame.style.top) || 0;
    return {
      pageNumber: i + 1,
      frameTop: top,
      frameBottom: top + PAGE_HEIGHT,
      contentTop: top + wasmTopMargin,
      contentBottom: top + PAGE_HEIGHT - BOTTOM_MARGIN,
    };
  });

  // Show first few frame positions
  frameData.slice(0, 5).forEach(f => {
    console.log(`  Page ${f.pageNumber}: frame=${f.frameTop}px, content area=${f.contentTop}px to ${f.contentBottom}px`);
  });

  // Check for overflow - how many elements extend beyond their page's content area
  let overflowCount = 0;
  const overflowDetails = [];
  contentElements.forEach(el => {
    const pos = getContentPosition(el);
    const className = el.className.split(' ').find(c => c.startsWith('pm-')) || 'unknown';

    // Find which frame this element is in
    for (let i = 0; i < frameData.length; i++) {
      const frame = frameData[i];
      const adjustedTop = frame.frameTop - containerOffset;
      const adjustedBottom = frame.frameBottom - containerOffset;
      const center = (pos.top + pos.bottom) / 2;

      if (center >= adjustedTop && center < adjustedBottom) {
        // Element is in this frame - check if it overflows content area
        const contentTop = frame.contentTop - containerOffset;
        const contentBottom = frame.contentBottom - containerOffset;

        if (pos.top < contentTop - 1 || pos.bottom > contentBottom + 1) {
          overflowCount++;
          if (overflowDetails.length < 10) {
            const topOverflow = pos.top < contentTop ? contentTop - pos.top : 0;
            const bottomOverflow = pos.bottom > contentBottom ? pos.bottom - contentBottom : 0;
            overflowDetails.push({
              page: i + 1,
              className,
              topOverflow: topOverflow.toFixed(0),
              bottomOverflow: bottomOverflow.toFixed(0),
            });
          }
        }
        break;
      }
    }
  });

  console.log(`\n  Overflow check: ${overflowCount} elements overflow content area`);
  if (overflowDetails.length > 0) {
    overflowDetails.forEach(d => {
      const desc = d.topOverflow > 0 ? `TOP by ${d.topOverflow}px` : `BOTTOM by ${d.bottomOverflow}px`;
      console.log(`    Page ${d.page}: ${d.className} overflows ${desc}`);
    });
  }

  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ 3. CONTENT POSITIONS (via getBoundingClientRect)                 │
└──────────────────────────────────────────────────────────────────┘`);

  // Measure content positions relative to content layer
  function getContentPosition(element) {
    const rect = element.getBoundingClientRect();
    // Position relative to content layer, unscaled
    const top = (rect.top - contentLayerRect.top) / scale;
    const bottom = (rect.bottom - contentLayerRect.top) / scale;
    return { top, bottom, height: bottom - top };
  }

  // Get first content element on each "page" by position
  const firstElementsByPage = [];
  frameData.forEach((frame, i) => {
    // Find elements within this frame's bounds (adjusted for container offset)
    const adjustedContentTop = frame.contentTop - containerOffset;
    const adjustedContentBottom = frame.contentBottom - containerOffset;

    const elementsInFrame = contentElements.filter(el => {
      const pos = getContentPosition(el);
      const center = (pos.top + pos.bottom) / 2;
      return center >= (frame.frameTop - containerOffset) && center < (frame.frameBottom - containerOffset);
    });

    if (elementsInFrame.length > 0) {
      const firstEl = elementsInFrame[0];
      const pos = getContentPosition(firstEl);
      firstElementsByPage.push({
        page: i + 1,
        expectedTop: adjustedContentTop,
        actualTop: pos.top,
        offset: pos.top - adjustedContentTop,
        className: firstEl.className.split(' ').find(c => c.startsWith('pm-')) || 'unknown',
      });
    }
  });

  // Show alignment for first few pages, then all problem pages
  firstElementsByPage.slice(0, 5).forEach(p => {
    const status = Math.abs(p.offset) < 2 ? '✓' : (Math.abs(p.offset) < 16 ? '~' : '✗');
    console.log(`  ${status} Page ${p.page}: expected=${p.expectedTop.toFixed(0)}px, actual=${p.actualTop.toFixed(0)}px, offset=${p.offset.toFixed(1)}px (${p.className})`);
  });

  // Show ALL pages with significant offset (> 2px)
  const problemPages = firstElementsByPage.filter(p => Math.abs(p.offset) > 2);
  console.log(`\n  ALL PROBLEM PAGES (${problemPages.length} with offset > 2px):`);
  problemPages.forEach(p => {
    console.log(`    Page ${p.page}: offset=${p.offset.toFixed(1)}px (${p.className})`);
  });

  // Check if CSS reset is working - inspect padding-top of first element after each break
  console.log(`\n  CSS RESET CHECK (first 10 breaks):`);
  breakContainers.slice(0, 10).forEach((container, i) => {
    const nextSibling = container.nextElementSibling;
    if (nextSibling) {
      const computedStyle = window.getComputedStyle(nextSibling);
      const paddingTop = parseFloat(computedStyle.paddingTop);
      const className = nextSibling.className.split(' ').find(c => c.startsWith('pm-')) || nextSibling.tagName;
      const status = paddingTop < 2 ? '✓' : '✗';
      console.log(`    ${status} Break ${i + 1} → ${className}: padding-top=${paddingTop}px`);
    }
  });

  // Store globally for debugging
  window._paginationDiag = { firstElementsByPage, problemPages, frameData, breakContainers };

  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ 4. DECORATION ZONE HEIGHTS                                       │
└──────────────────────────────────────────────────────────────────┘`);

  // Measure ALL decoration zone heights and look for anomalies
  const decorationHeights = breakContainers.map((container, i) => {
    const pageBottom = container.querySelector('.pm-page-bottom');
    const pageGap = container.querySelector('.pm-page-gap');
    const pageTop = container.querySelector('.pm-page-top');

    const bottomHeight = pageBottom ? pageBottom.getBoundingClientRect().height / scale : 0;
    const gapHeight = pageGap ? pageGap.getBoundingClientRect().height / scale : 0;
    const topHeight = pageTop ? pageTop.getBoundingClientRect().height / scale : 0;
    const total = bottomHeight + gapHeight + topHeight;

    return { breakNum: i + 1, bottom: bottomHeight, gap: gapHeight, top: topHeight, total };
  });

  // Show first 5
  decorationHeights.slice(0, 5).forEach(d => {
    console.log(`  Break ${d.breakNum}: bottom=${d.bottom.toFixed(0)}px, gap=${d.gap.toFixed(0)}px, top=${d.top.toFixed(0)}px, total=${d.total.toFixed(0)}px`);
  });

  // Find anomalies (gap != 40 or top != 96)
  const anomalies = decorationHeights.filter(d => Math.abs(d.gap - 40) > 2 || Math.abs(d.top - 96) > 2);
  if (anomalies.length > 0) {
    console.log(`\n  ⚠️ ANOMALIES FOUND (${anomalies.length} breaks with wrong gap/top):`);
    anomalies.slice(0, 10).forEach(d => {
      console.log(`    Break ${d.breakNum}: gap=${d.gap.toFixed(0)}px, top=${d.top.toFixed(0)}px`);
    });
  }

  // Calculate cumulative height and compare to expected
  console.log(`\n  CUMULATIVE HEIGHT CHECK:`);
  let cumulativeActual = 0;
  let cumulativeExpected = 0;
  [0, 4, 9, 19, 49, 99].forEach(idx => {
    if (idx < decorationHeights.length) {
      for (let i = 0; i <= idx; i++) {
        if (i === 0) {
          cumulativeActual = decorationHeights[i].total;
          cumulativeExpected = 136; // First break (title page)
        } else {
          cumulativeActual += decorationHeights[i].total;
          cumulativeExpected += 232; // Normal break (96 bottom + 40 gap + 96 top on average)
        }
      }
      const drift = cumulativeActual - cumulativeExpected;
      console.log(`    After ${idx + 1} breaks: actual=${cumulativeActual.toFixed(0)}px, expected=${cumulativeExpected}px, drift=${drift.toFixed(0)}px`);
    }
  });

  // Check for height mismatches
  if (decorationHeights.length > 0) {
    const avgGap = decorationHeights.reduce((s, d) => s + d.gap, 0) / decorationHeights.length;
    const avgTop = decorationHeights.reduce((s, d) => s + d.top, 0) / decorationHeights.length;

    if (Math.abs(avgGap - wasmPageGap) > 2) {
      console.log(`  ⚠️ Gap mismatch: ${avgGap.toFixed(1)}px actual vs ${wasmPageGap}px WASM`);
    }
    if (Math.abs(avgTop - wasmTopMargin) > 2) {
      console.log(`  ⚠️ Top margin mismatch: ${avgTop.toFixed(1)}px actual vs ${wasmTopMargin}px WASM`);
    }
  }

  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ 5. ALIGNMENT ANALYSIS                                            │
└──────────────────────────────────────────────────────────────────┘`);

  // Analyze alignment offsets
  const offsets = firstElementsByPage.map(p => p.offset);
  if (offsets.length > 0) {
    const avgOffset = offsets.reduce((a, b) => a + b, 0) / offsets.length;
    const minOffset = Math.min(...offsets);
    const maxOffset = Math.max(...offsets);

    console.log(`  Average offset: ${avgOffset.toFixed(1)}px`);
    console.log(`  Min offset: ${minOffset.toFixed(1)}px`);
    console.log(`  Max offset: ${maxOffset.toFixed(1)}px`);
    console.log(`  Container offset: ${containerOffset.toFixed(1)}px`);

    // Check if consistent offset
    const offsetVariance = maxOffset - minOffset;
    if (offsetVariance < 5) {
      console.log(`  Offset is CONSISTENT across pages (variance: ${offsetVariance.toFixed(1)}px)`);
      if (Math.abs(avgOffset) > 2) {
        console.log(`  → This suggests a constant offset that can be fixed by adjusting container alignment`);
      }
    } else {
      console.log(`  Offset VARIES across pages (variance: ${offsetVariance.toFixed(1)}px)`);
      console.log(`  → This suggests cumulative drift or decoration height issues`);
    }
  }

  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│ 6. DIAGNOSIS                                                     │
└──────────────────────────────────────────────────────────────────┘`);

  // Provide diagnosis
  const issues = [];

  // Check container offset
  if (Math.abs(containerOffset) > 2) {
    issues.push(`Container offset: ${containerOffset.toFixed(1)}px - frames and content have different origins`);
  }

  // Check decoration heights
  if (decorationHeights.length > 0) {
    const avgTop = decorationHeights.reduce((s, d) => s + d.top, 0) / decorationHeights.length;
    if (Math.abs(avgTop - wasmTopMargin) > 2) {
      issues.push(`Top margin: ${avgTop.toFixed(1)}px actual vs ${wasmTopMargin}px expected`);
    }
  }

  // Check alignment
  if (offsets.length > 0) {
    const avgOffset = offsets.reduce((a, b) => a + b, 0) / offsets.length;
    if (Math.abs(avgOffset) > 2) {
      issues.push(`Content offset: ${avgOffset.toFixed(1)}px average (content is ${avgOffset > 0 ? 'too low' : 'too high'})`);
    }
  }

  if (issues.length === 0) {
    console.log(`  ✓ PASS: No alignment issues detected`);
  } else {
    console.log(`  Issues found:`);
    issues.forEach(issue => console.log(`    • ${issue}`));
  }

  console.log(`
╚══════════════════════════════════════════════════════════════════╝
`);

  return {
    containerOffset,
    firstElementsByPage,
    decorationHeights,
    issues,
    cssVars: { wasmTopMargin, wasmPageGap, wasmPageHeight },
  };
})();
