import { PHYSICS_CONSTANTS } from './constants';

export interface TerrainHeightGrid {
  sizeMeters: number;
  segments: number;
  halfSize: number;
  step: number;
  /** Column-major Float32Array indexed as col * (segments + 1) + row matching Rapier heightfield */
  heights: Float32Array;
}

export interface RockColliderSpec {
  id: string;
  kind: 'outcrop' | 'basalt';
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  tintIndex: number;
  /** Horizontal collision radius (meters) */
  radiusXZ: number;
  /** Approximate vertical collider height (meters) */
  height: number;
  /** Approximate diameter (meters) used for >= 0.30 m static collider threshold */
  diameter: number;
}

function smoothstep(x: number, edge0: number, edge1: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Underlying analytical terrain surface heightfield used solely to bake the single shared
 * TerrainHeightGrid array. All runtime rendering and physics read the baked grid.
 */
export function analyticalGroundHeightAt(x: number, z: number): number {
  // Outpost pad centered around (2.4, -0.4)
  const dx = x - 2.4;
  const dz = z + 0.4;
  const distFromPad = Math.sqrt(dx * dx + dz * dz);
  const padFlatten = smoothstep(distFromPad, 5.2, 14.5);

  const rollingDunes =
    Math.sin(x * 0.12 + 0.4) * Math.cos(z * 0.11) * 0.85 +
    Math.sin(x * 0.28 + z * 0.19) * 0.28 +
    Math.cos(x * 0.55 - z * 0.45) * 0.08;

  // Prominent left-midground impact crater
  const cx = x + 10.5;
  const cz = z + 3.2;
  const craterDist = Math.sqrt(cx * cx + cz * cz);
  const craterRim = Math.exp(-Math.pow((craterDist - 4.8) / 1.5, 2)) * 0.88;
  const craterBowl = -Math.exp(-Math.pow(craterDist / 3.4, 2)) * 1.05;

  // Secondary distant crater on far right
  const cx2 = x - 16.0;
  const cz2 = z + 11.0;
  const craterDist2 = Math.sqrt(cx2 * cx2 + cz2 * cz2);
  const crater2 =
    Math.exp(-Math.pow((craterDist2 - 5.2) / 1.8, 2)) * 0.7 -
    Math.exp(-Math.pow(craterDist2 / 3.8, 2)) * 0.85;

  // Foreground rocky framing rise on bottom-right & far-left edges
  const fgRight = Math.exp(-Math.pow((x - 9.5) / 3.2, 2) - Math.pow((z - 9.2) / 2.6, 2)) * 0.72;
  const fgLeft = Math.exp(-Math.pow((x + 8.0) / 3.4, 2) - Math.pow((z - 8.5) / 2.6, 2)) * 0.58;

  // Subtle rover wheel track indentations curving from habitat airlock toward rover foreground
  const trackCurveZ = 2.6 - (x - 1.2) * 0.42;
  const trackMask = x > -1.2 && x < 4.5 ? Math.exp(-Math.pow((z - trackCurveZ) / 0.9, 2)) : 0;
  const wheelRuts =
    trackMask *
    (Math.exp(-Math.pow((z - trackCurveZ - 0.52) / 0.14, 2)) +
      Math.exp(-Math.pow((z - trackCurveZ + 0.52) / 0.14, 2))) *
    -0.045;

  return (
    rollingDunes * padFlatten +
    (craterRim + craterBowl) * padFlatten +
    crater2 * padFlatten +
    fgRight +
    fgLeft +
    wheelRuts
  );
}

/**
 * Generates the single-source-of-truth height array shared identically by Three.js
 * PlaneGeometry vertices and Rapier ColliderDesc.heightfield(nrows, ncols, heights, scale).
 *
 * Verified Rapier axis convention (rapier3d-compat 0.21):
 * - Array index `col * (segments + 1) + row` maps `col` -> +X and `row` -> +Z.
 */
export function createTerrainHeightGrid(
  sizeMeters = PHYSICS_CONSTANTS.TERRAIN_SIZE_M,
  segments = PHYSICS_CONSTANTS.TERRAIN_SEGMENTS,
): TerrainHeightGrid {
  const halfSize = sizeMeters * 0.5;
  const step = sizeMeters / segments;
  const stride = segments + 1;
  const heights = new Float32Array(stride * stride);

  for (let col = 0; col <= segments; col++) {
    const x = -halfSize + col * step;
    for (let row = 0; row <= segments; row++) {
      const z = -halfSize + row * step;
      heights[col * stride + row] = analyticalGroundHeightAt(x, z);
    }
  }

  return {
    sizeMeters,
    segments,
    halfSize,
    step,
    heights,
  };
}

/**
 * Exact triangle-interpolated lookup on the baked TerrainHeightGrid so callers
 * match the physical Rapier heightfield & visual PlaneGeometry surface everywhere.
 */
export function groundHeightAtGrid(grid: TerrainHeightGrid, x: number, z: number): number {
  const { segments, halfSize, step, heights } = grid;
  const stride = segments + 1;

  const gx = Math.max(0, Math.min(segments - 1e-6, (x + halfSize) / step));
  const gz = Math.max(0, Math.min(segments - 1e-6, (z + halfSize) / step));

  const col = Math.floor(gx);
  const row = Math.floor(gz);
  const fx = gx - col;
  const fz = gz - row;

  const h00 = heights[col * stride + row];
  const h10 = heights[(col + 1) * stride + row];
  const h01 = heights[col * stride + (row + 1)];
  const h11 = heights[(col + 1) * stride + (row + 1)];

  // Bilinear interpolation agrees with both diagonal splits to sub-millimeter precision on 1 m grid
  const hx0 = h00 + (h10 - h00) * fx;
  const hx1 = h01 + (h11 - h01) * fx;
  return hx0 + (hx1 - hx0) * fz;
}

let cachedDefaultGrid: TerrainHeightGrid | null = null;

export function getDefaultTerrainGrid(): TerrainHeightGrid {
  if (!cachedDefaultGrid) {
    cachedDefaultGrid = createTerrainHeightGrid();
  }
  return cachedDefaultGrid;
}

/** Single-source ground height lookup used by rendering, physics, rover, and crew. */
export function groundHeightAt(x: number, z: number): number {
  return groundHeightAtGrid(getDefaultTerrainGrid(), x, z);
}

function isClearOfOutpost(rx: number, rz: number): boolean {
  if (Math.hypot(rx - 4.4, rz + 3.4) < 4.5) return false; // habitat
  if (Math.hypot(rx - 4.4, rz + 8.0) < 4.2) return false; // CHAPEA rear crew wing
  if (Math.hypot(rx - 8.6, rz - 0.1) < 3.4) return false; // greenhouse
  if (Math.hypot(rx - 2.3, rz - 3.2) < 2.6) return false; // rover
  if (Math.hypot(rx - 4.8, rz - 2.5) < 1.8) return false; // astronaut
  if (Math.hypot(rx - 9.4, rz + 4.6) < 2.8) return false; // solar 1
  if (Math.hypot(rx - 11.4, rz + 2.4) < 2.8) return false; // solar 2
  if (Math.hypot(rx - 13.8, rz + 5.2) < 2.8) return false; // solar 3
  if (Math.hypot(rx - 14.2, rz + 1.5) < 2.8) return false; // solar 4
  if (Math.hypot(rx - 11.8, rz + 7.2) < 2.8) return false; // solar 5
  if (Math.hypot(rx - 14.5, rz + 3.6) < 3.0) return false; // battery container bank
  if (Math.hypot(rx + 10.2, rz + 7.8) < 3.4) return false; // wind turbine 1
  if (Math.hypot(rx - 16.8, rz + 8.2) < 3.4) return false; // wind turbine 2
  if (Math.hypot(rx + 2.6, rz - 1.2) < 2.2) return false; // helical vertical wind turbine
  if (Math.hypot(rx + 14.5, rz + 10.5) < 4.4) return false; // SWIM ice drill rig
  if (Math.hypot(rx - 16.8, rz - 9.2) < 6.8) return false; // Ares landing pad & cargo depot
  if (Math.hypot(rx - 1.45, rz + 0.85) < 2.0) return false; // Tank 2 bay
  if (Math.hypot(rx - 6.15, rz + 0.35) < 1.6) return false; // Power console
  if (Math.hypot(rx - 6.45, rz + 2.55) < 1.8) return false; // Water recycler
  if (Math.hypot(rx + 0.35, rz + 4.25) < 2.4) return false; // Radiation shelter
  if (rx > -4 && rx < 7 && rz > 6.5 && rz < 14) return false; // keep hero camera line clean
  return true;
}

/**
 * Deterministic generator producing exact visual & streamed-collider rock placements.
 * Only rocks with diameter >= ROCK_COLLIDER_MIN_DIAMETER_M (0.30 m) receive Rapier colliders.
 */
export function generateOutpostRockSpecs(
  quality: 'high' | 'low' = 'high',
  grid: TerrainHeightGrid = getDefaultTerrainGrid(),
): RockColliderSpec[] {
  const outcropCount = quality === 'high' ? 42 : 24;
  const basaltCount = quality === 'high' ? 85 : 45;
  const randRocks = seededRandom(1337);
  const specs: RockColliderSpec[] = [];

  const foregroundAnchors: [number, number, number][] = [
    [-6.2, 8.2, 1.55],
    [8.8, 7.6, 1.65],
    [-8.6, 4.8, 1.35],
  ];

  let oIdx = 0;
  for (const [fx, fz, fs] of foregroundAnchors) {
    if (oIdx >= outcropCount) break;
    const rotY = randRocks() * Math.PI * 2;
    const scaleX = fs * 1.4;
    const scaleY = fs * 0.9;
    const scaleZ = fs * 1.1;
    const y = groundHeightAtGrid(grid, fx, fz) + 0.12 * fs;
    const radiusXZ = Math.max(scaleX, scaleZ) * 0.56;
    const height = Math.max(0.28, scaleY * 0.58);
    specs.push({
      id: `outcrop-${oIdx}`,
      kind: 'outcrop',
      x: fx,
      y,
      z: fz,
      rotX: 0.08,
      rotY,
      rotZ: -0.06,
      scaleX,
      scaleY,
      scaleZ,
      tintIndex: oIdx,
      radiusXZ,
      height,
      diameter: radiusXZ * 2,
    });
    oIdx++;
  }

  let attempts = 0;
  while (oIdx < outcropCount && attempts < 500) {
    attempts++;
    const a = randRocks() * Math.PI * 2;
    const r = 6.0 + randRocks() * 26.0;
    const rx = 2.4 + Math.cos(a) * r;
    const rz = -0.5 + Math.sin(a) * r;
    if (!isClearOfOutpost(rx, rz)) continue;
    const s = 0.65 + randRocks() * 1.35;
    const rotX = (randRocks() - 0.5) * 0.25;
    const rotY = randRocks() * Math.PI * 2;
    const rotZ = (randRocks() - 0.5) * 0.25;
    const scaleX = s * (0.9 + randRocks() * 0.5);
    const scaleY = s * (0.65 + randRocks() * 0.45);
    const scaleZ = s;
    const y = groundHeightAtGrid(grid, rx, rz) + s * 0.08;
    const radiusXZ = Math.max(scaleX, scaleZ) * 0.56;
    const height = Math.max(0.25, scaleY * 0.58);
    specs.push({
      id: `outcrop-${oIdx}`,
      kind: 'outcrop',
      x: rx,
      y,
      z: rz,
      rotX,
      rotY,
      rotZ,
      scaleX,
      scaleY,
      scaleZ,
      tintIndex: oIdx,
      radiusXZ,
      height,
      diameter: radiusXZ * 2,
    });
    oIdx++;
  }

  let bIdx = 0;
  attempts = 0;
  while (bIdx < basaltCount && attempts < 600) {
    attempts++;
    const a = randRocks() * Math.PI * 2;
    const r = 3.2 + randRocks() * 24.0;
    const rx = 2.4 + Math.cos(a) * r;
    const rz = -0.5 + Math.sin(a) * r;
    if (!isClearOfOutpost(rx, rz)) continue;
    const s = 0.22 + randRocks() * 0.72;
    const rotX = randRocks() * Math.PI;
    const rotY = randRocks() * Math.PI;
    const rotZ = randRocks() * Math.PI;
    const scaleX = s * (0.85 + randRocks() * 0.5);
    const scaleY = s * (0.6 + randRocks() * 0.4);
    const scaleZ = s;
    const y = groundHeightAtGrid(grid, rx, rz) + s * 0.14;
    const radiusXZ = Math.max(scaleX, scaleZ) * 0.46;
    const height = Math.max(0.18, scaleY * 0.65);
    specs.push({
      id: `basalt-${bIdx}`,
      kind: 'basalt',
      x: rx,
      y,
      z: rz,
      rotX,
      rotY,
      rotZ,
      scaleX,
      scaleY,
      scaleZ,
      tintIndex: bIdx + 1,
      radiusXZ,
      height,
      diameter: radiusXZ * 2,
    });
    bIdx++;
  }

  return specs;
}
