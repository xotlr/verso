'use client';

import { useEffect, useRef, RefObject, useMemo } from 'react';
import { useSettings } from '@/contexts/settings-context';
import { useCursorPosition } from './useCursorPosition';
import type { CursorSettings } from '@/types/settings';

interface UseCursorOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  isTyping: boolean;
}

interface CursorProps {
  x: number;
  y: number;
  height: number;
  visible: boolean;
}

interface UseCursorReturn {
  cursorProps: CursorProps | null;
  updateCursorPosition: () => void;
  isCustomCursor: boolean;
  cursorSettings: CursorSettings;
}

/**
 * Main cursor hook that manages cursor state, styling, and position tracking.
 * Integrates with settings context and applies CSS classes for native/custom cursors.
 */
export function useCursor({
  textareaRef,
  containerRef,
  isTyping,
}: UseCursorOptions): UseCursorReturn {
  const { settings } = useSettings();
  const cursorSettings = settings.visual.cursor;
  const isCustomCursor = cursorSettings.mode !== 'native';

  // Check if mobile on mount
  const isMobileRef = useRef(
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  // Only track position for custom cursor on non-mobile
  const shouldTrackPosition = isCustomCursor && !isMobileRef.current;

  const { position, updatePosition } = useCursorPosition({
    textareaRef,
    enabled: shouldTrackPosition,
  });

  // Track focus state
  const hasFocusRef = useRef(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const onFocus = () => {
      hasFocusRef.current = true;
    };
    const onBlur = () => {
      hasFocusRef.current = false;
    };

    textarea.addEventListener('focus', onFocus);
    textarea.addEventListener('blur', onBlur);

    // Check initial focus state
    hasFocusRef.current = document.activeElement === textarea;

    return () => {
      textarea.removeEventListener('focus', onFocus);
      textarea.removeEventListener('blur', onBlur);
    };
  }, [textareaRef]);

  // Apply container classes and CSS custom properties
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Set cursor color CSS variable
    if (cursorSettings.color) {
      container.style.setProperty('--cursor-color', `hsl(${cursorSettings.color})`);
      container.style.setProperty('--cursor-glow-color', `hsl(${cursorSettings.color} / 0.5)`);
    } else {
      container.style.removeProperty('--cursor-color');
      container.style.removeProperty('--cursor-glow-color');
    }

    // Set other cursor CSS variables
    container.style.setProperty('--cursor-blink-speed', `${cursorSettings.blinkSpeed}ms`);
    container.style.setProperty('--cursor-width', `${cursorSettings.width}px`);
    container.style.setProperty('--cursor-glow-intensity', String(cursorSettings.glowIntensity));

    // Apply mode classes
    const shouldUseCustom = isCustomCursor && !isMobileRef.current;
    container.classList.toggle('cursor-overlay-active', shouldUseCustom);
    container.classList.toggle('cursor-native-custom', !isCustomCursor && !!cursorSettings.color);

    return () => {
      container.classList.remove('cursor-overlay-active', 'cursor-native-custom');
    };
  }, [containerRef, cursorSettings, isCustomCursor]);

  // Memoize cursor props
  const cursorProps = useMemo((): CursorProps | null => {
    if (!position) return null;
    return {
      ...position,
      visible: hasFocusRef.current,
    };
  }, [position]);

  return {
    cursorProps,
    updateCursorPosition: updatePosition,
    isCustomCursor: isCustomCursor && !isMobileRef.current,
    cursorSettings,
  };
}
