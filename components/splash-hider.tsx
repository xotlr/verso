'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __splashProgress?: {
      update: (progress: number) => void;
      setBar: (bar: HTMLElement) => void;
    };
  }
}

/**
 * Check if CSS variables are loaded by testing if --background differs from fallback.
 * Returns true when theme CSS has loaded and variables are available.
 */
function isCSSLoaded(): boolean {
  const style = getComputedStyle(document.documentElement);
  const bg = style.getPropertyValue('--background').trim();
  // If --background is defined and not empty, CSS has loaded
  return bg.length > 0;
}

/**
 * Client component that hides the splash screen after React hydrates.
 * Waits for theme CSS to load and transition to complete before fading out.
 */
export function SplashHider() {
  useEffect(() => {
    const splashContainer = document.getElementById('splash-container');
    const splash = document.getElementById('splash');
    const progressBar = document.querySelector('#splash-progress > div') as HTMLElement;

    // Initialize progress bar reference
    if (progressBar && window.__splashProgress) {
      window.__splashProgress.setBar(progressBar);
    }

    if (!splashContainer || !splash) return;

    // Complete progress to 100%
    if (window.__splashProgress) {
      window.__splashProgress.update(100);
    }
    if (progressBar) {
      progressBar.style.width = '100%';
    }

    // Wait for CSS to load, then allow theme transition to complete, then fade out
    const startExit = () => {
      // Give theme transition time to complete (matches 0.5s transition in styles)
      setTimeout(() => {
        // Smooth fade out
        splash.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        splash.style.opacity = '0';

        setTimeout(() => {
          splashContainer.remove();
        }, 500);
      }, 600); // Wait for theme color transition to settle
    };

    // Check if CSS is already loaded
    if (isCSSLoaded()) {
      // CSS loaded, start exit after brief pause at 100%
      setTimeout(startExit, 200);
    } else {
      // Poll for CSS to load (check every 50ms, max 2s)
      let attempts = 0;
      const checkCSS = setInterval(() => {
        attempts++;
        if (isCSSLoaded() || attempts > 40) {
          clearInterval(checkCSS);
          startExit();
        }
      }, 50);
    }
  }, []);

  return null;
}
