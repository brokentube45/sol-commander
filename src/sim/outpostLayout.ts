import { OutpostLandmarkId } from '../data/missionData';
import { CREW_PROFILES, CrewMemberId, PHYSICS_CONSTANTS } from './constants';
import { MissionZoneId } from './missionsData';

export type OutpostLayoutMode = 'showcase' | 'gameplay';

export interface ModuleColliderBoxSpec {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  hx: number;
  hy: number;
  hz: number;
  yawRad?: number;
}

export interface ModuleColliderCylinderSpec {
  id: string;
  cx: number;
  cy: number;
  cz: number;
  radius: number;
  halfHeight: number;
}

export interface RoadSegmentSpec {
  id: string;
  category: 'ring' | 'spoke' | 'footpath' | 'plaza';
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  widthM: number;
  label?: string;
}

export interface PadSpec {
  id: string;
  label: string;
  shape: 'circle' | 'rect';
  x: number;
  z: number;
  radiusM?: number;
  halfX?: number;
  halfZ?: number;
  topOffsetM: number;
  yawRad?: number;
}

export interface SignpostSpec {
  id: string;
  title: string;
  subtitle?: string;
  x: number;
  z: number;
  yawRad: number;
}

export interface BollardSpec {
  id: string;
  x: number;
  z: number;
}

export interface UtilityBridgeSpec {
  id: string;
  kind: 'pipe-bridge' | 'cable-ramp';
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  clearanceY: number;
  widthM: number;
}

export interface NavNodeSpec {
  id: string;
  x: number;
  z: number;
  label?: string;
}

export interface CrewStationSlot {
  label: string;
  x: number;
  z: number;
  yaw: number;
  dwellSeconds: number;
}

export interface OutpostModulesSpec {
  habitat: { x: number; z: number; yaw: number; deckRadius: number; shellRadius: number };
  airlockOffset: {
    dx: number;
    dz: number;
    yawRad: number;
    stepForward: number;
    hasSuitVestibule: boolean;
  };
  chapea: {
    x: number;
    z: number;
    yaw: number;
    plinthHalfX: number;
    plinthHalfZ: number;
    shellHalfX: number;
    shellHalfZ: number;
  };
  connHabChapea: {
    halfWidth: number;
    halfHeight: number;
    centerYOffset: number;
    habStartOffsetZ: number;
    chapeaEndOffsetZ: number;
  };
  greenhouse: {
    x: number;
    z: number;
    floorRadius: number;
    wallMidRadius: number;
    wallThick: number;
    wallHeight: number;
    floorTopOffset: number;
    doorAngleRad: number;
    doorHalfArcRad: number;
    tunnelDoorAngleRad: number | null;
    tunnelDoorHalfArcRad: number;
    waterTankX: number;
    waterTankZ: number;
  };
  connHabGh: {
    elevatedOverpass: boolean;
    startX: number;
    startYOffset: number;
    startZ: number;
    endX: number;
    endYOffset: number;
    endZ: number;
    halfWidth: number;
    halfHeight: number;
    undersideClearanceY: number;
    pierXs: number[];
  };
  powerConsole: { x: number; z: number; yaw: number };
  tank2: { x: number; z: number; yaw: number; hasIsruUnit: boolean; isruOffsetX: number; isruOffsetZ: number };
  recycler: { x: number; z: number; yaw: number };
  shelter: { x: number; z: number; yaw: number };
  solarPanels: Array<[number, number]>;
  batteryBank: { x: number; z: number; yaw: number };
  windmills: Array<[number, number, number]>;
  verticalTurbine: { x: number; z: number };
  iceDrill: { x: number; z: number; yaw: number };
  landingPad: { x: number; z: number; apronRadius: number; topOffset: number };
  roverPad: { x: number; z: number; widthM: number; depthM: number; topOffset: number; enabled: boolean };
  commsMast: { x: number; z: number; radiusM: number; tall: boolean };
  weatherMast: { x: number; z: number };
  roverSpawn: { x: number; z: number; yaw: number };
  astroSpawn: { x: number; z: number; yaw: number };
}

export interface OutpostLayoutConfig {
  mode: OutpostLayoutMode;
  terrainSizeM: number;
  terrainSegments: number;
  flattenPadHalfM: number;
  walkableCenter: { x: number; z: number };
  walkableRadiusM: number;
  modules: OutpostModulesSpec;
  pads: PadSpec[];
  roads: RoadSegmentSpec[];
  signposts: SignpostSpec[];
  bollards: BollardSpec[];
  utilityBridges: UtilityBridgeSpec[];
  navNodes: NavNodeSpec[];
  navEdges: Array<[string, string]>;
  crewStations: Record<CrewMemberId, CrewStationSlot[]>;
  alarmSlots: Record<CrewMemberId, { x: number; z: number; yaw: number }>;
  restSlots: Record<CrewMemberId, { x: number; z: number; yaw: number }>;
  stationInteractCoords: Record<OutpostLandmarkId, { x: number; z: number; yOffset?: number }>;
  landmarkFocusCoords: Record<OutpostLandmarkId, { x: number; z: number; yOffset: number }>;
  zoneCoords: Record<MissionZoneId, { x: number; z: number; yOffset?: number }>;
  zoneNavNodes: Record<MissionZoneId, string>;
  destinationWaypoints: Record<
    | 'airlock'
    | 'greenhouse'
    | 'solar'
    | 'tank2'
    | 'rover-pad'
    | 'landing-pad'
    | 'shelter'
    | 'comms-mast'
    | 'windmills'
    | 'ice-drill'
    | 'recycler'
    | 'power-console',
    { label: string; nodeId: string; x: number; z: number }
  >;
}

/**
 * Legacy Showcase / Landing Page compact hero-shot configuration.
 * NEVER modify its coordinates or look—preserves exact title screen framing & 7 camera presets.
 */
export const SHOWCASE_LAYOUT: OutpostLayoutConfig = {
  mode: 'showcase',
  terrainSizeM: 170,
  terrainSegments: 112,
  flattenPadHalfM: 0,
  walkableCenter: { x: 2.0, z: -1.0 },
  walkableRadiusM: 43.0,
  modules: {
    habitat: { x: 4.4, z: -3.4, yaw: 0.14, deckRadius: 2.86, shellRadius: 2.48 },
    airlockOffset: {
      dx: -2.35,
      dz: 1.05,
      yawRad: -0.82,
      stepForward: 1.22,
      hasSuitVestibule: false,
    },
    chapea: {
      x: 4.4,
      z: -8.0,
      yaw: 0,
      plinthHalfX: 2.35,
      plinthHalfZ: 1.75,
      shellHalfX: 2.12,
      shellHalfZ: 1.52,
    },
    connHabChapea: {
      halfWidth: 0.56,
      halfHeight: 0.56,
      centerYOffset: 1.15,
      habStartOffsetZ: -1.95,
      chapeaEndOffsetZ: 1.25,
    },
    greenhouse: {
      x: 8.6,
      z: -0.1,
      floorRadius: 2.25,
      wallMidRadius: 2.1,
      wallThick: 0.16,
      wallHeight: 2.3,
      floorTopOffset: 0.22,
      doorAngleRad: 2.15,
      doorHalfArcRad: 0.34,
      tunnelDoorAngleRad: null,
      tunnelDoorHalfArcRad: 0,
      waterTankX: 10.65,
      waterTankZ: 1.05,
    },
    connHabGh: {
      elevatedOverpass: false,
      startX: 6.25,
      startYOffset: 1.1,
      startZ: -2.15,
      endX: 6.85,
      endYOffset: 1.1,
      endZ: -0.95,
      halfWidth: 0.46,
      halfHeight: 0.48,
      undersideClearanceY: 0.62,
      pierXs: [],
    },
    powerConsole: { x: 6.15, z: -0.35, yaw: -0.45 },
    tank2: { x: 1.45, z: -0.85, yaw: 0.25, hasIsruUnit: false, isruOffsetX: 0, isruOffsetZ: 0 },
    recycler: { x: 6.65, z: -5.15, yaw: -0.55 },
    shelter: { x: -0.35, z: -4.25, yaw: 0.38 },
    solarPanels: [
      [9.4, -4.6],
      [11.4, -2.4],
      [13.8, -5.2],
      [14.2, -1.5],
      [11.8, -7.2],
    ],
    batteryBank: { x: 14.5, z: -3.6, yaw: -0.35 },
    windmills: [
      [-10.2, -7.8, 0.38],
      [16.8, -8.2, -0.45],
    ],
    verticalTurbine: { x: -2.6, z: 1.2 },
    iceDrill: { x: -14.5, z: -10.5, yaw: 0.48 },
    landingPad: { x: 16.8, z: 9.2, apronRadius: 5.08, topOffset: 0.22 },
    roverPad: { x: 2.1, z: 3.25, widthM: 0, depthM: 0, topOffset: 0, enabled: false },
    commsMast: { x: -0.6, z: 1.4, radiusM: 0.35, tall: false },
    weatherMast: { x: -0.6, z: 1.4 },
    roverSpawn: { x: 2.1, z: 3.25, yaw: -1.02 },
    astroSpawn: { x: 4.95, z: 2.65, yaw: -0.45 },
  },
  pads: [
    {
      id: 'landing-pad',
      label: 'LANDING PAD',
      shape: 'circle',
      x: 16.8,
      z: 9.2,
      radiusM: 5.08,
      topOffsetM: 0.22,
    },
  ],
  roads: [],
  signposts: [],
  bollards: [],
  utilityBridges: [],
  navNodes: [
    { id: 'c_sw', x: -1.5, z: 5.6, label: 'SW Courtyard' },
    { id: 'c_se', x: 5.4, z: 5.4, label: 'SE Courtyard' },
    { id: 'c_east', x: 11.4, z: 3.2, label: 'East Solar Plaza' },
    { id: 'c_ne', x: 11.2, z: -9.8, label: 'NE Ridge' },
    { id: 'c_n', x: 4.4, z: -12.4, label: 'North CHAPEA' },
    { id: 'c_nw', x: -5.2, z: -10.2, label: 'NW Basin' },
    { id: 'c_w', x: -6.2, z: 0.6, label: 'West Yard' },
    { id: 'airlock', x: 1.5, z: -1.2, label: 'Habitat Airlock' },
    { id: 'gh_door', x: 7.45, z: 1.72, label: 'Greenhouse Threshold' },
    { id: 'gh_in', x: 8.45, z: -0.05, label: 'Greenhouse Hydroponics' },
    { id: 'solar_bay', x: 10.6, z: 0.6, label: 'Solar Microgrid' },
    { id: 'tank2', x: 0.5, z: 1.2, label: 'O2 Tank 2' },
    { id: 'ice_drill', x: -11.5, z: -8.6, label: 'Ice Drill Core' },
    { id: 'landing_pad', x: 12.2, z: 7.6, label: 'Landing Pad Apron' },
    { id: 'shelter', x: -1.4, z: -2.6, label: 'Storm Shelter' },
    { id: 'power_console', x: 5.1, z: 1.2, label: 'Power Console' },
  ],
  navEdges: [
    ['c_sw', 'c_se'],
    ['c_sw', 'c_w'],
    ['c_sw', 'tank2'],
    ['c_sw', 'airlock'],
    ['c_se', 'c_east'],
    ['c_se', 'power_console'],
    ['c_se', 'gh_door'],
    ['c_se', 'landing_pad'],
    ['c_east', 'landing_pad'],
    ['c_east', 'solar_bay'],
    ['c_east', 'gh_door'],
    ['c_east', 'c_ne'],
    ['c_ne', 'c_n'],
    ['c_n', 'c_nw'],
    ['c_nw', 'c_w'],
    ['c_nw', 'ice_drill'],
    ['c_w', 'ice_drill'],
    ['c_w', 'shelter'],
    ['c_w', 'airlock'],
    ['shelter', 'airlock'],
    ['tank2', 'airlock'],
    ['gh_door', 'gh_in'],
    ['power_console', 'c_sw'],
  ],
  crewStations: {
    amara: [
      { label: 'Hydroponics Crop Bay', x: 8.5, z: -0.05, yaw: 0.6, dwellSeconds: 9 },
      { label: 'Greenhouse Plaza Entry', x: 6.2, z: 3.1, yaw: -1.2, dwellSeconds: 7 },
      { label: 'Habitat Airlock Check', x: 1.6, z: -0.9, yaw: 0.8, dwellSeconds: 8 },
    ],
    kenji: [
      { label: 'Solar Array Tracking', x: 9.8, z: -1.2, yaw: 0.3, dwellSeconds: 8 },
      { label: 'Battery Container Bank', x: 12.2, z: 2.8, yaw: -0.5, dwellSeconds: 9 },
      { label: 'Power Console Telemetry', x: 5.05, z: 1.15, yaw: 2.3, dwellSeconds: 7 },
    ],
    lucia: [
      { label: 'SWIM Ice Drill Core', x: -11.5, z: -8.6, yaw: -2.4, dwellSeconds: 10 },
      { label: 'West Crater Survey', x: -6.4, z: -0.8, yaw: 1.2, dwellSeconds: 8 },
      { label: 'North CHAPEA Sensor', x: 4.4, z: -12.4, yaw: 0.0, dwellSeconds: 8 },
    ],
    rafi: [
      { label: 'O2 Tank 2 Manifold', x: 0.4, z: 1.4, yaw: 0.7, dwellSeconds: 9 },
      { label: 'Landing Pad Propellant', x: 12.4, z: 7.4, yaw: 0.8, dwellSeconds: 8 },
      { label: 'Radiation Shelter Valve', x: -1.5, z: -2.4, yaw: 1.0, dwellSeconds: 8 },
    ],
  },
  alarmSlots: {
    amara: { x: 1.1, z: 0.2, yaw: -0.6 },
    kenji: { x: -0.1, z: 0.8, yaw: -0.4 },
    lucia: { x: -0.9, z: -0.6, yaw: 0.5 },
    rafi: { x: 2.2, z: 0.9, yaw: -0.9 },
  },
  restSlots: {
    amara: { x: 4.1, z: -11.4, yaw: 0.1 },
    kenji: { x: 2.3, z: -11.4, yaw: -0.2 },
    lucia: { x: 6.1, z: -11.4, yaw: 0.25 },
    rafi: { x: 4.1, z: -13.0, yaw: 0.0 },
  },
  stationInteractCoords: {
    habitat: { x: 1.13, z: -1.53 },
    greenhouse: { x: 8.6, z: -0.1, yOffset: 0.22 },
    solar: { x: 11.4, z: -3.4 },
    rover: { x: 2.1, z: 3.25 },
    astronaut: { x: 4.95, z: 2.65 },
    'power-console': { x: 6.15, z: -0.35 },
    windmill: { x: -10.2, z: -7.8 },
    'ice-drill': { x: -14.5, z: -10.5 },
    'landing-pad': { x: 16.8, z: 9.2 },
  },
  landmarkFocusCoords: {
    habitat: { x: 4.4, z: -3.4, yOffset: 1.8 },
    greenhouse: { x: 8.6, z: -0.1, yOffset: 1.2 },
    solar: { x: 11.4, z: -3.4, yOffset: 1.4 },
    rover: { x: 2.1, z: 3.25, yOffset: 0.85 },
    astronaut: { x: 4.95, z: 2.65, yOffset: 1.1 },
    'power-console': { x: 6.15, z: -0.35, yOffset: 1.1 },
    windmill: { x: -10.2, z: -7.8, yOffset: 4.2 },
    'ice-drill': { x: -14.5, z: -10.5, yOffset: 1.8 },
    'landing-pad': { x: 16.8, z: 9.2, yOffset: 1.2 },
  },
  zoneCoords: {
    tank2: { x: 1.45, z: -0.85 },
    solar: { x: 9.8, z: -3.8 },
    recycler: { x: 6.65, z: -5.15 },
    greenhouse: { x: 8.6, z: -0.1 },
    shelter: { x: -0.35, z: -4.25 },
  },
  zoneNavNodes: {
    tank2: 'tank2',
    solar: 'solar_bay',
    recycler: 'c_east',
    greenhouse: 'gh_in',
    shelter: 'shelter',
  },
  destinationWaypoints: {
    airlock: { label: 'Habitat Airlock', nodeId: 'airlock', x: 1.5, z: -1.2 },
    greenhouse: { label: 'Greenhouse', nodeId: 'gh_door', x: 7.45, z: 1.72 },
    solar: { label: 'Solar Array', nodeId: 'solar_bay', x: 10.6, z: 0.6 },
    tank2: { label: 'Tank Farm', nodeId: 'tank2', x: 0.5, z: 1.2 },
    'rover-pad': { label: 'Rover Pad', nodeId: 'c_sw', x: -1.5, z: 5.6 },
    'landing-pad': { label: 'Landing Pad', nodeId: 'landing_pad', x: 12.2, z: 7.6 },
    shelter: { label: 'Rad Shelter', nodeId: 'shelter', x: -1.4, z: -2.6 },
    'comms-mast': { label: 'Weather Mast', nodeId: 'c_sw', x: -0.6, z: 1.4 },
    windmills: { label: 'Wind Field', nodeId: 'c_w', x: -6.2, z: 0.6 },
    'ice-drill': { label: 'Ice Drill', nodeId: 'ice_drill', x: -11.5, z: -8.6 },
    recycler: { label: 'Recycler', nodeId: 'c_east', x: 11.4, z: 3.2 },
    'power-console': { label: 'Power Console', nodeId: 'power_console', x: 5.1, z: 1.2 },
  },
};

/**
 * Spacious, Connected, Walkable Gameplay Outpost Config (~90 m x 90 m pad).
 * Built only when starting exploration/gameplay. Travel-time budgets strictly satisfied.
 */
export const GAMEPLAY_LAYOUT: OutpostLayoutConfig = {
  mode: 'gameplay',
  terrainSizeM: 180,
  terrainSegments: 128,
  flattenPadHalfM: 45,
  walkableCenter: { x: 0, z: 0 },
  walkableRadiusM: 48.0,
  modules: {
    habitat: { x: 0, z: 0, yaw: 0, deckRadius: 3.05, shellRadius: 2.48 },
    airlockOffset: {
      dx: 0,
      dz: 6.0,
      yawRad: 0,
      stepForward: 2.3, // door target at (0, 8.3)
      hasSuitVestibule: true,
    },
    chapea: {
      x: 0,
      z: -6.4,
      yaw: 0,
      plinthHalfX: 2.35,
      plinthHalfZ: 1.75,
      shellHalfX: 2.12,
      shellHalfZ: 1.52,
    },
    connHabChapea: {
      halfWidth: 0.62,
      halfHeight: 0.6,
      centerYOffset: 1.15,
      habStartOffsetZ: -2.4,
      chapeaEndOffsetZ: 1.45,
    },
    greenhouse: {
      x: 20.5,
      z: 1.5,
      floorRadius: 4.5,
      wallMidRadius: 4.35,
      wallThick: 0.18,
      wallHeight: 2.65,
      floorTopOffset: 0.22,
      doorAngleRad: 2.32, // SW EVA Plaza door facing East Ring Road
      doorHalfArcRad: 0.24, // clear chord width ~ 2 * 4.35 * sin(0.24) = 2.07 - mullions = ~1.48 m >= 1.25 m
      tunnelDoorAngleRad: Math.PI, // West pressurized skybridge collar attachment
      tunnelDoorHalfArcRad: 0.2,
      waterTankX: 25.4,
      waterTankZ: 0.1,
    },
    connHabGh: {
      elevatedOverpass: true,
      startX: 2.43,
      startYOffset: 3.15,
      startZ: 0.15,
      endX: 16.22,
      endYOffset: 3.15,
      endZ: 1.5,
      halfWidth: 0.56,
      halfHeight: 0.58,
      undersideClearanceY: 2.57, // >= 2.2 m clear underpass over East Ring Road (x = 11.4)
      pierXs: [8.4, 14.3],
    },
    powerConsole: { x: 2.8, z: 7.6, yaw: -0.45 },
    tank2: { x: -16.5, z: -5.5, yaw: 0.25, hasIsruUnit: true, isruOffsetX: -1.95, isruOffsetZ: -0.25 },
    recycler: { x: -8.5, z: -16.5, yaw: -0.25 },
    shelter: { x: 8.5, z: 20.0, yaw: -0.32 },
    solarPanels: [
      [15.0, -16.5],
      [19.0, -16.5],
      [23.0, -16.5],
      [15.0, -22.0],
      [19.0, -22.0],
      [23.0, -22.0],
    ],
    batteryBank: { x: 25.0, z: -19.2, yaw: -0.45 },
    windmills: [
      [-20.8, -13.8, 0.38],
      [-26.8, -6.0, 0.62],
    ],
    verticalTurbine: { x: -18.2, z: -20.2 },
    iceDrill: { x: -24.8, z: 4.5, yaw: 0.42 },
    landingPad: { x: 24.0, z: 19.5, apronRadius: 5.08, topOffset: 0.22 },
    roverPad: { x: -13.0, z: 14.5, widthM: 8.0, depthM: 8.0, topOffset: 0.12, enabled: true },
    commsMast: { x: 4.0, z: -15.6, radiusM: 0.85, tall: true },
    weatherMast: { x: 4.0, z: -15.6 },
    roverSpawn: { x: -12.6, z: 14.2, yaw: 0.82 },
    astroSpawn: { x: 0.0, z: 8.6, yaw: 0.92 },
  },
  pads: [
    {
      id: 'airlock-courtyard',
      label: 'HABITAT COURTYARD',
      shape: 'rect',
      x: 0.8,
      z: 9.0,
      halfX: 3.4,
      halfZ: 2.2,
      topOffsetM: 0.0,
    },
    {
      id: 'rover-pad',
      label: 'ROVER PAD',
      shape: 'rect',
      x: -13.0,
      z: 14.5,
      halfX: 4.0,
      halfZ: 4.0,
      topOffsetM: 0.12,
    },
    {
      id: 'landing-pad',
      label: 'LANDING PAD',
      shape: 'circle',
      x: 24.0,
      z: 19.5,
      radiusM: 5.08,
      topOffsetM: 0.22,
    },
  ],
  roads: [
    // Main 4.0 m Ring Road loop encircling core Habitat/CHAPEA/Airlock
    { id: 'ring-s-se', category: 'ring', x1: 0.0, z1: 11.4, x2: 7.8, z2: 9.2, widthM: 4.0 },
    { id: 'ring-se-e', category: 'ring', x1: 7.8, z1: 9.2, x2: 11.4, z2: 4.8, widthM: 4.0 },
    { id: 'ring-e-pass', category: 'ring', x1: 11.4, z1: 4.8, x2: 11.4, z2: 0.9, widthM: 4.0 },
    { id: 'ring-pass-ne', category: 'ring', x1: 11.4, z1: 0.9, x2: 11.4, z2: -6.5, widthM: 4.0 },
    { id: 'ring-ne-n', category: 'ring', x1: 11.4, z1: -6.5, x2: 4.0, z2: -11.6, widthM: 4.0 },
    { id: 'ring-n-nw', category: 'ring', x1: 4.0, z1: -11.6, x2: -7.4, z2: -12.0, widthM: 4.0 },
    { id: 'ring-nw-w', category: 'ring', x1: -7.4, z1: -12.0, x2: -11.6, z2: -4.5, widthM: 4.0 },
    { id: 'ring-w-sww', category: 'ring', x1: -11.6, z1: -4.5, x2: -11.6, z2: 3.8, widthM: 4.0 },
    { id: 'ring-sww-sw', category: 'ring', x1: -11.6, z1: 3.8, x2: -8.2, z2: 9.0, widthM: 4.0 },
    { id: 'ring-sw-s', category: 'ring', x1: -8.2, z1: 9.0, x2: 0.0, z2: 11.4, widthM: 4.0 },

    // Main Spoke Roads (3.8 m wide for EVA rover & heavy carts)
    { id: 'spoke-airlock', category: 'plaza', x1: 0.0, z1: 7.8, x2: 0.0, z2: 11.4, widthM: 4.2 },
    { id: 'spoke-rover-pad', category: 'spoke', x1: -8.2, z1: 9.0, x2: -10.8, z2: 13.4, widthM: 3.8 },
    { id: 'spoke-rover-court', category: 'spoke', x1: 0.0, z1: 11.4, x2: -10.8, z2: 13.4, widthM: 3.8 },
    { id: 'spoke-gh-plaza', category: 'spoke', x1: 11.4, z1: 4.8, x2: 17.3, z2: 4.9, widthM: 4.0 },
    { id: 'spoke-landing-pad', category: 'spoke', x1: 7.8, z1: 9.2, x2: 19.6, z2: 16.4, widthM: 3.8 },
    { id: 'spoke-solar-field', category: 'spoke', x1: 11.4, z1: -6.5, x2: 15.2, z2: -15.0, widthM: 3.8 },

    // Service Footpaths (1.8 m wide to secondary stations & outer rim)
    { id: 'path-power-console', category: 'footpath', x1: 0.0, z1: 8.3, x2: 2.4, z2: 8.2, widthM: 2.0 },
    { id: 'path-shelter', category: 'footpath', x1: 7.8, z1: 9.2, x2: 8.5, z2: 17.6, widthM: 1.8 },
    { id: 'path-shelter-direct', category: 'footpath', x1: 0.0, z1: 11.4, x2: 8.5, z2: 17.6, widthM: 1.8 },
    { id: 'path-gh-landing', category: 'footpath', x1: 17.3, z1: 4.9, x2: 19.6, z2: 16.4, widthM: 1.8 },
    { id: 'path-landing-shelter', category: 'footpath', x1: 19.6, z1: 16.4, x2: 8.5, z2: 17.6, widthM: 1.8 },
    { id: 'path-tank-farm', category: 'footpath', x1: -11.6, z1: -4.5, x2: -14.6, z2: -4.8, widthM: 2.0 },
    { id: 'path-ice-drill', category: 'footpath', x1: -11.6, z1: 3.8, x2: -22.4, z2: 4.5, widthM: 1.8 },
    { id: 'path-wind-field', category: 'footpath', x1: -11.6, z1: -4.5, x2: -19.2, z2: -12.4, widthM: 1.8 },
    { id: 'path-recycler', category: 'footpath', x1: -7.4, z1: -12.0, x2: -8.2, z2: -14.8, widthM: 1.8 },
    { id: 'path-comms-mast', category: 'footpath', x1: 4.0, z1: -11.6, x2: 4.0, z2: -13.6, widthM: 1.8 },
    { id: 'path-north-service', category: 'footpath', x1: 4.0, z1: -13.6, x2: 15.2, z2: -15.0, widthM: 1.8 },
    { id: 'path-nw-service', category: 'footpath', x1: 4.0, z1: -13.6, x2: -8.2, z2: -14.8, widthM: 1.8 },
  ],
  signposts: [
    { id: 'sign-habitat', title: 'HABITAT', subtitle: 'AIRLOCK 01', x: -3.4, z: 7.4, yawRad: 0.32 },
    { id: 'sign-greenhouse', title: 'GREENHOUSE', subtitle: 'BIO-DOME', x: 13.8, z: 7.5, yawRad: -0.65 },
    { id: 'sign-solar', title: 'SOLAR ARRAY', subtitle: '6x TRACKERS', x: 10.6, z: -12.8, yawRad: -0.55 },
    { id: 'sign-rover', title: 'ROVER PAD', subtitle: 'ROVER-7 BAY', x: -7.5, z: 15.8, yawRad: 0.72 },
    { id: 'sign-tank2', title: 'TANK FARM', subtitle: 'O2 + ISRU', x: -16.8, z: -7.6, yawRad: 1.2 },
    { id: 'sign-comms', title: 'COMMS MAST', subtitle: 'WEATHER ARRAY', x: 6.2, z: -15.8, yawRad: -0.15 },
    { id: 'sign-wind', title: 'WIND FIELD', subtitle: 'AEOLUS RIG', x: -18.2, z: -9.4, yawRad: 0.9 },
    { id: 'sign-landing', title: 'LANDING PAD', subtitle: 'CARGO APRON', x: 16.0, z: 18.2, yawRad: -0.82 },
    { id: 'sign-recycler', title: 'RECYCLER', subtitle: 'H2O LOOP', x: -5.8, z: -16.2, yawRad: 0.2 },
    { id: 'sign-shelter', title: 'RAD SHELTER', subtitle: 'WATER WALL', x: 6.4, z: 19.2, yawRad: -0.3 },
    { id: 'sign-ice', title: 'ICE DRILL', subtitle: 'SWIM CORE', x: -20.8, z: 6.2, yawRad: 1.35 },
  ],
  bollards: [
    { id: 'bol-01', x: -3.2, z: 14.5 },
    { id: 'bol-02', x: 3.4, z: 12.6 },
    { id: 'bol-03', x: 13.4, z: 8.8 },
    { id: 'bol-04', x: 8.6, z: 2.8 },
    { id: 'bol-05', x: 8.6, z: -1.8 },
    { id: 'bol-06', x: 13.8, z: 2.2 },
    { id: 'bol-07', x: 15.6, z: 2.4 },
    { id: 'bol-08', x: 15.4, z: -9.8 },
    { id: 'bol-09', x: 1.8, z: -15.2 },
    { id: 'bol-10', x: -11.4, z: -12.6 },
    { id: 'bol-11', x: -14.4, z: -1.8 },
    { id: 'bol-12', x: -14.2, z: 6.2 },
    { id: 'bol-13', x: -6.2, z: 14.6 },
    { id: 'bol-14', x: 13.0, z: 18.8 },
  ],
  utilityBridges: [
    // Low-profile bevelled cable ramp (< 0.14 m high) carrying power trunk cleanly across North Ring Road
    {
      id: 'cable-ramp-solar-north',
      kind: 'cable-ramp',
      x1: 11.4,
      z1: -6.5,
      x2: 4.0,
      z2: -11.6,
      clearanceY: 0.12,
      widthM: 4.2,
    },
    // Low-profile cable ramp feeding Tank Farm / West Ring
    {
      id: 'cable-ramp-west-isru',
      kind: 'cable-ramp',
      x1: -11.6,
      z1: -4.5,
      x2: -14.6,
      z2: -4.8,
      clearanceY: 0.12,
      widthM: 2.2,
    },
    // Raised O2/Water pipe bridge (>= 2.35 m clear height) spanning across East Greenhouse Spoke
    {
      id: 'pipe-bridge-east-gh',
      kind: 'pipe-bridge',
      x1: 13.8,
      z1: 2.6,
      x2: 13.8,
      z2: 7.0,
      clearanceY: 2.35,
      widthM: 0.65,
    },
  ],
  navNodes: [
    { id: 'door', x: 0.0, z: 8.3, label: 'Habitat Airlock Door' },
    { id: 'n_south', x: 0.0, z: 11.4, label: 'Airlock Courtyard' },
    { id: 'n_console', x: 2.4, z: 8.2, label: 'Power Console' },
    { id: 'n_r_se', x: 7.8, z: 9.2, label: 'SE Ring Junction' },
    { id: 'n_r_e', x: 11.4, z: 4.8, label: 'East Ring Plaza' },
    { id: 'n_r_e_pass', x: 11.4, z: 0.9, label: 'Skybridge Underpass' },
    { id: 'n_r_ne', x: 11.4, z: -6.5, label: 'NE Ring Junction' },
    { id: 'n_r_n', x: 4.0, z: -11.6, label: 'North Ring' },
    { id: 'n_r_nw', x: -7.4, z: -12.0, label: 'NW Ring Junction' },
    { id: 'n_r_w', x: -11.6, z: -4.5, label: 'West Ring Junction' },
    { id: 'n_r_sww', x: -11.6, z: 3.8, label: 'WSW Ring Junction' },
    { id: 'n_r_sw', x: -8.2, z: 9.0, label: 'SW Ring Junction' },
    { id: 'rover_pad', x: -10.8, z: 13.4, label: 'Rover Pad Edge' },
    { id: 'shelter', x: 8.5, z: 17.6, label: 'Radiation Shelter' },
    { id: 'landing_pad', x: 19.6, z: 16.4, label: 'Landing Pad Apron' },
    { id: 'gh_door', x: 17.3, z: 4.9, label: 'Greenhouse Plaza Door' },
    { id: 'gh_in', x: 20.5, z: 1.5, label: 'Greenhouse Interior Aisle' },
    { id: 'solar_bay', x: 15.2, z: -15.0, label: 'Solar Field Bay' },
    { id: 'comms_mast', x: 4.0, z: -13.6, label: 'Comms Mast' },
    { id: 'recycler', x: -8.2, z: -14.8, label: 'Water Recycler' },
    { id: 'wind_field', x: -19.2, z: -12.4, label: 'Wind Turbine Field' },
    { id: 'tank2', x: -14.6, z: -4.8, label: 'Tank Farm & ISRU' },
    { id: 'ice_drill', x: -22.4, z: 4.5, label: 'Ice Drill Rig' },
  ],
  navEdges: [
    ['door', 'n_south'],
    ['door', 'n_console'],
    ['n_south', 'n_r_se'],
    ['n_south', 'n_r_sw'],
    ['n_south', 'rover_pad'],
    ['n_south', 'shelter'],
    ['n_r_se', 'n_r_e'],
    ['n_r_se', 'shelter'],
    ['n_r_se', 'landing_pad'],
    ['n_r_e', 'gh_door'],
    ['n_r_e', 'n_r_e_pass'],
    ['gh_door', 'gh_in'],
    ['gh_door', 'landing_pad'],
    ['landing_pad', 'shelter'],
    ['n_r_e_pass', 'n_r_ne'],
    ['n_r_ne', 'solar_bay'],
    ['n_r_ne', 'n_r_n'],
    ['n_r_n', 'comms_mast'],
    ['n_r_n', 'n_r_nw'],
    ['comms_mast', 'solar_bay'],
    ['comms_mast', 'recycler'],
    ['n_r_nw', 'recycler'],
    ['n_r_nw', 'n_r_w'],
    ['n_r_w', 'tank2'],
    ['n_r_w', 'wind_field'],
    ['n_r_w', 'n_r_sww'],
    ['n_r_sww', 'ice_drill'],
    ['n_r_sww', 'n_r_sw'],
    ['n_r_sw', 'rover_pad'],
  ],
  crewStations: {
    amara: [
      { label: 'Greenhouse Orchard Bay', x: 20.5, z: 1.5, yaw: -0.7, dwellSeconds: 9 },
      { label: 'Greenhouse Plaza Entry', x: 17.3, z: 4.9, yaw: -2.2, dwellSeconds: 7 },
      { label: 'Airlock Medical Check', x: 0.4, z: 8.8, yaw: 3.1, dwellSeconds: 8 },
    ],
    kenji: [
      { label: 'Solar Array Tracking', x: 15.2, z: -15.0, yaw: 0.4, dwellSeconds: 8 },
      { label: 'Power Console Telemetry', x: 2.2, z: 8.2, yaw: 1.9, dwellSeconds: 7 },
      { label: 'Comms Mast Weather Bay', x: 4.0, z: -13.6, yaw: 3.1, dwellSeconds: 8 },
    ],
    lucia: [
      { label: 'Ice Drill Core Sample', x: -22.4, z: 4.5, yaw: -1.5, dwellSeconds: 10 },
      { label: 'Wind Turbine Survey', x: -19.2, z: -12.4, yaw: -0.9, dwellSeconds: 8 },
      { label: 'Rover Pad Diagnostics', x: -10.8, z: 13.4, yaw: -2.2, dwellSeconds: 8 },
    ],
    rafi: [
      { label: 'O2 Tank 2 + ISRU Valve', x: -14.6, z: -4.8, yaw: -1.3, dwellSeconds: 9 },
      { label: 'Water Recycler Bay', x: -8.2, z: -14.8, yaw: 3.0, dwellSeconds: 8 },
      { label: 'Landing Pad Propellant', x: 19.6, z: 16.4, yaw: 0.8, dwellSeconds: 8 },
    ],
  },
  alarmSlots: {
    amara: { x: -1.6, z: 8.6, yaw: -0.3 },
    kenji: { x: 1.5, z: 9.0, yaw: 0.2 },
    lucia: { x: -2.0, z: 10.6, yaw: -0.5 },
    rafi: { x: 2.1, z: 10.7, yaw: 0.4 },
  },
  restSlots: {
    amara: { x: -2.8, z: -10.8, yaw: 0.2 },
    kenji: { x: -0.8, z: -10.9, yaw: 0.0 },
    lucia: { x: 1.4, z: -10.9, yaw: -0.1 },
    rafi: { x: 3.4, z: -10.7, yaw: -0.2 },
  },
  stationInteractCoords: {
    habitat: { x: 0.0, z: 8.3 },
    greenhouse: { x: 20.5, z: 1.5, yOffset: 0.22 },
    solar: { x: 16.2, z: -15.6 },
    rover: { x: -12.6, z: 14.2, yOffset: 0.12 },
    astronaut: { x: 0.0, z: 8.6 },
    'power-console': { x: 2.8, z: 7.6 },
    windmill: { x: -20.8, z: -13.8 },
    'ice-drill': { x: -24.8, z: 4.5 },
    'landing-pad': { x: 24.0, z: 19.5, yOffset: 0.22 },
  },
  landmarkFocusCoords: {
    habitat: { x: 0, z: 0, yOffset: 1.8 },
    greenhouse: { x: 20.5, z: 1.5, yOffset: 1.5 },
    solar: { x: 19.0, z: -19.2, yOffset: 1.4 },
    rover: { x: -12.6, z: 14.2, yOffset: 0.95 },
    astronaut: { x: 0.0, z: 8.6, yOffset: 1.1 },
    'power-console': { x: 2.8, z: 7.6, yOffset: 1.1 },
    windmill: { x: -20.8, z: -13.8, yOffset: 4.2 },
    'ice-drill': { x: -24.8, z: 4.5, yOffset: 1.8 },
    'landing-pad': { x: 24.0, z: 19.5, yOffset: 1.2 },
  },
  zoneCoords: {
    tank2: { x: -16.5, z: -5.5 },
    solar: { x: 16.0, z: -15.8 },
    recycler: { x: -8.5, z: -16.5 },
    greenhouse: { x: 20.5, z: 1.5, yOffset: 0.22 },
    shelter: { x: 8.5, z: 20.0 },
  },
  zoneNavNodes: {
    tank2: 'tank2',
    solar: 'solar_bay',
    recycler: 'recycler',
    greenhouse: 'gh_door',
    shelter: 'shelter',
  },
  destinationWaypoints: {
    airlock: { label: 'Habitat Airlock', nodeId: 'door', x: 0.0, z: 8.3 },
    greenhouse: { label: 'Greenhouse', nodeId: 'gh_door', x: 17.3, z: 4.9 },
    solar: { label: 'Solar Array', nodeId: 'solar_bay', x: 15.2, z: -15.0 },
    tank2: { label: 'Tank Farm', nodeId: 'tank2', x: -14.6, z: -4.8 },
    'rover-pad': { label: 'Rover Pad', nodeId: 'rover_pad', x: -10.8, z: 13.4 },
    'landing-pad': { label: 'Landing Pad', nodeId: 'landing_pad', x: 19.6, z: 16.4 },
    shelter: { label: 'Rad Shelter', nodeId: 'shelter', x: 8.5, z: 17.6 },
    'comms-mast': { label: 'Comms Mast', nodeId: 'comms_mast', x: 4.0, z: -13.6 },
    windmills: { label: 'Wind Field', nodeId: 'wind_field', x: -19.2, z: -12.4 },
    'ice-drill': { label: 'Ice Drill', nodeId: 'ice_drill', x: -22.4, z: 4.5 },
    recycler: { label: 'Recycler', nodeId: 'recycler', x: -8.2, z: -14.8 },
    'power-console': { label: 'Power Console', nodeId: 'n_console', x: 2.4, z: 8.2 },
  },
};

/** Default backwards-compatible export matching SHOWCASE_LAYOUT */
export const OUTPOST_MODULES = SHOWCASE_LAYOUT.modules;

export function getOutpostLayout(mode: OutpostLayoutMode = 'showcase'): OutpostLayoutConfig {
  return mode === 'gameplay' ? GAMEPLAY_LAYOUT : SHOWCASE_LAYOUT;
}

export function getAirlockWorldPose(layout: OutpostLayoutConfig = SHOWCASE_LAYOUT): {
  x: number;
  z: number;
  yawRad: number;
  stepX: number;
  stepZ: number;
} {
  const m = layout.modules;
  const x = m.habitat.x + m.airlockOffset.dx;
  const z = m.habitat.z + m.airlockOffset.dz;
  const yawRad = m.airlockOffset.yawRad;
  return {
    x,
    z,
    yawRad,
    stepX: x + Math.sin(yawRad) * m.airlockOffset.stepForward,
    stepZ: z + Math.cos(yawRad) * m.airlockOffset.stepForward,
  };
}

export function getGreenhouseDoorwaySpec(layout: OutpostLayoutConfig = SHOWCASE_LAYOUT): {
  centerX: number;
  centerZ: number;
  yawRad: number;
  clearWidthM: number;
  thresholdX: number;
  thresholdZ: number;
  interiorX: number;
  interiorZ: number;
} {
  const gh = layout.modules.greenhouse;
  const ux = Math.cos(gh.doorAngleRad);
  const uz = Math.sin(gh.doorAngleRad);
  const centerX = gh.x + ux * gh.wallMidRadius;
  const centerZ = gh.z + uz * gh.wallMidRadius;
  const chordClearWidthM =
    2 * gh.wallMidRadius * Math.sin(gh.doorHalfArcRad) - gh.wallThick * 0.45;
  return {
    centerX,
    centerZ,
    yawRad: -gh.doorAngleRad + Math.PI / 2,
    clearWidthM: Number(chordClearWidthM.toFixed(3)),
    thresholdX: gh.x + ux * (gh.floorRadius + 0.65),
    thresholdZ: gh.z + uz * (gh.floorRadius + 0.65),
    interiorX: gh.x + ux * 0.12,
    interiorZ: gh.z + uz * 0.12,
  };
}

export interface GreenhouseWallBaySpec {
  id: string;
  cx: number;
  cz: number;
  yawRad: number;
  halfWidth: number;
  halfHeight: number;
  halfThick: number;
}

function circularAngleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/**
 * Generates segmented wall panels around the Bio-Dome Greenhouse perimeter, leaving
 * clean open doorway(s) (>= 1.25 m wide) aligned identically between Three.js & Rapier.
 */
export function getGreenhouseWallSegments(
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): GreenhouseWallBaySpec[] {
  const gh = layout.modules.greenhouse;
  const bayCount = layout.mode === 'gameplay' ? 20 : 12;
  const step = (Math.PI * 2) / bayCount;
  const bayHalfW = gh.wallMidRadius * Math.tan(step * 0.5) + 0.015;
  const segs: GreenhouseWallBaySpec[] = [];

  for (let i = 0; i < bayCount; i++) {
    const a = i * step;
    if (circularAngleDiff(a, gh.doorAngleRad) < gh.doorHalfArcRad) {
      continue;
    }
    if (
      gh.tunnelDoorAngleRad !== null &&
      circularAngleDiff(a, gh.tunnelDoorAngleRad) < gh.tunnelDoorHalfArcRad
    ) {
      continue;
    }
    segs.push({
      id: `gh-wall-${i}`,
      cx: gh.x + Math.cos(a) * gh.wallMidRadius,
      cz: gh.z + Math.sin(a) * gh.wallMidRadius,
      yawRad: -a + Math.PI / 2,
      halfWidth: bayHalfW,
      halfHeight: gh.wallHeight * 0.5,
      halfThick: gh.wallThick * 0.5,
    });
  }
  return segs;
}

/** Computes exact world-space center, length, and quaternion aligning a pressurized corridor between two 3D joints. */
export function computeCorridorTransform(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): {
  cx: number;
  cy: number;
  cz: number;
  length: number;
  quaternion: { x: number; y: number; z: number; w: number };
} {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.max(0.05, Math.hypot(dx, dy, dz));
  const ux = dx / len;
  const uy = dy / len;
  const uz = dz / len;

  // Shortest-arc quaternion rotating +Z (0,0,1) onto (ux, uy, uz)
  const dot = uz;
  let qx = 0;
  let qy = 0;
  let qz = 0;
  let qw = 1;
  if (dot < -0.999999) {
    qx = 0;
    qy = 1;
    qz = 0;
    qw = 0;
  } else {
    qx = -uy;
    qy = ux;
    qz = 0;
    qw = 1 + dot;
    const inv = 1 / Math.hypot(qx, qy, qz, qw);
    qx *= inv;
    qy *= inv;
    qz *= inv;
    qw *= inv;
  }

  return {
    cx: (ax + bx) * 0.5,
    cy: (ay + by) * 0.5,
    cz: (az + bz) * 0.5,
    length: len,
    quaternion: { x: qx, y: qy, z: qz, w: qw },
  };
}

/** Minimum distance from point (px, pz) to finite segment (x1, z1)-(x2, z2) */
export function pointToSegmentDistSq(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
): number {
  const vx = x2 - x1;
  const vz = z2 - z1;
  const wx = px - x1;
  const wz = pz - z1;
  const lenSq = vx * vx + vz * vz;
  if (lenSq < 1e-8) return wx * wx + wz * wz;
  const t = Math.max(0, Math.min(1, (wx * vx + wz * vz) / lenSq));
  const cx = x1 + t * vx;
  const cz = z1 + t * vz;
  const dx = px - cx;
  const dz = pz - cz;
  return dx * dx + dz * dz;
}

/** Minimum unsigned distance from (x, z) to any gameplay road/footpath centerline */
export function distanceToNearestRoadCenterline(
  x: number,
  z: number,
  layout: OutpostLayoutConfig = GAMEPLAY_LAYOUT,
): number {
  if (layout.roads.length === 0) return Infinity;
  let minSq = Infinity;
  for (const seg of layout.roads) {
    const dSq = pointToSegmentDistSq(x, z, seg.x1, seg.z1, seg.x2, seg.z2);
    if (dSq < minSq) minSq = dSq;
  }
  return Math.sqrt(minSq);
}

/** True when (x, z) lies inside a compact paved road corridor or landing/rover pad */
export function isOnPavedSurface(
  x: number,
  z: number,
  layout: OutpostLayoutConfig = GAMEPLAY_LAYOUT,
): boolean {
  for (const pad of layout.pads) {
    if (pad.shape === 'circle' && pad.radiusM) {
      if (Math.hypot(x - pad.x, z - pad.z) <= pad.radiusM + 0.1) return true;
    } else if (pad.shape === 'rect' && pad.halfX && pad.halfZ) {
      if (
        Math.abs(x - pad.x) <= pad.halfX + 0.1 &&
        Math.abs(z - pad.z) <= pad.halfZ + 0.1
      ) {
        return true;
      }
    }
  }
  for (const seg of layout.roads) {
    const halfW = seg.widthM * 0.5;
    if (pointToSegmentDistSq(x, z, seg.x1, seg.z1, seg.x2, seg.z2) <= halfW * halfW) {
      return true;
    }
  }
  return false;
}

/**
 * Computes authoritative top support Y surface at (x, z) across ground + walkable pads
 * (Landing Pad +0.22 m, Rover Pad +0.12 m, Greenhouse deck +0.22 m).
 */
export function getOutpostSupportHeightAt(
  x: number,
  z: number,
  groundAt: (px: number, pz: number) => number,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): number {
  let y = groundAt(x, z);
  const { landingPad, roverPad, greenhouse } = layout.modules;

  // Ares Heavy Landing Pad (+0.22 m)
  if (Math.hypot(x - landingPad.x, z - landingPad.z) <= landingPad.apronRadius) {
    y = Math.max(y, groundAt(landingPad.x, landingPad.z) + landingPad.topOffset);
  }

  // Rover Parking & Charging Pad (+0.12 m in gameplay)
  if (roverPad.enabled) {
    const hw = roverPad.widthM * 0.5;
    const hd = roverPad.depthM * 0.5;
    if (Math.abs(x - roverPad.x) <= hw && Math.abs(z - roverPad.z) <= hd) {
      y = Math.max(y, groundAt(roverPad.x, roverPad.z) + roverPad.topOffset);
    }
  }

  // Greenhouse Walkable Deck (+0.22 m)
  if (Math.hypot(x - greenhouse.x, z - greenhouse.z) <= greenhouse.floorRadius) {
    y = Math.max(y, groundAt(greenhouse.x, greenhouse.z) + greenhouse.floorTopOffset);
  }

  return y;
}

/** Shortest road-corridor Dijkstra path across any layout's navNodes & navEdges */
export function computeLayoutNavPath(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): Array<{ x: number; z: number }> {
  const directDist = Math.hypot(toX - fromX, toZ - fromZ);
  if (directDist < 3.6 || layout.navNodes.length === 0) {
    return [{ x: toX, z: toZ }];
  }

  const nodes = layout.navNodes;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map<string, Array<{ id: string; w: number }>>();
  for (const n of nodes) adj.set(n.id, []);
  for (const [aId, bId] of layout.navEdges) {
    const a = nodeMap.get(aId);
    const b = nodeMap.get(bId);
    if (!a || !b) continue;
    const w = Math.hypot(b.x - a.x, b.z - a.z);
    adj.get(aId)!.push({ id: bId, w });
    adj.get(bId)!.push({ id: aId, w });
  }

  let startNodeId = nodes[0].id;
  let goalNodeId = nodes[0].id;
  let bestStart = Infinity;
  let bestGoal = Infinity;
  for (const n of nodes) {
    const ds = Math.hypot(n.x - fromX, n.z - fromZ);
    const dg = Math.hypot(n.x - toX, n.z - toZ);
    if (ds < bestStart) {
      bestStart = ds;
      startNodeId = n.id;
    }
    if (dg < bestGoal) {
      bestGoal = dg;
      goalNodeId = n.id;
    }
  }

  if (startNodeId === goalNodeId) {
    return [{ x: toX, z: toZ }];
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const unvisited = new Set<string>(nodes.map((n) => n.id));
  for (const n of nodes) {
    dist.set(n.id, Infinity);
    prev.set(n.id, null);
  }
  dist.set(startNodeId, 0);

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
    if (!cur || curD === Infinity || cur === goalNodeId) break;
    unvisited.delete(cur);
    for (const nb of adj.get(cur) ?? []) {
      if (!unvisited.has(nb.id)) continue;
      const alt = curD + nb.w;
      if (alt < dist.get(nb.id)!) {
        dist.set(nb.id, alt);
        prev.set(nb.id, cur);
      }
    }
  }

  const seq: Array<{ x: number; z: number }> = [];
  let trace: string | null = goalNodeId;
  while (trace) {
    const n = nodeMap.get(trace);
    if (n) seq.unshift({ x: n.x, z: n.z });
    trace = prev.get(trace) ?? null;
  }

  if (seq.length > 0 && Math.hypot(seq[0].x - fromX, seq[0].z - fromZ) < 1.1) {
    seq.shift();
  }
  const last = seq[seq.length - 1];
  if (!last || Math.hypot(last.x - toX, last.z - toZ) > 0.45) {
    seq.push({ x: toX, z: toZ });
  }
  return seq.length > 0 ? seq : [{ x: toX, z: toZ }];
}

/** Computes exact road-graph path distance between two node coordinates */
export function computeGraphPathDistanceM(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  layout: OutpostLayoutConfig,
): number {
  const pts = computeLayoutNavPath(fromX, fromZ, toX, toZ, layout);
  let total = 0;
  let cx = fromX;
  let cz = fromZ;
  for (const p of pts) {
    total += Math.hypot(p.x - cx, p.z - cz);
    cx = p.x;
    cz = p.z;
  }
  return total;
}

export interface TravelMatrixEntry {
  id: string;
  label: string;
  pathDistanceM: number;
  walkSec: number;
  lopeSec: number;
  quickWalkSec: number;
  passBudget: boolean;
}

export interface AdjacentHopEntry {
  fromId: string;
  toId: string;
  pathDistanceM: number;
  walkSec: number;
  lopeSec: number;
  quickWalkSec: number;
  passBudget: boolean;
}

export interface TravelAuditReport {
  fromAirlock: TravelMatrixEntry[];
  adjacentHops: AdjacentHopEntry[];
  fullTour: {
    stops: string[];
    totalDistanceM: number;
    walkSec: number;
    walkMin: number;
    lopeSec: number;
    quickWalkSec: number;
    passBudget: boolean;
  };
  maxFromAirlockM: number;
  maxAdjacentHopM: number;
  allBudgetsPass: boolean;
}

/**
 * Verifies every Travel-Time Budget rule using the immutable Froude constants in src/sim/constants.ts:
 * - Every primary destination <= 40 m path length from airlock door
 * - Neighbouring destinations along base perimeter <= 30 m apart
 * - Full tour (airlock -> greenhouse -> solar -> tank farm -> rover pad -> airlock) <= 3.5 min (210 s) walking
 */
export function computeTravelTimeMatrix(
  layout: OutpostLayoutConfig = GAMEPLAY_LAYOUT,
): TravelAuditReport {
  const walkSpeed = PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS; // 0.863 m/s
  const lopeSpeed = PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS; // 2.65 m/s
  const quickWalkSpeed = walkSpeed * PHYSICS_CONSTANTS.QUICK_MODE_SPEED_MULT; // 1.208 m/s

  const door = layout.destinationWaypoints.airlock;
  const primaryIds = [
    'power-console',
    'rover-pad',
    'shelter',
    'greenhouse',
    'landing-pad',
    'ice-drill',
    'tank2',
    'windmills',
    'recycler',
    'solar',
    'comms-mast',
  ] as const;

  const fromAirlock: TravelMatrixEntry[] = primaryIds.map((id) => {
    const wp = layout.destinationWaypoints[id];
    const d = computeGraphPathDistanceM(door.x, door.z, wp.x, wp.z, layout);
    return {
      id,
      label: wp.label,
      pathDistanceM: Number(d.toFixed(2)),
      walkSec: Number((d / walkSpeed).toFixed(1)),
      lopeSec: Number((d / lopeSpeed).toFixed(1)),
      quickWalkSec: Number((d / quickWalkSpeed).toFixed(1)),
      passBudget: d <= 40.0 + 1e-6,
    };
  });

  // Adjacent perimeter neighbour chain around the outpost loop
  const adjPairs: Array<[keyof OutpostLayoutConfig['destinationWaypoints'], keyof OutpostLayoutConfig['destinationWaypoints']]> = [
    ['airlock', 'rover-pad'],
    ['rover-pad', 'ice-drill'],
    ['ice-drill', 'tank2'],
    ['tank2', 'windmills'],
    ['windmills', 'recycler'],
    ['recycler', 'comms-mast'],
    ['comms-mast', 'solar'],
    ['solar', 'greenhouse'],
    ['greenhouse', 'landing-pad'],
    ['landing-pad', 'shelter'],
    ['shelter', 'airlock'],
  ];

  const adjacentHops: AdjacentHopEntry[] = adjPairs.map(([fromId, toId]) => {
    const a = layout.destinationWaypoints[fromId];
    const b = layout.destinationWaypoints[toId];
    const d = computeGraphPathDistanceM(a.x, a.z, b.x, b.z, layout);
    return {
      fromId: a.label,
      toId: b.label,
      pathDistanceM: Number(d.toFixed(2)),
      walkSec: Number((d / walkSpeed).toFixed(1)),
      lopeSec: Number((d / lopeSpeed).toFixed(1)),
      quickWalkSec: Number((d / quickWalkSpeed).toFixed(1)),
      passBudget: d <= 30.0 + 1e-6,
    };
  });

  // 5-stop Grand Tour: airlock -> greenhouse -> solar -> tank farm -> rover pad -> airlock
  const tourStops: Array<keyof OutpostLayoutConfig['destinationWaypoints']> = [
    'airlock',
    'greenhouse',
    'solar',
    'tank2',
    'rover-pad',
    'airlock',
  ];
  let tourDist = 0;
  for (let i = 0; i < tourStops.length - 1; i++) {
    const a = layout.destinationWaypoints[tourStops[i]];
    const b = layout.destinationWaypoints[tourStops[i + 1]];
    tourDist += computeGraphPathDistanceM(a.x, a.z, b.x, b.z, layout);
  }
  const tourWalkSec = tourDist / walkSpeed;
  const maxFromAirlockM = Math.max(...fromAirlock.map((r) => r.pathDistanceM));
  const maxAdjacentHopM = Math.max(...adjacentHops.map((r) => r.pathDistanceM));

  const fullTour = {
    stops: tourStops.map((k) => layout.destinationWaypoints[k].label),
    totalDistanceM: Number(tourDist.toFixed(2)),
    walkSec: Number(tourWalkSec.toFixed(1)),
    walkMin: Number((tourWalkSec / 60).toFixed(2)),
    lopeSec: Number((tourDist / lopeSpeed).toFixed(1)),
    quickWalkSec: Number((tourDist / quickWalkSpeed).toFixed(1)),
    passBudget: tourWalkSec <= 210.0, // <= 3.5 minutes
  };

  const allBudgetsPass =
    fromAirlock.every((r) => r.passBudget) &&
    adjacentHops.every((r) => r.passBudget) &&
    fullTour.passBudget;

  return {
    fromAirlock,
    adjacentHops,
    fullTour,
    maxFromAirlockM,
    maxAdjacentHopM,
    allBudgetsPass,
  };
}

/** Formats ASCII/CSV-ready Travel-Time Matrix string for Verification Report */
export function formatTravelTimeMatrixReport(report: TravelAuditReport): string {
  const lines: string[] = [];
  lines.push('Destination from Airlock     | Path (m) | Walk (s) | Lope (s) | Quick (s) | <=40m');
  lines.push('-----------------------------|----------|----------|----------|-----------|------');
  for (const r of report.fromAirlock) {
    lines.push(
      `${r.label.padEnd(28)} | ${String(r.pathDistanceM).padStart(8)} | ${String(r.walkSec).padStart(8)} | ${String(r.lopeSec).padStart(8)} | ${String(r.quickWalkSec).padStart(9)} | ${r.passBudget ? 'PASS' : 'FAIL'}`,
    );
  }
  lines.push('');
  lines.push('Adjacent Neighbours          | Path (m) | Walk (s) | <=30m');
  lines.push('-----------------------------|----------|----------|------');
  for (const h of report.adjacentHops) {
    lines.push(
      `${`${h.fromId} -> ${h.toId}`.slice(0, 28).padEnd(28)} | ${String(h.pathDistanceM).padStart(8)} | ${String(h.walkSec).padStart(8)} | ${h.passBudget ? 'PASS' : 'FAIL'}`,
    );
  }
  lines.push('');
  lines.push(
    `Full Tour (${report.fullTour.stops.join(' -> ')}): ${report.fullTour.totalDistanceM}m | Walk ${report.fullTour.walkSec}s (${report.fullTour.walkMin} min <= 3.5 min) | Lope ${report.fullTour.lopeSec}s | Quick ${report.fullTour.quickWalkSec}s -> ${report.fullTour.passBudget ? 'PASS' : 'FAIL'}`,
  );
  return lines.join('\n');
}

/** Rotates local horizontal (x, z) offset by yawRad (matching Three.js Y rotation and Rapier yawToQuat) */
export function rotateXZ(x: number, z: number, yawRad: number): [number, number] {
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  return [x * c + z * s, -x * s + z * c];
}

export const SHOWCASE_CRATES: ReadonlyArray<{ x: number; z: number; yaw: number }> = [
  { x: 0.35, z: -2.15, yaw: 0.3 },
  { x: -0.15, z: -1.75, yaw: -0.4 },
];

export const OUTPOST_NAV_NODES = SHOWCASE_LAYOUT.navNodes;
export const OUTPOST_NAV_EDGES = SHOWCASE_LAYOUT.navEdges;

export const OUTPOST_CREW_STATIONS: Record<
  CrewMemberId,
  { stations: Array<{ x: number; z: number; label: string }>; yaw: number }
> = {
  amara: {
    stations: SHOWCASE_LAYOUT.crewStations.amara.map(({ x, z, label }) => ({ x, z, label })),
    yaw: SHOWCASE_LAYOUT.crewStations.amara[0].yaw,
  },
  kenji: {
    stations: SHOWCASE_LAYOUT.crewStations.kenji.map(({ x, z, label }) => ({ x, z, label })),
    yaw: SHOWCASE_LAYOUT.crewStations.kenji[0].yaw,
  },
  lucia: {
    stations: SHOWCASE_LAYOUT.crewStations.lucia.map(({ x, z, label }) => ({ x, z, label })),
    yaw: SHOWCASE_LAYOUT.crewStations.lucia[0].yaw,
  },
  rafi: {
    stations: SHOWCASE_LAYOUT.crewStations.rafi.map(({ x, z, label }) => ({ x, z, label })),
    yaw: SHOWCASE_LAYOUT.crewStations.rafi[0].yaw,
  },
};

export const OUTPOST_ALARM_SLOTS = SHOWCASE_LAYOUT.alarmSlots;
export const OUTPOST_REST_SLOTS = SHOWCASE_LAYOUT.restSlots;

export interface GreenhouseBotanicalPropSpec {
  id: string;
  kind: 'orchard-tree' | 'led-rack' | 'planter' | 'mist-tower' | 'workbench';
  /** Offset from greenhouse center X (meters) */
  dx: number;
  /** Offset from greenhouse center Z (meters) */
  dz: number;
  yawRad: number;
  colliderShape: 'cylinder' | 'cuboid';
  radius?: number;
  hx?: number;
  hz?: number;
  height: number;
  label: string;
}

/**
 * Botanical props for the expanded r=4.5m GAMEPLAY_LAYOUT Bio-Dome.
 * Placed around perimeter bays so the >=1.25m SW-doorway -> center aisle stays clear.
 */
export const GAMEPLAY_GREENHOUSE_PROPS: ReadonlyArray<GreenhouseBotanicalPropSpec> = [
  {
    id: 'gh-tree-citrus',
    kind: 'orchard-tree',
    dx: -1.35,
    dz: -2.4,
    yawRad: 0.35,
    colliderShape: 'cylinder',
    radius: 0.56,
    height: 1.95,
    label: 'Dwarf Citrus Tree',
  },
  {
    id: 'gh-tree-apple',
    kind: 'orchard-tree',
    dx: 1.95,
    dz: -2.0,
    yawRad: -0.45,
    colliderShape: 'cylinder',
    radius: 0.56,
    height: 2.05,
    label: 'Dwarf Apple Tree',
  },
  {
    id: 'gh-led-rack-east',
    kind: 'led-rack',
    dx: 2.65,
    dz: 0.45,
    yawRad: -1.42,
    colliderShape: 'cuboid',
    hx: 0.92,
    hz: 0.4,
    height: 1.88,
    label: 'Multi-Tier LED Rack A',
  },
  {
    id: 'gh-led-rack-se',
    kind: 'led-rack',
    dx: 1.3,
    dz: 2.7,
    yawRad: 2.62,
    colliderShape: 'cuboid',
    hx: 0.92,
    hz: 0.4,
    height: 1.88,
    label: 'Multi-Tier LED Rack B',
  },
  {
    id: 'gh-planter-tomato',
    kind: 'planter',
    dx: -2.65,
    dz: -0.95,
    yawRad: 1.55,
    colliderShape: 'cuboid',
    hx: 0.74,
    hz: 0.38,
    height: 1.15,
    label: 'Hydroponic Tomato Bed',
  },
  {
    id: 'gh-planter-pepper',
    kind: 'planter',
    dx: -0.85,
    dz: 2.9,
    yawRad: -0.32,
    colliderShape: 'cuboid',
    hx: 0.74,
    hz: 0.38,
    height: 1.05,
    label: 'Pepper & Herb Planter',
  },
  {
    id: 'gh-mist-tower',
    kind: 'mist-tower',
    dx: 0.35,
    dz: -2.78,
    yawRad: 0,
    colliderShape: 'cylinder',
    radius: 0.42,
    height: 1.92,
    label: 'Aeroponic Mist Tower',
  },
  {
    id: 'gh-workbench',
    kind: 'workbench',
    dx: 2.92,
    dz: 2.05,
    yawRad: -0.78,
    colliderShape: 'cuboid',
    hx: 0.62,
    hz: 0.36,
    height: 0.96,
    label: 'Botany Soil Workbench',
  },
];

void CREW_PROFILES;

