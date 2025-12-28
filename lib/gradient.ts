/*
 *   Stripe WebGl Gradient Animation
 *   All Credits to Stripe.com
 *   https://kevinhufnagl.com
 */

// Converting colors to proper format
function normalizeColor(hexCode: number): number[] {
  return [(hexCode >> 16 & 255) / 255, (hexCode >> 8 & 255) / 255, (255 & hexCode) / 255]
}

// Shader sources
const shaderFiles = {
  vertex: `varying vec3 v_color;

void main() {
  float time = u_time * u_global.noiseSpeed;
  vec2 noiseCoord = resolution * uvNorm * u_global.noiseFreq;
  vec2 st = 1. - uvNorm.xy;

  float tilt = resolution.y / 2.0 * uvNorm.y;
  float incline = resolution.x * uvNorm.x / 2.0 * u_vertDeform.incline;
  float offset = resolution.x / 2.0 * u_vertDeform.incline * mix(u_vertDeform.offsetBottom, u_vertDeform.offsetTop, uv.y);

  float noise = snoise(vec3(
    noiseCoord.x * u_vertDeform.noiseFreq.x + time * u_vertDeform.noiseFlow,
    noiseCoord.y * u_vertDeform.noiseFreq.y,
    time * u_vertDeform.noiseSpeed + u_vertDeform.noiseSeed
  )) * u_vertDeform.noiseAmp;

  noise *= 1.0 - pow(abs(uvNorm.y), 2.0);
  noise = max(0.0, noise);

  vec3 pos = vec3(position.x, position.y + tilt + incline + noise - offset, position.z);

  if (u_active_colors[0] == 1.) {
    v_color = u_baseColor;
  }

  for (int i = 0; i < u_waveLayers_length; i++) {
    if (u_active_colors[i + 1] == 1.) {
      WaveLayers layer = u_waveLayers[i];
      float noise = smoothstep(
        layer.noiseFloor,
        layer.noiseCeil,
        snoise(vec3(
          noiseCoord.x * layer.noiseFreq.x + time * layer.noiseFlow,
          noiseCoord.y * layer.noiseFreq.y,
          time * layer.noiseSpeed + layer.noiseSeed
        )) / 2.0 + 0.5
      );
      v_color = blendNormal(v_color, layer.color, pow(noise, 4.));
    }
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`,
  noise: `vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`,
  blend: `vec3 blendNormal(vec3 base, vec3 blend) { return blend; }
vec3 blendNormal(vec3 base, vec3 blend, float opacity) { return (blendNormal(base, blend) * opacity + base * (1.0 - opacity)); }`,
  fragment: `varying vec3 v_color;

void main() {
  vec3 color = v_color;
  if (u_darken_top == 1.0) {
    vec2 st = gl_FragCoord.xy/resolution.xy;
    color.g -= pow(st.y + sin(-12.0) * st.x, u_shadow_power) * 0.4;
  }
  gl_FragColor = vec4(color, 1.0);
}`
};

interface UniformValue {
  type?: string;
  value?: unknown;
  excludeFrom?: string;
}

interface MiniGlMesh {
  geometry: MiniGlPlaneGeometry;
  material: MiniGlMaterial;
  wireframe: boolean;
  draw: () => void;
}

interface MiniGlUniform {
  type: string;
  value: unknown;
  update: (location: WebGLUniformLocation | null) => void;
  getDeclaration: (name: string, type: string, length?: number) => string;
}

interface MiniGlMaterial {
  uniforms: Record<string, MiniGlUniform>;
  program: WebGLProgram;
}

interface MiniGlPlaneGeometry {
  setTopology: (xSeg: number, ySeg: number) => void;
  setSize: (width: number, height: number, orientation?: string) => void;
}

export class Gradient {
  private el: HTMLCanvasElement | null = null;
  private conf = { playing: true, density: [0.06, 0.16] as [number, number] };
  private width = 0;
  private height = 600;
  private gl: WebGLRenderingContext | null = null;
  private mesh: MiniGlMesh | null = null;
  private sectionColors: number[][] = [];
  private t = 1253106;
  private last = 0;
  private xSegCount = 0;
  private ySegCount = 0;
  private amp = 320;
  private seed = 5;
  private freqX = 14e-5;
  private freqY = 29e-5;
  private activeColors = [1, 1, 1, 1];
  private angle = 0;
  private animationFrame: number | null = null;
  private commonUniforms: Record<string, MiniGlUniform> | null = null;
  private resizeTimeout: ReturnType<typeof setTimeout> | null = null;

  private resizeHandler = () => {
    // Debounce resize to avoid clearing canvas on every event
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);

    this.resizeTimeout = setTimeout(() => {
      if (!this.el || !this.mesh || !this.gl || !this.commonUniforms) return;
      const parent = this.el.parentElement;
      if (!parent) return;

      // Cap dimensions to avoid WebGL issues at extreme zoom levels
      const MAX_CANVAS_SIZE = 2560;
      this.width = Math.min(parent.clientWidth, MAX_CANVAS_SIZE);
      this.height = Math.min(parent.clientHeight, MAX_CANVAS_SIZE);

      this.el.width = this.width;
      this.el.height = this.height;
      this.gl.viewport(0, 0, this.width, this.height);
      this.commonUniforms.resolution.value = [this.width, this.height];
      this.commonUniforms.aspectRatio.value = this.width / this.height;
      this.commonUniforms.projectionMatrix.value = [
        2 / this.width, 0, 0, 0,
        0, 2 / this.height, 0, 0,
        0, 0, 2 / (-2000 - 2000), 0,
        0, 0, 0, 1
      ];

      this.xSegCount = Math.ceil(this.width * this.conf.density[0]);
      this.ySegCount = Math.ceil(this.height * this.conf.density[1]);
      this.mesh.geometry.setTopology(this.xSegCount, this.ySegCount);
      this.mesh.geometry.setSize(this.width, this.height);
      (this.mesh.material.uniforms.u_shadow_power as MiniGlUniform).value = this.width < 600 ? 5 : 6;
    }, 150);
  };

  private animate = (e: number) => {
    if (!this.conf.playing || !this.mesh || !this.gl) return;

    this.t += Math.min(e - this.last, 1e3 / 15);
    this.last = e;
    (this.mesh.material.uniforms.u_time as MiniGlUniform).value = this.t;

    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clearDepth(1);
    this.mesh.draw();

    this.animationFrame = requestAnimationFrame(this.animate);
  };

  connect(canvas: HTMLCanvasElement, colors: [string, string, string, string]) {
    this.el = canvas;
    this.gl = canvas.getContext("webgl", { antialias: true });
    if (!this.gl) return;

    // Convert hex colors to normalized RGB
    this.sectionColors = colors.map(hex => {
      const cleanHex = hex.replace('#', '');
      const fullHex = cleanHex.length === 3
        ? cleanHex.split('').map(c => c + c).join('')
        : cleanHex;
      return normalizeColor(parseInt(fullHex, 16));
    });

    const parent = this.el.parentElement;
    if (parent) {
      this.width = parent.clientWidth;
      this.height = parent.clientHeight;
    }

    this.initWebGL();
    window.addEventListener("resize", this.resizeHandler);
    this.resizeHandler();
    this.conf.playing = true;
    this.animationFrame = requestAnimationFrame(this.animate);
  }

  private initWebGL() {
    const gl = this.gl;
    if (!gl) return;

    const a = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    // Create uniform helper
    const createUniform = (opts: UniformValue): MiniGlUniform => {
      const type = opts.type || "float";
      const typeFn = ({
        float: "1f", int: "1i", vec2: "2fv", vec3: "3fv", vec4: "4fv", mat4: "Matrix4fv"
      } as Record<string, string>)[type] || "1f";

      return {
        type,
        value: opts.value,
        update(location: WebGLUniformLocation | null) {
          if (this.value === undefined || !location) return;
          const fn = `uniform${typeFn}`;
          if (typeFn.indexOf("Matrix") === 0) {
            (gl as unknown as Record<string, (loc: WebGLUniformLocation, transpose: boolean, val: unknown) => void>)[fn](location, false, this.value);
          } else {
            (gl as unknown as Record<string, (loc: WebGLUniformLocation, val: unknown) => void>)[fn](location, this.value);
          }
        },
        getDeclaration(name: string, declType: string, length?: number): string {
          if (opts.excludeFrom === declType) return "";
          if (type === "array") {
            const arr = this.value as MiniGlUniform[];
            return arr[0].getDeclaration(name, declType, arr.length) + `\nconst int ${name}_length = ${arr.length};`;
          }
          if (type === "struct") {
            let nameNoPrefix = name.replace("u_", "");
            nameNoPrefix = nameNoPrefix.charAt(0).toUpperCase() + nameNoPrefix.slice(1);
            return `uniform struct ${nameNoPrefix} {\n` +
              Object.entries(this.value as Record<string, MiniGlUniform>)
                .map(([n, uniform]) => uniform.getDeclaration(n, declType).replace(/^uniform/, ""))
                .join("") +
              `\n} ${name}${length && length > 0 ? `[${length}]` : ""};`;
          }
          return `uniform ${type} ${name}${length && length > 0 ? `[${length}]` : ""};`;
        }
      };
    };

    this.commonUniforms = {
      projectionMatrix: createUniform({ type: "mat4", value: a }),
      modelViewMatrix: createUniform({ type: "mat4", value: a }),
      resolution: createUniform({ type: "vec2", value: [1, 1] }),
      aspectRatio: createUniform({ type: "float", value: 1 })
    };

    // Create material uniforms
    const uniforms: Record<string, MiniGlUniform> = {
      u_time: createUniform({ value: 0 }),
      u_shadow_power: createUniform({ value: 5 }),
      u_darken_top: createUniform({ value: 0 }),
      u_active_colors: createUniform({ value: this.activeColors, type: "vec4" }),
      u_global: createUniform({
        value: {
          noiseFreq: createUniform({ value: [this.freqX, this.freqY], type: "vec2" }),
          noiseSpeed: createUniform({ value: 5e-6 })
        },
        type: "struct"
      }),
      u_vertDeform: createUniform({
        value: {
          incline: createUniform({ value: Math.sin(this.angle) / Math.cos(this.angle) }),
          offsetTop: createUniform({ value: -0.5 }),
          offsetBottom: createUniform({ value: -0.5 }),
          noiseFreq: createUniform({ value: [3, 4], type: "vec2" }),
          noiseAmp: createUniform({ value: this.amp }),
          noiseSpeed: createUniform({ value: 10 }),
          noiseFlow: createUniform({ value: 3 }),
          noiseSeed: createUniform({ value: this.seed })
        },
        type: "struct",
        excludeFrom: "fragment"
      }),
      u_baseColor: createUniform({
        value: this.sectionColors[0],
        type: "vec3",
        excludeFrom: "fragment"
      }),
      u_waveLayers: createUniform({
        value: this.sectionColors.slice(1).map((color, i) => createUniform({
          value: {
            color: createUniform({ value: color, type: "vec3" }),
            noiseFreq: createUniform({ value: [2 + (i + 1) / this.sectionColors.length, 3 + (i + 1) / this.sectionColors.length], type: "vec2" }),
            noiseSpeed: createUniform({ value: 11 + 0.3 * (i + 1) }),
            noiseFlow: createUniform({ value: 6.5 + 0.3 * (i + 1) }),
            noiseSeed: createUniform({ value: this.seed + 10 * (i + 1) }),
            noiseFloor: createUniform({ value: 0.1 }),
            noiseCeil: createUniform({ value: 0.63 + 0.07 * (i + 1) })
          },
          type: "struct"
        })),
        excludeFrom: "fragment",
        type: "array"
      })
    };

    // Compile shaders
    const getUniformDeclarations = (u: Record<string, MiniGlUniform>, type: string) =>
      Object.entries(u).map(([name, uniform]) => uniform.getDeclaration(name, type)).join("\n");

    const prefix = "precision highp float;\n";
    const vertexSource = `${prefix}
      attribute vec4 position;
      attribute vec2 uv;
      attribute vec2 uvNorm;
      ${getUniformDeclarations(this.commonUniforms, "vertex")}
      ${getUniformDeclarations(uniforms, "vertex")}
      ${shaderFiles.noise}
      ${shaderFiles.blend}
      ${shaderFiles.vertex}
    `;
    const fragmentSource = `${prefix}
      ${getUniformDeclarations(this.commonUniforms, "fragment")}
      ${getUniformDeclarations(uniforms, "fragment")}
      ${shaderFiles.fragment}
    `;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);

    // Collect uniform locations
    const uniformInstances: Array<{ uniform: MiniGlUniform; location: WebGLUniformLocation | null }> = [];
    const attachUniforms = (name: string | undefined, u: Record<string, MiniGlUniform> | MiniGlUniform) => {
      if (name === undefined) {
        Object.entries(u as Record<string, MiniGlUniform>).forEach(([n, uniform]) => attachUniforms(n, uniform));
      } else if ((u as MiniGlUniform).type === "array") {
        ((u as MiniGlUniform).value as MiniGlUniform[]).forEach((uniform, i) => attachUniforms(`${name}[${i}]`, uniform));
      } else if ((u as MiniGlUniform).type === "struct") {
        Object.entries((u as MiniGlUniform).value as Record<string, MiniGlUniform>).forEach(([n, uniform]) => attachUniforms(`${name}.${n}`, uniform));
      } else {
        uniformInstances.push({ uniform: u as MiniGlUniform, location: gl.getUniformLocation(program, name) });
      }
    };
    attachUniforms(undefined, this.commonUniforms);
    attachUniforms(undefined, uniforms);

    // Create geometry
    const xSegCount = Math.ceil(this.width * this.conf.density[0]) || 1;
    const ySegCount = Math.ceil(this.height * this.conf.density[1]) || 1;
    let vertexCount = (xSegCount + 1) * (ySegCount + 1);
    let quadCount = xSegCount * ySegCount * 2;

    const positionBuffer = gl.createBuffer()!;
    const uvBuffer = gl.createBuffer()!;
    const uvNormBuffer = gl.createBuffer()!;
    const indexBuffer = gl.createBuffer()!;

    let positionValues = new Float32Array(3 * vertexCount);
    let uvValues = new Float32Array(2 * vertexCount);
    let uvNormValues = new Float32Array(2 * vertexCount);
    let indexValues = new Uint16Array(3 * quadCount);

    const setTopology = (xSeg: number, ySeg: number) => {
      vertexCount = (xSeg + 1) * (ySeg + 1);
      quadCount = xSeg * ySeg * 2;
      uvValues = new Float32Array(2 * vertexCount);
      uvNormValues = new Float32Array(2 * vertexCount);
      indexValues = new Uint16Array(3 * quadCount);

      for (let e = 0; e <= ySeg; e++) {
        for (let t = 0; t <= xSeg; t++) {
          const i = e * (xSeg + 1) + t;
          uvValues[2 * i] = t / xSeg;
          uvValues[2 * i + 1] = 1 - e / ySeg;
          uvNormValues[2 * i] = t / xSeg * 2 - 1;
          uvNormValues[2 * i + 1] = 1 - e / ySeg * 2;
          if (t < xSeg && e < ySeg) {
            const s = e * xSeg + t;
            indexValues[6 * s] = i;
            indexValues[6 * s + 1] = i + 1 + xSeg;
            indexValues[6 * s + 2] = i + 1;
            indexValues[6 * s + 3] = i + 1;
            indexValues[6 * s + 4] = i + 1 + xSeg;
            indexValues[6 * s + 5] = i + 2 + xSeg;
          }
        }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, uvValues, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, uvNormBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, uvNormValues, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexValues, gl.STATIC_DRAW);
    };

    const setSize = (width: number, height: number) => {
      if (positionValues.length !== 3 * vertexCount) {
        positionValues = new Float32Array(3 * vertexCount);
      }
      const xSeg = Math.ceil(width * this.conf.density[0]) || 1;
      const ySeg = Math.ceil(height * this.conf.density[1]) || 1;
      const o = width / -2;
      const r = height / -2;
      const segW = width / xSeg;
      const segH = height / ySeg;

      for (let yIdx = 0; yIdx <= ySeg; yIdx++) {
        const t = r + yIdx * segH;
        for (let xIdx = 0; xIdx <= xSeg; xIdx++) {
          const rx = o + xIdx * segW;
          const l = yIdx * (xSeg + 1) + xIdx;
          positionValues[3 * l] = rx;
          positionValues[3 * l + 1] = -t;
          positionValues[3 * l + 2] = 0;
        }
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positionValues, gl.STATIC_DRAW);
    };

    setTopology(xSegCount, ySegCount);
    setSize(this.width, this.height);

    // Set up attributes
    const positionLoc = gl.getAttribLocation(program, "position");
    const uvLoc = gl.getAttribLocation(program, "uv");
    const uvNormLoc = gl.getAttribLocation(program, "uvNorm");

    this.mesh = {
      geometry: { setTopology, setSize },
      material: { uniforms, program },
      wireframe: false,
      draw: () => {
        gl.useProgram(program);
        uniformInstances.forEach(({ uniform, location }) => uniform.update(location));

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.enableVertexAttribArray(uvLoc);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, uvNormBuffer);
        gl.enableVertexAttribArray(uvNormLoc);
        gl.vertexAttribPointer(uvNormLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(gl.TRIANGLES, indexValues.length, gl.UNSIGNED_SHORT, 0);
      }
    };
  }

  pause() {
    this.conf.playing = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  play() {
    if (!this.conf.playing) {
      this.conf.playing = true;
      this.animationFrame = requestAnimationFrame(this.animate);
    }
  }

  disconnect() {
    this.pause();
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
    window.removeEventListener("resize", this.resizeHandler);
  }
}
