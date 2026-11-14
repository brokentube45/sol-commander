import * as THREE from 'three';
import {
  RockColliderSpec,
  TerrainHeightGrid,
  generateOutpostRockSpecs,
  getDefaultTerrainGrid,
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
    // Flatten top into mesa-like outcrop & terrace horizontal strata
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

/** Sculpted layered canyon mesa ridge geometry (replaces primitive cones/cylinders) */
function buildMesaFormationGeometry(seed: number, width: number, height: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(width * 0.42, width, height, 18, 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const angle = Math.atan2(v.z, v.x);
    const normY = (v.y + height * 0.5) / height;
    // Stepped canyon terraces
    const terrace = Math.sin(normY * Math.PI * 5.0) * 0.12;
    const crag =
      Math.sin(angle * 3.0 + seed) * 0.24 +
      Math.cos(angle * 7.0 - seed * 1.7) * 0.11;
    const scaleXZ = 1.0 + crag + terrace;
    v.x *= scaleXZ;
    v.z *= scaleXZ * 0.85;
    // Slight plateau unevenness
    if (normY > 0.92) {
      v.y += Math.sin(angle * 2.0 + seed) * (height * 0.06);
    }
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
  envTexture: THREE.Texture;
  dispose: () => void;
}

export function buildMarsEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  quality: 'high' | 'low',
  isSoftwareGl: boolean,
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

  // 1. Atmospheric Martian Sunset Sky Dome
  const skyGeo = trackGeo(new THREE.SphereGeometry(115, 36, 24));
  const skyMat = trackMat(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uZenith: { value: new THREE.Color('#091529') },
        uMidSky: { value: new THREE.Color('#1B3A5F') },
        uDuskBand: { value: new THREE.Color('#7a2f27') },
        uHorizon: { value: new THREE.Color('#d9682b') },
        uSunDir: { value: sunDirection },
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
        varying vec3 vWorldDir;

        void main() {
          float h = clamp(vWorldDir.y, -0.05, 1.0);
          vec3 sky = mix(uHorizon, uDuskBand, smoothstep(0.0, 0.14, h));
          sky = mix(sky, uMidSky, smoothstep(0.11, 0.36, h));
          sky = mix(sky, uZenith, smoothstep(0.32, 0.82, h));

          // Golden sunset scatter halo around Sol
          float sunDot = max(dot(vWorldDir, uSunDir), 0.0);
          sky += vec3(1.0, 0.56, 0.18) * pow(sunDot, 10.0) * 0.45;
          sky += vec3(1.0, 0.78, 0.38) * pow(sunDot, 64.0) * 0.65;
          sky += vec3(1.0, 0.94, 0.80) * pow(sunDot, 420.0) * 1.45;

          // Subtle high-altitude Martian cirrus wisps
          float wisp = sin(vWorldDir.x * 9.0 + vWorldDir.z * 5.0) * cos(vWorldDir.z * 7.0 - vWorldDir.x * 3.0);
          float wispMask = smoothstep(0.06, 0.25, h) * (1.0 - smoothstep(0.25, 0.55, h));
          sky += vec3(0.95, 0.55, 0.32) * max(wisp, 0.0) * wispMask * 0.11;

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    }),
  );
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // Subtle High-Altitude Solar-Wind Aurora Shimmer (activated subtly during Scene 4 advisory)
  const auroraGeo = trackGeo(new THREE.SphereGeometry(108, 32, 18, 0, Math.PI * 2, 0.08, Math.PI * 0.34));
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

  // Build custom Martian Sunset PMREM Environment Map directly from the sky dome + warm ground bounce!
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(skyGeo, skyMat);
  envScene.add(envSky);
  const envGround = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(90, 24)),
    trackMat(new THREE.MeshBasicMaterial({ color: '#7a2f1a', side: THREE.DoubleSide })),
  );
  envGround.rotation.x = -Math.PI / 2;
  envGround.position.y = -2;
  envScene.add(envGround);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  scene.environment = envTexture;
  scene.environmentIntensity = 0.92;

  // Upper space starfield
  const starCount = quality === 'high' ? 360 : 180;
  const starPos = new Float32Array(starCount * 3);
  const randStars = seededRandom(2026);
  for (let i = 0; i < starCount; i++) {
    const theta = randStars() * Math.PI * 2;
    const phi = randStars() * Math.PI * 0.38;
    const r = 104;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) + 8;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = trackGeo(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = trackMat(
    new THREE.PointsMaterial({
      color: '#f8f9fa',
      size: 0.42,
      transparent: true,
      opacity: 0.72,
      fog: false,
    }),
  );
  scene.add(new THREE.Points(starGeo, starMat));

  // 2. High-Detail Martian Terrain with PBR Maps + Slope-Dependent Vertex Colors + AO
  const regolith = createMarsRegolithTextures(maxAniso, 20);
  trackTex(regolith.map);
  trackTex(regolith.normalMap);
  trackTex(regolith.roughnessMap);
  if (regolith.aoMap) trackTex(regolith.aoMap);

  const terrainGrid = getDefaultTerrainGrid();
  const segments = terrainGrid.segments;
  const terrainGeo = trackGeo(
    new THREE.PlaneGeometry(terrainGrid.sizeMeters, terrainGrid.sizeMeters, segments, segments),
  );
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, groundHeightAt(vx, vz));
  }
  terrainGeo.computeVertexNormals();
  terrainGeo.setAttribute('uv2', terrainGeo.attributes.uv);

  // Vertex color tinting by elevation, slope & crater depth
  const normAttr = terrainGeo.attributes.normal as THREE.BufferAttribute;
  const vColors = new Float32Array(posAttr.count * 3);
  const cDust = new THREE.Color('#f0c8b0');
  const cSlope = new THREE.Color('#8e4838');
  const cBasin = new THREE.Color('#c88266');
  const tmpC = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const vy = posAttr.getY(i);
    const ny = normAttr.getY(i); // 1 = flat, < 0.9 = steep slope
    const slopeFactor = THREE.MathUtils.clamp((1.0 - ny) * 4.5, 0, 1);
    const heightFactor = THREE.MathUtils.clamp((vy + 0.9) / 2.2, 0, 1);

    tmpC.copy(cBasin).lerp(cDust, heightFactor);
    tmpC.lerp(cSlope, slopeFactor);
    vColors[i * 3] = tmpC.r;
    vColors[i * 3 + 1] = tmpC.g;
    vColors[i * 3 + 2] = tmpC.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(vColors, 3));

  const terrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: regolith.map,
      normalMap: regolith.normalMap,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughnessMap: regolith.roughnessMap,
      roughness: 0.94,
      metalness: 0.03,
      aoMap: regolith.aoMap,
      aoMapIntensity: 0.75,
      vertexColors: true,
    }),
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // 3. Continuous 360° Layered Martian Canyon Rim & Distant Mountain Range
  const rockTex = createMartianRockTextures(maxAniso);
  trackTex(rockTex.map);
  trackTex(rockTex.normalMap);
  trackTex(rockTex.roughnessMap);

  const mesaMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: rockTex.map,
      normalMap: rockTex.normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: rockTex.roughnessMap,
      color: '#a84c32',
      roughness: 0.92,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
  );

  // Continuous inner canyon cliff ridge ring (r ~ 44..54) eliminating flat plane horizon gaps
  const buildContinuousRidgeRing = (
    innerR: number,
    outerR: number,
    baseHeight: number,
    peakAmp: number,
    seedOffset: number,
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
      const ny = (v.y + baseHeight * 0.5) / baseHeight; // 0 bottom .. 1 top
      const ridgeWave =
        Math.sin(ang * 4.0 + seedOffset) * 0.45 +
        Math.cos(ang * 9.0 - seedOffset * 1.4) * 0.3 +
        Math.sin(ang * 17.0 + seedOffset * 0.7) * 0.15 +
        Math.cos(ang * 29.0) * 0.1;
      const terrace = Math.sin(ny * Math.PI * 4.0) * 0.65;
      const rScale = 1.0 + ridgeWave * 0.08 + (1.0 - ny) * 0.14;
      v.x = v.x * rScale + 2.0;
      v.z = v.z * rScale - 2.0;
      if (ny > 0.05) {
        v.y += ny * (ridgeWave * peakAmp + terrace * 0.45);
      }
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = baseHeight * 0.36 - 2.5;
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  buildContinuousRidgeRing(58, 70, 8.2, 4.6, 1.2, mesaMat);
  buildContinuousRidgeRing(
    74,
    88,
    13.5,
    7.2,
    3.7,
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#6e2e24',
        roughness: 0.96,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
    ),
  );

  // Hero terraced mesa landmarks framing the sunset vista
  const randMesa = seededRandom(512);
  const heroMesaAngles = [-1.9, -1.05, -0.35, 0.3, 2.5];
  heroMesaAngles.forEach((angle, i) => {
    const dist = 46 + (i % 2) * 5;
    const width = 6.8 + randMesa() * 3.8;
    const height = 7.4 + randMesa() * 4.5;
    const mesaGeo = trackGeo(buildMesaFormationGeometry(i * 3.1, width, height));
    const mesa = new THREE.Mesh(mesaGeo, mesaMat);
    const mx = Math.cos(angle) * dist + 2;
    const mz = Math.sin(angle) * dist - 4;
    mesa.position.set(mx, groundHeightAt(mx, mz) + height * 0.32 - 1.4, mz);
    mesa.rotation.y = randMesa() * Math.PI * 2;
    mesa.receiveShadow = true;
    scene.add(mesa);
  });

  // 4. Sculpted Rock Formations via InstancedMesh (Outcrops + Jagged Basalt + Framing Boulders)
  const outcropGeo = trackGeo(buildStratifiedRockGeometry());
  const basaltGeo = trackGeo(buildJaggedBasaltGeometry());

  const rockMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: rockTex.map,
      normalMap: rockTex.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughnessMap: rockTex.roughnessMap,
      color: '#ffffff',
      roughness: 0.9,
      metalness: 0.05,
    }),
  );

  const rockSpecs = generateOutpostRockSpecs(quality, terrainGrid);
  const outcropSpecs = rockSpecs.filter((r) => r.kind === 'outcrop');
  const basaltSpecs = rockSpecs.filter((r) => r.kind === 'basalt');

  const outcropInst = new THREE.InstancedMesh(
    outcropGeo,
    rockMat,
    Math.max(1, outcropSpecs.length),
  );
  const basaltInst = new THREE.InstancedMesh(
    basaltGeo,
    rockMat,
    Math.max(1, basaltSpecs.length),
  );
  outcropInst.castShadow = !isSoftwareGl && quality === 'high';
  outcropInst.receiveShadow = true;
  basaltInst.castShadow = !isSoftwareGl && quality === 'high';
  basaltInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const rockColor = new THREE.Color();
  const tints = ['#d98462', '#b95f42', '#9c4b35', '#e49b72'];

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

  // 5. Environmental Storytelling Props (Catenary Umbilical Cables, Guide Beacons, Weather Mast, Supply Crates)
  const matDarkMetal = trackMat(
    new THREE.MeshStandardMaterial({ color: '#24364d', roughness: 0.45, metalness: 0.65 }),
  );
  const matOrangeAccent = trackMat(
    new THREE.MeshStandardMaterial({ color: '#e85d04', roughness: 0.42, metalness: 0.18 }),
  );
  const matAmberLens = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffb703',
      emissive: '#ffb703',
      emissiveIntensity: 1.8,
      roughness: 0.2,
    }),
  );

  // Ground power umbilical cables connecting Solar Arrays, Wind Turbines & Battery Bank -> Habitat
  const cablePaths: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [
    [
      new THREE.Vector3(8.8, groundHeightAt(8.8, -4.8) + 0.06, -4.8),
      new THREE.Vector3(7.2, groundHeightAt(7.2, -4.4) + 0.05, -4.4),
      new THREE.Vector3(6.2, groundHeightAt(6.2, -3.7) + 0.08, -3.7),
    ],
    [
      new THREE.Vector3(11.1, groundHeightAt(11.1, -3.0) + 0.06, -3.0),
      new THREE.Vector3(9.6, groundHeightAt(9.6, -3.2) + 0.05, -3.2),
      new THREE.Vector3(8.8, groundHeightAt(8.8, -4.6) + 0.06, -4.6),
    ],
    [
      new THREE.Vector3(14.3, groundHeightAt(14.3, -3.6) + 0.06, -3.6),
      new THREE.Vector3(12.6, groundHeightAt(12.6, -3.1) + 0.05, -3.1),
      new THREE.Vector3(11.4, groundHeightAt(11.4, -2.4) + 0.06, -2.4),
    ],
    [
      new THREE.Vector3(-10.0, groundHeightAt(-10.0, -7.8) + 0.06, -7.8),
      new THREE.Vector3(-4.2, groundHeightAt(-4.2, -6.2) + 0.05, -6.2),
      new THREE.Vector3(1.8, groundHeightAt(1.8, -4.8) + 0.08, -4.8),
    ],
    [
      new THREE.Vector3(16.6, groundHeightAt(16.6, -8.2) + 0.06, -8.2),
      new THREE.Vector3(15.2, groundHeightAt(15.2, -5.8) + 0.05, -5.8),
      new THREE.Vector3(14.4, groundHeightAt(14.4, -3.8) + 0.06, -3.8),
    ],
  ];
  cablePaths.forEach(([p0, p1, p2]) => {
    const curve = new THREE.CatmullRomCurve3([p0, p1, p2]);
    const tube = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(curve, 16, 0.045, 8, false)), matDarkMetal);
    tube.castShadow = !isSoftwareGl;
    scene.add(tube);
  });

  // Walkway guide beacons along path from Habitat Airlock to Rover, Greenhouse, Ice Drill & Landing Pad
  const beaconSpots: [number, number][] = [
    [1.4, -0.4],
    [3.8, 1.3],
    [6.1, 0.9],
    [-4.8, -5.4],
    [-9.6, -8.2],
    [10.8, 3.8],
    [13.6, 6.6],
  ];
  const beaconLights: THREE.Mesh[] = [];
  beaconSpots.forEach(([bx, bz]) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, groundHeightAt(bx, bz), bz);
    const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.08, 0.42, 8)), matDarkMetal);
    post.position.y = 0.21;
    bGroup.add(post);
    const lens = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 8)), matAmberLens);
    lens.position.y = 0.45;
    bGroup.add(lens);
    beaconLights.push(lens);
    scene.add(bGroup);
  });

  // 3 Gravity Survey Marker Stakes highlighting localized Mars gravity variations
  const matSkyBeacon = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#38BDF8',
      emissiveIntensity: 1.5,
      roughness: 0.25,
    }),
  );
  const gravMarkers: [number, number][] = [
    [-10.5, -3.2], // Crater Mascon Basin (+Gravity)
    [3.2, 1.5], // Mid-Latitude Outpost Plain
    [16.5, -8.5], // High Wind Ridge (-Gravity)
  ];
  gravMarkers.forEach(([gx, gz]) => {
    const gStake = new THREE.Group();
    gStake.position.set(gx, groundHeightAt(gx, gz), gz);
    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.035, 0.95, 8)), matDarkMetal);
    pole.position.y = 0.475;
    gStake.add(pole);
    const flag = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.16, 0.03)), matSkyBeacon);
    flag.position.set(0.14, 0.84, 0);
    gStake.add(flag);
    scene.add(gStake);
  });

  // Rugged Beveled Supply Crates near Habitat Airlock
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

  const crateSpots: [number, number, number][] = [
    [1.65, -2.05, 0.3],
    [1.25, -1.65, -0.4],
  ];
  crateSpots.forEach(([cx, cz, rotY], idx) => {
    const crate = new THREE.Mesh(crateGeo, idx === 0 ? matOrangeAccent : matDarkMetal);
    crate.position.set(cx, groundHeightAt(cx, cz) + 0.24, cz);
    crate.rotation.y = rotY;
    crate.castShadow = !isSoftwareGl;
    crate.receiveShadow = true;
    scene.add(crate);
  });

  // Outpost Weather & Solar Radiation Sensor Mast
  const mastGroup = new THREE.Group();
  const mx = -0.6;
  const mz = 1.4;
  mastGroup.position.set(mx, groundHeightAt(mx, mz), mz);
  const tripodPts = [0, 1, 2].map((i) => {
    const a = (i / 3) * Math.PI * 2;
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35),
      new THREE.Vector3(0, 0.65, 0),
    ]);
  });
  tripodPts.forEach((c) => {
    const leg = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(c, 6, 0.03, 6, false)), matDarkMetal);
    leg.castShadow = !isSoftwareGl;
    mastGroup.add(leg);
  });
  const mastPole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.035, 0.045, 1.85, 8)), matDarkMetal);
  mastPole.position.y = 1.05;
  mastPole.castShadow = !isSoftwareGl;
  mastGroup.add(mastPole);

  const anemometerHead = new THREE.Group();
  anemometerHead.position.y = 2.02;
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
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (randDust() - 0.5) * 34 + 2;
    dustPositions[i * 3 + 1] = 0.2 + randDust() * 6.5;
    dustPositions[i * 3 + 2] = (randDust() - 0.5) * 26;
  }
  const dustGeo = trackGeo(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = trackMat(
    new THREE.PointsMaterial({
      map: dustTex,
      color: '#ffd6a5',
      size: 0.22,
      transparent: true,
      opacity: 0.65,
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
    envTexture,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      envTexture.dispose();
    },
  };
}
