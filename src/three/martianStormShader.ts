import * as THREE from 'three';

/**
 * High-fidelity 'Dust Storm' post-processing shader for MarsOutpost3D.
 * Blends warm Martian orange haze, adds animated dust/film grain, grades
 * shadows/midtones, and applies gust-modulated radial chromatic aberration
 * whenever `simVisuals.weatherEvent` is active. Operates in linear HDR space
 * prior to OutputPass (ACES Filmic tone mapping + sRGB conversion).
 */
export const MartianStormShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uIntensity: { value: 0.0 },
    uTime: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(1280, 720) },
    uAberration: { value: 0.011 },
    uGrainStrength: { value: 0.065 },
    uHazeStrength: { value: 0.42 },
    uHazeColor: { value: new THREE.Vector3(0.72, 0.24, 0.055) },
    uDustTint: { value: new THREE.Vector3(1.24, 0.78, 0.50) },
    uContrastBoost: { value: 0.16 },
    uVignetteStrength: { value: 0.48 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uAberration;
    uniform float uGrainStrength;
    uniform float uHazeStrength;
    uniform vec3 uHazeColor;
    uniform vec3 uDustTint;
    uniform float uContrastBoost;
    uniform float uVignetteStrength;

    varying vec2 vUv;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float valueNoise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      vec2 u = f * f * (3.0 - 2.0 * f);

      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));

      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec4 baseSample = texture2D(tDiffuse, vUv);

      // Fast-path passthrough when no dust storm weather event is active
      if (uIntensity <= 0.001) {
        gl_FragColor = baseSample;
        return;
      }

      vec2 dir = vUv - 0.5;
      float dist = length(dir);

      // 1. Radial Chromatic Aberration (sharp central focus, strong optical split toward visor edges)
      float gustPulse = 1.0 + 0.30 * sin(uTime * 7.8 + vUv.y * 8.5);
      float radialCurve = 0.45 * dist + 0.90 * dist * dist;
      vec2 caOffset = dir * (uAberration * uIntensity * radialCurve * gustPulse);

      vec2 uvR = clamp(vUv - caOffset, vec2(0.001), vec2(0.999));
      vec2 uvB = clamp(vUv + caOffset, vec2(0.001), vec2(0.999));

      float r = texture2D(tDiffuse, uvR).r;
      float g = baseSample.g;
      float b = texture2D(tDiffuse, uvB).b;
      vec3 col = vec3(r, g, b);

      // 2. Martian Dust Storm Color Grading (compress cool blues, warm ochre/rust midtones)
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 desaturated = mix(col, vec3(luma), 0.24 * uIntensity);
      vec3 tinted = desaturated * mix(vec3(1.0), uDustTint, 0.78 * uIntensity);

      vec3 graded = mix(
        tinted,
        pow(max(tinted, vec3(0.0001)), vec3(1.0 + uContrastBoost * uIntensity)),
        0.55 * uIntensity
      );

      // 3. Swirling Orange Martian Haze Blend (denser across wind streaks & horizon/edges)
      vec2 windUv1 = vUv * vec2(3.0, 6.0) + vec2(-uTime * 1.75, uTime * 0.22);
      vec2 windUv2 = vUv * vec2(5.8, 10.5) + vec2(-uTime * 2.65, -uTime * 0.16);
      float dustLayer = valueNoise(windUv1) * 0.65 + valueNoise(windUv2) * 0.35;
      float edgeWeight = smoothstep(0.10, 0.88, dist);
      float hazeDensity = (0.38 + 0.62 * dustLayer) * (0.42 + 0.58 * edgeWeight);
      float hazeBlend = clamp(uHazeStrength * hazeDensity * uIntensity, 0.0, 0.62);
      graded = mix(graded, uHazeColor, hazeBlend);

      // 4. Increased High-Frequency Sand/Film Grain (pixel-crisp spatio-temporal grit)
      vec2 pixelCoord = vUv * max(uResolution, vec2(320.0)) * 0.75;
      float frameStep = floor(uTime * 24.0);
      float grainRaw = hash21(pixelCoord + vec2(frameStep * 17.3, frameStep * 31.7)) - 0.5;
      // Bias grain slightly warmer (red/orange grit) and stronger in midtones/shadows
      float grainMask = (1.0 - 0.35 * clamp(luma, 0.0, 1.0)) * uGrainStrength * uIntensity;
      graded += vec3(1.12, 0.92, 0.74) * (grainRaw * grainMask);

      // 5. Deep Martian Rust Storm Vignette
      float vignette = smoothstep(0.26, 0.96, dist) * uVignetteStrength * uIntensity;
      graded = mix(graded, vec3(0.22, 0.055, 0.012), clamp(vignette, 0.0, 0.78));

      gl_FragColor = vec4(max(graded, vec3(0.0)), baseSample.a);
    }
  `,
};
