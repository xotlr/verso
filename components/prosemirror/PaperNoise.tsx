'use client';

import { useEffect, useRef } from 'react';

interface PaperNoiseProps {
  opacity?: number;
  grainSize?: number;
  intensity?: number;
  resolution?: number;
}

/**
 * High-quality paper noise component with Perlin-like algorithm
 * for realistic film grain effect.
 */
export function PaperNoise({
  opacity = 0.03,       // Reduced from 0.05 for subtlety
  grainSize = 1,        // Finer grain (was 2px)
  intensity = 0.2,      // Softer variation (was 0.3)
  resolution = 1024,    // Higher quality (was 512)
}: PaperNoiseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = resolution;
    canvas.height = resolution;

    // Generate smooth Perlin-like noise
    const imageData = ctx.createImageData(resolution, resolution);
    const data = imageData.data;

    // Create noise with Perlin-like smoothing
    const noise = generatePerlinLikeNoise(resolution, resolution, intensity);

    // Apply noise to image data
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const i = (y * resolution + x) * 4;
        const value = noise[y][x];

        data[i] = value;     // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
        data[i + 3] = 255;   // A
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [intensity, resolution]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full rounded-md"
      style={{
        opacity,
        backgroundSize: `${grainSize}px ${grainSize}px`,
        imageRendering: 'auto',  // Changed from 'pixelated' for smoother grain
        mixBlendMode: 'overlay',
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Generate Perlin-like noise with smooth interpolation
 * This creates a more natural film grain effect than pure random noise
 */
function generatePerlinLikeNoise(
  width: number,
  height: number,
  intensity: number
): number[][] {
  const noise: number[][] = Array(height)
    .fill(0)
    .map(() => Array(width).fill(0));

  // Generate base random grid (lower resolution for smoothing)
  const gridSize = 8; // Control smoothness
  const gridWidth = Math.ceil(width / gridSize);
  const gridHeight = Math.ceil(height / gridSize);
  const grid: number[][] = Array(gridHeight)
    .fill(0)
    .map(() =>
      Array(gridWidth)
        .fill(0)
        .map(() => Math.random())
    );

  // Interpolate to create smooth noise
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = x / gridSize;
      const gy = y / gridSize;

      const gx0 = Math.floor(gx);
      const gx1 = Math.min(gx0 + 1, gridWidth - 1);
      const gy0 = Math.floor(gy);
      const gy1 = Math.min(gy0 + 1, gridHeight - 1);

      const fx = gx - gx0;
      const fy = gy - gy0;

      // Smooth interpolation (cosine)
      const sx = smoothstep(fx);
      const sy = smoothstep(fy);

      // Bilinear interpolation
      const n00 = grid[gy0][gx0];
      const n10 = grid[gy0][gx1];
      const n01 = grid[gy1][gx0];
      const n11 = grid[gy1][gx1];

      const nx0 = lerp(n00, n10, sx);
      const nx1 = lerp(n01, n11, sx);
      const noiseValue = lerp(nx0, nx1, sy);

      // Add fine-grain random noise on top
      const fineNoise = (Math.random() - 0.5) * 0.3;

      // Combine smooth noise with fine grain
      const combined = noiseValue * 0.7 + fineNoise * 0.3;

      // Map to grayscale range with intensity
      const base = 128;
      const variation = (combined - 0.5) * 255 * intensity;
      noise[y][x] = Math.max(0, Math.min(255, base + variation));
    }
  }

  return noise;
}

/**
 * Smooth step function for smooth interpolation
 */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Linear interpolation
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
