import {
  CREW_PROFILES,
  CrewMemberId,
  PHYSICS_CONSTANTS,
} from './constants';
import {
  OUTPOST_ALARM_SLOTS,
  OUTPOST_CREW_STATIONS,
  OUTPOST_NAV_EDGES,
  OUTPOST_NAV_NODES,
  OUTPOST_REST_SLOTS,
  OutpostLayoutConfig,
  OutpostLayoutMode,
  SHOWCASE_LAYOUT,
  NavNodeSpec,
  computeLayoutNavPath,
  getGreenhouseDoorwaySpec,
  getOutpostSupportHeightAt,
} from './outpostLayout';
import {
  TerrainHeightGrid,
  computeTerrainSlopeDeg,
  getSoftSandFactorAt,
  groundHeightAt,
} from './terrainField';
import { CrewMemberState } from './simEngine';

export type CrewBehaviorMode =
  | 'Working'
  | 'Resting'
  | 'CheckingConsole'
  | 'Alarm'
  | 'Recovering';

export interface CrewStationSpec {
  x: number;
  z: number;
  label: string;
}

export interface CrewAgentState {
  id: CrewMemberId;
  x: number;
  z: number;
  y: number;
  yaw: number;
  vx: number;
  vz: number;
  speedMs: number;
  walkPhase: number;
  limping: boolean;
  mode: CrewBehaviorMode;
  homeStation: CrewStationSpec;
  patrolStation: CrewStationSpec;
  stations: CrewStationSpec[];
  activeStationIndex: number;
  waypointIndex: number;
  path: Array<{ x: number; z: number }>;
  pathCursor: number;
  lastGoalKey: string;
  stuckTicks: number;
  pauseTimerS: number;
  talkTimerS: number;
}

export interface CrewContext {
  weatherAlertActive: boolean;
  tank2LeakActive: boolean;
  radiationAlert: boolean;
  habitatShelterPos: { x: number; z: number };
  crewMembers: CrewMemberState[];
  obstacles: Array<{ x: number; z: number; radius: number }>;
  grid?: TerrainHeightGrid;
  layout?: OutpostLayoutConfig;
  /** Optional Rapier physics character controller step hook */
  moveCrewViaPhysics?: (
    id: CrewMemberId,
    desiredDx: number,
    desiredDz: number,
    dt: number,
  ) => { x: number; footY: number; z: number; vx: number; vz: number; blocked: boolean };
  /** Called once after all crew call moveCrewViaPhysics so kinematic transforms commit */
  afterPhysicsCrewStep?: () => void;
}

export const CREW_STATIONS: Record<
  CrewMemberId,
  { stations: CrewStationSpec[]; yaw: number }
> = OUTPOST_CREW_STATIONS;

export { OUTPOST_NAV_NODES, OUTPOST_NAV_EDGES };
export type { NavNodeSpec };

interface CachedNavGraph {
  nodeMap: Map<string, NavNodeSpec>;
  adjacency: Map<string, Array<{ to: string; cost: number }>>;
}

const navGraphCache = new Map<OutpostLayoutMode, CachedNavGraph>();

function getNavGraphInternal(layout: OutpostLayoutConfig): CachedNavGraph {
  const existing = navGraphCache.get(layout.mode);
  if (existing) return existing;

  const nodeMap = new Map<string, NavNodeSpec>(layout.navNodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, Array<{ to: string; cost: number }>>();
  for (const n of layout.navNodes) {
    adjacency.set(n.id, []);
  }
  for (const [a, b] of layout.navEdges) {
    const na = nodeMap.get(a);
    const nb = nodeMap.get(b);
    if (!na || !nb) continue;
    const dist = Math.hypot(nb.x - na.x, nb.z - na.z);
    adjacency.get(a)!.push({ to: b, cost: dist });
    adjacency.get(b)!.push({ to: a, cost: dist });
  }
  const built = { nodeMap, adjacency };
  navGraphCache.set(layout.mode, built);
  return built;
}

export function getOutpostNavGraph(layout: OutpostLayoutConfig = SHOWCASE_LAYOUT): {
  nodes: ReadonlyArray<NavNodeSpec>;
  edges: ReadonlyArray<[string, string]>;
} {
  return { nodes: layout.navNodes, edges: layout.navEdges };
}

function isInsideGreenhouseXZ(
  x: number,
  z: number,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): boolean {
  const gh = layout.modules.greenhouse;
  return Math.hypot(x - gh.x, z - gh.z) < gh.wallMidRadius - 0.1;
}

function findNearestNavNodeId(
  x: number,
  z: number,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): string {
  const insideGh = isInsideGreenhouseXZ(x, z, layout);
  const { nodeMap } = getNavGraphInternal(layout);
  if (insideGh && nodeMap.has('gh_in')) return 'gh_in';

  let bestId = layout.navNodes[0].id;
  let bestDist = Infinity;
  for (const n of layout.navNodes) {
    if (n.id === 'gh_in') continue; // never pick interior dome node when outside dome
    const d = Math.hypot(n.x - x, n.z - z);
    if (d < bestDist) {
      bestDist = d;
      bestId = n.id;
    }
  }
  return bestId;
}

/**
 * Shortest Dijkstra polyline path along collision-free outpost navigation edges.
 */
export function computeCrewNavPath(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): Array<{ x: number; z: number }> {
  const startId = findNearestNavNodeId(fromX, fromZ, layout);
  const goalId = findNearestNavNodeId(toX, toZ, layout);

  if (startId === goalId) {
    return [{ x: toX, z: toZ }];
  }

  const { nodeMap, adjacency } = getNavGraphInternal(layout);
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const unvisited = new Set<string>(layout.navNodes.map((n) => n.id));

  for (const n of layout.navNodes) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  dist.set(startId, 0);

  while (unvisited.size > 0) {
    let cur: string | null = null;
    let curD = Infinity;
    for (const id of unvisited) {
      const d = dist.get(id)!;
      if (d < curD) {
        curD = d;
        cur = id;
      }
    }
    if (!cur || !Number.isFinite(curD)) break;
    if (cur === goalId) break;
    unvisited.delete(cur);

    for (const edge of adjacency.get(cur) ?? []) {
      if (!unvisited.has(edge.to)) continue;
      const alt = curD + edge.cost;
      if (alt < dist.get(edge.to)!) {
        dist.set(edge.to, alt);
        prev.set(edge.to, cur);
      }
    }
  }

  const nodePath: Array<{ x: number; z: number }> = [];
  let trace: string | null = goalId;
  while (trace) {
    const node = nodeMap.get(trace);
    if (node) nodePath.unshift({ x: node.x, z: node.z });
    trace = prev.get(trace) ?? null;
  }

  while (
    nodePath.length > 1 &&
    Math.hypot(nodePath[0].x - fromX, nodePath[0].z - fromZ) < 0.35
  ) {
    nodePath.shift();
  }

  const last = nodePath[nodePath.length - 1];
  if (!last || Math.hypot(last.x - toX, last.z - toZ) > 0.15) {
    nodePath.push({ x: toX, z: toZ });
  }
  return nodePath;
}

export function createInitialCrewAgents(
  grid?: TerrainHeightGrid,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): CrewAgentState[] {
  return CREW_PROFILES.map((profile, idx) => {
    const rawSlots = layout.crewStations[profile.id];
    const stations: CrewStationSpec[] = rawSlots.map((s) => ({
      x: s.x,
      z: s.z,
      label: s.label,
    }));
    const startSt = stations[0];
    const nextSt = stations[1] ?? startSt;
    const y = getOutpostSupportHeightAt(
      startSt.x,
      startSt.z,
      (px, pz) => groundHeightAt(px, pz, grid),
      layout,
    );
    return {
      id: profile.id,
      x: startSt.x,
      z: startSt.z,
      y,
      yaw: rawSlots[0].yaw,
      vx: 0,
      vz: 0,
      speedMs: 0,
      walkPhase: idx * 1.3,
      limping: false,
      mode: 'Working',
      homeStation: startSt,
      patrolStation: nextSt,
      stations,
      activeStationIndex: 0,
      waypointIndex: 0,
      path: [{ x: startSt.x, z: startSt.z }],
      pathCursor: 0,
      lastGoalKey: `station:0`,
      stuckTicks: 0,
      pauseTimerS: 1.5 + idx * 0.9,
      talkTimerS: 0,
    };
  });
}

function wrapAngleDiff(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

export function stepCrewAgents(
  agents: CrewAgentState[],
  dt: number,
  ctx: CrewContext,
): CrewAgentState[] {
  const safeDt = Math.min(0.1, Math.max(0, dt));
  if (safeDt <= 0) return agents;

  const layout = ctx.layout ?? SHOWCASE_LAYOUT;
  const urgentAlert = ctx.weatherAlertActive || ctx.radiationAlert;
  const ghDoor = getGreenhouseDoorwaySpec(layout);
  const alarmSlots = layout.alarmSlots ?? OUTPOST_ALARM_SLOTS;
  const restSlots = layout.restSlots ?? OUTPOST_REST_SLOTS;
  const habCenter = layout.modules.habitat;

  const updated = agents.map((agent, idx) => {
    const simMember = ctx.crewMembers.find((m) => m.id === agent.id);
    const health = simMember?.health ?? 95;
    const stress = simMember?.stress ?? 18;
    const alive = simMember?.alive ?? true;

    const next: CrewAgentState = { ...agent };

    if (!alive) {
      next.vx = 0;
      next.vz = 0;
      next.speedMs = 0;
      next.mode = 'Resting';
      next.y = getOutpostSupportHeightAt(
        next.x,
        next.z,
        (px, pz) => groundHeightAt(px, pz, ctx.grid),
        layout,
      );
      return next;
    }

    next.limping = health < 55;

    let goalX = next.stations[next.activeStationIndex].x;
    let goalZ = next.stations[next.activeStationIndex].z;
    let goalKey = `station:${next.activeStationIndex}`;

    if (urgentAlert) {
      next.mode = 'Alarm';
      const slot = alarmSlots[next.id];
      goalX = slot.x;
      goalZ = slot.z;
      goalKey = `alarm:${next.id}`;
      next.pauseTimerS = 0;
    } else if (ctx.tank2LeakActive && next.id === 'rafi' && layout.mode === 'gameplay') {
      next.mode = 'CheckingConsole';
      goalX = layout.crewStations.rafi[0].x;
      goalZ = layout.crewStations.rafi[0].z;
      goalKey = 'tank2leak:rafi';
    } else if (ctx.tank2LeakActive && next.id === 'kenji') {
      next.mode = 'CheckingConsole';
      goalX = next.stations[0].x;
      goalZ = next.stations[0].z;
      goalKey = 'tank2leak:kenji';
    } else if (stress > 68) {
      next.mode = 'Resting';
      const slot = restSlots[next.id];
      goalX = slot.x;
      goalZ = slot.z;
      goalKey = `rest:${next.id}`;
    } else if (health < 55) {
      next.mode = 'Recovering';
      goalX = next.homeStation.x;
      goalZ = next.homeStation.z;
      goalKey = `recover:${next.id}`;
    } else {
      const stIdx = next.activeStationIndex % next.stations.length;
      const st = next.stations[stIdx];
      next.mode = stIdx % 2 === 0 ? 'Working' : 'CheckingConsole';
      next.patrolStation = st;
      goalX = st.x;
      goalZ = st.z;
      goalKey = `station:${stIdx}`;
    }

    if (next.lastGoalKey !== goalKey || next.path.length === 0) {
      next.lastGoalKey = goalKey;
      next.path = computeCrewNavPath(next.x, next.z, goalX, goalZ, layout);
      next.pathCursor = 0;
      next.stuckTicks = 0;
    }

    const totalGoalDist = Math.hypot(goalX - next.x, goalZ - next.z);

    if (totalGoalDist < 0.42) {
      next.vx = 0;
      next.vz = 0;
      next.speedMs = 0;
      next.stuckTicks = 0;
      if (!urgentAlert) {
        next.pauseTimerS -= safeDt;
        if (next.pauseTimerS <= 0) {
          next.activeStationIndex = (next.activeStationIndex + 1) % next.stations.length;
          next.waypointIndex = next.activeStationIndex;
          const slotCfg = layout.crewStations[next.id][next.activeStationIndex];
          next.pauseTimerS = slotCfg?.dwellSeconds ? Math.min(4.8, slotCfg.dwellSeconds * 0.45) : 3.2 + idx * 0.7;
        }
      }
      if (next.mode === 'CheckingConsole') {
        const inspectYaw = Math.atan2(habCenter.x - next.x, habCenter.z - next.z);
        next.yaw += wrapAngleDiff(next.yaw, inspectYaw) * Math.min(1, safeDt * 4);
      }
    } else {
      while (
        next.pathCursor < next.path.length - 1 &&
        Math.hypot(
          next.path[next.pathCursor].x - next.x,
          next.path[next.pathCursor].z - next.z,
        ) < 0.48
      ) {
        next.pathCursor++;
      }
      const wp = next.path[Math.min(next.pathCursor, next.path.length - 1)];
      const dx = wp.x - next.x;
      const dz = wp.z - next.z;
      const wpDist = Math.hypot(dx, dz) || 1e-4;

      const baseSpeed = urgentAlert
        ? 1.75
        : next.limping
          ? PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS * 0.62
          : PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS * 0.96;

      let dirX = dx / wpDist;
      let dirZ = dz / wpDist;

      const nearDoor = Math.hypot(next.x - ghDoor.centerX, next.z - ghDoor.centerZ) < 1.1;
      if (!nearDoor) {
        for (const other of agents) {
          if (other.id === next.id) continue;
          const ox = next.x - other.x;
          const oz = next.z - other.z;
          const od = Math.hypot(ox, oz);
          if (od > 0.001 && od < 1.25) {
            const push = ((1.25 - od) / 1.25) * 1.15;
            dirX += (ox / od) * push;
            dirZ += (oz / od) * push;
          }
        }
      }

      if (next.stuckTicks > 2) {
        const sign = idx % 2 === 0 ? 1 : -1;
        const perpX = -dirZ * sign;
        const perpZ = dirX * sign;
        dirX = dirX * 0.45 + perpX * 0.95;
        dirZ = dirZ * 0.45 + perpZ * 0.95;
      }

      const norm = Math.hypot(dirX, dirZ) || 1;
      dirX /= norm;
      dirZ /= norm;

      const stepDist = Math.min(wpDist, baseSpeed * safeDt);
      const desiredDx = dirX * stepDist;
      const desiredDz = dirZ * stepDist;

      if (ctx.moveCrewViaPhysics) {
        const phys = ctx.moveCrewViaPhysics(next.id, desiredDx, desiredDz, safeDt);
        next.x = phys.x;
        next.z = phys.z;
        next.y = phys.footY;
        const rawSpeed = Math.hypot(phys.vx, phys.vz);
        if (rawSpeed > PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS) {
          const clampScale = PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS / rawSpeed;
          next.vx = phys.vx * clampScale;
          next.vz = phys.vz * clampScale;
          next.speedMs = PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS;
        } else {
          next.vx = phys.vx;
          next.vz = phys.vz;
          next.speedMs = rawSpeed;
        }
        next.stuckTicks = phys.blocked ? next.stuckTicks + 1 : 0;
        if (next.stuckTicks > 18) {
          next.path = computeCrewNavPath(next.x, next.z, goalX, goalZ, layout);
          next.pathCursor = 0;
          next.stuckTicks = 0;
        }
      } else {
        for (const obs of ctx.obstacles) {
          const ox = next.x - obs.x;
          const oz = next.z - obs.z;
          const od = Math.hypot(ox, oz);
          const minClear = obs.radius + 0.55;
          if (od > 0.001 && od < minClear) {
            const push = ((minClear - od) / minClear) * 1.45;
            dirX += (ox / od) * push;
            dirZ += (oz / od) * push;
          }
        }
        const fNorm = Math.hypot(dirX, dirZ) || 1;
        dirX /= fNorm;
        dirZ /= fNorm;
        next.x += dirX * stepDist;
        next.z += dirZ * stepDist;
        next.vx = (dirX * stepDist) / safeDt;
        next.vz = (dirZ * stepDist) / safeDt;
        next.speedMs = Math.hypot(next.vx, next.vz);
        next.y = getOutpostSupportHeightAt(
          next.x,
          next.z,
          (px, pz) => groundHeightAt(px, pz, ctx.grid),
          layout,
        );
      }

      const desiredYaw = Math.atan2(dirX, dirZ);
      next.yaw += wrapAngleDiff(next.yaw, desiredYaw) * Math.min(1, safeDt * 7.0);
      next.walkPhase += safeDt * Math.max(2.0, next.speedMs * 3.8);
    }

    if (!ctx.moveCrewViaPhysics) {
      next.y = getOutpostSupportHeightAt(
        next.x,
        next.z,
        (px, pz) => groundHeightAt(px, pz, ctx.grid),
        layout,
      );
    }

    const relX = next.x - layout.walkableCenter.x;
    const relZ = next.z - layout.walkableCenter.z;
    const radial = Math.hypot(relX, relZ);
    const maxR = layout.walkableRadiusM - 1.5;
    if (radial > maxR) {
      next.x = layout.walkableCenter.x + (relX / radial) * maxR;
      next.z = layout.walkableCenter.z + (relZ / radial) * maxR;
    }

    return next;
  });

  if (ctx.moveCrewViaPhysics && ctx.afterPhysicsCrewStep) {
    ctx.afterPhysicsCrewStep();
  }

  return updated;
}

export interface CrewInspectCardData {
  id: CrewMemberId;
  name: string;
  role: string;
  specialty: string;
  modeLabel: string;
  health: number;
  stress: number;
  stationLabel: string;
  note: string;
}

export function getCrewInspectInfo(
  agent: CrewAgentState,
  member: CrewMemberState | undefined,
): CrewInspectCardData {
  const profile = CREW_PROFILES.find((p) => p.id === agent.id)!;
  const health = member?.health ?? 95;
  const stress = member?.stress ?? 20;
  const activeStation =
    agent.stations[agent.activeStationIndex % agent.stations.length] ?? agent.homeStation;

  let modeLabel = 'Working at Outpost';
  let note = `${profile.name} is performing nominal EVA checks near ${activeStation.label}.`;
  if (agent.mode === 'Alarm') {
    modeLabel = 'Seek Shelter Protocol';
    note = 'Moving briskly toward the pressurized Habitat airlock until the dust vortex clears.';
  } else if (agent.mode === 'CheckingConsole') {
    modeLabel = 'Diagnostic Check';
    note = `Inspecting gauges and telemetry near ${activeStation.label}.`;
  } else if (agent.mode === 'Recovering' || agent.limping) {
    modeLabel = 'Low Health — Careful Pace';
    note = `Moving slowly to conserve suit energy. Consider rest or medical care if stress rises.`;
  } else if (agent.mode === 'Resting') {
    modeLabel = 'High Stress — Resting';
    note = 'Taking a calm breather beside the Habitat to keep suit heart rate steady.';
  }

  return {
    id: agent.id,
    name: profile.name,
    role: profile.role,
    specialty: profile.specialty,
    modeLabel,
    health,
    stress,
    stationLabel: activeStation.label,
    note,
  };
}

// ============================================================================
// Autonomous 6-Wheel Rocker-Bogie Rover Controller (B5 + Pad Height Support)
// ============================================================================
export type RoverDriveState = 'PARKED' | 'FOLLOWING';

export interface RoverControllerState {
  x: number;
  z: number;
  y: number;
  yaw: number;
  pitchRad: number;
  rollRad: number;
  leftRockerRad: number;
  rightRockerRad: number;
  wheelSpinRad: number;
  wheelOffsetsM: [number, number, number, number, number, number];
  state: RoverDriveState;
  speedMs: number;
  softSandFactor: number;
  tiltDeg: number;
  tiltWarning: boolean;
  isDriving: boolean;
}

export function createInitialRoverController(
  startX: number,
  startZ: number,
  startYaw = -1.02,
  grid?: TerrainHeightGrid,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): RoverControllerState {
  const supportY = getOutpostSupportHeightAt(
    startX,
    startZ,
    (px, pz) => groundHeightAt(px, pz, grid),
    layout,
  );
  return {
    x: startX,
    z: startZ,
    y: supportY,
    yaw: startYaw,
    pitchRad: 0,
    rollRad: 0,
    leftRockerRad: 0,
    rightRockerRad: 0,
    wheelSpinRad: 0,
    wheelOffsetsM: [0, 0, 0, 0, 0, 0],
    state: 'PARKED',
    speedMs: 0,
    softSandFactor: getSoftSandFactorAt(startX, startZ, layout.mode),
    tiltDeg: 0,
    tiltWarning: false,
    isDriving: false,
  };
}

export interface RoverStepOptions {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  damaged: boolean;
  holdPosition?: boolean;
  obstacles: Array<{ x: number; z: number; radius: number }>;
  grid?: TerrainHeightGrid;
  layout?: OutpostLayoutConfig;
}

const WHEEL_LOCAL_COORDS: ReadonlyArray<[number, number]> = [
  [-0.78, -0.66], // Left Rear
  [-0.78, 0.0], // Left Mid
  [-0.78, 0.66], // Left Front
  [0.78, -0.66], // Right Rear
  [0.78, 0.0], // Right Mid
  [0.78, 0.66], // Right Front
];

export function stepRoverController(
  prev: RoverControllerState,
  dt: number,
  opts: RoverStepOptions,
): RoverControllerState {
  const safeDt = Math.min(0.1, Math.max(0, dt));
  const layout = opts.layout ?? SHOWCASE_LAYOUT;
  const next: RoverControllerState = {
    ...prev,
    wheelOffsetsM: [...prev.wheelOffsetsM] as [
      number,
      number,
      number,
      number,
      number,
      number,
    ],
  };

  const distToPlayer = Math.hypot(opts.playerX - next.x, opts.playerZ - next.z);

  if (opts.holdPosition) {
    next.state = 'PARKED';
  } else if (next.state === 'PARKED') {
    if (distToPlayer > PHYSICS_CONSTANTS.ROVER_PARK_START_FOLLOW_M) {
      next.state = 'FOLLOWING';
    }
  } else if (distToPlayer <= PHYSICS_CONSTANTS.ROVER_PARK_STOP_FOLLOW_M) {
    next.state = 'PARKED';
  }

  let movedDist = 0;

  if (next.state === 'FOLLOWING' && safeDt > 0) {
    const stopTargetX = opts.playerX - Math.sin(opts.playerYaw + 0.55) * 3.1;
    const stopTargetZ = opts.playerZ - Math.cos(opts.playerYaw + 0.55) * 3.1;

    // Follow road network when far (> 7.5 m) on gameplay base; cut direct when close
    let steerX = stopTargetX;
    let steerZ = stopTargetZ;
    if (distToPlayer > 7.5 && layout.roads.length > 0) {
      const roadPath = computeLayoutNavPath(next.x, next.z, stopTargetX, stopTargetZ, layout);
      for (const wp of roadPath) {
        if (Math.hypot(wp.x - next.x, wp.z - next.z) > 1.4) {
          steerX = wp.x;
          steerZ = wp.z;
          break;
        }
      }
    }

    const dx = steerX - next.x;
    const dz = steerZ - next.z;
    const dTarget = Math.hypot(dx, dz);

    if (dTarget > 0.25) {
      let dirX = dx / dTarget;
      let dirZ = dz / dTarget;

      for (const obs of opts.obstacles) {
        const ox = next.x - obs.x;
        const oz = next.z - obs.z;
        const od = Math.hypot(ox, oz);
        const minR = obs.radius + 1.05;
        if (od > 0.001 && od < minR) {
          const push = ((minR - od) / minR) * 1.85;
          dirX += (ox / od) * push;
          dirZ += (oz / od) * push;
        }
      }

      const norm = Math.hypot(dirX, dirZ) || 1;
      dirX /= norm;
      dirZ /= norm;

      const sandFactor = getSoftSandFactorAt(next.x, next.z, layout.mode);
      const sandSpeedMult = 1 - sandFactor * 0.28;
      const baseSpeed = opts.damaged
        ? PHYSICS_CONSTANTS.ROVER_SIM_DRIVE_SPEED_MS * 0.65
        : PHYSICS_CONSTANTS.ROVER_SIM_DRIVE_SPEED_MS;
      const driveSpeed = baseSpeed * sandSpeedMult;
      const candidateStep = Math.min(dTarget, driveSpeed * safeDt);
      const candX = next.x + dirX * candidateStep;
      const candZ = next.z + dirZ * candidateStep;

      const candSlope = computeTerrainSlopeDeg(candX, candZ, opts.grid);
      if (candSlope < PHYSICS_CONSTANTS.ROVER_TILT_LIMIT_DEG) {
        next.x = candX;
        next.z = candZ;
        movedDist = candidateStep;
      }

      const desiredYaw = Math.atan2(dirX, dirZ);
      next.yaw += wrapAngleDiff(next.yaw, desiredYaw) * Math.min(1, safeDt * 4.5);
    }
  }

  const relX = next.x - layout.walkableCenter.x;
  const relZ = next.z - layout.walkableCenter.z;
  const radial = Math.hypot(relX, relZ);
  const maxR = layout.walkableRadiusM - 2.0;
  if (radial > maxR) {
    next.x = layout.walkableCenter.x + (relX / radial) * maxR;
    next.z = layout.walkableCenter.z + (relZ / radial) * maxR;
  }

  next.speedMs = safeDt > 0 ? movedDist / safeDt : 0;
  next.isDriving = movedDist > 0.0005;
  next.wheelSpinRad += movedDist / PHYSICS_CONSTANTS.ROVER_WHEEL_RADIUS_M;

  // Compute 6-wheel contact atop both terrain and elevated Landing/Rover Pads (0 sinkage on paved pads)
  const sinY = Math.sin(next.yaw);
  const cosY = Math.cos(next.yaw);
  const wheelGrounds: number[] = [];
  let maxSand = 0;

  for (let i = 0; i < 6; i++) {
    const [lx, lz] = WHEEL_LOCAL_COORDS[i];
    const wx = next.x + lx * cosY + lz * sinY;
    const wz = next.z - lx * sinY + lz * cosY;
    const sand = getSoftSandFactorAt(wx, wz, layout.mode);
    if (sand > maxSand) maxSand = sand;
    const sinkage =
      sand *
      PHYSICS_CONSTANTS.ROVER_WHEEL_RADIUS_M *
      PHYSICS_CONSTANTS.ROVER_SOFT_SAND_SINK_RATIO;
    const supportY = getOutpostSupportHeightAt(
      wx,
      wz,
      (px, pz) => groundHeightAt(px, pz, opts.grid),
      layout,
    );
    wheelGrounds.push(supportY - sinkage);
  }

  next.softSandFactor = maxSand;
  const avgY = wheelGrounds.reduce((a, b) => a + b, 0) / 6;
  next.y = avgY;

  const leftAvg = (wheelGrounds[0] + wheelGrounds[1] + wheelGrounds[2]) / 3;
  const rightAvg = (wheelGrounds[3] + wheelGrounds[4] + wheelGrounds[5]) / 3;
  const frontAvg = (wheelGrounds[2] + wheelGrounds[5]) / 2;
  const rearAvg = (wheelGrounds[0] + wheelGrounds[3]) / 2;

  const targetRoll = Math.atan2(leftAvg - rightAvg, 1.56);
  const targetPitch = Math.atan2(rearAvg - frontAvg, 1.32);

  const smooth = safeDt > 0 ? Math.min(1, safeDt * 9) : 1;
  next.rollRad += (targetRoll - next.rollRad) * smooth;
  next.pitchRad += (targetPitch - next.pitchRad) * smooth;

  const leftPitch = Math.atan2(wheelGrounds[0] - wheelGrounds[2], 1.32);
  const rightPitch = Math.atan2(wheelGrounds[3] - wheelGrounds[5], 1.32);
  next.leftRockerRad += (leftPitch - next.leftRockerRad) * smooth;
  next.rightRockerRad += (rightPitch - next.rightRockerRad) * smooth;

  for (let i = 0; i < 6; i++) {
    const [lx, lz] = WHEEL_LOCAL_COORDS[i];
    const predictedSurfaceAtWheel =
      avgY - lz * Math.sin(next.pitchRad) + lx * Math.sin(next.rollRad);
    const travel = Math.max(-0.14, Math.min(0.14, wheelGrounds[i] - predictedSurfaceAtWheel));
    next.wheelOffsetsM[i] = travel;
  }

  const slopeDeg = computeTerrainSlopeDeg(next.x, next.z, opts.grid);
  const attitudeDeg = Math.hypot(next.pitchRad, next.rollRad) * (180 / Math.PI);
  next.tiltDeg = Number(Math.max(slopeDeg, attitudeDeg).toFixed(1));
  next.tiltWarning = next.tiltDeg > PHYSICS_CONSTANTS.ROVER_TILT_WARN_DEG;

  return next;
}
