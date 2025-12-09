import { useState, useEffect } from 'react';
import { PAGE_WIDTH_PX, SIDEBAR_WIDTH } from '@/lib/constants';

/**
 * Hook to calculate responsive scale for the screenplay pages.
 * Pages are fixed-size and scaled with CSS transforms to fit available space.
 * Matches google-screenplay-wasm approach.
 */
export function useResponsiveScale(showSidebar: boolean = true) {
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 768; // md breakpoint
      setIsMobile(mobile);

      // On mobile, sidebar is hidden (0 width in layout calculation)
      // On desktop, sidebar consumes width when visible
      const sidebarWidth = (!mobile && showSidebar) ? SIDEBAR_WIDTH : 0;

      // Padding around the page (less on mobile)
      const padding = mobile ? 32 : 96;
      const availableWidth = width - sidebarWidth - padding;

      // Calculate scale to fit page in available width
      let newScale = 1;
      if (availableWidth < PAGE_WIDTH_PX) {
        // Scale down to fit, minimum 0.5 for readability on small phones
        newScale = Math.max(0.5, availableWidth / PAGE_WIDTH_PX);
      } else {
        // Allow slight scale up on large screens, max 1.1
        newScale = Math.min(1.1, availableWidth / PAGE_WIDTH_PX);
      }

      setScale(newScale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showSidebar]);

  return { scale, isMobile };
}
