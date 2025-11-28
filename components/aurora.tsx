'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[5];
uniform vec2 uResolution;
uniform float uBlend;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ),
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec3 getGradientColor(float t) {
  t = clamp(t, 0.0, 1.0);

  // Smooth blend between all 5 stops without hard boundaries
  vec3 color = uColorStops[0];
  color = mix(color, uColorStops[1], smoothstep(0.0, 0.25, t));
  color = mix(color, uColorStops[2], smoothstep(0.25, 0.5, t));
  color = mix(color, uColorStops[3], smoothstep(0.5, 0.75, t));
  color = mix(color, uColorStops[4], smoothstep(0.75, 1.0, t));

  return color;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  // Slow, flowing color shift across x-axis with time
  float colorShift = uv.x + sin(uTime * 0.02) * 0.2;
  vec3 rampColor = getGradientColor(fract(colorShift));

  // Multiple layered waves - ultra smooth and slow
  float t = uTime * 0.3;
  float wave1 = snoise(vec2(uv.x * 0.4 + t * 0.02, t * 0.015)) * 0.5;
  float wave2 = snoise(vec2(uv.x * 0.6 - t * 0.015, t * 0.02 + 50.0)) * 0.35;
  float wave3 = snoise(vec2(uv.x * 0.3 + t * 0.01, t * 0.012 + 100.0)) * 0.25;
  float wave4 = snoise(vec2(uv.x * 0.8 - t * 0.008, t * 0.018 + 150.0)) * 0.15;

  float height = (wave1 + wave2 + wave3 + wave4) * uAmplitude;
  height = exp(height * 0.5);
  height = (uv.y * 2.0 - height + 0.35);
  float intensity = 0.4 * height;

  float midPoint = 0.12;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.7, midPoint + uBlend * 0.7, intensity);

  vec3 auroraColor = intensity * rampColor * 1.4;

  fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha * 0.85);
}
`;

// Parse hex color to RGB array [0-1]
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [0.5, 0.5, 0.5];
}

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
  className?: string;
}

export function Aurora({
  colorStops,
  amplitude = 1.0,
  blend = 0.5,
  speed = 1.0,
  className = ''
}: AuroraProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const programRef = useRef<Program | null>(null);
  const animationRef = useRef<number>(0);
  const speedRef = useRef(speed);
  const { resolvedTheme } = useTheme();

  // Keep speedRef in sync with prop
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Get theme-based colors - rich gradient palette with 5 stops
  const getThemeColors = useCallback((): string[] => {
    if (colorStops) return colorStops;

    if (resolvedTheme === 'dark') {
      // Dark mode: deep rich colors - blues, teals, purples, magentas
      return ['#1a365d', '#2d5a7b', '#4a3f6b', '#6b3a5d', '#2d4a5a'];
    } else {
      // Light mode: soft pastels - corals, lavenders, sky blues, mints, peaches
      return ['#e8b4b8', '#b8c5d6', '#c9b8d9', '#b8d4c8', '#d9c8b8'];
    }
  }, [colorStops, resolvedTheme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
    });
    rendererRef.current = renderer;

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    (gl.canvas as HTMLCanvasElement).style.backgroundColor = 'transparent';

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) {
      delete geometry.attributes.uv;
    }

    const colors = getThemeColors();
    const colorStopsArray = colors.map(hexToRgb);

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: amplitude },
        uColorStops: { value: colorStopsArray },
        uResolution: { value: [container.offsetWidth, container.offsetHeight] },
        uBlend: { value: blend },
      },
    });
    programRef.current = program;

    const mesh = new Mesh(gl, { geometry, program });

    const handleResize = () => {
      if (!container || !program) return;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [width, height];
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    container.appendChild(gl.canvas as HTMLCanvasElement);
    handleResize();

    const startTime = performance.now();
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      if (!program) return;

      const elapsed = (performance.now() - startTime) * 0.001;
      program.uniforms.uTime.value = elapsed * speedRef.current;

      renderer.render({ scene: mesh });
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      if (container && gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas as HTMLCanvasElement);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      rendererRef.current = null;
      programRef.current = null;
    };
  }, []);

  useEffect(() => {
    const program = programRef.current;
    if (!program) return;

    program.uniforms.uAmplitude.value = amplitude;
    program.uniforms.uBlend.value = blend;
  }, [amplitude, blend]);

  useEffect(() => {
    const program = programRef.current;
    if (!program) return;

    const colors = getThemeColors();
    program.uniforms.uColorStops.value = colors.map(hexToRgb);
  }, [resolvedTheme, getThemeColors]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
}

export default Aurora;
