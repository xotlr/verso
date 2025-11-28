'use client';

import { useRef, useCallback, useEffect, useState, RefObject } from 'react';

interface CursorPosition {
  x: number;
  y: number;
  height: number;
}

interface UseCursorPositionOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  enabled: boolean;
  throttleMs?: number;
}

/**
 * Performance-optimized hook for tracking cursor position in a textarea.
 * Uses a reusable mirror element, cached styles, and throttled updates.
 */
export function useCursorPosition({
  textareaRef,
  enabled,
  throttleMs = 16, // ~60fps max
}: UseCursorPositionOptions) {
  const [position, setPosition] = useState<CursorPosition | null>(null);

  // Persistent refs for performance
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const cachedStylesRef = useRef<CSSStyleDeclaration | null>(null);

  // Create reusable mirror element
  const getMirror = useCallback(() => {
    if (mirrorRef.current) return mirrorRef.current;

    const mirror = document.createElement('div');
    mirror.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow: hidden;
      pointer-events: none;
      top: -9999px;
      left: -9999px;
    `;
    document.body.appendChild(mirror);
    mirrorRef.current = mirror;
    return mirror;
  }, []);

  // Cache computed styles
  const updateCachedStyles = useCallback(() => {
    if (textareaRef.current) {
      cachedStylesRef.current = getComputedStyle(textareaRef.current);
    }
  }, [textareaRef]);

  // Core position calculation
  const calculatePosition = useCallback((): CursorPosition | null => {
    const textarea = textareaRef.current;
    const styles = cachedStylesRef.current;
    if (!textarea || !styles) return null;

    const mirror = getMirror();

    // Apply styles to mirror
    mirror.style.fontFamily = styles.fontFamily;
    mirror.style.fontSize = styles.fontSize;
    mirror.style.lineHeight = styles.lineHeight;
    mirror.style.padding = styles.padding;
    mirror.style.width = styles.width;
    mirror.style.boxSizing = styles.boxSizing;
    mirror.style.letterSpacing = styles.letterSpacing;

    // Get text up to cursor
    const cursorPos = textarea.selectionStart;
    mirror.textContent = textarea.value.substring(0, cursorPos);

    // Add marker
    const marker = document.createElement('span');
    marker.textContent = '\u200B'; // Zero-width space
    mirror.appendChild(marker);

    // Calculate positions relative to textarea
    const textareaRect = textarea.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();

    const x = markerRect.left - mirrorRect.left;
    const y = markerRect.top - mirrorRect.top - textarea.scrollTop;
    const height = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.2;

    // Remove marker for next calculation
    mirror.removeChild(marker);

    return { x, y, height };
  }, [textareaRef, getMirror]);

  // Throttled update
  const updatePosition = useCallback(() => {
    if (!enabled) return;

    const now = performance.now();
    if (now - lastUpdateRef.current < throttleMs) {
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          updatePosition();
        });
      }
      return;
    }

    lastUpdateRef.current = now;
    const newPos = calculatePosition();

    if (newPos) {
      setPosition((prev) => {
        // Only update if position actually changed
        if (prev && prev.x === newPos.x && prev.y === newPos.y) return prev;
        return newPos;
      });
    }
  }, [enabled, throttleMs, calculatePosition]);

  // Setup resize observer to update cached styles
  useEffect(() => {
    if (!enabled || !textareaRef.current) return;

    updateCachedStyles();

    const observer = new ResizeObserver(() => {
      updateCachedStyles();
      updatePosition();
    });

    observer.observe(textareaRef.current);

    return () => {
      observer.disconnect();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [enabled, textareaRef, updateCachedStyles, updatePosition]);

  // Cleanup mirror on unmount
  useEffect(() => {
    return () => {
      if (mirrorRef.current) {
        document.body.removeChild(mirrorRef.current);
        mirrorRef.current = null;
      }
    };
  }, []);

  return { position, updatePosition };
}
