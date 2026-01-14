/**
 * Petal geometry and texture generation utilities.
 */

import * as THREE from 'three';

/**
 * Create a procedural petal texture with veins and subtle noise.
 */
export function createPetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base gradient from center to edges
  const baseGrad = ctx.createRadialGradient(128, 180, 0, 128, 128, 180);
  baseGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  baseGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  baseGrad.addColorStop(1, 'rgba(180, 140, 160, 0.15)');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 256, 256);

  // Central vein
  ctx.strokeStyle = 'rgba(200, 160, 180, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(128, 240);
  ctx.quadraticCurveTo(128, 128, 128, 20);
  ctx.stroke();

  // Side veins
  ctx.strokeStyle = 'rgba(200, 160, 180, 0.2)';
  ctx.lineWidth = 1;
  const veins = [
    { start: 0.7, angle: 35, length: 0.35 },
    { start: 0.55, angle: 40, length: 0.3 },
    { start: 0.4, angle: 45, length: 0.25 },
    { start: 0.28, angle: 50, length: 0.18 },
  ];

  for (const vein of veins) {
    const startY = 256 * vein.start;
    const len = 256 * vein.length;
    const rad = vein.angle * Math.PI / 180;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(128, startY);
      ctx.quadraticCurveTo(
        128 + side * len * 0.5 * Math.sin(rad),
        startY - len * 0.3,
        128 + side * len * Math.sin(rad),
        startY - len * Math.cos(rad) * 0.5
      );
      ctx.stroke();
    }
  }

  // Add noise for organic feel
  const imageData = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 8;
    imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + n));
    imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + n));
    imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + n));
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Create a translucency map for subsurface scattering simulation.
 * Darker in center (thicker), lighter at edges (thinner).
 */
export function createTranslucencyMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgb(60, 60, 60)');
  grad.addColorStop(0.5, 'rgb(100, 100, 100)');
  grad.addColorStop(0.8, 'rgb(180, 180, 180)');
  grad.addColorStop(1, 'rgb(220, 220, 220)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Create a petal geometry with curvature and asymmetry.
 * @param seed - Seed for shape variation (0-7 recommended)
 */
export function createPetalGeometry(seed = 0): THREE.ShapeGeometry {
  const shape = new THREE.Shape();

  // Size variation based on seed
  const width = 0.07 + Math.abs(Math.sin(seed * 3.14)) * 0.035;
  const height = 0.14 + Math.abs(Math.cos(seed * 2.71)) * 0.04;
  const asymmetry = Math.sin(seed * 7.13) * 0.01;

  // Draw petal outline with bezier curves
  shape.moveTo(0, -height * 0.75);
  shape.bezierCurveTo(
    width * 0.4 + asymmetry, -height * 0.55,
    width * 0.9 + asymmetry, -height * 0.2,
    width * 0.85, height * 0.25
  );
  shape.bezierCurveTo(
    width * 0.75, height * 0.6,
    width * 0.35, height * 0.9,
    0, height
  );
  shape.bezierCurveTo(
    -width * 0.35, height * 0.9,
    -width * 0.75, height * 0.6,
    -width * 0.85, height * 0.25
  );
  shape.bezierCurveTo(
    -width * 0.9 - asymmetry * 0.5, -height * 0.2,
    -width * 0.4 - asymmetry * 0.5, -height * 0.55,
    0, -height * 0.75
  );

  const geometry = new THREE.ShapeGeometry(shape, 12);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  // Calculate bounds for UV mapping
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    minX = Math.min(minX, pos.getX(i));
    maxX = Math.max(maxX, pos.getX(i));
    minY = Math.min(minY, pos.getY(i));
    maxY = Math.max(maxY, pos.getY(i));
  }

  // Apply UV mapping and Z displacement for curvature
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);

    // UV mapping
    uv.setXY(i, (x - minX) / (maxX - minX), (y - minY) / (maxY - minY));

    // Z displacement for natural petal curvature
    const dist = Math.sqrt(x * x + y * y);
    const normalizedY = (y - minY) / (maxY - minY);
    const cup = dist * dist * 4; // Cupping at edges
    const twist = x * y * 0.6; // Slight twist
    const lengthwiseCurve = Math.sin(normalizedY * Math.PI) * 0.012; // Lengthwise bend
    const edgeWave = Math.sin(Math.atan2(y, x) * 5 + seed * 2) * 0.006 * dist * 10; // Edge waviness

    pos.setZ(i, cup + twist + lengthwiseCurve + edgeWave);
  }

  geometry.computeVertexNormals();
  return geometry;
}
