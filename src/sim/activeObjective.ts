import { MissionZoneId } from './missionsData';
import { GAMEPLAY_LAYOUT, OutpostLayoutConfig } from './outpostLayout';
import { CampaignState, getActiveMission } from './simEngine';
import { ChorePlaceId, GRAVITY_CRYSTAL_SPOTS } from './storyBeats';

export interface ActiveObjective {
  id: string;
  label: string;
  x: number;
  z: number;
  ownerScene: string;
  colorHex: string;
  /** Whether the single 3D floating diamond marker and ground ring should be visible */
  showMarkerAndRing: boolean;
  /** Whether Tank 2 gauge glow / tick-hiss / marker is allowed in this scene */
  isTank2: boolean;
  zoneId?: MissionZoneId;
}

export interface PathGuideChevron {
  x: number;
  z: number;
  yaw: number;
  distFromPlayerM: number;
  opacity: number;
  pulse: number;
}

export interface PathGuideRouteResult {
  visible: boolean;
  colorHex: string;
  totalDistanceM: number;
  waypoints: Array<{ x: number; z: number }>;
  chevrons: PathGuideChevron[];
}

export interface ScreenEdgeGuideResult {
  visible: boolean;
  isOffscreen: boolean;
  direction: 'left' | 'right' | 'center';
  turnDirection: 'left' | 'right' | 'center';
  angleDeg: number;
  screenLeftPct: number;
  distanceLabel: string;
  distanceM: number;
  colorHex: string;
}

const ZONE_LABELS: Record<MissionZoneId, string> = {
  tank2: 'Oxygen Tank 2',
  solar: 'Solar Field',
  recycler: 'Water Bay',
  greenhouse: 'Greenhouse',
  shelter: 'Storm Shelter',
};

const BIBLE_CHORE_ORDER: readonly ChorePlaceId[] = ['greenhouse', 'solar', 'habitat'] as const;

export function areAllChoresVisited(choresVisited: Record<ChorePlaceId, boolean>): boolean {
  return Boolean(
    choresVisited?.greenhouse && choresVisited?.solar && choresVisited?.habitat,
  );
}

/**
 * Returns true ONLY when the scene is S1.6 (Tank 2 check & quiz after 3/3 chores)
 * or Mission 1 (Sol 21 Tank 2 leak). Never true during S1.5 Chores or earlier Act 1 steps.
 */
export function isTank2SceneActive(state: CampaignState): boolean {
  if (state.tutorialStep === 'inspect-oxygen' || state.tutorialStep === 'tutorial-quiz') {
    return areAllChoresVisited(state.choresVisited);
  }
  if (state.tutorialStep === 'complete' && state.phase === 'active-mission') {
    const activeMission = getActiveMission(state);
    return activeMission.id === 'm1';
  }
  return false;
}

/**
 * Single Source of Truth for the player's current Active Objective across Act 1, Act 2, and Act 3.
 * Read by: Top Compass, 3D Diamond Marker, Ground Ring, Path Guide Chevrons, Screen-Edge Arrow,
 * Wrist Map, and Rover Guidance.
 */
export function getActiveObjective(
  state: CampaignState,
  layout: OutpostLayoutConfig = GAMEPLAY_LAYOUT,
  playerX?: number,
  playerZ?: number,
): ActiveObjective {
  // Priority 0: Active localized weather shelter alert
  if (state.activeWeatherEvent) {
    return {
      id: 'weather-shelter',
      label: 'Habitat Shelter',
      x: layout.destinationWaypoints.airlock.x,
      z: layout.destinationWaypoints.airlock.z,
      ownerScene: 'weather-alert',
      colorHex: '#22C55E',
      showMarkerAndRing: true,
      isTank2: false,
      zoneId: 'shelter',
    };
  }

  const spawn = layout.modules.astroSpawn;
  const yellowLightX = Number((spawn.x + Math.sin(spawn.yaw) * 7.0).toFixed(2));
  const yellowLightZ = Number((spawn.z + Math.cos(spawn.yaw) * 7.0).toFixed(2));

  // Act 1 Tutorial Steps (S0.4 -> S1.7)
  if (state.tutorialStep !== 'complete') {
    switch (state.tutorialStep) {
      case 'take-control':
        return {
          id: 'act1-take-control',
          label: 'Habitat Airlock',
          x: layout.destinationWaypoints.airlock.x,
          z: layout.destinationWaypoints.airlock.z,
          ownerScene: 'S0.4-take-control',
          colorHex: '#FFB703',
          showMarkerAndRing: false,
          isTank2: false,
        };

      case 'look':
        return {
          id: 'act1-look',
          label: 'Look Around (60°)',
          x: yellowLightX,
          z: yellowLightZ,
          ownerScene: 'S1.1-look-60deg',
          colorHex: '#FFB703',
          showMarkerAndRing: false,
          isTank2: false,
        };

      case 'move':
      case 'inspect-rover':
        return {
          id: 'act1-yellow-light',
          label: 'Yellow Light (7 m)',
          x: yellowLightX,
          z: yellowLightZ,
          ownerScene: 'S1.2-move-7m',
          colorHex: '#FFB703',
          showMarkerAndRing: true,
          isTank2: false,
        };

      case 'jump-crystals': {
        const collected = new Set(state.collectedCrystalIds ?? []);
        const nextCrystal =
          GRAVITY_CRYSTAL_SPOTS.find((c) => !collected.has(c.id)) ?? GRAVITY_CRYSTAL_SPOTS[1];
        return {
          id: 'act1-crystals',
          label: 'Gravity Crystals',
          x: nextCrystal.x,
          z: nextCrystal.z,
          ownerScene: 'S1.3-jump-crystals',
          colorHex: '#38BDF8',
          // Crystals have their own 3 glowing gems/rings; no extra zone beacon diamond
          showMarkerAndRing: false,
          isTank2: false,
        };
      }

      case 'gravity-card':
        return {
          id: 'act1-gravity-card',
          label: 'Greenhouse (Rafi)',
          x: layout.zoneCoords.greenhouse.x,
          z: layout.zoneCoords.greenhouse.z,
          ownerScene: 'S1.4-gravity-card',
          colorHex: '#FFB703',
          showMarkerAndRing: false,
          isTank2: false,
        };

      case 'chores': {
        const choreTargets: Record<
          ChorePlaceId,
          { id: string; label: string; x: number; z: number; zoneId: MissionZoneId }
        > = {
          greenhouse: {
            id: 'chore-greenhouse',
            label: 'Greenhouse (Rafi)',
            x: layout.zoneCoords.greenhouse.x,
            z: layout.zoneCoords.greenhouse.z,
            zoneId: 'greenhouse',
          },
          solar: {
            id: 'chore-solar',
            label: 'Solar Field (Kenji)',
            x: layout.zoneCoords.solar.x,
            z: layout.zoneCoords.solar.z,
            zoneId: 'solar',
          },
          habitat: {
            id: 'chore-habitat',
            label: 'Habitat Core (Amara & Lucía)',
            x: layout.destinationWaypoints.airlock.x,
            z: layout.destinationWaypoints.airlock.z,
            zoneId: 'shelter',
          },
        };

        const unvisited = BIBLE_CHORE_ORDER.filter((cid) => !state.choresVisited?.[cid]);
        if (unvisited.length === 0) {
          // All 3 chores visited -> transitions to S1.6 Tank 2
          return {
            id: 'act1-tank2',
            label: 'Oxygen Tank 2',
            x: layout.zoneCoords.tank2.x,
            z: layout.zoneCoords.tank2.z,
            ownerScene: 'S1.6-tank2-quiz',
            colorHex: '#FFB703',
            showMarkerAndRing: true,
            isTank2: true,
            zoneId: 'tank2',
          };
        }

        // Strictly follow Bible S1.5 order: Greenhouse -> Solar Field -> Habitat Core
        const chosenId = unvisited[0];
        const chosen = choreTargets[chosenId];
        return {
          id: chosen.id,
          label: chosen.label,
          x: chosen.x,
          z: chosen.z,
          ownerScene: 'S1.5-chores-3-places',
          colorHex: '#FFB703',
          showMarkerAndRing: true,
          isTank2: false,
          zoneId: chosen.zoneId,
        };
      }

      case 'inspect-oxygen':
      case 'tutorial-quiz':
        return {
          id: 'act1-tank2',
          label: 'Oxygen Tank 2',
          x: layout.zoneCoords.tank2.x,
          z: layout.zoneCoords.tank2.z,
          ownerScene: 'S1.6-tank2-quiz',
          colorHex: '#FFB703',
          showMarkerAndRing: state.tutorialStep === 'inspect-oxygen',
          isTank2: true,
          zoneId: 'tank2',
        };

      case 'crew-map-intro':
        return {
          id: 'act1-sunset-log',
          label: 'Habitat Airlock',
          x: layout.destinationWaypoints.airlock.x,
          z: layout.destinationWaypoints.airlock.z,
          ownerScene: 'S1.7-sunset-log-sleep',
          colorHex: '#FFB703',
          showMarkerAndRing: false,
          isTank2: false,
        };
    }
  }

  // Act 2 & Act 3 Missions (M1..M5) & Free Roam
  const activeMission = getActiveMission(state);
  const zId = activeMission.zoneId;
  const coords = layout.zoneCoords[zId];
  const isMissionActive = state.phase === 'active-mission';

  return {
    id: `mission-${activeMission.id}-${zId}`,
    label: ZONE_LABELS[zId] ?? activeMission.title,
    x: coords.x,
    z: coords.z,
    ownerScene: `${activeMission.id.toUpperCase()}-sol-${state.sol}`,
    colorHex: '#FFB703',
    showMarkerAndRing: isMissionActive || state.phase === 'free-roam',
    isTank2: zId === 'tank2' && isMissionActive,
    zoneId: zId,
  };
}

interface ObstacleCircle {
  x: number;
  z: number;
  r: number;
}

function getMajorStructureObstacles(layout: OutpostLayoutConfig): ObstacleCircle[] {
  const m = layout.modules;
  return [
    { x: m.habitat.x, z: m.habitat.z, r: m.habitat.deckRadius + 0.9 },
    { x: m.greenhouse.x, z: m.greenhouse.z, r: m.greenhouse.floorRadius + 0.8 },
    { x: m.chapea.x, z: m.chapea.z, r: Math.max(m.chapea.plinthHalfX, m.chapea.plinthHalfZ) + 0.8 },
    { x: m.shelter.x, z: m.shelter.z, r: 2.3 },
    { x: m.recycler.x, z: m.recycler.z, r: 1.8 },
    { x: m.tank2.x, z: m.tank2.z, r: 1.9 },
    { x: m.batteryBank.x, z: m.batteryBank.z, r: 2.0 },
  ];
}

/**
 * Computes a walkable 2D polyline from (startX, startZ) to (goalX, goalZ)
 * that steers smoothly around major outpost domes and structures.
 * Always starts at (startX, startZ) and ends at (goalX, goalZ).
 */
export function buildWalkableRouteWaypoints(
  startX: number,
  startZ: number,
  goalX: number,
  goalZ: number,
  layout: OutpostLayoutConfig = GAMEPLAY_LAYOUT,
): Array<{ x: number; z: number }> {
  const waypoints: Array<{ x: number; z: number }> = [{ x: startX, z: startZ }];
  const obstacles = getMajorStructureObstacles(layout);

  let curX = startX;
  let curZ = startZ;

  for (let iter = 0; iter < 4; iter++) {
    const segDx = goalX - curX;
    const segDz = goalZ - curZ;
    const segLen = Math.hypot(segDx, segDz);
    if (segLen < 0.5) break;

    const dirX = segDx / segLen;
    const dirZ = segDz / segLen;

    let hitObs: ObstacleCircle | null = null;
    let closestProj = Infinity;

    for (const obs of obstacles) {
      // Skip obstacle if start or goal is intentionally inside/at its interaction perimeter
      const distStart = Math.hypot(obs.x - curX, obs.z - curZ);
      const distGoal = Math.hypot(obs.x - goalX, obs.z - goalZ);
      if (distStart <= obs.r + 0.25 || distGoal <= obs.r + 0.85) continue;

      const toObsX = obs.x - curX;
      const toObsZ = obs.z - curZ;
      const proj = toObsX * dirX + toObsZ * dirZ;
      if (proj <= 0.2 || proj >= segLen - 0.2) continue;

      const perpX = curX + dirX * proj - obs.x;
      const perpZ = curZ + dirZ * proj - obs.z;
      const perpDist = Math.hypot(perpX, perpZ);

      if (perpDist < obs.r && proj < closestProj) {
        closestProj = proj;
        hitObs = obs;
      }
    }

    if (!hitObs) break;

    // Detour around the obstacle on the shorter side
    const normX = -dirZ;
    const normZ = dirX;
    const toCenterSide = (hitObs.x - curX) * normX + (hitObs.z - curZ) * normZ;
    const sideSign = toCenterSide >= 0 ? -1 : 1;
    const detourRadius = hitObs.r + 1.1;
    const wpX = Number((hitObs.x + normX * sideSign * detourRadius).toFixed(2));
    const wpZ = Number((hitObs.z + normZ * sideSign * detourRadius).toFixed(2));

    waypoints.push({ x: wpX, z: wpZ });
    curX = wpX;
    curZ = wpZ;
  }

  waypoints.push({ x: goalX, z: goalZ });
  return waypoints;
}

export const PATH_GUIDE_MAX_DISTANCE_M = 40.0;
export const PATH_GUIDE_NEAR_HIDE_M = 3.0;
export const PATH_GUIDE_CHEVRON_SPACING_M = 1.65;

/**
 * Computes the Kid-Friendly Path Guide state (ground chevrons + route waypoints).
 * - Hidden when `guideEnabled === false`
 * - Hidden when within 3.0 m of the objective (`totalDistanceM <= 3.0`)
 * - Shows chevrons up to 40 m along the route from the player, fading with distance
 * - Animates flow toward the objective unless `reducedMotion === true`
 */
export function computePathGuideState(params: {
  playerX: number;
  playerZ: number;
  objective: ActiveObjective;
  guideEnabled: boolean;
  layout?: OutpostLayoutConfig;
  elapsedSec?: number;
  reducedMotion?: boolean;
}): PathGuideRouteResult {
  const {
    playerX,
    playerZ,
    objective,
    guideEnabled,
    layout = GAMEPLAY_LAYOUT,
    elapsedSec = 0,
    reducedMotion = false,
  } = params;

  const waypoints = buildWalkableRouteWaypoints(
    playerX,
    playerZ,
    objective.x,
    objective.z,
    layout,
  );
  const directDistM = Math.hypot(objective.x - playerX, objective.z - playerZ);

  if (!guideEnabled || directDistM <= PATH_GUIDE_NEAR_HIDE_M) {
    return {
      visible: false,
      colorHex: objective.colorHex,
      totalDistanceM: Number(directDistM.toFixed(2)),
      waypoints,
      chevrons: [],
    };
  }

  // Build cumulative arc-length table along waypoints
  const segments: Array<{
    ax: number;
    az: number;
    bx: number;
    bz: number;
    len: number;
    startDist: number;
    yaw: number;
  }> = [];
  let accum = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 1e-3) continue;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    segments.push({
      ax: a.x,
      az: a.z,
      bx: b.x,
      bz: b.z,
      len,
      startDist: accum,
      yaw,
    });
    accum += len;
  }

  const maxRouteDist = Math.min(accum - 0.6, PATH_GUIDE_MAX_DISTANCE_M);
  const flowOffset = reducedMotion
    ? 0
    : ((elapsedSec * 1.45) % 1) * PATH_GUIDE_CHEVRON_SPACING_M;

  // Fade factor as player approaches the 3 m threshold (smooth fade between 4.5 m and 3.0 m)
  const nearTargetFade = Math.min(1, Math.max(0.15, (directDistM - PATH_GUIDE_NEAR_HIDE_M) / 1.5));

  const chevrons: PathGuideChevron[] = [];
  for (
    let d = 1.15 + flowOffset;
    d <= maxRouteDist && chevrons.length < 26;
    d += PATH_GUIDE_CHEVRON_SPACING_M
  ) {
    const seg = segments.find((s) => d >= s.startDist && d <= s.startDist + s.len);
    if (!seg) continue;
    const u = (d - seg.startDist) / seg.len;
    const cx = seg.ax + (seg.bx - seg.ax) * u;
    const cz = seg.az + (seg.bz - seg.az) * u;
    const distFade = Math.max(0.18, 1 - (d / PATH_GUIDE_MAX_DISTANCE_M) * 0.78);

    const pulse = reducedMotion
      ? 1.0
      : Number((0.92 + 0.16 * Math.sin(elapsedSec * 4.2 - chevrons.length * 0.55)).toFixed(3));

    chevrons.push({
      x: Number(cx.toFixed(3)),
      z: Number(cz.toFixed(3)),
      yaw: seg.yaw,
      distFromPlayerM: Number(d.toFixed(2)),
      opacity: Number((distFade * nearTargetFade).toFixed(3)),
      pulse,
    });
  }

  // Ensure at least one chevron is emitted when distance > 3 m
  if (chevrons.length === 0 && segments.length > 0) {
    const seg = segments[0];
    const midX = (seg.ax + seg.bx) * 0.5;
    const midZ = (seg.az + seg.bz) * 0.5;
    chevrons.push({
      x: Number(midX.toFixed(3)),
      z: Number(midZ.toFixed(3)),
      yaw: seg.yaw,
      distFromPlayerM: Number((directDistM * 0.5).toFixed(2)),
      opacity: Number(nearTargetFade.toFixed(3)),
      pulse: 1.0,
    });
  }

  return {
    visible: chevrons.length > 0,
    colorHex: objective.colorHex,
    totalDistanceM: Number(directDistM.toFixed(2)),
    waypoints,
    chevrons,
  };
}

/**
 * Computes screen-edge arrow and distance label ("23 m") for the active objective.
 */
export function computeScreenEdgeGuide(
  playerX: number,
  playerZ: number,
  headingDeg: number,
  objective: ActiveObjective,
  guideEnabled = true,
): ScreenEdgeGuideResult {
  const distM = Math.max(0, Math.round(Math.hypot(objective.x - playerX, objective.z - playerZ)));
  const targetBearingDeg =
    ((Math.atan2(objective.x - playerX, -(objective.z - playerZ)) * 180) / Math.PI + 360) % 360;

  let relDeg = ((targetBearingDeg - headingDeg + 540) % 360) - 180;
  if (relDeg < -180) relDeg += 360;

  const isOffscreen = Math.abs(relDeg) > 34;
  const direction: 'left' | 'right' | 'center' =
    relDeg < -34 ? 'left' : relDeg > 34 ? 'right' : 'center';
  const screenLeftPct = Math.max(18, Math.min(82, 50 + (relDeg / 34) * 28));

  return {
    visible: guideEnabled && distM > 0,
    isOffscreen,
    direction,
    turnDirection: direction,
    angleDeg: Math.round(relDeg),
    screenLeftPct,
    distanceLabel: `${distM} m`,
    distanceM: distM,
    colorHex: objective.colorHex,
  };
}
