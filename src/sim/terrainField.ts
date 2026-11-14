import { MARS_FACTS, PHYSICS_CONSTANTS } from './constants';
import {
  GAMEPLAY_LAYOUT,
  OUTPOST_NAV_EDGES,
  OUTPOST_NAV_NODES,
  OutpostLayoutConfig,
  OutpostLayoutMode,
  SHOWCASE_LAYOUT,
  getOutpostLayout,
  isOnPavedSurface,
  pointToSegmentDistSq,
} from './outpostLayout';

export interface TerrainHeightGrid {
  sizeMeters: number;
  segments: number;
  halfSize: number;
  step: number;
  mode: OutpostLayoutMode;
  /** Column-major Float32Array indexed as col * (segments + 1) + row matching Rapier heightfield */
  heights: Float32Array;
}

export interface TerrainPatchZone {
  id: string;
  label: string;
  x: number;
  z: number;
  radius: number;
  kind: 'soft-sand' | 'rocky-patch';
  kValue: number;
}

/** [SIM] Deterministic soft-sand ripple hollows (k = 0.02) and rocky basalt ejecta zones (k = 0.19) for Showcase */
export const SHOWCASE_SURFACE_ZONES: TerrainPatchZone[] = [
  {
    id: 'sand-hollow-west',
    label: 'Aeolian Soft-Sand Hollow West',
    x: -7.5,
    z: 7.5,
    radius: 5.2,
    kind: 'soft-sand',
    kValue: MARS_FACTS.GOLOMBEK_K_SANDY_HOLLOW,
  },
  {
    id: 'sand-hollow-east',
    label: 'Dune Ripple Drift East',
    x: 10.5,
    z: 13.5,
    radius: 5.5,
    kind: 'soft-sand',
    kValue: MARS_FACTS.GOLOMBEK_K_SANDY_HOLLOW,
  },
  {
    id: 'rocky-crater-rim',
    label: 'Crater Ejecta Basalt Field',
    x: -11.5,
    z: -1.5,
    radius: 7.2,
    kind: 'rocky-patch',
    kValue: MARS_FACTS.GOLOMBEK_K_ROCKY_PATCH,
  },
  {
    id: 'rocky-ridge-north',
    label: 'Northern Basalt Outcrop Belt',
    x: 15.5,
    z: -11.5,
    radius: 7.8,
    kind: 'rocky-patch',
    kValue: MARS_FACTS.GOLOMBEK_K_ROCKY_PATCH,
  },
];

/** [SIM] Deterministic gameplay sand/rock zones positioned in open off-road basins of the 90x90m base */
export const GAMEPLAY_SURFACE_ZONES: TerrainPatchZone[] = [
  {
    id: 'gp-sand-sw',
    label: 'Aeolian Soft-Sand Hollow SW',
    x: -24.5,
    z: 18.0,
    radius: 6.5,
    kind: 'soft-sand',
    kValue: MARS_FACTS.GOLOMBEK_K_SANDY_HOLLOW,
  },
  {
    id: 'gp-sand-se',
    label: 'Dune Ripple Drift SE',
    x: 14.5,
    z: 28.5,
    radius: 6.2,
    kind: 'soft-sand',
    kValue: MARS_FACTS.GOLOMBEK_K_SANDY_HOLLOW,
  },
  {
    id: 'gp-rocky-nw',
    label: 'Western Basalt Ejecta Field',
    x: -28.0,
    z: -21.0,
    radius: 9.0,
    kind: 'rocky-patch',
    kValue: MARS_FACTS.GOLOMBEK_K_ROCKY_PATCH,
  },
  {
    id: 'gp-rocky-ne',
    label: 'Northern Basalt Ridge Skirt',
    x: 28.0,
    z: -26.0,
    radius: 9.5,
    kind: 'rocky-patch',
    kValue: MARS_FACTS.GOLOMBEK_K_ROCKY_PATCH,
  },
];

export const TERRAIN_SURFACE_ZONES = SHOWCASE_SURFACE_ZONES;

export function getSurfaceZones(mode: OutpostLayoutMode = 'showcase'): TerrainPatchZone[] {
  return mode === 'gameplay' ? GAMEPLAY_SURFACE_ZONES : SHOWCASE_SURFACE_ZONES;
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

/** [REAL] Golombek et al. (2012) exponential slope q(k) = 1.79 + 0.152 / k */
export function golombekQ(k: number): number {
  return 1.79 + 0.152 / Math.max(0.005, k);
}

/** [REAL] Cumulative area fraction covered by rocks >= diameterM: F_k(D) = k * exp(-q(k)*D) */
export function golombekExceedanceFraction(k: number, diameterM: number): number {
  return k * Math.exp(-golombekQ(k) * Math.max(0, diameterM));
}

/** Returns 0..1 soft-sand density factor at world (x, z); always 0 on compacted paved roads & pads */
export function getSoftSandFactorAt(
  x: number,
  z: number,
  mode: OutpostLayoutMode = 'showcase',
): number {
  const layout = getOutpostLayout(mode);
  if (isOnPavedSurface(x, z, layout)) {
    return 0;
  }
  let maxFactor = 0;
  for (const zone of getSurfaceZones(mode)) {
    if (zone.kind !== 'soft-sand') continue;
    const d = Math.hypot(x - zone.x, z - zone.z);
    if (d < zone.radius) {
      const f = 1 - smoothstep(d, zone.radius * 0.45, zone.radius);
      if (f > maxFactor) maxFactor = f;
    }
  }
  return maxFactor;
}

/** Returns local Golombek rock abundance k and surface classification at world (x, z) */
export function getLocalRockFractionK(
  x: number,
  z: number,
  mode: OutpostLayoutMode = 'showcase',
): { k: number; zoneLabel: string } {
  const layout = getOutpostLayout(mode);
  if (isOnPavedSurface(x, z, layout)) {
    return { k: MARS_FACTS.GOLOMBEK_K_PLAINS, zoneLabel: 'Compacted Paved Pad' };
  }
  let bestK: number = MARS_FACTS.GOLOMBEK_K_PLAINS;
  let zoneLabel = 'Compacted Regolith Plain';
  let bestWeight = 0;
  for (const zone of getSurfaceZones(mode)) {
    const d = Math.hypot(x - zone.x, z - zone.z);
    if (d < zone.radius) {
      const w = 1 - d / zone.radius;
      if (w > bestWeight) {
        bestWeight = w;
        bestK = zone.kValue;
        zoneLabel = zone.label;
      }
    }
  }
  return { k: bestK, zoneLabel };
}

/**
 * Underlying analytical terrain surface heightfield used solely to bake the single shared
 * TerrainHeightGrid array. All runtime rendering and physics read the baked grid.
 */
export function analyticalGroundHeightAt(
  x: number,
  z: number,
  mode: OutpostLayoutMode = 'showcase',
): number {
  if (mode === 'gameplay') {
    // Flattened 90 x 90 m compacted base apron: |x|, |z| <= 44.5 m is flat 0.0 m (slope 0 deg)
    const boxDist = Math.max(Math.abs(x), Math.abs(z));
    const padFlatten = smoothstep(boxDist, 44.2, 52.5);
    if (padFlatten <= 1e-6) {
      return 0;
    }

    const outerDunes =
      Math.sin(x * 0.09 + 0.5) * Math.cos(z * 0.085) * 1.45 +
      Math.sin(x * 0.22 + z * 0.16) * 0.48 +
      Math.cos(x * 0.42 - z * 0.34) * 0.16;

    // Gentle crater depression outside base pad (NW & SE quadrants outside r=50m)
    const c1 = Math.hypot(x + 56, z + 38);
    const crater1 =
      Math.exp(-Math.pow((c1 - 9.0) / 3.2, 2)) * 1.5 -
      Math.exp(-Math.pow(c1 / 6.2, 2)) * 1.6;
    const c2 = Math.hypot(x - 58, z - 42);
    const crater2 =
      Math.exp(-Math.pow((c2 - 8.5) / 2.8, 2)) * 1.3 -
      Math.exp(-Math.pow(c2 / 5.5, 2)) * 1.4;

    // Outer Jezero basin rise toward far horizon rim
    const r = Math.hypot(x, z);
    const basinRise = smoothstep(r, 46, 86) * 3.8;

    return (outerDunes + crater1 + crater2 + basinRise) * padFlatten;
  }

  // Legacy Showcase / Landing Page hero terrain
  const dx = x - 2.4;
  const dz = z + 0.4;
  const distFromPad = Math.sqrt(dx * dx + dz * dz);
  const padFlatten = smoothstep(distFromPad, 5.2, 14.5);

  const rollingDunes =
    Math.sin(x * 0.12 + 0.4) * Math.cos(z * 0.11) * 0.85 +
    Math.sin(x * 0.28 + z * 0.19) * 0.28 +
    Math.cos(x * 0.55 - z * 0.45) * 0.08;

  const cx = x + 10.5;
  const cz = z + 3.2;
  const craterDist = Math.sqrt(cx * cx + cz * cz);
  const craterRim = Math.exp(-Math.pow((craterDist - 4.8) / 1.5, 2)) * 0.88;
  const craterBowl = -Math.exp(-Math.pow(craterDist / 3.4, 2)) * 1.05;

  const cx2 = x - 16.0;
  const cz2 = z + 11.0;
  const craterDist2 = Math.sqrt(cx2 * cx2 + cz2 * cz2);
  const crater2 =
    Math.exp(-Math.pow((craterDist2 - 5.2) / 1.8, 2)) * 0.7 -
    Math.exp(-Math.pow(craterDist2 / 3.8, 2)) * 0.85;

  const fgRight = Math.exp(-Math.pow((x - 9.5) / 3.2, 2) - Math.pow((z - 9.2) / 2.6, 2)) * 0.72;
  const fgLeft = Math.exp(-Math.pow((x + 8.0) / 3.4, 2) - Math.pow((z - 8.5) / 2.6, 2)) * 0.58;

  let sandDepression = 0;
  for (const zone of SHOWCASE_SURFACE_ZONES) {
    if (zone.kind !== 'soft-sand') continue;
    const d = Math.hypot(x - zone.x, z - zone.z);
    if (d < zone.radius) {
      const ripple = Math.sin(x * 3.8 + z * 2.1) * 0.03;
      sandDepression -= Math.exp(-Math.pow(d / (zone.radius * 0.65), 2)) * 0.14 - ripple * 0.5;
    }
  }

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
    sandDepression * padFlatten +
    wheelRuts
  );
}

/**
 * Generates the single-source-of-truth height array shared identically by Three.js
 * PlaneGeometry vertices and Rapier ColliderDesc.heightfield(nrows, ncols, heights, scale).
 */
export function createTerrainHeightGrid(
  sizeMeters?: number,
  segments?: number,
  mode: OutpostLayoutMode = 'showcase',
): TerrainHeightGrid {
  const layout = getOutpostLayout(mode);
  const resolvedSize = sizeMeters ?? layout.terrainSizeM;
  const resolvedSegments = segments ?? layout.terrainSegments;
  const halfSize = resolvedSize * 0.5;
  const step = resolvedSize / resolvedSegments;
  const stride = resolvedSegments + 1;
  const heights = new Float32Array(stride * stride);

  for (let col = 0; col <= resolvedSegments; col++) {
    const x = -halfSize + col * step;
    for (let row = 0; row <= resolvedSegments; row++) {
      const z = -halfSize + row * step;
      heights[col * stride + row] = analyticalGroundHeightAt(x, z, mode);
    }
  }

  return {
    sizeMeters: resolvedSize,
    segments: resolvedSegments,
    halfSize,
    step,
    mode,
    heights,
  };
}

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

  const hx0 = h00 + (h10 - h00) * fx;
  const hx1 = h01 + (h11 - h01) * fx;
  return hx0 + (hx1 - hx0) * fz;
}

const cachedGrids: Partial<Record<OutpostLayoutMode, TerrainHeightGrid>> = {};

export function getDefaultTerrainGrid(mode: OutpostLayoutMode = 'showcase'): TerrainHeightGrid {
  if (!cachedGrids[mode]) {
    cachedGrids[mode] = createTerrainHeightGrid(undefined, undefined, mode);
  }
  return cachedGrids[mode]!;
}

/** Single-source ground height lookup used by rendering, physics, rover, and crew. */
export function groundHeightAt(
  x: number,
  z: number,
  grid: TerrainHeightGrid = getDefaultTerrainGrid('showcase'),
): number {
  return groundHeightAtGrid(grid, x, z);
}

/** Computes terrain slope angle in degrees at world (x, z). */
export function computeTerrainSlopeDeg(
  x: number,
  z: number,
  grid: TerrainHeightGrid = getDefaultTerrainGrid('showcase'),
): number {
  const eps = 0.35;
  const hL = groundHeightAtGrid(grid, x - eps, z);
  const hR = groundHeightAtGrid(grid, x + eps, z);
  const hD = groundHeightAtGrid(grid, x, z - eps);
  const hU = groundHeightAtGrid(grid, x, z + eps);
  const dhdx = (hR - hL) / (2 * eps);
  const dhdz = (hU - hD) / (2 * eps);
  return (Math.atan(Math.hypot(dhdx, dhdz)) * 180) / Math.PI;
}

const SHOWCASE_NODE_MAP = new Map(OUTPOST_NAV_NODES.map((n) => [n.id, n]));
const SHOWCASE_FOOTPATH_SEGMENTS: Array<[number, number, number, number]> =
  OUTPOST_NAV_EDGES.flatMap(([aId, bId]) => {
    const a = SHOWCASE_NODE_MAP.get(aId);
    const b = SHOWCASE_NODE_MAP.get(bId);
    return a && b ? [[a.x, a.z, b.x, b.z] as [number, number, number, number]] : [];
  });

function distToSegmentXZ(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  return Math.sqrt(pointToSegmentDistSq(px, pz, ax, az, bx, bz));
}

export function isClearOfOutpost(
  rx: number,
  rz: number,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): boolean {
  if (layout.mode === 'gameplay') {
    const m = layout.modules;
    if (Math.hypot(rx - m.habitat.x, rz - m.habitat.z) < m.habitat.deckRadius + 2.2) return false;
    if (Math.hypot(rx - m.chapea.x, rz - m.chapea.z) < 4.5) return false;
    if (
      Math.hypot(rx - (m.habitat.x + m.airlockOffset.dx), rz - (m.habitat.z + m.airlockOffset.dz)) <
      3.5
    ) {
      return false;
    }
    if (Math.hypot(rx - m.greenhouse.x, rz - m.greenhouse.z) < m.greenhouse.floorRadius + 2.2) {
      return false;
    }
    // Clear skybridge piers and overpass corridor footprint
    if (m.connHabGh.elevatedOverpass) {
      if (
        distToSegmentXZ(rx, rz, m.connHabGh.startX, m.connHabGh.startZ, m.connHabGh.endX, m.connHabGh.endZ) <
        2.0
      ) {
        return false;
      }
    }
    for (const [sx, sz] of m.solarPanels) {
      if (Math.hypot(rx - sx, rz - sz) < 2.9) return false;
    }
    if (Math.hypot(rx - m.batteryBank.x, rz - m.batteryBank.z) < 3.2) return false;
    for (const [wx, wz] of m.windmills) {
      if (Math.hypot(rx - wx, rz - wz) < 3.6) return false;
    }
    if (Math.hypot(rx - m.verticalTurbine.x, rz - m.verticalTurbine.z) < 2.6) return false;
    if (Math.hypot(rx - m.iceDrill.x, rz - m.iceDrill.z) < 4.2) return false;
    if (Math.hypot(rx - m.landingPad.x, rz - m.landingPad.z) < m.landingPad.apronRadius + 2.8) {
      return false;
    }
    if (
      m.roverPad.enabled &&
      Math.abs(rx - m.roverPad.x) < m.roverPad.widthM * 0.5 + 1.8 &&
      Math.abs(rz - m.roverPad.z) < m.roverPad.depthM * 0.5 + 1.8
    ) {
      return false;
    }
    if (Math.hypot(rx - m.tank2.x, rz - m.tank2.z) < 3.6) return false;
    if (Math.hypot(rx - m.powerConsole.x, rz - m.powerConsole.z) < 2.2) return false;
    if (Math.hypot(rx - m.recycler.x, rz - m.recycler.z) < 2.6) return false;
    if (Math.hypot(rx - m.shelter.x, rz - m.shelter.z) < 3.2) return false;
    if (Math.hypot(rx - m.commsMast.x, rz - m.commsMast.z) < 2.6) return false;

    for (const pad of layout.pads) {
      if (pad.shape === 'circle' && pad.radiusM) {
        if (Math.hypot(rx - pad.x, rz - pad.z) < pad.radiusM + 1.4) return false;
      } else if (pad.shape === 'rect' && pad.halfX && pad.halfZ) {
        if (Math.abs(rx - pad.x) < pad.halfX + 1.4 && Math.abs(rz - pad.z) < pad.halfZ + 1.4) {
          return false;
        }
      }
    }
    for (const seg of layout.roads) {
      const clearDist = Math.max(2.2, seg.widthM * 0.5 + 0.9);
      if (distToSegmentXZ(rx, rz, seg.x1, seg.z1, seg.x2, seg.z2) < clearDist) return false;
    }
    for (const sp of layout.signposts) {
      if (Math.hypot(rx - sp.x, rz - sp.z) < 1.3) return false;
    }
    for (const bol of layout.bollards) {
      if (Math.hypot(rx - bol.x, rz - bol.z) < 1.0) return false;
    }
    for (const ub of layout.utilityBridges) {
      if (distToSegmentXZ(rx, rz, ub.x1, ub.z1, ub.x2, ub.z2) < 1.5) return false;
    }
    return true;
  }

  // Legacy Showcase layout obstacle exclusions
  if (Math.hypot(rx - 4.4, rz + 3.4) < 4.5) return false;
  if (Math.hypot(rx - 4.4, rz + 8.0) < 4.2) return false;
  if (Math.hypot(rx - 8.6, rz - 0.1) < 3.4) return false;
  if (Math.hypot(rx - 2.3, rz - 3.2) < 2.6) return false;
  if (Math.hypot(rx - 4.8, rz - 2.5) < 1.8) return false;
  if (Math.hypot(rx - 9.4, rz + 4.6) < 2.8) return false;
  if (Math.hypot(rx - 11.4, rz + 2.4) < 2.8) return false;
  if (Math.hypot(rx - 13.8, rz + 5.2) < 2.8) return false;
  if (Math.hypot(rx - 14.2, rz + 1.5) < 2.8) return false;
  if (Math.hypot(rx - 11.8, rz + 7.2) < 2.8) return false;
  if (Math.hypot(rx - 14.5, rz + 3.6) < 3.0) return false;
  if (Math.hypot(rx + 10.2, rz + 7.8) < 3.4) return false;
  if (Math.hypot(rx - 16.8, rz + 8.2) < 3.4) return false;
  if (Math.hypot(rx + 2.6, rz - 1.2) < 2.2) return false;
  if (Math.hypot(rx + 14.5, rz + 10.5) < 4.4) return false;
  if (Math.hypot(rx - 16.8, rz - 9.2) < 6.8) return false;
  if (Math.hypot(rx - 1.45, rz + 0.85) < 2.0) return false;
  if (Math.hypot(rx - 6.15, rz + 0.35) < 1.6) return false;
  if (Math.hypot(rx - 8.35, rz + 7.35) < 1.8) return false;
  if (Math.hypot(rx + 0.35, rz + 4.25) < 2.4) return false;
  if (Math.hypot(rx - 0.1, rz + 1.95) < 1.5) return false;
  if (rx > -4 && rx < 7 && rz > 6.5 && rz < 14) return false;
  for (let i = 0; i < SHOWCASE_FOOTPATH_SEGMENTS.length; i++) {
    const [ax, az, bx, bz] = SHOWCASE_FOOTPATH_SEGMENTS[i];
    if (distToSegmentXZ(rx, rz, ax, az, bx, bz) < 1.15) return false;
  }
  return true;
}

/**
 * Deterministic generator producing exact visual & streamed-collider rock placements
 * anchored to Golombek et al. (2012) exponential abundance F_k(D) = k * exp(-q(k)*D).
 * Visual InstancedMesh renders down to D >= 0.10 m; static Rapier colliders stream >= 0.30 m.
 */
export function generateOutpostRockSpecs(
  quality: 'high' | 'low' = 'high',
  grid?: TerrainHeightGrid,
  mode?: OutpostLayoutMode,
): RockColliderSpec[] {
  const resolvedMode = mode ?? grid?.mode ?? 'showcase';
  const layout = getOutpostLayout(resolvedMode);
  const resolvedGrid = grid ?? getDefaultTerrainGrid(resolvedMode);

  const totalBudget =
    resolvedMode === 'gameplay'
      ? quality === 'high'
        ? 420
        : 210
      : quality === 'high'
        ? 340
        : 170;
  const randRocks = seededRandom(1337);
  const specs: RockColliderSpec[] = [];

  const foregroundAnchors: [number, number, number][] =
    resolvedMode === 'gameplay'
      ? [
          [-26.5, 19.5, 1.65],
          [24.5, -6.5, 1.55],
          [-6.5, 22.8, 1.45],
        ]
      : [
          [-6.2, 8.2, 1.55],
          [8.8, 7.6, 1.65],
          [-8.6, 4.8, 1.35],
        ];

  let oIdx = 0;
  for (const [fx, fz, fs] of foregroundAnchors) {
    const rotY = randRocks() * Math.PI * 2;
    const scaleX = fs * 1.4;
    const scaleY = fs * 0.9;
    const scaleZ = fs * 1.1;
    const y = groundHeightAtGrid(resolvedGrid, fx, fz) + 0.12 * fs;
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

  let bIdx = 0;
  let attempts = 0;
  const center = layout.walkableCenter;
  const maxRockRadius = resolvedMode === 'gameplay' ? 58.0 : 34.0;
  const minRockRadius = resolvedMode === 'gameplay' ? 6.5 : 3.2;

  while (specs.length < totalBudget && attempts < 3600) {
    attempts++;
    const a = randRocks() * Math.PI * 2;
    const r = minRockRadius + Math.sqrt(randRocks()) * maxRockRadius;
    const rx = center.x + Math.cos(a) * r;
    const rz = center.z + Math.sin(a) * r;
    if (!isClearOfOutpost(rx, rz, layout)) continue;

    const { k } = getLocalRockFractionK(rx, rz, resolvedMode);
    const keepProb = Math.min(1, k / MARS_FACTS.GOLOMBEK_K_ROCKY_PATCH + 0.12);
    if (randRocks() > keepProb) continue;

    const q = golombekQ(k);
    const u = Math.max(0.002, randRocks());
    const rawDiameter =
      PHYSICS_CONSTANTS.ROCK_VISUAL_MIN_DIAMETER_M + (-Math.log(u) / q) * 1.35;
    const diameter = Math.min(2.2, rawDiameter);

    const isOutcrop = diameter >= 0.68 || (diameter >= 0.42 && randRocks() < 0.35);
    const rotX = isOutcrop ? (randRocks() - 0.5) * 0.25 : randRocks() * Math.PI;
    const rotY = randRocks() * Math.PI * 2;
    const rotZ = isOutcrop ? (randRocks() - 0.5) * 0.25 : randRocks() * Math.PI;

    const aspect = 0.85 + randRocks() * 0.4;
    const scaleBase = isOutcrop ? diameter / 1.15 : diameter / 0.92;
    const scaleX = scaleBase * aspect;
    const scaleY = scaleBase * (isOutcrop ? 0.62 + randRocks() * 0.3 : 0.58 + randRocks() * 0.32);
    const scaleZ = scaleBase;

    const y = groundHeightAtGrid(resolvedGrid, rx, rz) + scaleBase * (isOutcrop ? 0.08 : 0.12);
    const radiusXZ = Math.max(scaleX, scaleZ) * (isOutcrop ? 0.56 : 0.46);
    const height = Math.max(0.08, scaleY * (isOutcrop ? 0.58 : 0.65));

    specs.push({
      id: isOutcrop ? `outcrop-${oIdx++}` : `basalt-${bIdx++}`,
      kind: isOutcrop ? 'outcrop' : 'basalt',
      x: rx,
      y,
      z: rz,
      rotX,
      rotY,
      rotZ,
      scaleX,
      scaleY,
      scaleZ,
      tintIndex: oIdx + bIdx,
      radiusXZ,
      height,
      diameter: Number((radiusXZ * 2).toFixed(3)),
    });
  }

  // Note: unused GAMEPLAY_LAYOUT import check prevented while keeping strict module linkage
  void GAMEPLAY_LAYOUT;

  return specs;
}
