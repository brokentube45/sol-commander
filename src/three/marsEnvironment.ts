import * as THREE from 'three';
import { MARS_FACTS } from '../sim/constants';
import {
  OutpostLayoutConfig,
  SHOWCASE_CRATES,
  SHOWCASE_LAYOUT,
  distanceToNearestRoadCenterline,
  isOnPavedSurface,
} from '../sim/outpostLayout';
import {
  RockColliderSpec,
  TerrainHeightGrid,
  generateOutpostRockSpecs,
  getDefaultTerrainGrid,
  getLocalRockFractionK,
  getSoftSandFactorAt,
  groundHeightAt,
  seededRandom,
} from '../sim/terrainField';
import {
  createDustSpriteTexture,
  createMarsRegolithTextures,
  createMartianRockTextures,
} from './proceduralTextures';

export { groundHeightAt, seededRandom };

/** Sculpted non-primitive stratified Martian sandstone outcrop geometry */
function buildStratifiedRockGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(0.65, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (v.y > 0.22) v.y = 0.22 + (v.y - 0.22) * 0.35;
    if (v.y < -0.25) v.y = -0.25 + (v.y + 0.25) * 0.45;
    const strata = Math.sin(v.y * 14.0) * 0.08;
    const n =
      Math.sin(v.x * 4.7 + v.z * 3.1) * 0.14 +
      Math.cos(v.z * 6.3 - v.y * 5.2) * 0.09;
    const radialScale = 1.0 + strata + n;
    v.x *= radialScale * 1.25;
    v.z *= radialScale * 1.05;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted wind-carved angular volcanic basalt boulder geometry */
function buildJaggedBasaltGeometry(): THREE.BufferGeometry {
  const geo = new THREE.DodecahedronGeometry(0.5, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const facet =
      Math.abs(Math.sin(v.x * 5.2 + 0.7)) * 0.16 +
      Math.cos(v.z * 4.8 + v.y * 3.9) * 0.14;
    const ridge = v.y > 0 ? 1.0 - v.y * 0.28 : 1.15;
    v.x *= (1.0 + facet) * ridge;
    v.z *= (1.0 - facet * 0.4) * ridge;
    v.y *= 0.88 + Math.sin(v.x * 4.1) * 0.12;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted layered canyon mesa ridge geometry */
function buildMesaFormationGeometry(seed: number, width: number, height: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(width * 0.42, width, height, 18, 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const angle = Math.atan2(v.z, v.x);
    const normY = (v.y + height * 0.5) / height;
    const terrace = Math.sin(normY * Math.PI * 5.0) * 0.12;
    const crag =
      Math.sin(angle * 3.0 + seed) * 0.24 +
      Math.cos(angle * 7.0 - seed * 1.7) * 0.11;
    const scaleXZ = 1.0 + crag + terrace;
    v.x *= scaleXZ;
    v.z *= scaleXZ * 0.85;
    if (normY > 0.92) {
      v.y += Math.sin(angle * 2.0 + seed) * (height * 0.06);
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Sculpted natural Martian sandstone arch silhouette */
function buildNaturalArchGeometry(spanRadius: number, tubeRadius: number, seed: number): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(spanRadius, tubeRadius, 10, 22, Math.PI * 1.08);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const strata = Math.sin(v.y * 2.4 + seed) * 0.16;
    const rugged =
      Math.sin(v.x * 1.9 + v.z * 2.7 + seed) * 0.18 +
      Math.cos(v.y * 3.3 - v.x * 1.4) * 0.12;
    const baseBulge = v.y < spanRadius * 0.35 ? 1.28 : 0.92;
    v.x *= 1.0 + strata * 0.35 + rugged * 0.12;
    v.z *= baseBulge + rugged * 0.38;
    v.y += rugged * 0.14;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Small rounded desert pebble geometry for non-collidable ground scatter */
function buildPebbleGeometry(): THREE.BufferGeometry {
  const geo = new THREE.DodecahedronGeometry(0.11, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.y *= 0.52;
    v.x *= 1.18 + Math.sin(v.z * 11.0) * 0.12;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export interface EnvironmentBuildResult {
  terrainGrid: TerrainHeightGrid;
  rockSpecs: RockColliderSpec[];
  dustPoints: THREE.Points;
  dustMat: THREE.PointsMaterial;
  dustPositions: Float32Array;
  dustCount: number;
  anemometerHead: THREE.Group;
  beaconLights: THREE.Mesh[];
  skyMat: THREE.ShaderMaterial;
  auroraMat: THREE.ShaderMaterial;
  phobosMesh: THREE.Mesh;
  deimosMesh: THREE.Mesh;
  updateCelestialAndSky: (elapsedSec: number, dustTau: number) => void;
  envTexture: THREE.Texture;
  dispose: () => void;
}

export function buildMarsEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  quality: 'high' | 'low',
  isSoftwareGl: boolean,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): EnvironmentBuildResult {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  const maxAniso = isSoftwareGl ? 1 : Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  const sunDirection = new THREE.Vector3(24, 9.5, -24).normalize();

  // 1. Vibrant Kid-Friendly Martian Sunset Sky Dome
  const skyGeo = trackGeo(new THREE.SphereGeometry(132, 40, 26));
  const skyMat = trackMat(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uZenith: { value: new THREE.Color('#34568b') },
        uMidSky: { value: new THREE.Color('#8e6ca8') },
        uDuskBand: { value: new THREE.Color('#f07c4e') },
        uHorizon: { value: new THREE.Color('#ffb36b') },
        uSunDir: { value: sunDirection },
        uDustTau: { value: 1.0 },
        uHgG: { value: MARS_FACTS.HG_ASYMMETRY_G },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uZenith;
        uniform vec3 uMidSky;
        uniform vec3 uDuskBand;
        uniform vec3 uHorizon;
        uniform vec3 uSunDir;
        uniform float uDustTau;
        uniform float uHgG;
        varying vec3 vWorldDir;

        float henyeyGreenstein(float cosTheta, float g) {
          float g2 = g * g;
          return (1.0 - g2) / (4.0 * 3.14159265 * pow(max(0.05, 1.0 + g2 - 2.0 * g * cosTheta), 1.5));
        }

        void main() {
          float h = clamp(vWorldDir.y, -0.05, 1.0);
          float stormShift = clamp((uDustTau - 0.8) / 2.8, 0.0, 1.0);

          vec3 sky = mix(uHorizon, uDuskBand, smoothstep(0.0, 0.16, h));
          sky = mix(sky, uMidSky, smoothstep(0.14, 0.44, h));
          sky = mix(sky, uZenith, smoothstep(0.38, 0.86, h));
          sky = mix(sky, vec3(0.84, 0.48, 0.28), stormShift * 0.45);

          float cosTheta = clamp(dot(normalize(vWorldDir), normalize(uSunDir)), -1.0, 1.0);
          float hgHalo = henyeyGreenstein(cosTheta, uHgG);
          float hgWide = smoothstep(0.55, 0.995, cosTheta);
          float cosZenith = max(normalize(uSunDir).y, 0.05);
          float beerAtten = exp(-uDustTau * 0.35 / cosZenith);

          // Warm golden-coral solar glow plus subtle Martian forward blue-sunset scatter
          vec3 warmSunGlow = vec3(1.0, 0.76, 0.44) * pow(max(0.0, cosTheta), 6.0) * 0.45;
          vec3 blueSunsetTint = vec3(0.48, 0.72, 0.95) * clamp(hgHalo * 0.22, 0.0, 0.65) * (1.0 - stormShift * 0.55);
          sky += warmSunGlow + blueSunsetTint * (0.45 + 0.45 * hgWide);

          float sunDisc = smoothstep(0.99945, 0.99990, cosTheta);
          sky += vec3(1.0, 0.97, 0.88) * sunDisc * 2.4 * max(0.3, beerAtten);

          float wisp = sin(vWorldDir.x * 8.5 + vWorldDir.z * 4.5) * cos(vWorldDir.z * 6.5 - vWorldDir.x * 3.0);
          float wispMask = smoothstep(0.06, 0.26, h) * (1.0 - smoothstep(0.26, 0.58, h));
          sky += vec3(1.0, 0.76, 0.56) * max(wisp, 0.0) * wispMask * 0.14;

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    }),
  );
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  const phobosMesh = new THREE.Mesh(
    trackGeo(new THREE.DodecahedronGeometry(0.68, 1)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#a89f96',
        roughness: 0.92,
        metalness: 0.04,
        emissive: '#3a302b',
        emissiveIntensity: 0.45,
        fog: false,
      }),
    ),
  );
  phobosMesh.scale.set(1.22, 0.92, 0.98);
  scene.add(phobosMesh);

  const deimosMesh = new THREE.Mesh(
    trackGeo(new THREE.DodecahedronGeometry(0.32, 0)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#c9bfb2',
        roughness: 0.88,
        metalness: 0.04,
        emissive: '#4d443c',
        emissiveIntensity: 0.6,
        fog: false,
      }),
    ),
  );
  scene.add(deimosMesh);

  const updateCelestialAndSky = (elapsedSec: number, dustTau: number) => {
    skyMat.uniforms.uDustTau.value = dustTau;

    const compressedHours = (elapsedSec * 180) / 3600;
    const phobosAng = (compressedHours / MARS_FACTS.PHOBOS_ORBIT_HOURS) * Math.PI * 2 + 0.85;
    const deimosAng = -(compressedHours / MARS_FACTS.DEIMOS_ORBIT_HOURS) * Math.PI * 2 + 2.1;

    const skyR = 104;
    const pElev = 0.28 + Math.abs(Math.sin(phobosAng)) * 0.45;
    phobosMesh.position.set(
      -Math.cos(phobosAng) * skyR * Math.cos(pElev),
      Math.max(14, Math.sin(pElev) * skyR),
      Math.sin(phobosAng) * skyR * 0.55 - 18,
    );
    phobosMesh.rotation.y = phobosAng * 1.4;

    const dElev = 0.42 + Math.abs(Math.cos(deimosAng)) * 0.25;
    deimosMesh.position.set(
      Math.cos(deimosAng) * skyR * Math.cos(dElev),
      Math.max(22, Math.sin(dElev) * skyR),
      -Math.sin(deimosAng) * skyR * 0.6 - 12,
    );
    deimosMesh.rotation.y = deimosAng;
  };
  updateCelestialAndSky(0, 1.0);

  const auroraGeo = trackGeo(new THREE.SphereGeometry(116, 32, 18, 0, Math.PI * 2, 0.08, Math.PI * 0.34));
  const auroraMat = trackMat(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec3 vPos;
        void main() {
          float band = smoothstep(0.16, 0.42, vPos.y) * (1.0 - smoothstep(0.48, 0.85, vPos.y));
          float wave = 0.5 + 0.5 * sin(vPos.x * 7.5 + uTime * 0.7) * cos(vPos.z * 5.2 - uTime * 0.45);
          float curtain = pow(wave, 2.2) * band;
          vec3 col = mix(vec3(0.18, 0.78, 0.55), vec3(1.0, 0.68, 0.16), smoothstep(-0.4, 0.6, vPos.x));
          gl_FragColor = vec4(col * curtain * uIntensity * 0.55, curtain * uIntensity * 0.45);
        }
      `,
    }),
  );
  const auroraDome = new THREE.Mesh(auroraGeo, auroraMat);
  scene.add(auroraDome);

  // PMREM Martian Sunset Environment Map
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(skyGeo, skyMat);
  envScene.add(envSky);
  const envGround = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(90, 24)),
    trackMat(new THREE.MeshBasicMaterial({ color: '#d47040', side: THREE.DoubleSide })),
  );
  envGround.rotation.x = -Math.PI / 2;
  envGround.position.y = -2;
  envScene.add(envGround);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  scene.environment = envTexture;
  scene.environmentIntensity = 1.05;

  // High-altitude twilight stars
  const starCount = quality === 'high' ? 280 : 140;
  const starPos = new Float32Array(starCount * 3);
  const randStars = seededRandom(2026);
  for (let i = 0; i < starCount; i++) {
    const theta = randStars() * Math.PI * 2;
    const phi = randStars() * Math.PI * 0.28;
    const r = 116;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) + 10;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = trackGeo(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = trackMat(
    new THREE.PointsMaterial({
      color: '#fff6e8',
      size: 0.36,
      transparent: true,
      opacity: 0.45,
      fog: false,
    }),
  );
  scene.add(new THREE.Points(starGeo, starMat));

  // 2. Martian Terrain with PBR Maps + Slope-Dependent / Compacted-Pad Vertex Colors
  const regolith = createMarsRegolithTextures(maxAniso, layout.mode === 'gameplay' ? 24 : 20);
  trackTex(regolith.map);
  trackTex(regolith.normalMap);
  trackTex(regolith.roughnessMap);
  if (regolith.aoMap) trackTex(regolith.aoMap);

  const terrainGrid = getDefaultTerrainGrid(layout.mode);
  const gAt = (x: number, z: number) => groundHeightAt(x, z, terrainGrid);
  const segments = terrainGrid.segments;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(terrainGrid.sizeMeters, terrainGrid.sizeMeters, segments, segments),
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, gAt(vx, vz));
  }
  terrainGeo.computeVertexNormals();
  terrainGeo.setAttribute('uv2', terrainGeo.attributes.uv);

  const normAttr = terrainGeo.attributes.normal as THREE.BufferAttribute;
  const vColors = new Float32Array(posAttr.count * 3);
  const cDust = new THREE.Color('#ffd0a6');
  const cOrangePlain = new THREE.Color('#f59256');
  const cTerracotta = new THREE.Color('#dc643a');
  const cSlope = new THREE.Color('#b64c34');
  const cBasin = new THREE.Color('#eb8c58');
  const cSoftSand = new THREE.Color('#ffbd7e');
  const cRockyPatch = new THREE.Color('#a65440');
  const cCompactedPad = new THREE.Color('#b87556');
  const tmpC = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const ny = normAttr.getY(i);
    const slopeFactor = THREE.MathUtils.clamp((1.0 - ny) * 4.5, 0, 1);
    const heightFactor = THREE.MathUtils.clamp((vy + 0.9) / 2.2, 0, 1);
    const softSand = getSoftSandFactorAt(vx, vz, layout.mode);
    const { k } = getLocalRockFractionK(vx, vz, layout.mode);
    const rockyFactor = THREE.MathUtils.clamp((k - 0.05) / 0.14, 0, 1);

    // Rich non-repetitive macro soil variation across both flat colony interior & outer hills
    const macroPatch =
      0.5 +
      0.28 * Math.sin(vx * 0.085 + 0.7) * Math.cos(vz * 0.075 - 0.4) +
      0.22 * Math.sin((vx * 0.17 - vz * 0.14) + Math.cos(vx * 0.06) * 1.4);
    const warmStreak =
      0.5 + 0.5 * Math.sin(vx * 0.21 + vz * 0.12 + Math.sin(vz * 0.09) * 1.6);

    tmpC.copy(cBasin).lerp(cDust, heightFactor);
    tmpC.lerp(cOrangePlain, THREE.MathUtils.clamp(macroPatch, 0, 1) * 0.55);
    tmpC.lerp(cTerracotta, THREE.MathUtils.clamp(warmStreak, 0, 1) * 0.34);
    tmpC.lerp(cSlope, slopeFactor);
    if (softSand > 0.01) tmpC.lerp(cSoftSand, softSand * 0.72);
    if (rockyFactor > 0.01) tmpC.lerp(cRockyPatch, rockyFactor * 0.48);
    if (layout.mode === 'gameplay' && isOnPavedSurface(vx, vz, layout)) {
      tmpC.lerp(cCompactedPad, 0.5);
    }

    vColors[i * 3] = tmpC.r;
    vColors[i * 3 + 1] = tmpC.g;
    vColors[i * 3 + 2] = tmpC.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(vColors, 3));

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: regolith.map,
      normalMap: regolith.normalMap,
      normalScale: new THREE.Vector2(1.05, 1.05),
      roughnessMap: regolith.roughnessMap,
      roughness: 0.9,
      metalness: 0.03,
      aoMap: regolith.aoMap,
      aoMapIntensity: 0.55,
      vertexColors: true,
    }),
  );
  // Break UV tiling repetition with smooth world-space multi-frequency color modulation
  terrainMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vTerrainWorldPos;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vTerrainWorldPos;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float macroA = sin(vTerrainWorldPos.x * 0.13 + 0.5) * cos(vTerrainWorldPos.z * 0.11 - 0.3);
        float macroB = sin(vTerrainWorldPos.x * 0.31 - vTerrainWorldPos.z * 0.27);
        float rippleMod = sin(vTerrainWorldPos.x * 0.75 + vTerrainWorldPos.z * 0.35 + macroA * 1.4);
        float soilTone = 1.0 + macroA * 0.09 + macroB * 0.05 + rippleMod * 0.03;
        vec3 warmAccent = mix(vec3(1.03, 0.96, 0.91), vec3(1.08, 1.02, 0.94), clamp(0.5 + 0.5 * macroA, 0.0, 1.0));
        diffuseColor.rgb *= soilTone * warmAccent;`,
      );
  };
  terrainMat.customProgramCacheKey = () => 'mars-terrain-macro-v1';

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // 3. Continuous 360° Multi-Tier Martian Canyon Rim, Distant Atmospheric Mountains & Rock Arches
  const rockTex = createMartianRockTextures(maxAniso);
  trackTex(rockTex.map);
  trackTex(rockTex.normalMap);
  trackTex(rockTex.roughnessMap);

  const mesaMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: rockTex.map,
      normalMap: rockTex.normalMap,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughnessMap: rockTex.roughnessMap,
      color: '#d8724a',
      roughness: 0.88,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
  );

  const archMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: rockTex.map,
      normalMap: rockTex.normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: rockTex.roughnessMap,
      color: '#e07a4f',
      roughness: 0.86,
      metalness: 0.04,
    }),
  );

  const buildContinuousRidgeRing = (
    innerR: number,
    outerR: number,
    baseHeight: number,
    peakAmp: number,
    seedOffset: number,
    yBaseOffset: number,
    mat: THREE.Material,
  ) => {
    const radialSegs = 96;
    const heightSegs = 6;
    const geo = trackGeo(new THREE.CylinderGeometry(innerR, outerR, baseHeight, radialSegs, heightSegs, true));
    const p = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const ang = Math.atan2(v.z, v.x);
      const ny = (v.y + baseHeight * 0.5) / baseHeight;
      const ridgeWave =
        Math.sin(ang * 4.0 + seedOffset) * 0.45 +
        Math.cos(ang * 9.0 - seedOffset * 1.4) * 0.3 +
        Math.sin(ang * 17.0 + seedOffset * 0.7) * 0.15 +
        Math.cos(ang * 29.0) * 0.1;
      const terrace = Math.sin(ny * Math.PI * 4.0) * 0.65;
      const rScale = 1.0 + ridgeWave * 0.08 + (1.0 - ny) * 0.14;
      v.x = v.x * rScale + layout.walkableCenter.x;
      v.z = v.z * rScale + layout.walkableCenter.z;
      if (ny > 0.05) {
        v.y += ny * (ridgeWave * peakAmp + terrace * 0.45);
      }
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = baseHeight * 0.36 + yBaseOffset;
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  const midRidgeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#bf5c44',
      roughness: 0.94,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  const farHazeMountainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#a35d64',
      roughness: 0.98,
      metalness: 0.01,
      side: THREE.DoubleSide,
    }),
  );

  if (layout.mode === 'gameplay') {
    buildContinuousRidgeRing(64, 77, 10.2, 5.4, 1.2, -2.2, mesaMat);
    buildContinuousRidgeRing(80, 95, 16.0, 8.2, 3.7, -2.5, midRidgeMat);
    buildContinuousRidgeRing(98, 115, 22.5, 10.5, 6.1, -3.0, farHazeMountainMat);
  } else {
    buildContinuousRidgeRing(57, 69, 8.8, 4.8, 1.2, -2.2, mesaMat);
    buildContinuousRidgeRing(73, 87, 14.5, 7.6, 3.7, -2.5, midRidgeMat);
    buildContinuousRidgeRing(90, 106, 20.0, 9.5, 6.1, -3.0, farHazeMountainMat);
  }

  const randMesa = seededRandom(512);
  const heroMesaAngles = [-2.55, -1.9, -1.05, -0.35, 0.3, 1.35, 2.5];
  heroMesaAngles.forEach((angle, i) => {
    const dist = (layout.mode === 'gameplay' ? 58 : 46) + (i % 2) * 5;
    const width = 6.5 + randMesa() * 3.8;
    const height = 7.4 + randMesa() * 4.8;
    const mesaGeo = trackGeo(buildMesaFormationGeometry(i * 3.1, width, height));
    const mesa = new THREE.Mesh(mesaGeo, mesaMat);
    const mx = Math.cos(angle) * dist + 2;
    const mz = Math.sin(angle) * dist - 4;
    mesa.position.set(mx, gAt(mx, mz) + height * 0.32 - 1.4, mz);
    mesa.rotation.y = randMesa() * Math.PI * 2;
    mesa.receiveShadow = true;
    scene.add(mesa);
  });

  // Two Dramatic Natural Sandstone Arches outside the playable base perimeter
  const archConfigs =
    layout.mode === 'gameplay'
      ? [
          { x: 46, z: -42, rotY: 0.65, span: 5.2, tube: 1.15 },
          { x: -48, z: 36, rotY: -0.45, span: 4.6, tube: 1.0 },
        ]
      : [
          { x: 30, z: -26, rotY: 0.65, span: 3.8, tube: 0.85 },
          { x: -28, z: 22, rotY: -0.45, span: 3.4, tube: 0.78 },
        ];
  archConfigs.forEach((cfg, idx) => {
    const aGeo = trackGeo(buildNaturalArchGeometry(cfg.span, cfg.tube, idx * 4.3 + 1.5));
    const arch = new THREE.Mesh(aGeo, archMat);
    arch.position.set(cfg.x, gAt(cfg.x, cfg.z) - 0.35, cfg.z);
    arch.rotation.y = cfg.rotY;
    arch.castShadow = !isSoftwareGl && quality === 'high';
    arch.receiveShadow = true;
    scene.add(arch);
  });

  // 4. Sculpted Rock Formations via InstancedMesh (Collidable Rocks + Non-Collidable Pebble Scatter)
  const outcropGeo = trackGeo(buildStratifiedRockGeometry());
  const basaltGeo = trackGeo(buildJaggedBasaltGeometry());
  const pebbleGeo = trackGeo(buildPebbleGeometry());

  const rockMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: rockTex.map,
      normalMap: rockTex.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughnessMap: rockTex.roughnessMap,
      color: '#ffffff',
      roughness: 0.86,
      metalness: 0.04,
    }),
  );

  const rockSpecs = generateOutpostRockSpecs(quality, terrainGrid, layout.mode);
  const outcropSpecs = rockSpecs.filter((r) => r.kind === 'outcrop');
  const basaltSpecs = rockSpecs.filter((r) => r.kind === 'basalt');

  const outcropInst = new THREE.InstancedMesh(outcropGeo, rockMat, Math.max(1, outcropSpecs.length));
  const basaltInst = new THREE.InstancedMesh(basaltGeo, rockMat, Math.max(1, basaltSpecs.length));
  outcropInst.castShadow = !isSoftwareGl && quality === 'high';
  outcropInst.receiveShadow = true;
  basaltInst.castShadow = !isSoftwareGl && quality === 'high';
  basaltInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const rockColor = new THREE.Color();
  const tints = ['#f09864', '#de6e44', '#c95a3a', '#f6b282', '#bd5d46'];

  outcropSpecs.forEach((spec, idx) => {
    dummy.position.set(spec.x, spec.y, spec.z);
    dummy.rotation.set(spec.rotX, spec.rotY, spec.rotZ);
    dummy.scale.set(spec.scaleX, spec.scaleY, spec.scaleZ);
    dummy.updateMatrix();
    outcropInst.setMatrixAt(idx, dummy.matrix);
    rockColor.set(tints[spec.tintIndex % tints.length]);
    outcropInst.setColorAt(idx, rockColor);
  });
  outcropInst.count = outcropSpecs.length;
  outcropInst.instanceMatrix.needsUpdate = true;
  if (outcropInst.instanceColor) outcropInst.instanceColor.needsUpdate = true;
  outcropInst.computeBoundingSphere();
  scene.add(outcropInst);

  basaltSpecs.forEach((spec, idx) => {
    dummy.position.set(spec.x, spec.y, spec.z);
    dummy.rotation.set(spec.rotX, spec.rotY, spec.rotZ);
    dummy.scale.set(spec.scaleX, spec.scaleY, spec.scaleZ);
    dummy.updateMatrix();
    basaltInst.setMatrixAt(idx, dummy.matrix);
    rockColor.set(tints[spec.tintIndex % tints.length]);
    basaltInst.setColorAt(idx, rockColor);
  });
  basaltInst.count = basaltSpecs.length;
  basaltInst.instanceMatrix.needsUpdate = true;
  if (basaltInst.instanceColor) basaltInst.instanceColor.needsUpdate = true;
  basaltInst.computeBoundingSphere();
  scene.add(basaltInst);

  // Small non-collidable pebble & sandstone chip scatter (zero Rapier overhead, strictly off roads/pads)
  const pebbleBudget = quality === 'high' ? 240 : 110;
  const pebbleMatrices: THREE.Matrix4[] = [];
  const pebbleColors: THREE.Color[] = [];
  const randPebble = seededRandom(8842);
  const pMaxR = layout.mode === 'gameplay' ? 46 : 28;
  for (let attempt = 0; attempt < 950 && pebbleMatrices.length < pebbleBudget; attempt++) {
    const a = randPebble() * Math.PI * 2;
    const r = 4.5 + Math.sqrt(randPebble()) * pMaxR;
    const px = layout.walkableCenter.x + Math.cos(a) * r;
    const pz = layout.walkableCenter.z + Math.sin(a) * r;
    if (isOnPavedSurface(px, pz, layout)) continue;
    if (layout.roads.length > 0 && distanceToNearestRoadCenterline(px, pz, layout) < 2.3) continue;
    dummy.position.set(px, gAt(px, pz) + 0.025, pz);
    dummy.rotation.set((randPebble() - 0.5) * 0.3, randPebble() * Math.PI * 2, (randPebble() - 0.5) * 0.3);
    const s = 0.55 + randPebble() * 0.75;
    dummy.scale.set(s * (0.9 + randPebble() * 0.4), s * 0.75, s);
    dummy.updateMatrix();
    pebbleMatrices.push(dummy.matrix.clone());
    pebbleColors.push(new THREE.Color(tints[pebbleMatrices.length % tints.length]));
  }
  if (pebbleMatrices.length > 0) {
    const pebbleInst = new THREE.InstancedMesh(pebbleGeo, rockMat, pebbleMatrices.length);
    pebbleMatrices.forEach((mat4, idx) => {
      pebbleInst.setMatrixAt(idx, mat4);
      pebbleInst.setColorAt(idx, pebbleColors[idx]);
    });
    pebbleInst.instanceMatrix.needsUpdate = true;
    if (pebbleInst.instanceColor) pebbleInst.instanceColor.needsUpdate = true;
    pebbleInst.receiveShadow = true;
    pebbleInst.computeBoundingSphere();
    scene.add(pebbleInst);
  }

  // 5. Environmental Storytelling Props, Exploration Points of Interest & Comms/Weather Mast
  const matDarkMetal = trackMat(
    new THREE.MeshStandardMaterial({ color: '#334d6e', roughness: 0.42, metalness: 0.55 }),
  );
  const matOrangeAccent = trackMat(
    new THREE.MeshStandardMaterial({ color: '#f26419', roughness: 0.40, metalness: 0.16 }),
  );
  const matAmberLens = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffb703',
      emissive: '#ffb703',
      emissiveIntensity: 1.85,
      roughness: 0.2,
    }),
  );

  const beaconLights: THREE.Mesh[] = [];

  if (layout.mode === 'showcase') {
    const cablePaths: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [
      [
        new THREE.Vector3(8.8, gAt(8.8, -4.8) + 0.06, -4.8),
        new THREE.Vector3(7.2, gAt(7.2, -4.4) + 0.05, -4.4),
        new THREE.Vector3(6.2, gAt(6.2, -3.7) + 0.08, -3.7),
      ],
      [
        new THREE.Vector3(11.1, gAt(11.1, -3.0) + 0.06, -3.0),
        new THREE.Vector3(9.6, gAt(9.6, -3.2) + 0.05, -3.2),
        new THREE.Vector3(8.8, gAt(8.8, -4.6) + 0.06, -4.6),
      ],
      [
        new THREE.Vector3(14.3, gAt(14.3, -3.6) + 0.06, -3.6),
        new THREE.Vector3(12.6, gAt(12.6, -3.1) + 0.05, -3.1),
        new THREE.Vector3(11.4, gAt(11.4, -2.4) + 0.06, -2.4),
      ],
      [
        new THREE.Vector3(-10.0, gAt(-10.0, -7.8) + 0.06, -7.8),
        new THREE.Vector3(-4.2, gAt(-4.2, -6.2) + 0.05, -6.2),
        new THREE.Vector3(1.8, gAt(1.8, -4.8) + 0.08, -4.8),
      ],
      [
        new THREE.Vector3(16.6, gAt(16.6, -8.2) + 0.06, -8.2),
        new THREE.Vector3(15.2, gAt(15.2, -5.8) + 0.05, -5.8),
        new THREE.Vector3(14.4, gAt(14.4, -3.8) + 0.06, -3.8),
      ],
    ];
    cablePaths.forEach(([p0, p1, p2]) => {
      const curve = new THREE.CatmullRomCurve3([p0, p1, p2]);
      const tube = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(curve, 16, 0.045, 8, false)), matDarkMetal);
      tube.castShadow = !isSoftwareGl;
      scene.add(tube);
    });

    const beaconSpots: [number, number][] = [
      [1.4, -0.4],
      [3.8, 1.3],
      [6.1, 0.9],
      [-4.8, -5.4],
      [-9.6, -8.2],
      [10.8, 3.8],
      [13.6, 6.6],
    ];
    beaconSpots.forEach(([bx, bz]) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(bx, gAt(bx, bz), bz);
      const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.08, 0.42, 8)), matDarkMetal);
      post.position.y = 0.21;
      bGroup.add(post);
      const lens = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 8)), matAmberLens);
      lens.position.y = 0.45;
      bGroup.add(lens);
      beaconLights.push(lens);
      scene.add(bGroup);
    });

    const crateShape = new THREE.Shape();
    crateShape.moveTo(-0.32, -0.22);
    crateShape.lineTo(0.32, -0.22);
    crateShape.lineTo(0.32, 0.22);
    crateShape.lineTo(-0.32, 0.22);
    crateShape.closePath();
    const crateGeo = trackGeo(
      new THREE.ExtrudeGeometry(crateShape, {
        depth: 0.42,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 2,
      }),
    );
    crateGeo.center();

    SHOWCASE_CRATES.forEach((cr, idx) => {
      const crate = new THREE.Mesh(crateGeo, idx === 0 ? matOrangeAccent : matDarkMetal);
      crate.position.set(cr.x, gAt(cr.x, cr.z) + 0.24, cr.z);
      crate.rotation.y = cr.yaw;
      crate.castShadow = !isSoftwareGl;
      crate.receiveShadow = true;
      scene.add(crate);
    });
  }

  // Gravity Survey Marker Stakes
  const matSkyBeacon = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#38BDF8',
      emissiveIntensity: 1.5,
      roughness: 0.25,
    }),
  );
  const gravMarkers: [number, number][] =
    layout.mode === 'gameplay'
      ? [
          [-29.5, 16.0],
          [16.0, 29.0],
          [32.0, -24.0],
        ]
      : [
          [-10.5, -3.2],
          [3.2, 1.5],
          [16.5, -8.5],
        ];
  gravMarkers.forEach(([gx, gz]) => {
    const gStake = new THREE.Group();
    gStake.position.set(gx, gAt(gx, gz), gz);
    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.035, 0.95, 8)), matDarkMetal);
    pole.position.y = 0.475;
    gStake.add(pole);
    const flag = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.16, 0.03)), matSkyBeacon);
    flag.position.set(0.14, 0.84, 0);
    gStake.add(flag);
    scene.add(gStake);
  });

  // Two Kid-Friendly Off-Road Exploration Points of Interest (crystal mineral geo-site + crater sample site)
  const matCrystalCyan = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#38bdf8',
      emissive: '#0ea5e9',
      emissiveIntensity: 0.95,
      roughness: 0.14,
      metalness: 0.1,
      clearcoat: 1.0,
    }),
  );
  const matCrystalGold = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#ffd166',
      emissive: '#f59e0b',
      emissiveIntensity: 0.85,
      roughness: 0.16,
      metalness: 0.1,
      clearcoat: 1.0,
    }),
  );
  const crystalGeo = trackGeo(new THREE.OctahedronGeometry(0.22, 0));
  const poiSites =
    layout.mode === 'gameplay'
      ? [
          { x: -24.0, z: 23.5, crystalMat: matCrystalCyan },
          { x: 31.5, z: -28.5, crystalMat: matCrystalGold },
        ]
      : [
          { x: -8.8, z: 8.6, crystalMat: matCrystalCyan },
          { x: 17.5, z: -14.2, crystalMat: matCrystalGold },
        ];
  poiSites.forEach((site, sIdx) => {
    const poiGroup = new THREE.Group();
    poiGroup.position.set(site.x, gAt(site.x, site.z), site.z);
    for (let c = 0; c < 4; c++) {
      const ang = (c / 4) * Math.PI * 2 + sIdx * 0.7;
      const crystal = new THREE.Mesh(crystalGeo, site.crystalMat);
      crystal.scale.set(0.75, 1.55 + (c % 2) * 0.65, 0.75);
      crystal.position.set(Math.cos(ang) * 0.42, 0.22, Math.sin(ang) * 0.42);
      crystal.rotation.set((c % 2 === 0 ? 1 : -1) * 0.22, ang, 0.18);
      poiGroup.add(crystal);
    }
    const probePole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.04, 0.85, 8)), matDarkMetal);
    probePole.position.set(0.75, 0.425, 0.35);
    poiGroup.add(probePole);
    const probeOrb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.085, 10, 8)), matSkyBeacon);
    probeOrb.position.set(0.75, 0.88, 0.35);
    beaconLights.push(probeOrb);
    poiGroup.add(probeOrb);
    scene.add(poiGroup);
  });

  // Outpost Weather / Comms Sensor Mast (compact in Showcase, tall relay tower in Gameplay)
  const mastSpec = layout.modules.commsMast;
  const mastGroup = new THREE.Group();
  const mx = mastSpec.x;
  const mz = mastSpec.z;
  mastGroup.position.set(mx, gAt(mx, mz), mz);

  const legRadius = mastSpec.tall ? 0.58 : 0.35;
  const tripodJoinY = mastSpec.tall ? 1.85 : 0.65;
  const mastHeight = mastSpec.tall ? 5.6 : 1.85;
  const mastCenterY = mastSpec.tall ? 3.2 : 1.05;
  const anemometerY = mastSpec.tall ? 6.08 : 2.02;

  [0, 1, 2].forEach((i) => {
    const a = (i / 3) * Math.PI * 2;
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * legRadius, 0, Math.sin(a) * legRadius),
      new THREE.Vector3(0, tripodJoinY, 0),
    ]);
    const leg = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(c, 6, mastSpec.tall ? 0.055 : 0.03, 6, false)),
      matDarkMetal,
    );
    leg.castShadow = !isSoftwareGl;
    mastGroup.add(leg);
  });

  if (mastSpec.tall) {
    const plinth = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.76, 0.84, 0.28, 12)), matDarkMetal);
    plinth.position.y = 0.14;
    plinth.castShadow = !isSoftwareGl;
    mastGroup.add(plinth);
  }

  const mastPole = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(mastSpec.tall ? 0.065 : 0.035, mastSpec.tall ? 0.095 : 0.045, mastHeight, 8)),
    matDarkMetal,
  );
  mastPole.position.y = mastCenterY;
  mastPole.castShadow = !isSoftwareGl;
  mastGroup.add(mastPole);

  if (mastSpec.tall) {
    const dish = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.12, 0.25, 14)), matOrangeAccent);
    dish.rotation.x = 0.85;
    dish.position.set(0.18, 4.85, 0.22);
    mastGroup.add(dish);
    const beacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 10, 8)), matAmberLens);
    beacon.position.set(0, 6.22, 0);
    beaconLights.push(beacon);
    mastGroup.add(beacon);
  }

  const anemometerHead = new THREE.Group();
  anemometerHead.position.y = anemometerY;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const arm = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6)), matDarkMetal);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = a;
    arm.position.set(Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14);
    anemometerHead.add(arm);

    const cup = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI)), matOrangeAccent);
    cup.position.set(Math.cos(a) * 0.28, 0, Math.sin(a) * 0.28);
    cup.rotation.y = a;
    anemometerHead.add(cup);
  }
  mastGroup.add(anemometerHead);
  scene.add(mastGroup);

  // 6. Sunlit Martian Dust Motes
  const dustTex = trackTex(createDustSpriteTexture());
  const dustCount = quality === 'high' ? 240 : 100;
  const dustPositions = new Float32Array(dustCount * 3);
  const randDust = seededRandom(99);
  const spanX = layout.mode === 'gameplay' ? 76 : 34;
  const spanZ = layout.mode === 'gameplay' ? 68 : 26;
  const offsetX = layout.mode === 'gameplay' ? 0 : 2;
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (randDust() - 0.5) * spanX + offsetX;
    dustPositions[i * 3 + 1] = 0.2 + randDust() * 6.5;
    dustPositions[i * 3 + 2] = (randDust() - 0.5) * spanZ;
  }
  const dustGeo = trackGeo(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = trackMat(
    new THREE.PointsMaterial({
      map: dustTex,
      color: '#ffe3bc',
      size: 0.24,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  return {
    terrainGrid,
    rockSpecs,
    dustPoints,
    dustMat,
    dustPositions,
    dustCount,
    anemometerHead,
    beaconLights,
    skyMat,
    auroraMat,
    phobosMesh,
    deimosMesh,
    updateCelestialAndSky,
    envTexture,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envTexture.dispose();
    },
  };
}
