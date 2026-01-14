/**
 * GLSL shaders for petal rendering with subsurface scattering,
 * translucency, and post-processing effects.
 */

import * as THREE from 'three';

/**
 * Vertex shader for petals.
 * Calculates UV, normals, view position, world position, and depth.
 */
export const petalVertexShader = `
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

/**
 * Fragment shader for petals.
 * Implements subsurface scattering, fresnel rim lighting, and depth-based alpha.
 */
export const petalFragmentShader = `
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

/**
 * Chromatic aberration post-processing shader.
 * Creates RGB channel separation for a lens-like effect.
 */
export const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uOffset: { value: new THREE.Vector2(0.002, 0.002) },
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
  `,
};

/**
 * Blur post-processing shader.
 * 9-tap gaussian-style blur with alpha preservation.
 */
export const BlurShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uBlurAmount: { value: 1.5 },
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
  `,
};

/**
 * Haze overlay shader.
 * Adds atmospheric depth with radial gradient.
 */
export const HazeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uHazeColor: { value: new THREE.Vector3(1.0, 0.98, 0.99) },
    uHazeStrength: { value: 0.12 },
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
  `,
};

/**
 * Final output shader.
 * Outputs to screen with premultiplied alpha for proper blending.
 */
export const OutputShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
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
  `,
};
