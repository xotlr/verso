"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

// ============================================
// TYPES
// ============================================

export type PetalPalette = 'primary' | 'sakura' | 'rose' | 'autumn' | 'snow' | 'blossom' | 'gold' | 'blood';

export interface PetalsProps {
  count?: number;
  palette?: PetalPalette;
  primaryColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

// ============================================
// PHYSICS CONSTANTS
// ============================================

const PHYSICS = {
  CT: 1.0,
  CR: 1.2,
  CD_0: 0.12,
  CD_90: 2.0,
  FR_CRITICAL: 0.67,
  OMEGA_FLUTTER: 0.8,
  OMEGA_TUMBLE: 1.5,
  TERMINAL_VELOCITY: 0.6,
};

const STATE = {
  STEADY_DESCENT: 0,
  FLUTTERING: 1,
  TUMBLING: 2,
  CHAOTIC: 3,
  GLIDING: 4,
  CUSP_TURN: 5,
} as const;

// ============================================
// COLOR PALETTES
// ============================================

const PALETTE_COLORS: Record<Exclude<PetalPalette, 'primary'>, string[]> = {
  sakura: [
    '#f8ecf2', '#f0dce6', '#e8ccd8', '#e0bccc', '#d8acc0',
    '#ffffff', '#fff5f8', '#fce4ec',
  ],
  rose: [
    '#E8B4B8', '#D4A0A4', '#C98B8F', '#F2C4C8', '#DEB0B4',
    '#F0D0D4', '#E0A8AC', '#D09498',
  ],
  autumn: [
    '#E8C4A0', '#D4A882', '#C99066', '#F2D8C0', '#DEBCA0',
    '#F5E0C8', '#D8B090', '#C8A078',
  ],
  snow: [
    '#E8E8F0', '#D4D4E0', '#C0C0D0', '#F2F2FA', '#DEDEE8',
    '#F8F8FF', '#E0E0F0', '#D8D8E8',
  ],
  blossom: [
    '#F4B8C8', '#E8A0B4', '#DC88A0', '#FFD0DC', '#F0C0CC',
    '#FFE0E8', '#E890A8', '#D47890',
  ],
  gold: [
    '#FFD700', '#FFC800', '#FFDF00', '#FFE44D', '#FFCC00',
    '#FFE066', '#FFDB4D', '#FFC933',
  ],
  blood: [
    '#8B0000', '#A52A2A', '#B22222', '#CD5C5C', '#DC143C',
    '#990000', '#AA3333', '#C04040',
  ],
};

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePrimaryPalette(primaryColor: string): string[] {
  const parts = primaryColor.split(' ');
  if (parts.length < 3) return PALETTE_COLORS.sakura;

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);

  const colors: string[] = [];
  for (let i = 0; i < 8; i++) {
    const lVar = l + (Math.random() - 0.5) * 30;
    const sVar = s + (Math.random() - 0.5) * 20;
    const hVar = h + (Math.random() - 0.5) * 15;
    colors.push(hslToHex(
      (hVar + 360) % 360,
      Math.max(10, Math.min(100, sVar)),
      Math.max(20, Math.min(90, lVar))
    ));
  }
  return colors;
}

function getColors(palette: PetalPalette, primaryColor?: string): THREE.Color[] {
  let hexColors: string[];

  if (palette === 'primary' && primaryColor) {
    hexColors = generatePrimaryPalette(primaryColor);
  } else if (palette !== 'primary' && palette in PALETTE_COLORS) {
    hexColors = PALETTE_COLORS[palette];
  } else {
    hexColors = PALETTE_COLORS.sakura;
  }

  return hexColors.map(hex => new THREE.Color(hex));
}

// ============================================
// SIMPLEX NOISE
// ============================================

class SimplexNoise {
  private p: Uint8Array;
  private perm: Uint8Array;
  private permMod12: Uint8Array;

  constructor(seed = Math.random()) {
    this.p = new Uint8Array(256);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 256; i++) this.p[i] = i;
    let n: number, q: number;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      n = seed % (i + 1);
      q = this.p[i]; this.p[i] = this.p[n]; this.p[n] = q;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise3D(x: number, y: number, z: number): number {
    const F3 = 1/3, G3 = 1/6;
    const grad3: number[][] = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    let n0: number, n1: number, n2: number, n3: number;
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const X0 = i - t, Y0 = j - t, Z0 = k - t;
    const x0 = x - X0, y0 = y - Y0, z0 = z - Z0;
    let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
      else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
      else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
    } else {
      if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
      else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
      else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2*G3, y2 = y0 - j2 + 2*G3, z2 = z0 - k2 + 2*G3;
    const x3 = x0 - 1 + 3*G3, y3 = y0 - 1 + 3*G3, z3 = z0 - 1 + 3*G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t0 < 0) n0 = 0; else { const gi0 = this.permMod12[ii + this.perm[jj + this.perm[kk]]]; t0 *= t0; n0 = t0 * t0 * (grad3[gi0][0]*x0 + grad3[gi0][1]*y0 + grad3[gi0][2]*z0); }
    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (t1 < 0) n1 = 0; else { const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]]; t1 *= t1; n1 = t1 * t1 * (grad3[gi1][0]*x1 + grad3[gi1][1]*y1 + grad3[gi1][2]*z1); }
    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (t2 < 0) n2 = 0; else { const gi2 = this.permMod12[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]]; t2 *= t2; n2 = t2 * t2 * (grad3[gi2][0]*x2 + grad3[gi2][1]*y2 + grad3[gi2][2]*z2); }
    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (t3 < 0) n3 = 0; else { const gi3 = this.permMod12[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]]; t3 *= t3; n3 = t3 * t3 * (grad3[gi3][0]*x3 + grad3[gi3][1]*y3 + grad3[gi3][2]*z3); }
    return 32 * (n0 + n1 + n2 + n3);
  }

  fbm(x: number, y: number, z: number, octaves = 4): number {
    let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise3D(x * frequency, y * frequency, z * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / maxValue;
  }

  curl(x: number, y: number, z: number, epsilon = 0.0001): THREE.Vector3 {
    const dx = (this.noise3D(x + epsilon, y, z) - this.noise3D(x - epsilon, y, z)) / (2 * epsilon);
    const dy = (this.noise3D(x, y + epsilon, z) - this.noise3D(x, y - epsilon, z)) / (2 * epsilon);
    const dz = (this.noise3D(x, y, z + epsilon) - this.noise3D(x, y, z - epsilon)) / (2 * epsilon);
    return new THREE.Vector3(dy - dz, dz - dx, dx - dy);
  }
}

// ============================================
// CONFIG
// ============================================

interface PetalsConfig {
  petalCount: number;
  spread: { x: number; y: number; z: number };
  colors: THREE.Color[];
  clusterCount: number;
  clusterRadius: number;
  cohesionStrength: number;
  alignmentStrength: number;
}

function createConfig(count: number, colors: THREE.Color[]): PetalsConfig {
  return {
    petalCount: count,
    spread: { x: 18, y: 14, z: 16 },
    colors,
    clusterCount: Math.max(6, Math.floor(count / 30)),
    clusterRadius: 2.5,
    cohesionStrength: 0.015,
    alignmentStrength: 0.02,
  };
}

// ============================================
// CLUSTER SPAWNER
// ============================================

interface Cluster {
  position: THREE.Vector3;
  colorBias: number;
  drift: THREE.Vector3;
  phase: number;
  activity: number;
}

class ClusterSpawner {
  clusters: Cluster[] = [];
  private config: PetalsConfig;

  constructor(config: PetalsConfig) {
    this.config = config;
    this.initClusters();
  }

  initClusters(): void {
    this.clusters = [];
    for (let i = 0; i < this.config.clusterCount; i++) {
      this.clusters.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * this.config.spread.x * 0.8,
          this.config.spread.y / 2 + Math.random() * 3,
          (Math.random() - 0.5) * this.config.spread.z * 0.8
        ),
        colorBias: Math.floor(Math.random() * this.config.colors.length),
        drift: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          0,
          (Math.random() - 0.5) * 0.02
        ),
        phase: Math.random() * Math.PI * 2,
        activity: 0.5 + Math.random() * 0.5,
      });
    }
  }

  update(time: number): void {
    for (const cluster of this.clusters) {
      cluster.position.x += Math.sin(time * 0.1 + cluster.phase) * 0.005;
      cluster.position.z += Math.cos(time * 0.08 + cluster.phase) * 0.005;

      if (cluster.position.x > this.config.spread.x / 2) cluster.position.x = -this.config.spread.x / 2;
      if (cluster.position.x < -this.config.spread.x / 2) cluster.position.x = this.config.spread.x / 2;
      if (cluster.position.z > this.config.spread.z / 2) cluster.position.z = -this.config.spread.z / 2;
      if (cluster.position.z < -this.config.spread.z / 2) cluster.position.z = this.config.spread.z / 2;
    }
  }

  getSpawnPosition(clusterId: number): THREE.Vector3 {
    const cluster = this.clusters[clusterId];
    return new THREE.Vector3(
      cluster.position.x + (Math.random() - 0.5) * this.config.clusterRadius,
      cluster.position.y + (Math.random() - 0.5) * 1.5,
      cluster.position.z + (Math.random() - 0.5) * this.config.clusterRadius
    );
  }

  getClusterColor(clusterId: number): THREE.Color {
    const cluster = this.clusters[clusterId];
    if (Math.random() < 0.7) {
      return this.config.colors[cluster.colorBias];
    }
    return this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
  }
}

// ============================================
// AIR POCKET SYSTEM
// ============================================

interface AirPocket {
  position: THREE.Vector3;
  radius: number;
  strength: number;
  life: number;
  maxLife: number;
  drift: THREE.Vector3;
  currentStrength: number;
}

class AirPocketSystem {
  pockets: AirPocket[] = [];
  private maxPockets = 8;

  update(time: number): void {
    if (this.pockets.length < this.maxPockets && Math.random() < 0.005) {
      this.pockets.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 18,
          -7 + Math.random() * 14 * 0.4,
          (Math.random() - 0.5) * 16
        ),
        radius: 2 + Math.random() * 3,
        strength: 0.5 + Math.random() * 0.7,
        life: 0,
        maxLife: 5 + Math.random() * 6,
        drift: new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.15 + Math.random() * 0.1, (Math.random() - 0.5) * 0.1),
        currentStrength: 0,
      });
    }

    for (let i = this.pockets.length - 1; i >= 0; i--) {
      const pocket = this.pockets[i];
      pocket.life += 0.016;
      pocket.position.add(pocket.drift.clone().multiplyScalar(0.016));
      pocket.currentStrength = pocket.strength * Math.sin(pocket.life / pocket.maxLife * Math.PI);
      if (pocket.life > pocket.maxLife) this.pockets.splice(i, 1);
    }
  }

  getForceAt(position: THREE.Vector3): THREE.Vector3 {
    const force = new THREE.Vector3(0, 0, 0);
    for (const pocket of this.pockets) {
      const diff = position.clone().sub(pocket.position);
      const dist = diff.length();
      if (dist < pocket.radius) {
        const falloff = 1 - (dist / pocket.radius);
        force.y += pocket.currentStrength * falloff * falloff;
        const inward = diff.clone().normalize().multiplyScalar(-0.06 * falloff);
        force.x += inward.x;
        force.z += inward.z;
      }
    }
    return force;
  }
}

// ============================================
// SPATIAL HASH
// ============================================

class SpatialHash {
  private cellSize: number;
  private cells: Map<string, Petal[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear(): void {
    this.cells.clear();
  }

  private getKey(x: number, y: number, z: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)},${Math.floor(z / this.cellSize)}`;
  }

  insert(petal: Petal): void {
    const key = this.getKey(petal.position.x, petal.position.y, petal.position.z);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key)!.push(petal);
  }

  getNearby(position: THREE.Vector3, radius: number): Petal[] {
    const nearby: Petal[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          if (this.cells.has(key)) nearby.push(...this.cells.get(key)!);
        }
      }
    }
    return nearby;
  }
}

// ============================================
// TEXTURES
// ============================================

function createPetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const baseGrad = ctx.createRadialGradient(128, 180, 0, 128, 128, 180);
  baseGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  baseGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  baseGrad.addColorStop(1, 'rgba(180, 140, 160, 0.15)');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(200, 160, 180, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(128, 240);
  ctx.quadraticCurveTo(128, 128, 128, 20);
  ctx.stroke();

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
      ctx.quadraticCurveTo(128 + side * len * 0.5 * Math.sin(rad), startY - len * 0.3, 128 + side * len * Math.sin(rad), startY - len * Math.cos(rad) * 0.5);
      ctx.stroke();
    }
  }

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

function createTranslucencyMap(): THREE.CanvasTexture {
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

// ============================================
// PETAL GEOMETRY
// ============================================

function createPetalGeometry(seed = 0): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  const width = 0.07 + Math.abs(Math.sin(seed * 3.14)) * 0.035;
  const height = 0.14 + Math.abs(Math.cos(seed * 2.71)) * 0.04;
  const asymmetry = Math.sin(seed * 7.13) * 0.01;

  shape.moveTo(0, -height * 0.75);
  shape.bezierCurveTo(width * 0.4 + asymmetry, -height * 0.55, width * 0.9 + asymmetry, -height * 0.2, width * 0.85, height * 0.25);
  shape.bezierCurveTo(width * 0.75, height * 0.6, width * 0.35, height * 0.9, 0, height);
  shape.bezierCurveTo(-width * 0.35, height * 0.9, -width * 0.75, height * 0.6, -width * 0.85, height * 0.25);
  shape.bezierCurveTo(-width * 0.9 - asymmetry * 0.5, -height * 0.2, -width * 0.4 - asymmetry * 0.5, -height * 0.55, 0, -height * 0.75);

  const geometry = new THREE.ShapeGeometry(shape, 12);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    minX = Math.min(minX, pos.getX(i));
    maxX = Math.max(maxX, pos.getX(i));
    minY = Math.min(minY, pos.getY(i));
    maxY = Math.max(maxY, pos.getY(i));
  }

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    uv.setXY(i, (x - minX) / (maxX - minX), (y - minY) / (maxY - minY));
    const dist = Math.sqrt(x * x + y * y);
    const normalizedY = (y - minY) / (maxY - minY);
    const cup = dist * dist * 4;
    const twist = x * y * 0.6;
    const lengthwiseCurve = Math.sin(normalizedY * Math.PI) * 0.012;
    const edgeWave = Math.sin(Math.atan2(y, x) * 5 + seed * 2) * 0.006 * dist * 10;
    pos.setZ(i, cup + twist + lengthwiseCurve + edgeWave);
  }

  geometry.computeVertexNormals();
  return geometry;
}

// ============================================
// SHADERS
// ============================================

const petalVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying float vDepth;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vec4 mvPosition = viewMatrix * worldPos;
    vViewPosition = -mvPosition.xyz;
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const petalFragmentShader = `
  uniform vec3 uColor;
  uniform sampler2D uTexture;
  uniform sampler2D uTranslucency;
  uniform vec3 uLightPos;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying float vDepth;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    vec3 lightDir = normalize(uLightPos - vWorldPosition);

    vec4 texColor = texture2D(uTexture, vUv);
    float translucency = texture2D(uTranslucency, vUv).r;

    vec3 color = uColor * (1.0 - texColor.r * 0.15);

    float NdotL = max(dot(normal, lightDir), 0.0);
    float diffuse = NdotL * 0.5 + 0.5;

    float backLight = max(dot(-normal, lightDir), 0.0);
    vec3 sss = uColor * backLight * translucency * 0.6;

    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    vec3 rim = vec3(1.0, 0.95, 0.98) * fresnel * 0.4;

    float edgeFactor = smoothstep(0.0, 0.3, translucency);
    vec3 edgeGlow = uColor * edgeFactor * 0.2;

    color = color * diffuse + sss + rim + edgeGlow;
    color.r += fresnel * 0.1;
    color.b -= fresnel * 0.05;

    // Depth-based alpha - more opaque, with soft depth falloff
    float depthFade = smoothstep(4.0, 20.0, vDepth);
    float alpha = mix(0.92, 0.55, depthFade);

    // Add slight blur simulation via color softening at edges
    float edgeSoftness = smoothstep(0.0, 0.15, translucency);
    color = mix(color, color * 1.1, edgeSoftness * 0.3);

    gl_FragColor = vec4(color, alpha);
  }
`;

// Chromatic aberration with alpha preservation
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uOffset: { value: new THREE.Vector2(0.002, 0.002) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uOffset;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - vec2(0.5);
      float dist = length(dir);
      vec2 offset = dir * uOffset * dist * 1.5;
      float r = texture2D(tDiffuse, vUv + offset).r;
      vec4 center = texture2D(tDiffuse, vUv);
      float b = texture2D(tDiffuse, vUv - offset).b;
      // Preserve alpha from center sample
      gl_FragColor = vec4(r, center.g, b, center.a);
    }
  `
};

// Blur shader with alpha preservation
const BlurShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uBlurAmount: { value: 1.5 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uBlurAmount;
    varying vec2 vUv;

    void main() {
      vec2 texelSize = uBlurAmount / uResolution;

      // 9-tap gaussian-ish blur
      vec4 sum = vec4(0.0);
      float totalWeight = 0.0;

      for (float x = -1.0; x <= 1.0; x += 1.0) {
        for (float y = -1.0; y <= 1.0; y += 1.0) {
          vec2 offset = vec2(x, y) * texelSize;
          float weight = 1.0 - length(vec2(x, y)) * 0.3;
          vec4 texel = texture2D(tDiffuse, vUv + offset);
          sum += texel * weight;
          totalWeight += weight;
        }
      }

      gl_FragColor = sum / totalWeight;
    }
  `
};

// Final pass that outputs to screen with proper alpha
const OutputShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      // Output with premultiplied alpha for proper blending
      gl_FragColor = vec4(tex.rgb * tex.a, tex.a);
    }
  `
};

// Haze overlay shader - adds atmospheric depth
const HazeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uHazeColor: { value: new THREE.Vector3(1.0, 0.98, 0.99) },
    uHazeStrength: { value: 0.12 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 uHazeColor;
    uniform float uHazeStrength;
    varying vec2 vUv;

    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);

      // Create radial gradient from center (less haze) to edges (more haze)
      vec2 center = vUv - vec2(0.5);
      float dist = length(center) * 1.4;
      float hazeFactor = smoothstep(0.0, 1.0, dist) * uHazeStrength;

      // Blend haze with existing color while preserving alpha
      vec3 hazedColor = mix(tex.rgb, uHazeColor, hazeFactor * tex.a);

      gl_FragColor = vec4(hazedColor, tex.a);
    }
  `
};

// ============================================
// PETAL CLASS
// ============================================

class Petal {
  index: number;
  clusterId: number;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  angularVelocity: THREE.Vector3;
  mass: number;
  area: number;
  scale: number;
  width: number;
  radius: number;
  beta: number;
  froudeNumber: number;
  state: number;
  stateTime: number;
  stateDuration: number;
  flutterOmega: number;
  flutterPhase: number;
  flutterAmplitude: number;
  tumbleAxis: THREE.Vector3;
  tumbleSpeed: number;
  inCuspTurn: boolean;
  cuspElevation: number;
  timeOffset: number;
  noiseOffset: THREE.Vector3;
  prevVelocityX: number;

  private clusterSpawner: ClusterSpawner;
  private config: PetalsConfig;

  constructor(
    geometry: THREE.ShapeGeometry,
    index: number,
    clusterId: number,
    clusterSpawner: ClusterSpawner,
    config: PetalsConfig,
    petalTexture: THREE.CanvasTexture,
    translucencyMap: THREE.CanvasTexture
  ) {
    this.index = index;
    this.clusterId = clusterId;
    this.clusterSpawner = clusterSpawner;
    this.config = config;

    const color = clusterSpawner.getClusterColor(clusterId);

    const material = new THREE.ShaderMaterial({
      vertexShader: petalVertexShader,
      fragmentShader: petalFragmentShader,
      uniforms: {
        uColor: { value: color },
        uTexture: { value: petalTexture },
        uTranslucency: { value: translucencyMap },
        uLightPos: { value: new THREE.Vector3(5, 10, 5) }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;

    const scale = 0.6 + Math.random() * 0.9;
    this.mesh.scale.setScalar(scale);
    this.scale = scale;
    this.width = scale * 0.14;
    this.radius = scale * 0.1;

    this.position = clusterSpawner.getSpawnPosition(clusterId);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      -0.05 - Math.random() * 0.05,
      (Math.random() - 0.5) * 0.1
    );

    this.quaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
    );
    this.angularVelocity = new THREE.Vector3(0, 0, 0);

    this.mass = 0.12 + Math.random() * 0.2;
    this.area = scale * scale;
    this.beta = 0.05 + Math.random() * 0.15;
    this.froudeNumber = 0;

    this.state = STATE.FLUTTERING;
    this.stateTime = 0;
    this.stateDuration = 1 + Math.random() * 2;

    this.flutterOmega = PHYSICS.OMEGA_FLUTTER * (0.7 + Math.random() * 0.5);
    this.flutterPhase = Math.random() * Math.PI * 2;
    this.flutterAmplitude = 0.25 + Math.random() * 0.25;

    this.tumbleAxis = new THREE.Vector3().randomDirection();
    this.tumbleSpeed = 0;

    this.inCuspTurn = false;
    this.cuspElevation = 0;

    this.timeOffset = Math.random() * 100;
    this.noiseOffset = new THREE.Vector3(Math.random() * 100, Math.random() * 100, Math.random() * 100);

    this.prevVelocityX = 0;
  }

  private getPetalNormal(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
  }

  private updateFroudeNumber(): void {
    const speed = this.velocity.length();
    this.froudeNumber = speed / Math.sqrt(0.65 * this.width);
  }

  private calculateDrag(velocity: THREE.Vector3): THREE.Vector3 {
    const speed = velocity.length();
    if (speed < 0.001) return new THREE.Vector3(0, 0, 0);

    const velDir = velocity.clone().normalize();
    const normal = this.getPetalNormal();
    const cosAlpha = Math.abs(velDir.dot(normal));
    const sinAlpha = Math.sqrt(1 - cosAlpha * cosAlpha);
    const CD = PHYSICS.CD_0 * cosAlpha * cosAlpha + PHYSICS.CD_90 * sinAlpha * sinAlpha;

    return velDir.multiplyScalar(-0.5 * CD * this.area * speed * speed);
  }

  private calculateLift(velocity: THREE.Vector3, angularSpeed: number): THREE.Vector3 {
    const speed = velocity.length();
    if (speed < 0.02) return new THREE.Vector3(0, 0, 0);

    const velDir = velocity.clone().normalize();
    const normal = this.getPetalNormal();
    const sinTwoAlpha = 2 * normal.dot(velDir) * Math.sqrt(1 - Math.pow(normal.dot(velDir), 2));

    const translationalLift = -0.5 * PHYSICS.CT * this.width * speed * speed * sinTwoAlpha;
    const rotationalLift = 0.5 * PHYSICS.CR * this.width * this.width * angularSpeed * speed;
    const totalLift = translationalLift + rotationalLift;

    const liftDir = new THREE.Vector3().crossVectors(velDir, normal);
    if (liftDir.lengthSq() < 0.0001) return new THREE.Vector3(0, 0, 0);
    liftDir.cross(velDir).normalize();
    if (liftDir.y < 0) liftDir.negate();

    return liftDir.multiplyScalar(Math.abs(totalLift));
  }

  private detectCuspTurn(): void {
    const velocitySignChanged = (this.velocity.x * this.prevVelocityX) < 0;
    const isSlowing = this.velocity.length() < 0.12;

    if (velocitySignChanged && isSlowing && !this.inCuspTurn) {
      this.inCuspTurn = true;
      this.cuspElevation = 0.25 + Math.random() * 0.15;
    }

    if (this.inCuspTurn) {
      this.cuspElevation *= 0.94;
      if (this.cuspElevation < 0.01) this.inCuspTurn = false;
    }

    this.prevVelocityX = this.velocity.x;
  }

  private updateState(time: number): void {
    this.updateFroudeNumber();
    this.stateTime += 0.016;

    if (this.froudeNumber < PHYSICS.FR_CRITICAL * 0.5) {
      if (this.state !== STATE.FLUTTERING && this.state !== STATE.CUSP_TURN && Math.random() < 0.015) {
        this.state = STATE.FLUTTERING;
        this.flutterPhase = time * this.flutterOmega;
      }
    } else if (this.froudeNumber > PHYSICS.FR_CRITICAL * 1.2) {
      if (this.state !== STATE.TUMBLING && Math.random() < 0.01) {
        this.state = STATE.TUMBLING;
        this.tumbleAxis.randomDirection();
        this.tumbleSpeed = PHYSICS.OMEGA_TUMBLE * (0.7 + Math.random() * 0.5);
      }
    } else {
      if (Math.random() < 0.005) {
        this.state = STATE.CHAOTIC;
        this.stateDuration = 0.4 + Math.random() * 0.8;
      }
    }

    if (this.inCuspTurn && this.state !== STATE.CUSP_TURN) {
      this.state = STATE.CUSP_TURN;
      this.stateDuration = 0.15 + Math.random() * 0.25;
    }

    if (this.state === STATE.CUSP_TURN && !this.inCuspTurn) {
      this.state = STATE.FLUTTERING;
      this.flutterPhase = time * this.flutterOmega;
    }

    if (this.stateTime > this.stateDuration) {
      this.state = STATE.FLUTTERING;
      this.stateTime = 0;
      this.stateDuration = 1 + Math.random() * 2;
    }
  }

  private getFlockingForce(nearbyPetals: Petal[]): THREE.Vector3 {
    const cohesion = new THREE.Vector3(0, 0, 0);
    const alignment = new THREE.Vector3(0, 0, 0);
    const separation = new THREE.Vector3(0, 0, 0);
    let neighborCount = 0;

    for (const other of nearbyPetals) {
      if (other === this) continue;

      const diff = this.position.clone().sub(other.position);
      const dist = diff.length();

      if (dist < 1.5 && dist > 0.01) {
        cohesion.sub(diff);
        alignment.add(other.velocity);

        if (dist < 0.4) {
          separation.add(diff.normalize().multiplyScalar(0.4 - dist));
        }

        neighborCount++;
      }
    }

    const force = new THREE.Vector3(0, 0, 0);

    if (neighborCount > 0) {
      cohesion.divideScalar(neighborCount);
      force.add(cohesion.multiplyScalar(this.config.cohesionStrength));

      alignment.divideScalar(neighborCount);
      alignment.sub(this.velocity);
      force.add(alignment.multiplyScalar(this.config.alignmentStrength));

      force.add(separation.multiplyScalar(0.05));
    }

    return force;
  }

  private getWakeInfluence(nearbyPetals: Petal[]): THREE.Vector3 {
    const wake = new THREE.Vector3(0, 0, 0);

    for (const other of nearbyPetals) {
      if (other === this) continue;

      const diff = this.position.clone().sub(other.position);
      const dist = diff.length();

      if (dist < 1.8 && dist > 0.05) {
        const otherSpeed = other.velocity.length();
        if (otherSpeed > 0.025) {
          const velDir = other.velocity.clone().normalize();
          const behindness = diff.normalize().dot(velDir);

          if (behindness > 0.15) {
            const strength = (1 - dist / 1.8) * behindness * otherSpeed * 0.25;
            wake.y -= strength * 0.35;
            wake.x += (Math.random() - 0.5) * strength * 0.4;
            wake.z += (Math.random() - 0.5) * strength * 0.4;
          }
        }
      }
    }

    return wake;
  }

  private handleCollisions(nearbyPetals: Petal[]): void {
    for (const other of nearbyPetals) {
      if (other === this || other.index <= this.index) continue;

      const diff = this.position.clone().sub(other.position);
      const dist = diff.length();
      const minDist = this.radius + other.radius;

      if (dist < minDist && dist > 0.001) {
        const overlap = minDist - dist;
        const normal = diff.normalize();

        this.position.add(normal.clone().multiplyScalar(overlap * 0.5));
        other.position.sub(normal.clone().multiplyScalar(overlap * 0.5));

        const relVel = this.velocity.clone().sub(other.velocity);
        const velAlongNormal = relVel.dot(normal);

        if (velAlongNormal < 0) {
          const impulse = -(1.3) * velAlongNormal * 0.4;
          const impulseVec = normal.clone().multiplyScalar(impulse);

          this.velocity.add(impulseVec.clone().divideScalar(this.mass));
          other.velocity.sub(impulseVec.clone().divideScalar(other.mass));

          const tangent = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0));
          this.angularVelocity.add(tangent.multiplyScalar(impulse * 1.5));
        }
      }
    }
  }

  update(
    time: number,
    deltaTime: number,
    nearbyPetals: Petal[],
    noise: SimplexNoise,
    airPockets: AirPocketSystem
  ): void {
    const t = time + this.timeOffset;

    this.detectCuspTurn();
    this.updateState(time);

    const windScale = 0.05;
    const curlWind = noise.curl(
      this.position.x * windScale + t * 0.035,
      this.position.y * windScale + t * 0.02,
      this.position.z * windScale
    ).multiplyScalar(0.18);

    curlWind.x += noise.fbm(t * 0.025, this.position.y * 0.1, this.position.z * 0.1, 2) * 0.1;
    curlWind.z += noise.fbm(this.position.x * 0.1, t * 0.025, this.position.y * 0.1, 2) * 0.1;

    const airPocketForce = airPockets.getForceAt(this.position);
    const wakeForce = this.getWakeInfluence(nearbyPetals);
    const flockingForce = this.getFlockingForce(nearbyPetals);

    const gravity = new THREE.Vector3(0, -0.6, 0);

    const stateForce = new THREE.Vector3(0, 0, 0);
    const stateAngular = new THREE.Vector3(0, 0, 0);

    switch (this.state) {
      case STATE.FLUTTERING: {
        const phase = t * this.flutterOmega + this.flutterPhase;
        stateForce.x += Math.cos(phase) * this.flutterAmplitude * 0.18;
        stateAngular.x = Math.cos(phase) * 0.9;
        stateAngular.z = -Math.cos(phase) * 0.7;
        stateAngular.x += Math.sin(t * 3.2 + this.flutterPhase) * 0.25;
        stateAngular.z += Math.cos(t * 2.8 + this.flutterPhase) * 0.25;
        break;
      }

      case STATE.TUMBLING: {
        stateAngular.add(this.tumbleAxis.clone().multiplyScalar(this.tumbleSpeed));
        stateForce.x += Math.sin(t * 4.5) * 0.08;
        stateForce.z += Math.cos(t * 4) * 0.08;
        this.tumbleSpeed *= 0.994;
        break;
      }

      case STATE.CHAOTIC: {
        stateForce.x += noise.noise3D(t * 1.8, this.noiseOffset.x, 0) * 0.12;
        stateForce.z += noise.noise3D(this.noiseOffset.y, t * 1.8, 0) * 0.12;
        stateAngular.x = noise.noise3D(t * 2.5, 0, this.noiseOffset.z) * 1.8;
        stateAngular.y = noise.noise3D(0, t * 2.5, this.noiseOffset.x) * 1.3;
        stateAngular.z = noise.noise3D(this.noiseOffset.y, 0, t * 2.5) * 1.8;
        break;
      }

      case STATE.CUSP_TURN: {
        gravity.y *= 0.08;
        stateForce.y += this.cuspElevation;
        stateAngular.x = Math.sin(t * 3.5) * 1.8;
        stateAngular.z = Math.cos(t * 3) * 1.8;
        break;
      }

      case STATE.GLIDING: {
        gravity.y *= 0.25;
        const glideDir = this.velocity.clone();
        glideDir.y = 0;
        if (glideDir.length() > 0.01) stateForce.add(glideDir.normalize().multiplyScalar(0.15));
        const normal = this.getPetalNormal();
        stateAngular.x -= normal.x * 0.8;
        stateAngular.z -= normal.z * 0.8;
        break;
      }
    }

    const angularSpeed = this.angularVelocity.length();
    const drag = this.calculateDrag(this.velocity);
    const lift = this.calculateLift(this.velocity, angularSpeed);

    const totalForce = new THREE.Vector3()
      .add(gravity)
      .add(curlWind)
      .add(airPocketForce)
      .add(wakeForce)
      .add(flockingForce)
      .add(drag)
      .add(lift)
      .add(stateForce);

    this.velocity.add(totalForce.clone().multiplyScalar(deltaTime / this.mass));

    const maxSpeed = PHYSICS.TERMINAL_VELOCITY * 1.8;
    if (this.velocity.length() > maxSpeed) this.velocity.normalize().multiplyScalar(maxSpeed);

    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    this.handleCollisions(nearbyPetals);

    this.angularVelocity.lerp(stateAngular, deltaTime * 4.5);
    this.angularVelocity.multiplyScalar(0.92);

    const rotationDelta = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        this.angularVelocity.x * deltaTime,
        this.angularVelocity.y * deltaTime,
        this.angularVelocity.z * deltaTime
      )
    );
    this.quaternion.multiply(rotationDelta).normalize();

    const bounds = this.config.spread;
    if (this.position.y < -bounds.y / 2 - 2) this.reset();
    if (this.position.x < -bounds.x / 2 - 2) this.position.x = bounds.x / 2 + 2;
    if (this.position.x > bounds.x / 2 + 2) this.position.x = -bounds.x / 2 - 2;
    if (this.position.z < -bounds.z / 2 - 2) this.position.z = bounds.z / 2 + 2;
    if (this.position.z > bounds.z / 2 + 2) this.position.z = -bounds.z / 2 - 2;

    this.mesh.position.copy(this.position);
    this.mesh.quaternion.copy(this.quaternion);
  }

  reset(): void {
    this.position = this.clusterSpawner.getSpawnPosition(this.clusterId);
    this.velocity.set(
      (Math.random() - 0.5) * 0.1,
      -0.05 - Math.random() * 0.05,
      (Math.random() - 0.5) * 0.1
    );
    this.angularVelocity.set(0, 0, 0);
    this.state = STATE.FLUTTERING;
    this.stateTime = 0;
    this.inCuspTurn = false;
    this.prevVelocityX = 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.ShaderMaterial).dispose();
  }
}

// ============================================
// COMPONENT
// ============================================

export function Petals({
  count = 150,
  palette = "sakura",
  primaryColor,
  className = "",
  style = {},
}: PetalsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const petalsRef = useRef<Petal[]>([]);
  const noiseRef = useRef<SimplexNoise | null>(null);
  const clusterSpawnerRef = useRef<ClusterSpawner | null>(null);
  const airPocketsRef = useRef<AirPocketSystem | null>(null);
  const spatialHashRef = useRef<SpatialHash | null>(null);
  const animationIdRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock | null>(null);
  const mouseTargetRef = useRef<THREE.Vector2>(new THREE.Vector2());

  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const container = containerRef.current;
    const colors = getColors(palette, primaryColor);
    const config = createConfig(count, colors);

    // Scene
    const scene = new THREE.Scene();
    scene.background = null; // Transparent
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 12);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Post-processing with alpha-enabled render target
    const renderTarget = new THREE.WebGLRenderTarget(
      container.clientWidth,
      container.clientHeight,
      {
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        stencilBuffer: false,
      }
    );

    const composer = new EffectComposer(renderer, renderTarget);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new ShaderPass(ChromaticAberrationShader));

    // Blur pass for soft petal effect
    const blurPass = new ShaderPass(BlurShader);
    blurPass.uniforms.uResolution.value.set(container.clientWidth, container.clientHeight);
    composer.addPass(blurPass);

    // Haze pass for atmospheric depth
    const hazePass = new ShaderPass(HazeShader);
    composer.addPass(hazePass);

    // Final output pass with proper alpha blending
    const outputPass = new ShaderPass(OutputShader);
    outputPass.renderToScreen = true;
    composer.addPass(outputPass);

    composerRef.current = composer;

    // Systems
    const noise = new SimplexNoise(42);
    noiseRef.current = noise;

    const clusterSpawner = new ClusterSpawner(config);
    clusterSpawnerRef.current = clusterSpawner;

    const airPockets = new AirPocketSystem();
    airPocketsRef.current = airPockets;

    const spatialHash = new SpatialHash(1.2);
    spatialHashRef.current = spatialHash;

    // Textures
    const petalTexture = createPetalTexture();
    const translucencyMap = createTranslucencyMap();

    // Geometries
    const petalGeometries = [0, 1, 2, 3, 4, 5, 6, 7].map(i => createPetalGeometry(i));

    // Create petals
    const petals: Petal[] = [];
    for (let i = 0; i < config.petalCount; i++) {
      const geometry = petalGeometries[Math.floor(Math.random() * petalGeometries.length)];
      const clusterId = i % config.clusterCount;
      const petal = new Petal(geometry, i, clusterId, clusterSpawner, config, petalTexture, translucencyMap);
      petals.push(petal);
      scene.add(petal.mesh);
    }
    petalsRef.current = petals;

    // Lighting
    scene.add(new THREE.AmbientLight(0xfff5f8, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(5, 10, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffe0e8, 0.3);
    fillLight.position.set(-6, 4, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xe8d8f0, 0.2);
    rimLight.position.set(0, -3, 6);
    scene.add(rimLight);

    const backLight = new THREE.DirectionalLight(0xfff0f5, 0.15);
    backLight.position.set(0, 5, -8);
    scene.add(backLight);

    // Clock
    const clock = new THREE.Clock();
    clockRef.current = clock;
    let lastTime = 0;

    // Mouse
    const handleMouseMove = (e: MouseEvent) => {
      mouseTargetRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseTargetRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
      blurPass.uniforms.uResolution.value.set(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      const deltaTime = Math.min(time - lastTime, 0.033);
      lastTime = time;

      clusterSpawner.update(time);
      airPockets.update(time);

      spatialHash.clear();
      for (const petal of petals) spatialHash.insert(petal);

      for (const petal of petals) {
        const nearby = spatialHash.getNearby(petal.position, 1.8);
        petal.update(time, deltaTime, nearby, noise, airPockets);
      }

      camera.position.x += (mouseTargetRef.current.x * 0.6 - camera.position.x) * 0.018;
      camera.position.y += (-mouseTargetRef.current.y * 0.4 - camera.position.y) * 0.018;
      camera.lookAt(0, 0, 0);

      composer.render();
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      for (const petal of petals) {
        petal.dispose();
        scene.remove(petal.mesh);
      }

      for (const geo of petalGeometries) {
        geo.dispose();
      }

      petalTexture.dispose();
      translucencyMap.dispose();

      renderTarget.dispose();
      composer.dispose();
      renderer.dispose();

      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [count, palette, primaryColor, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        ...style,
      }}
    />
  );
}

export default Petals;
