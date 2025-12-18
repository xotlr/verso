'use client';

import React, { useRef, useCallback, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ZoomSliderProps {
  zoom: number;
  fitToWidthScale: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;
  className?: string;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;
const SLIDER_HEIGHT = 100;
const MAX_OVERFLOW = 20;

/**
 * Procreate-style zoom slider (embedded version).
 * Wide rounded track with filled bar indicator (no dot/knob).
 * Designed to be embedded in a toolbar container.
 */
export function ZoomSlider({
  zoom,
  fitToWidthScale,
  onZoomChange,
  onResetZoom,
  className,
}: ZoomSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values
  const overflow = useMotionValue(0);
  const interactionScale = useSpring(1, { stiffness: 400, damping: 30 });

  // Track width expands on interaction (10px -> 14px)
  const trackWidth = useTransform(interactionScale, [1, 1.1], [10, 14]);

  // Calculate position from zoom (0 = bottom/min, 1 = top/max)
  const position = (zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);
  const zoomPercent = Math.round(zoom * 100);
  const isFitToWidth = Math.abs(zoom - fitToWidthScale) < 0.01;

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
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
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
    if (!isDragging) animate(interactionScale, 1.05, { type: 'spring', stiffness: 400, damping: 30 });
  }, [isDragging, interactionScale]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isDragging) {
      animate(interactionScale, 1, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }, [isDragging, interactionScale]);

  return (
    <div
      className={cn('relative flex flex-col items-center', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Percentage label - appears while dragging */}
      <motion.div
        className="absolute -left-8 top-1/2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-foreground/60 select-none whitespace-nowrap"
        initial={{ opacity: 0, x: 4 }}
        animate={{
          opacity: isDragging ? 1 : 0,
          x: isDragging ? 0 : 4
        }}
        transition={{ duration: 0.15 }}
      >
        {isFitToWidth ? 'Fit' : `${zoomPercent}%`}
      </motion.div>

      {/* Slider container */}
      <motion.div
        ref={sliderRef}
        className="relative flex items-center justify-center cursor-pointer touch-none select-none"
        style={{
          height: SLIDER_HEIGHT,
          width: 28,
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
          {/* Filled bar indicator */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-full"
            style={{
              height: `${position * 100}%`,
              backgroundColor: isDragging
                ? 'hsl(var(--foreground) / 0.5)'
                : 'hsl(var(--foreground) / 0.3)'
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
    </div>
  );
}
