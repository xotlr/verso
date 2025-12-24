'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ZoomIndicatorProps {
  zoom: number;
  fitToWidthScale: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;
  className?: string;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;
const SLIDER_HEIGHT = 120;
const MAX_OVERFLOW = 20;

/**
 * Procreate-style zoom slider.
 * Wide rounded track with filled bar indicator (no dot/knob).
 * The fill level shows the current zoom - rises up for more zoom.
 */
export function ZoomIndicator({
  zoom,
  fitToWidthScale,
  onZoomChange,
  onResetZoom,
  className,
}: ZoomIndicatorProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastZoomRef = useRef(zoom);

  // Motion values
  const overflow = useMotionValue(0);
  const interactionScale = useSpring(1, { stiffness: 400, damping: 30 });

  // Track width expands on interaction (12px -> 16px)
  const trackWidth = useTransform(interactionScale, [1, 1.1], [14, 18]);

  // Calculate position from zoom (0 = bottom/min, 1 = top/max)
  const position = (zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);
  const zoomPercent = Math.round(zoom * 100);
  const isFitToWidth = Math.abs(zoom - fitToWidthScale) < 0.01;

  // Show slider when zoom changes externally (pinch, wheel)
  useEffect(() => {
    if (Math.abs(zoom - lastZoomRef.current) > 0.001) {
      setIsVisible(true);
      lastZoomRef.current = zoom;

      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        if (!isDragging && !isHovered) setIsVisible(false);
      }, 2000);
    }

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [zoom, isDragging, isHovered]);

  // Decay function for elastic overflow
  const decay = (value: number, max: number): number => {
    if (max === 0) return 0;
    const entry = value / max;
    const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);
    return sigmoid * max;
  };

  // Convert Y position to zoom value
  const yToZoom = useCallback((clientY: number): number => {
    if (!sliderRef.current) return zoom;
    const rect = sliderRef.current.getBoundingClientRect();
    const relativeY = (clientY - rect.top) / rect.height;
    // Invert: top = max zoom, bottom = min zoom
    const rawZoom = MIN_ZOOM + (1 - relativeY) * (MAX_ZOOM - MIN_ZOOM);
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, rawZoom));
  }, [zoom]);

  // Handle overflow when dragging past bounds
  const handleOverflow = useCallback((clientY: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();

    if (clientY < rect.top) {
      overflow.set(decay(rect.top - clientY, MAX_OVERFLOW));
    } else if (clientY > rect.bottom) {
      overflow.set(-decay(clientY - rect.bottom, MAX_OVERFLOW));
    } else {
      overflow.set(0);
    }
  }, [overflow]);

  // Pointer handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setIsVisible(true);
    animate(interactionScale, 1.1, { type: 'spring', stiffness: 500, damping: 30 });

    const newZoom = yToZoom(e.clientY);
    onZoomChange(newZoom);
    handleOverflow(e.clientY);
  }, [yToZoom, onZoomChange, handleOverflow, interactionScale]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    const newZoom = yToZoom(e.clientY);
    onZoomChange(newZoom);
    handleOverflow(e.clientY);
  }, [isDragging, yToZoom, onZoomChange, handleOverflow]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    animate(overflow, 0, { type: 'spring', stiffness: 500, damping: 25, bounce: 0.3 });
    animate(interactionScale, isHovered ? 1.05 : 1, { type: 'spring', stiffness: 400, damping: 30 });

    hideTimeoutRef.current = setTimeout(() => {
      if (!isHovered) setIsVisible(false);
    }, 1500);
  }, [overflow, interactionScale, isHovered]);

  // Double-tap to reset
  const lastTapRef = useRef(0);
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onResetZoom();
      animate(interactionScale, [1.15, 1], { duration: 0.25, ease: 'easeOut' });
    }
    lastTapRef.current = now;
  }, [onResetZoom, interactionScale]);

  // Hover handlers
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setIsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (!isDragging) animate(interactionScale, 1.05, { type: 'spring', stiffness: 400, damping: 30 });
  }, [isDragging, interactionScale]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isDragging) {
      animate(interactionScale, 1, { type: 'spring', stiffness: 400, damping: 30 });
      hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 800);
    }
  }, [isDragging, interactionScale]);

  return (
    <motion.div
      className={cn(
        'fixed z-50 flex items-center gap-2',
        className
      )}
      initial={{ opacity: 0 }}
      animate={{
        opacity: isVisible || isDragging ? 1 : 0,
        pointerEvents: isVisible || isDragging ? 'auto' : 'none'
      }}
      transition={{ duration: 0.2 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Percentage label - appears while dragging */}
      <motion.div
        className="text-[11px] font-medium tabular-nums text-foreground/60 select-none"
        initial={{ opacity: 0, x: -4 }}
        animate={{
          opacity: isDragging ? 1 : 0,
          x: isDragging ? 0 : -4
        }}
        transition={{ duration: 0.15 }}
      >
        {isFitToWidth ? 'Fit' : `${zoomPercent}%`}
      </motion.div>

      {/* Slider container - invisible hit area */}
      <motion.div
        ref={sliderRef}
        className="relative flex items-center justify-center cursor-pointer touch-none select-none"
        style={{
          height: SLIDER_HEIGHT,
          width: 32, // Wide hit area for touch
          y: overflow
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleTap}
      >
        {/* Track - wide rounded rectangle */}
        <motion.div
          className="relative rounded-full bg-foreground/10 overflow-hidden"
          style={{
            width: trackWidth,
            height: '100%'
          }}
        >
          {/* Filled bar - THIS is the indicator (no dot/knob) */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-full"
            style={{
              height: `${position * 100}%`,
              backgroundColor: isDragging
                ? 'hsl(var(--foreground) / 0.5)'
                : 'hsl(var(--foreground) / 0.35)'
            }}
            animate={{
              height: `${position * 100}%`
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
