"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

// Extracted modules
import { SimplexNoise } from "@/lib/noise/simplex-noise";
import { getColors, type PetalPalette } from "@/lib/colors/palette-utils";
import { SpatialHash } from "@/lib/spatial/spatial-hash";
import {
  ChromaticAberrationShader,
  BlurShader,
  HazeShader,
  OutputShader,
} from "@/lib/graphics/petal-shaders";
import {
  createPetalTexture,
  createTranslucencyMap,
  createPetalGeometry,
} from "@/lib/graphics/petal-geometry";
import {
  Petal,
  ClusterSpawner,
  AirPocketSystem,
  createPetalsConfig,
} from "@/lib/particles";

// Re-export palette type for consumers
export type { PetalPalette } from "@/lib/colors/palette-utils";

export interface PetalsProps {
  count?: number;
  palette?: PetalPalette;
  primaryColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

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
  const spatialHashRef = useRef<SpatialHash<Petal> | null>(null);
  const animationIdRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock | null>(null);
  const mouseTargetRef = useRef<THREE.Vector2>(new THREE.Vector2());
  // Track mounted state to prevent cleanup race conditions with React reconciliation
  const isMountedRef = useRef(true);

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

    isMountedRef.current = true;
    const container = containerRef.current;
    const colors = getColors(palette, primaryColor);
    const config = createPetalsConfig(count, colors);

    // Scene
    const scene = new THREE.Scene();
    scene.background = null; // Transparent
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
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
    blurPass.uniforms.uResolution.value.set(
      container.clientWidth,
      container.clientHeight
    );
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

    const spatialHash = new SpatialHash<Petal>(1.2);
    spatialHashRef.current = spatialHash;

    // Textures
    const petalTexture = createPetalTexture();
    const translucencyMap = createTranslucencyMap();

    // Geometries (8 variations for variety)
    const petalGeometries = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
      createPetalGeometry(i)
    );

    // Create petals
    const petals: Petal[] = [];
    for (let i = 0; i < config.petalCount; i++) {
      const geometry =
        petalGeometries[Math.floor(Math.random() * petalGeometries.length)];
      const clusterId = i % config.clusterCount;
      const petal = new Petal(
        geometry,
        i,
        clusterId,
        clusterSpawner,
        config,
        petalTexture,
        translucencyMap
      );
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

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      mouseTargetRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseTargetRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Resize handling
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
    window.addEventListener("resize", handleResize);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      const deltaTime = Math.min(time - lastTime, 0.033);
      lastTime = time;

      clusterSpawner.update(time);
      airPockets.update(time);

      // Rebuild spatial hash each frame
      spatialHash.clear();
      for (const petal of petals) {
        spatialHash.insert(petal);
      }

      // Update all petals
      for (const petal of petals) {
        const nearby = spatialHash.getNearby(petal.position, 1.8);
        petal.update(time, deltaTime, nearby, noise, airPockets);
      }

      // Subtle camera movement following mouse
      camera.position.x +=
        (mouseTargetRef.current.x * 0.6 - camera.position.x) * 0.018;
      camera.position.y +=
        (-mouseTargetRef.current.y * 0.4 - camera.position.y) * 0.018;
      camera.lookAt(0, 0, 0);

      composer.render();
    };

    animate();

    // Cleanup
    return () => {
      isMountedRef.current = false;
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

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

      // Only remove if canvas is still our child (prevents React reconciliation conflicts)
      if (container && renderer.domElement && renderer.domElement.parentNode === container) {
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
