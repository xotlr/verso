'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  varying vec2 vUv;
  uniform float uTime;
  uniform float uTheme; // 0 = light, 1 = dark
  uniform vec2 uResolution;

  // Simplex 3D noise
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Fractal brownian motion for organic shapes
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for(int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 adjustedUv = vec2(uv.x * aspect, uv.y);

    // Flowing time - visible animation
    float t = uTime * 0.15;

    // Add flowing motion to UVs for visible movement
    vec2 flowUv = adjustedUv + vec2(
      sin(adjustedUv.y * 2.0 + t) * 0.05,
      cos(adjustedUv.x * 2.0 + t * 0.7) * 0.05
    );

    // Multiple noise layers for organic flow
    float n1 = fbm(vec3(flowUv * 1.5, t * 0.5));
    float n2 = fbm(vec3(flowUv * 2.0 + 100.0, t * 0.4 + 50.0));
    float n3 = snoise(vec3(flowUv * 0.8 + n1 * 0.3, t * 0.3));
    float n4 = snoise(vec3(flowUv * 1.2 + n2 * 0.2, t * 0.5 + 25.0));

    // Combine noise for shape
    float shape1 = smoothstep(-0.3, 0.6, n1 + n3 * 0.5);
    float shape2 = smoothstep(-0.2, 0.7, n2 + n4 * 0.4);
    float shape3 = smoothstep(-0.4, 0.5, n3 * 0.8 + n1 * 0.3);

    // ============ LIGHT THEME COLORS (Gojo ethereal blue) ============
    vec3 lightBase = vec3(0.945, 0.965, 0.985);      // Cool ethereal white-blue
    vec3 lightCyan = vec3(0.235, 0.741, 0.941);      // Bright sky blue #3cbdf0
    vec3 lightTeal = vec3(0.0, 0.588, 0.831);        // Deep cyan #0096d4
    vec3 lightDeep = vec3(0.012, 0.243, 0.545);      // Deep blue #033e8b
    vec3 lightDark = vec3(0.059, 0.071, 0.180);      // Dark navy accent

    // ============ DARK THEME COLORS (Gojo Infinite Void - teal not black) ============
    vec3 darkBase = vec3(0.04, 0.10, 0.14);          // Deep teal base (not black)
    vec3 darkCyan = vec3(0.235, 0.784, 0.941);       // Bright cyan #3cc8f0
    vec3 darkTeal = vec3(0.0, 0.55, 0.75);           // Rich teal
    vec3 darkDeep = vec3(0.02, 0.08, 0.12);          // Darker teal shadows
    vec3 darkAccent = vec3(0.4, 0.85, 0.95);         // Ethereal cyan glow

    // Interpolate between themes
    vec3 base = mix(lightBase, darkBase, uTheme);
    vec3 cyan = mix(lightCyan, darkCyan, uTheme);
    vec3 teal = mix(lightTeal, darkTeal, uTheme);
    vec3 deep = mix(lightDeep, darkDeep, uTheme);
    vec3 accent = mix(lightDark, darkAccent, uTheme);

    // Build color composition
    vec3 color = base;

    // Layer 1: Deep shadows/shapes
    color = mix(color, deep, shape1 * 0.5);

    // Layer 2: Teal mid-tones
    color = mix(color, teal, shape2 * 0.4 * (1.0 - shape1 * 0.3));

    // Layer 3: Bright cyan highlights
    float cyanMask = smoothstep(0.3, 0.8, shape3) * (1.0 - shape1 * 0.5);
    color = mix(color, cyan, cyanMask * 0.6);

    // Layer 4: Accent touches
    float accentMask = smoothstep(0.5, 0.9, n4 + n1 * 0.3) * shape2 * 0.35;
    color = mix(color, accent, accentMask);

    // Subtle vignette
    float vignette = 1.0 - smoothstep(0.3, 1.2, length(uv - 0.5) * 1.3);
    color *= 0.88 + vignette * 0.12;

    // Film grain (very subtle)
    float grain = (fract(sin(dot(uv * uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.025;
    color += grain;

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface AuroraBackgroundProps {
  className?: string;
  transitionDuration?: number;
}

export function AuroraBackground({
  className = '',
  transitionDuration = 800
}: AuroraBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const frameRef = useRef<number>(0);
  const targetThemeRef = useRef<number>(0);
  const currentThemeRef = useRef<number>(0);

  // Get initial theme
  const getThemeValue = useCallback(() => {
    if (typeof document === 'undefined') return 0;
    return document.documentElement.classList.contains('dark') ? 1 : 0;
  }, []);

  const init = useCallback(() => {
    if (!containerRef.current) return;

    // Clean up any existing canvas from previous render
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // Use window dimensions for fixed full-viewport element
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    // Ensure canvas fills container
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const initialTheme = getThemeValue();
    targetThemeRef.current = initialTheme;
    currentThemeRef.current = initialTheme;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uTheme: { value: initialTheme },
        uResolution: { value: new THREE.Vector2(width, height) }
      }
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const startTime = performance.now();
    let isRunning = true;

    const animate = () => {
      if (!isRunning) return;

      const elapsed = (performance.now() - startTime) / 1000;
      material.uniforms.uTime.value = elapsed;

      // Smooth theme transition
      const diff = targetThemeRef.current - currentThemeRef.current;
      if (Math.abs(diff) > 0.001) {
        const speed = 1000 / transitionDuration / 60;
        currentThemeRef.current += diff * Math.min(speed, 1);
        material.uniforms.uTheme.value = currentThemeRef.current;
      }

      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    frameRef.current = requestAnimationFrame(animate);

    // Use ResizeObserver for reliable resize detection
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      renderer.setSize(newWidth, newHeight);
      material.uniforms.uResolution.value.set(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [transitionDuration, getThemeValue]);

  // Initialize
  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  // Watch for theme changes
  useEffect(() => {
    const updateTheme = () => {
      targetThemeRef.current = getThemeValue();
    };

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [getThemeValue]);

  return (
    <div
      ref={containerRef}
      className={className}
      data-aurora="background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
