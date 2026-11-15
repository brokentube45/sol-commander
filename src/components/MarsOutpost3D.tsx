import { MutableRefObject, memo, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  GamePhase,
  OutpostLandmarkId,
  PROLOGUE_DURATION_SEC,
  PowerAllocation,
} from '../data/missionData';
import { CrewMemberId, MARS_FACTS, PHYSICS_CONSTANTS } from '../sim/constants';
import { GRAVITY_CRYSTAL_SPOTS, TutorialStepId } from '../sim/juniorData';
import {
  CrewAgentState,
  CrewInspectCardData,
  RoverControllerState,
  createInitialCrewAgents,
  createInitialRoverController,
  getCrewInspectInfo,
  stepCrewAgents,
  stepRoverController,
} from '../sim/crewAndRoverSim';
import {
  GAMEPLAY_LAYOUT,
  OutpostLayoutConfig,
  OutpostLayoutMode,
  SHOWCASE_LAYOUT,
  isOnPavedSurface,
} from '../sim/outpostLayout';
import { getSoftSandFactorAt, groundHeightAt } from '../sim/terrainField';
import { buildMarsEnvironment } from '../three/marsEnvironment';
import { buildOutpostAssets } from '../three/outpostAssets';
import { MartianStormShader } from '../three/martianStormShader';
import {
  createFootprintDecalTexture,
  createRoverTrackDecalTexture,
} from '../three/proceduralTextures';
import { MarsPhysicsWorld } from '../sim/rapierWorld';
import { GameplayPoseTelemetry } from './WristMapModal';

import { MissionZoneId } from '../sim/missionsData';
import { RoverMood } from '../sim/roverData';
import { CrewMemberState, WeatherEventKind } from '../sim/simEngine';
import {
  ActiveObjective,
  computePathGuideState,
} from '../sim/activeObjective';
import {
  MarsEnvironmentSnapshot,
  MarsJumpTelemetry,
  computeDiurnalMarsWeather,
  computeFreeFallMetrics,
  computeJumpTelemetry,
  computeLocalMarsGravity,
} from '../sim/marsPhysics';
import { OutpostAudioZone, soundEngine } from '../utils/soundEngine';
import {
  CREW_PROFILES,
} from '../sim/constants';
import {
  DebugOverlayKey,
  MarsDebugOverlayManager,
  MovementFrameSample,
  runLiveDiagnosticsSelfTest,
} from '../debug/diagnostics';
import { SelfTestReport, computeModuleAABBs, measurePairwiseSeamGaps } from '../debug/outpostAudit';

export type GraphicsQuality = 'high' | 'low';
export type CursorUnlockKey = 'Alt' | 'KeyK' | 'Backquote';

export interface GameplayInputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint?: boolean;
  lookX: number;
  lookY?: number;
  analogX?: number;
  analogY?: number;
  jumpRequested?: boolean;
}

export interface LandingTelemetrySummary {
  impactMs: number;
  fallHeightM: number;
  marsHangOrFallS: number;
  earthHangOrFallS: number;
  apexM: number;
  earthApexM: number;
  isJump: boolean;
}

export interface SimVisualState {
  activeZoneId: MissionZoneId;
  dustFactor: number;
  panelsDusty: boolean;
  tank2LeakActive: boolean;
  greenhouseFrost: boolean;
  recyclerDegraded: boolean;
  roverName: string;
  roverMood: RoverMood;
  roverDamaged: boolean;
  commandModeOpen: boolean;
  mapOpen?: boolean;
  quickMenuOpen?: boolean;
  cameraMode: '3p' | '1p';
  radiationAlert: boolean;
  showGravityCrystals?: boolean;
  collectedCrystalIds?: string[];
  sol?: number;
  dustTau?: number;
  activeWxWindMs?: number;
  guidanceStage?: 0 | 1 | 2 | 3;
  activeObjective?: ActiveObjective;
  guideEnabled?: boolean;
  crew?: CrewMemberState[];
  weatherEvent: {
    active: boolean;
    kind: WeatherEventKind;
    x: number;
    z: number;
  } | null;
}

interface MarsOutpost3DProps {
  gamePhase: GamePhase;
  selectedLandmark: OutpostLandmarkId | null;
  onSelectLandmark: (id: OutpostLandmarkId | null) => void;
  prologueElapsed: number;
  tutorialStep: TutorialStepId;
  powerAllocation: PowerAllocation;
  simVisuals?: SimVisualState;
  paused?: boolean;
  quickMode?: boolean;
  mouseSensitivity?: number;
  cursorUnlockKey?: CursorUnlockKey;
  onCursorUnlockedChange?: (unlocked: boolean) => void;
  canvasElRef?: MutableRefObject<HTMLCanvasElement | null>;
  onPointerLockChange?: (locked: boolean) => void;
  onPauseRequested?: () => void;
  onToggleCameraMode?: () => void;
  onNearbyZoneChange?: (zoneId: MissionZoneId | null) => void;
  onInteractZone?: (zoneId: MissionZoneId) => void;
  onShelterReached?: () => void;
  onHabitatDistanceChange?: (meters: number) => void;
  onPhysicsUpdate?: (snapshot: MarsEnvironmentSnapshot) => void;
  onPoseTelemetry?: (telemetry: GameplayPoseTelemetry) => void;
  onTutorialMoveDone: () => void;
  onTutorialLookDone: () => void;
  onCrystalCollected?: (crystalId: string) => void;
  onNearbyStationChange: (stationId: OutpostLandmarkId | null) => void;
  onInteractStation: (stationId: OutpostLandmarkId) => void;
  onEngineReady?: () => void;
  onNearbyCrewChange?: (crewId: CrewMemberId | null) => void;
  onInteractCrew?: (crew: CrewInspectCardData) => void;
  onLandingTelemetry?: (summary: LandingTelemetrySummary) => void;
  onRoverTiltAlert?: (warning: boolean, tiltDeg: number) => void;
  onToggleLens?: () => void;
  onToggleMap?: () => void;
  onAudioZoneChange?: (zone: OutpostAudioZone) => void;
  onRoverMakeWay?: () => void;
  moveInputRef?: MutableRefObject<GameplayInputState>;
  reducedMotion: boolean;
  quality: GraphicsQuality;
  debugMode?: boolean;
  onDebugForcePhase?: (phase: GamePhase) => void;
}

const CAMERA_PRESETS: Record<
  'overview' | OutpostLandmarkId,
  { pos: [number, number, number]; look: [number, number, number] }
> = {
  overview: {
    pos: [-3.2, 3.55, 13.6],
    look: [3.4, 1.45, -0.8],
  },
  habitat: {
    pos: [-0.9, 2.85, 2.8],
    look: [4.1, 1.65, -3.2],
  },
  greenhouse: {
    pos: [4.2, 2.45, 5.2],
    look: [8.6, 1.15, -0.1],
  },
  rover: {
    pos: [-0.85, 1.72, 6.2],
    look: [2.15, 0.78, 3.25],
  },
  solar: {
    pos: [5.4, 3.05, 1.8],
    look: [10.4, 1.45, -3.5],
  },
  astronaut: {
    pos: [3.2, 1.72, 5.85],
    look: [5.45, 1.08, 2.65],
  },
  'power-console': {
    pos: [4.1, 2.05, 2.2],
    look: [6.15, 1.05, -0.35],
  },
  windmill: {
    pos: [-4.5, 4.8, 3.8],
    look: [-10.2, 4.4, -7.8],
  },
  'ice-drill': {
    pos: [-9.2, 3.6, -4.6],
    look: [-14.5, 1.6, -10.5],
  },
  'landing-pad': {
    pos: [8.4, 4.2, 16.5],
    look: [16.8, 1.2, 9.2],
  },
};

const THIRD_PERSON_INIT_YAW = 2.86; // Facing from (4.95, 2.65) toward Outpost Power Console, Habitat & Greenhouse
const THIRD_PERSON_INIT_PITCH = 0.16;
const THIRD_PERSON_DIST = 4.05;

function shortestAngleDiff(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function easeInOutCubic(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Frame-rate-independent critically damped spring (Game Programming Gems 4).
 */
function smoothDampScalar(
  current: number,
  target: number,
  velocityRef: { v: number },
  smoothTime: number,
  dt: number,
): number {
  const safeDt = Math.max(1e-5, Math.min(0.12, dt));
  const st = Math.max(0.001, smoothTime);
  const omega = 2.0 / st;
  const x = omega * safeDt;
  const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocityRef.v + omega * change) * safeDt;
  velocityRef.v = (velocityRef.v - omega * temp) * exp;
  return target + (change + temp) * exp;
}

function smoothDampVec3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  vel: THREE.Vector3,
  smoothTime: number,
  dt: number,
): void {
  const safeDt = Math.max(1e-5, Math.min(0.12, dt));
  const st = Math.max(0.001, smoothTime);
  const omega = 2.0 / st;
  const x = omega * safeDt;
  const exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x);

  const cx = current.x - target.x;
  const cy = current.y - target.y;
  const cz = current.z - target.z;

  const tx = (vel.x + omega * cx) * safeDt;
  const ty = (vel.y + omega * cy) * safeDt;
  const tz = (vel.z + omega * cz) * safeDt;

  vel.x = (vel.x - omega * tx) * exp;
  vel.y = (vel.y - omega * ty) * exp;
  vel.z = (vel.z - omega * tz) * exp;

  current.x = target.x + (cx + tx) * exp;
  current.y = target.y + (cy + ty) * exp;
  current.z = target.z + (cz + tz) * exp;
}

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const MarsOutpost3D = memo(function MarsOutpost3D({
  gamePhase,
  selectedLandmark,
  onSelectLandmark,
  prologueElapsed,
  tutorialStep,
  powerAllocation,
  simVisuals,
  paused = false,
  quickMode = false,
  mouseSensitivity = 1.0,
  cursorUnlockKey = 'Alt',
  onCursorUnlockedChange,
  canvasElRef,
  onPointerLockChange,
  onPauseRequested,
  onToggleCameraMode,
  onNearbyZoneChange,
  onInteractZone,
  onShelterReached,
  onHabitatDistanceChange,
  onPhysicsUpdate,
  onTutorialMoveDone,
  onTutorialLookDone,
  onCrystalCollected,
  onNearbyStationChange,
  onInteractStation,
  onEngineReady,
  onNearbyCrewChange,
  onInteractCrew,
  onLandingTelemetry,
  onRoverTiltAlert,
  onToggleLens,
  onToggleMap,
  onAudioZoneChange,
  onRoverMakeWay,
  onPoseTelemetry,
  moveInputRef,
  reducedMotion,
  quality,
  debugMode = false,
  onDebugForcePhase,
}: MarsOutpost3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rendererQualityRef = useRef<GraphicsQuality>(quality);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [loadingGameplayOutpost, setLoadingGameplayOutpost] = useState(false);
  const [curtainOpaque, setCurtainOpaque] = useState(false);

  const layoutMode: OutpostLayoutMode = gamePhase === 'gameplay' ? 'gameplay' : 'showcase';

  const debugModeRef = useRef<boolean>(debugMode);
  debugModeRef.current = debugMode;

  const onDebugForcePhaseRef = useRef(onDebugForcePhase);
  onDebugForcePhaseRef.current = onDebugForcePhase;

  const gamePhaseRef = useRef<GamePhase>(gamePhase);
  gamePhaseRef.current = gamePhase;

  const selectedRef = useRef<OutpostLandmarkId | null>(selectedLandmark);
  selectedRef.current = selectedLandmark;

  const prologueElapsedRef = useRef<number>(prologueElapsed);
  prologueElapsedRef.current = prologueElapsed;

  const tutorialStepRef = useRef<TutorialStepId>(tutorialStep);
  tutorialStepRef.current = tutorialStep;

  const powerAllocRef = useRef<PowerAllocation>(powerAllocation);
  powerAllocRef.current = powerAllocation;

  const simVisualsRef = useRef<SimVisualState | undefined>(simVisuals);
  simVisualsRef.current = simVisuals;

  const pausedRef = useRef<boolean>(paused);
  pausedRef.current = paused;

  const quickModeRef = useRef<boolean>(quickMode);
  quickModeRef.current = quickMode;

  const sensitivityRef = useRef<number>(mouseSensitivity);
  sensitivityRef.current = mouseSensitivity;

  const cursorUnlockKeyRef = useRef<CursorUnlockKey>(cursorUnlockKey);
  cursorUnlockKeyRef.current = cursorUnlockKey;

  const onCursorUnlockedRef = useRef(onCursorUnlockedChange);
  onCursorUnlockedRef.current = onCursorUnlockedChange;

  const onPointerLockRef = useRef(onPointerLockChange);
  onPointerLockRef.current = onPointerLockChange;

  const onPauseRequestedRef = useRef(onPauseRequested);
  onPauseRequestedRef.current = onPauseRequested;

  const onToggleCamRef = useRef(onToggleCameraMode);
  onToggleCamRef.current = onToggleCameraMode;

  const onNearbyZoneRef = useRef(onNearbyZoneChange);
  onNearbyZoneRef.current = onNearbyZoneChange;

  const onInteractZoneRef = useRef(onInteractZone);
  onInteractZoneRef.current = onInteractZone;

  const onShelterReachedRef = useRef(onShelterReached);
  onShelterReachedRef.current = onShelterReached;

  const onHabitatDistRef = useRef(onHabitatDistanceChange);
  onHabitatDistRef.current = onHabitatDistanceChange;

  const onPhysicsRef = useRef(onPhysicsUpdate);
  onPhysicsRef.current = onPhysicsUpdate;

  const onSelectRef = useRef(onSelectLandmark);
  onSelectRef.current = onSelectLandmark;

  const onMoveDoneRef = useRef(onTutorialMoveDone);
  onMoveDoneRef.current = onTutorialMoveDone;

  const onLookDoneRef = useRef(onTutorialLookDone);
  onLookDoneRef.current = onTutorialLookDone;

  const onCrystalCollectedRef = useRef(onCrystalCollected);
  onCrystalCollectedRef.current = onCrystalCollected;

  const onNearbyRef = useRef(onNearbyStationChange);
  onNearbyRef.current = onNearbyStationChange;

  const onInteractRef = useRef(onInteractStation);
  onInteractRef.current = onInteractStation;

  const onEngineReadyRef = useRef(onEngineReady);
  onEngineReadyRef.current = onEngineReady;

  const onNearbyCrewRef = useRef(onNearbyCrewChange);
  onNearbyCrewRef.current = onNearbyCrewChange;

  const onInteractCrewRef = useRef(onInteractCrew);
  onInteractCrewRef.current = onInteractCrew;

  const onLandingTelemetryRef = useRef(onLandingTelemetry);
  onLandingTelemetryRef.current = onLandingTelemetry;

  const onRoverTiltAlertRef = useRef(onRoverTiltAlert);
  onRoverTiltAlertRef.current = onRoverTiltAlert;

  const onToggleLensRef = useRef(onToggleLens);
  onToggleLensRef.current = onToggleLens;

  const onToggleMapRef = useRef(onToggleMap);
  onToggleMapRef.current = onToggleMap;

  const onAudioZoneRef = useRef(onAudioZoneChange);
  onAudioZoneRef.current = onAudioZoneChange;

  const onRoverMakeWayRef = useRef(onRoverMakeWay);
  onRoverMakeWayRef.current = onRoverMakeWay;

  const onPoseTelemetryRef = useRef(onPoseTelemetry);
  onPoseTelemetryRef.current = onPoseTelemetry;

  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  // Dispose persistent WebGLRenderer only when MarsOutpost3D unmounts
  useEffect(() => {
    return () => {
      const r = rendererRef.current;
      if (r) {
        r.dispose();
        if (r.domElement.parentNode) {
          r.domElement.parentNode.removeChild(r.domElement);
        }
        rendererRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const activeLayout: OutpostLayoutConfig =
      layoutMode === 'gameplay' ? GAMEPLAY_LAYOUT : SHOWCASE_LAYOUT;
    const isSoftwareGl = detectSoftwareGl();

    // Recreate persistent renderer only if uninitialized or graphics quality changed
    if (rendererRef.current && rendererQualityRef.current !== quality) {
      const old = rendererRef.current;
      old.dispose();
      if (old.domElement.parentNode) {
        old.domElement.parentNode.removeChild(old.domElement);
      }
      rendererRef.current = null;
    }

    let renderer = rendererRef.current;
    if (!renderer) {
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: quality === 'high' && !isSoftwareGl,
          powerPreference: 'high-performance',
          alpha: false,
        });
      } catch {
        setWebglUnavailable(true);
        onEngineReadyRef.current?.();
        return;
      }
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.setAttribute('aria-label', 'Interactive 3D Mars Outpost environment');
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      rendererQualityRef.current = quality;
    }

    if (layoutMode === 'gameplay') {
      setCurtainOpaque(true);
      setLoadingGameplayOutpost(true);
    } else {
      setCurtainOpaque(false);
      setLoadingGameplayOutpost(false);
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const targetPixelRatio =
      isSoftwareGl || quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(targetPixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl && quality === 'high';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (canvasElRef) canvasElRef.current = renderer.domElement;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    const handleContextRestored = () => {
      setWebglUnavailable(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e08152');
    scene.fog = new THREE.FogExp2('#d8784a', 0.0072);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 220);
    const currentCamPos = new THREE.Vector3(...CAMERA_PRESETS.overview.pos);
    const currentLookAt = new THREE.Vector3(...CAMERA_PRESETS.overview.look);
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);

    // Cinematic Sunset Lighting Rig
    const hemiLight = new THREE.HemisphereLight('#8cb8f5', '#e67a44', 1.22);
    hemiLight.position.set(0, 35, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#ffd08a', 3.05);
    sunLight.position.set(26, 14.5, -24);
    sunLight.castShadow = !isSoftwareGl && quality === 'high';
    sunLight.shadow.mapSize.width = 1536;
    sunLight.shadow.mapSize.height = 1536;
    sunLight.shadow.camera.near = 4;
    sunLight.shadow.camera.far = 110;
    sunLight.shadow.camera.left = -36;
    sunLight.shadow.camera.right = 36;
    sunLight.shadow.camera.top = 32;
    sunLight.shadow.camera.bottom = -32;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.025;
    sunLight.shadow.radius = 2.0;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const skyFillLight = new THREE.DirectionalLight('#82aee8', 0.88);
    skyFillLight.position.set(-16, 10, 14);
    scene.add(skyFillLight);

    const rimLight = new THREE.DirectionalLight('#ff9654', 0.68);
    rimLight.position.set(12, 4, 16);
    scene.add(rimLight);

    // Full-screen post-processing pipeline on GPU (skipped on software WebGL per Three.js perf budget)
    let composer: EffectComposer | null = null;
    let composerTarget: THREE.WebGLRenderTarget | null = null;
    let fpRenderPass: RenderPass | null = null;
    let stormPass: ShaderPass | null = null;
    let outputPass: OutputPass | null = null;

    // Build Environment & Detailed Outpost Assets (single-source TerrainHeightGrid per layoutMode)
    const envBuild = buildMarsEnvironment(scene, renderer, quality, isSoftwareGl, activeLayout);
    const gAt = (x: number, z: number) => groundHeightAt(x, z, envBuild.terrainGrid);
    const roverRockObstacles = envBuild.rockSpecs
      .filter((r) => r.radiusXZ >= 0.22)
      .map((r) => ({ x: r.x, z: r.z, radius: r.radiusXZ }));
    const outpost = buildOutpostAssets(
      scene,
      renderer,
      quality,
      isSoftwareGl,
      activeLayout,
      envBuild.terrainGrid,
    );

    if (!isSoftwareGl) {
      const msaaSamples = renderer.capabilities.isWebGL2 && quality === 'high' ? 2 : 0;
      composerTarget = new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        samples: msaaSamples,
      });
      composer = new EffectComposer(renderer, composerTarget);
      composer.setPixelRatio(targetPixelRatio);
      composer.setSize(width, height);
      composer.addPass(new RenderPass(scene, camera));

      fpRenderPass = new RenderPass(outpost.fpScene, outpost.fpCamera);
      fpRenderPass.clear = false;
      fpRenderPass.clearDepth = true;
      fpRenderPass.enabled = false;
      composer.addPass(fpRenderPass);

      stormPass = new ShaderPass(MartianStormShader);
      (stormPass.uniforms.uResolution.value as THREE.Vector2).set(width, height);
      composer.addPass(stormPass);

      outputPass = new OutputPass();
      composer.addPass(outputPass);
    }

    // Pooled Ground Footprint / Track Decals & Ballistic Kicked Dust Particles (y'' = -3.73)
    const extraGeos: THREE.BufferGeometry[] = [];
    const extraMats: THREE.Material[] = [];
    const extraTexs: THREE.Texture[] = [];

    const footprintTex = createFootprintDecalTexture();
    const trackTex = createRoverTrackDecalTexture();
    extraTexs.push(footprintTex, trackTex);

    const footprintGeo = new THREE.PlaneGeometry(0.18, 0.34);
    footprintGeo.rotateX(-Math.PI / 2);
    const trackGeo = new THREE.PlaneGeometry(0.32, 0.56);
    trackGeo.rotateX(-Math.PI / 2);
    extraGeos.push(footprintGeo, trackGeo);

    interface DecalSlot {
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      age: number;
      maxAge: number;
    }

    const createDecalPool = (
      count: number,
      geo: THREE.BufferGeometry,
      map: THREE.Texture,
      maxAge: number,
    ): DecalSlot[] => {
      const pool: DecalSlot[] = [];
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });
        extraMats.push(mat);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        mesh.renderOrder = 8;
        scene.add(mesh);
        pool.push({ mesh, mat, age: maxAge, maxAge });
      }
      return pool;
    };

    const footprintPool = createDecalPool(24, footprintGeo, footprintTex, 18.0);
    const roverTrackPool = createDecalPool(24, trackGeo, trackTex, 20.0);
    let footprintCursor = 0;
    let trackCursor = 0;

    const stampDecal = (
      pool: DecalSlot[],
      cursorRef: { idx: number },
      x: number,
      z: number,
      yaw: number,
    ) => {
      const slot = pool[cursorRef.idx % pool.length];
      cursorRef.idx = (cursorRef.idx + 1) % pool.length;
      const surfY = physicsWorld
        ? physicsWorld.getGroundSupportHeightAt(x, z)
        : groundHeightAt(x, z, envBuild.terrainGrid);
      const rawGroundY = groundHeightAt(x, z, envBuild.terrainGrid);
      const onRaisedPad = surfY - rawGroundY > 0.05;
      const decalOffset =
        !onRaisedPad && isOnPavedSurface(x, z, activeLayout) ? 0.044 : 0.018;
      slot.mesh.position.set(x, surfY + decalOffset, z);
      slot.mesh.rotation.y = yaw;
      slot.mesh.visible = true;
      slot.age = 0;
      slot.mat.opacity = 0.72;
    };

    // Ballistic kicked-dust pool (max 60 particles following y'' = -3.73 m/s^2)
    const KICK_PARTICLE_COUNT = 60;
    const kickPositions = new Float32Array(KICK_PARTICLE_COUNT * 3);
    const kickVel = new Float32Array(KICK_PARTICLE_COUNT * 3);
    const kickAge = new Float32Array(KICK_PARTICLE_COUNT);
    const kickMaxAge = new Float32Array(KICK_PARTICLE_COUNT);
    for (let i = 0; i < KICK_PARTICLE_COUNT; i++) {
      kickAge[i] = 99;
      kickMaxAge[i] = 1.0;
      kickPositions[i * 3 + 1] = -999;
    }
    const kickGeo = new THREE.BufferGeometry();
    kickGeo.setAttribute('position', new THREE.BufferAttribute(kickPositions, 3));
    extraGeos.push(kickGeo);
    const kickMat = new THREE.PointsMaterial({
      color: '#d98a5f',
      size: 0.14,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    extraMats.push(kickMat);
    const kickPoints = new THREE.Points(kickGeo, kickMat);
    kickPoints.frustumCulled = false;
    scene.add(kickPoints);
    let kickCursor = 0;

    // Tutorial Step 3: 3 Glowing Gravity Crystals floating at Mars-jump height
    interface GravityCrystalNode {
      id: string;
      x: number;
      z: number;
      yOffset: number;
      phaseOffset: number;
      group: THREE.Group;
      gem: THREE.Mesh;
      ring: THREE.Mesh;
    }
    const crystalGeo = new THREE.OctahedronGeometry(0.32, 0);
    const crystalRingGeo = new THREE.RingGeometry(0.45, 0.62, 24);
    crystalRingGeo.rotateX(-Math.PI / 2);
    extraGeos.push(crystalGeo, crystalRingGeo);

    const crystalMat = new THREE.MeshStandardMaterial({
      color: '#38BDF8',
      emissive: '#FFB703',
      emissiveIntensity: 1.55,
      roughness: 0.18,
      metalness: 0.35,
    });
    const crystalRingMat = new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    extraMats.push(crystalMat, crystalRingMat);

    const crystalNodes: GravityCrystalNode[] = GRAVITY_CRYSTAL_SPOTS.map((spot, idx) => {
      const group = new THREE.Group();
      const groundY = gAt(spot.x, spot.z);
      group.position.set(spot.x, groundY, spot.z);
      group.visible = false;

      const gem = new THREE.Mesh(crystalGeo, crystalMat);
      gem.position.y = spot.yOffset;
      group.add(gem);

      const ring = new THREE.Mesh(crystalRingGeo, crystalRingMat);
      ring.position.y = 0.05;
      ring.renderOrder = 9;
      group.add(ring);

      scene.add(group);
      return {
        id: spot.id,
        x: spot.x,
        z: spot.z,
        yOffset: spot.yOffset,
        phaseOffset: idx * 1.4,
        group,
        gem,
        ring,
      };
    });
    const reportedCrystalIds = new Set<string>();

    // Kid-Friendly Ground Chevron Path Guide (InstancedMesh of 28 flowing chevrons)
    const MAX_CHEVRONS = 28;
    const chevronShape = new THREE.Shape();
    chevronShape.moveTo(0, 0.28);
    chevronShape.lineTo(0.26, -0.14);
    chevronShape.lineTo(0.15, -0.22);
    chevronShape.lineTo(0, 0.06);
    chevronShape.lineTo(-0.15, -0.22);
    chevronShape.lineTo(-0.26, -0.14);
    chevronShape.closePath();
    const chevronGeo = new THREE.ShapeGeometry(chevronShape);
    chevronGeo.rotateX(Math.PI / 2);
    const chevronMat = new THREE.MeshBasicMaterial({
      color: '#FFB703',
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    extraGeos.push(chevronGeo);
    extraMats.push(chevronMat);
    const chevronInstancedMesh = new THREE.InstancedMesh(chevronGeo, chevronMat, MAX_CHEVRONS);
    chevronInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chevronInstancedMesh.renderOrder = 10;
    chevronInstancedMesh.frustumCulled = false;
    chevronInstancedMesh.visible = false;
    chevronInstancedMesh.count = 0;
    scene.add(chevronInstancedMesh);
    const _chevronMatrix = new THREE.Matrix4();
    const _chevronPos = new THREE.Vector3();
    const _chevronEuler = new THREE.Euler();
    const _chevronQuat = new THREE.Quaternion();
    const _chevronScale = new THREE.Vector3();


    const spawnBallisticDust = (
      x: number,
      y: number,
      z: number,
      count: number,
      speedScale = 1.0,
    ) => {
      for (let c = 0; c < count; c++) {
        const idx = kickCursor;
        kickCursor = (kickCursor + 1) % KICK_PARTICLE_COUNT;
        const ang = Math.random() * Math.PI * 2;
        const horiz = (0.35 + Math.random() * 0.75) * speedScale;
        kickPositions[idx * 3] = x + Math.cos(ang) * 0.12;
        kickPositions[idx * 3 + 1] = y + 0.06;
        kickPositions[idx * 3 + 2] = z + Math.sin(ang) * 0.12;
        kickVel[idx * 3] = Math.cos(ang) * horiz;
        kickVel[idx * 3 + 1] = (1.15 + Math.random() * 0.95) * speedScale;
        kickVel[idx * 3 + 2] = Math.sin(ang) * horiz;
        kickAge[idx] = 0;
        kickMaxAge[idx] = 0.75 + Math.random() * 0.45;
      }
    };

    // Autonomous 4 Crew Agents + 6-Wheel Rocker-Bogie Rover Controller
    let crewAgents: CrewAgentState[] = createInitialCrewAgents(envBuild.terrainGrid, activeLayout);
    let roverController: RoverControllerState = createInitialRoverController(
      outpost.roverBasePos.x,
      outpost.roverBasePos.z,
      activeLayout.modules.roverSpawn.yaw,
      envBuild.terrainGrid,
      activeLayout,
    );
    const mSpec = activeLayout.modules;
    const outpostObstacles: Array<{ x: number; z: number; radius: number }> = [
      { x: mSpec.habitat.x, z: mSpec.habitat.z, radius: mSpec.habitat.deckRadius + 0.35 },
      {
        x: mSpec.habitat.x + mSpec.airlockOffset.dx,
        z: mSpec.habitat.z + mSpec.airlockOffset.dz,
        radius: 1.5,
      },
      { x: mSpec.chapea.x, z: mSpec.chapea.z, radius: mSpec.chapea.plinthHalfX + 0.45 },
      { x: mSpec.greenhouse.x, z: mSpec.greenhouse.z, radius: mSpec.greenhouse.floorRadius + 0.45 },
      { x: mSpec.greenhouse.waterTankX, z: mSpec.greenhouse.waterTankZ, radius: 0.9 },
      { x: mSpec.recycler.x, z: mSpec.recycler.z, radius: 1.3 },
      { x: mSpec.shelter.x, z: mSpec.shelter.z, radius: 1.85 },
      { x: mSpec.tank2.x, z: mSpec.tank2.z, radius: 1.8 },
      ...mSpec.solarPanels.map(([sx, sz]) => ({ x: sx, z: sz, radius: 1.5 })),
      { x: mSpec.batteryBank.x, z: mSpec.batteryBank.z, radius: 1.6 },
      ...mSpec.windmills.map(([wx, wz]) => ({ x: wx, z: wz, radius: 1.6 })),
      { x: mSpec.verticalTurbine.x, z: mSpec.verticalTurbine.z, radius: 1.1 },
      { x: mSpec.iceDrill.x, z: mSpec.iceDrill.z, radius: 2.3 },
      { x: mSpec.powerConsole.x, z: mSpec.powerConsole.z, radius: 1.15 },
      { x: mSpec.commsMast.x, z: mSpec.commsMast.z, radius: mSpec.commsMast.radiusM + 0.45 },
      { x: mSpec.landingPad.x + 4.6, z: mSpec.landingPad.z, radius: 2.4 },
    ];
    if (mSpec.connHabGh.elevatedOverpass) {
      for (const px of mSpec.connHabGh.pierXs) {
        const t = (px - mSpec.connHabGh.startX) / (mSpec.connHabGh.endX - mSpec.connHabGh.startX);
        const pz = mSpec.connHabGh.startZ + (mSpec.connHabGh.endZ - mSpec.connHabGh.startZ) * t;
        outpostObstacles.push({ x: px, z: pz, radius: 0.75 });
      }
    }
    if (mSpec.roverPad.enabled) {
      outpostObstacles.push({
        x: mSpec.roverPad.x - mSpec.roverPad.widthM * 0.5 + 0.55,
        z: mSpec.roverPad.z - mSpec.roverPad.depthM * 0.5 + 0.55,
        radius: 0.95,
      });
    }
    for (const ub of activeLayout.utilityBridges) {
      if (ub.kind === 'pipe-bridge') {
        outpostObstacles.push({ x: ub.x1, z: ub.z1, radius: 0.65 });
        outpostObstacles.push({ x: ub.x2, z: ub.z2, radius: 0.65 });
      }
    }
    for (const sp of activeLayout.signposts) {
      outpostObstacles.push({ x: sp.x, z: sp.z, radius: 0.48 });
    }
    for (const bol of activeLayout.bollards) {
      outpostObstacles.push({ x: bol.x, z: bol.z, radius: 0.36 });
    }

    // Initialize authoritative Rapier WASM physics world ONLY for Gameplay layout
    let physicsWorld: MarsPhysicsWorld | null = null;
    let disposed = false;

    if (layoutMode === 'gameplay') {
      void MarsPhysicsWorld.create({
        layout: activeLayout,
        grid: envBuild.terrainGrid,
        quality,
        rockSpecs: envBuild.rockSpecs,
        startX: outpost.astroBasePos.x,
        startZ: outpost.astroBasePos.z,
      }).then((pw) => {
        if (disposed) {
          pw.dispose();
          return;
        }
        physicsWorld = pw;
        setLoadingGameplayOutpost(false);
        setCurtainOpaque(false);
        onEngineReadyRef.current?.();
      });
    } else {
      // Showcase Landing/Prologue/Briefing runs with zero Rapier overhead
      onEngineReadyRef.current?.();
    }

    // Gameplay state driven by Rapier physics (spawn at Airlock Door facing N/NE when gameplay)
    const initPlayerYaw =
      layoutMode === 'gameplay' ? activeLayout.modules.astroSpawn.yaw : THIRD_PERSON_INIT_YAW;
    const playerPos = new THREE.Vector2(outpost.astroBasePos.x, outpost.astroBasePos.z);
    let playerFootY = gAt(outpost.astroBasePos.x, outpost.astroBasePos.z);
    let smoothFootY = playerFootY;
    const smoothFootYVel = { v: 0 };
    const camPosSpringVel = new THREE.Vector3();
    const camLookSpringVel = new THREE.Vector3();
    const prevCameraPosForJerk = new THREE.Vector3().copy(currentCamPos);
    let prevCamSpeedForJerk = 0;
    let playerYaw = initPlayerYaw;
    let playerGrounded = true;
    let playerJumpQueued = false;
    let lastRoverPushingInto = false;
    let roverMakeWayRequested = false;
    let camYaw = initPlayerYaw;
    let camPitch = THIRD_PERSON_INIT_PITCH;
    let camDist = THIRD_PERSON_DIST;
    let walkPhase = 0;
    let walkBlend = 0;
    let visualHorizSpeed = 0;
    let lastStepHalfCycle = 0;
    let landingDipY = 0;
    let fpInteractPulse = 0;
    let totalDistanceMoved = 0;
    let totalLookDelta = 0;
    let moveTutorialReported = false;
    let lookTutorialReported = false;
    let lastNearbyId: OutpostLandmarkId | null = null;
    let lastNearbyZoneId: MissionZoneId | null = null;
    let lastNearbyCrewId: CrewMemberId | null = null;
    let lastHabDistMeters = -1;
    let lastAudioZone: OutpostAudioZone = 'outdoors';
    let shelterSentThisEvent = false;
    let lastRoverTiltWarn = false;
    let lastRoverTrackPos = new THREE.Vector2(outpost.roverBasePos.x, outpost.roverBasePos.z);
    let prevPhase: GamePhase = gamePhaseRef.current;
    let lastJumpTelemetry: MarsJumpTelemetry | null = null;
    let lastPhysicsPushMs = 0;
    let lastPoseTelemetryMs = 0;
    let lastCompassEventMs = 0;

    // Optional zero-cost-when-off ?debug=1 diagnostics layer
    let debugSpeedMult = 1;
    let debugCamOverride: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
    let lastDebugReport: SelfTestReport | null = null;
    const debugMoveSamples: MovementFrameSample[] = [];
    const DEBUG_MOVE_RING_SIZE = 600;
    const CAMERA_JERK_THRESHOLD_MS2 = 45;
    const overlayMgr = debugModeRef.current
      ? new MarsDebugOverlayManager(scene, outpost, activeLayout)
      : null;

    if (debugModeRef.current && overlayMgr) {
      window.__MARS_DEBUG__ = {
        enabled: true,
        get player() {
          const snap = physicsWorld?.getSnapshot();
          return {
            x: Number(playerPos.x.toFixed(3)),
            footY: Number(playerFootY.toFixed(3)),
            centerY: Number((snap?.centerY ?? playerFootY + 0.92).toFixed(3)),
            z: Number(playerPos.y.toFixed(3)),
            vx: Number((snap?.vx ?? 0).toFixed(3)),
            vy: Number((snap?.vy ?? 0).toFixed(3)),
            vz: Number((snap?.vz ?? 0).toFixed(3)),
            grounded: playerGrounded,
            speedMs: Number((snap?.horizontalSpeedMs ?? 0).toFixed(3)),
            yawDeg: Number(((playerYaw * 180) / Math.PI).toFixed(1)),
            capsuleRadiusM: PHYSICS_CONSTANTS.CAPSULE_RADIUS_M,
            capsuleHeightM: PHYSICS_CONSTANTS.CAPSULE_TOTAL_HEIGHT_M,
          };
        },
        get crew() {
          const physRegistered = (physicsWorld?.crewBodyIds.length ?? 0) > 0;
          return crewAgents.map((ag) => {
            const prof = CREW_PROFILES.find((p) => p.id === ag.id);
            const curSt =
              ag.stations[ag.activeStationIndex % ag.stations.length] ?? ag.homeStation;
            return {
              id: ag.id,
              name: prof?.name ?? ag.id,
              position: { x: Number(ag.x.toFixed(3)), y: Number(ag.y.toFixed(3)), z: Number(ag.z.toFixed(3)) },
              velocity: { x: Number(ag.vx.toFixed(3)), y: 0, z: Number(ag.vz.toFixed(3)) },
              speedMs: Number(ag.speedMs.toFixed(3)),
              state: ag.mode,
              currentStation: curSt.label,
              targetStation: curSt.label,
              path: ag.path.map((pt) => ({
                x: Number(pt.x.toFixed(3)),
                y: Number(
                  (physicsWorld
                    ? physicsWorld.getGroundSupportHeightAt(pt.x, pt.z)
                    : groundHeightAt(pt.x, pt.z, envBuild.terrainGrid)
                  ).toFixed(3),
                ),
                z: Number(pt.z.toFixed(3)),
              })),
              physicsRegistered: physRegistered,
            };
          });
        },
        get rover() {
          return {
            x: Number(roverController.x.toFixed(3)),
            y: Number(roverController.y.toFixed(3)),
            z: Number(roverController.z.toFixed(3)),
            yawRad: Number(roverController.yaw.toFixed(3)),
            speedMs: Number(roverController.speedMs.toFixed(3)),
            tiltDeg: roverController.tiltDeg,
            state: roverController.state,
          };
        },
        get camera() {
          return {
            x: Number(camera.position.x.toFixed(3)),
            y: Number(camera.position.y.toFixed(3)),
            z: Number(camera.position.z.toFixed(3)),
            yawRad: Number(camYaw.toFixed(3)),
            pitchRad: Number(camPitch.toFixed(3)),
            mode: simVisualsRef.current?.cameraMode ?? '3p',
            overridden: Boolean(debugCamOverride),
          };
        },
        get overlays() {
          return { ...overlayMgr.flags };
        },
        setOverlay(key, value) {
          overlayMgr.setFlag(key, value);
          window.dispatchEvent(new Event('mars-debug-sync'));
        },
        toggleOverlay(key) {
          const next = !overlayMgr.flags[key];
          overlayMgr.setFlag(key, next);
          window.dispatchEvent(new Event('mars-debug-sync'));
          return next;
        },
        getSelectedCrewId() {
          return overlayMgr.selectedCrewId;
        },
        cycleSelectedCrew() {
          const id = overlayMgr.cycleSelectedCrew();
          window.dispatchEvent(new Event('mars-debug-sync'));
          return id;
        },
        setGameSpeed(mult) {
          debugSpeedMult = Math.max(0.1, Math.min(20, Number.isFinite(mult) ? mult : 1));
          window.dispatchEvent(new Event('mars-debug-sync'));
        },
        getGameSpeed() {
          return debugSpeedMult;
        },
        setPhase(nextPhase) {
          onDebugForcePhaseRef.current?.(nextPhase);
        },
        teleport(opts) {
          if (opts.kind === 'camera-reset') {
            debugCamOverride = null;
          } else if (opts.kind === 'camera') {
            const x = opts.x ?? camera.position.x;
            const y = opts.y ?? camera.position.y;
            const z = opts.z ?? camera.position.z;
            const look = opts.lookAt
              ? new THREE.Vector3(opts.lookAt.x, opts.lookAt.y, opts.lookAt.z)
              : new THREE.Vector3(4.4, 1.2, -3.4);
            debugCamOverride = { pos: new THREE.Vector3(x, y, z), look };
            currentCamPos.copy(debugCamOverride.pos);
            currentLookAt.copy(debugCamOverride.look);
          } else if (opts.kind === 'player' && opts.x !== undefined && opts.z !== undefined) {
            debugCamOverride = null;
            playerPos.set(opts.x, opts.z);
            playerFootY = gAt(opts.x, opts.z);
            if (opts.yaw !== undefined) {
              playerYaw = opts.yaw;
              camYaw = opts.yaw;
            }
            if (opts.pitch !== undefined) camPitch = opts.pitch;
            physicsWorld?.teleportPlayer(opts.x, opts.z);
          } else if (opts.kind === 'crew' && opts.x !== undefined && opts.z !== undefined) {
            const targetId = opts.crewId ?? overlayMgr.selectedCrewId;
            const synced = physicsWorld?.teleportCrewMember(targetId, opts.x, opts.z);
            crewAgents = crewAgents.map((ag) =>
              ag.id === targetId
                ? {
                    ...ag,
                    x: synced ? synced.x : opts.x!,
                    z: synced ? synced.z : opts.z!,
                    y: synced ? synced.footY : gAt(opts.x!, opts.z!),
                    lastGoalKey: '',
                  }
                : ag,
            );
          }
          window.dispatchEvent(new Event('mars-debug-sync'));
        },
        getModuleList() {
          return {
            modules: computeModuleAABBs(outpost, physicsWorld),
            seams: measurePairwiseSeamGaps(outpost, physicsWorld, activeLayout),
          };
        },
        getStaticColliders() {
          return {
            staticColliders: physicsWorld ? physicsWorld.getStaticColliderRecords() : [],
            roverCollider: physicsWorld ? physicsWorld.getRoverColliderState() : null,
            activeRocks: physicsWorld ? physicsWorld.getActiveRockSpecs() : [],
          };
        },
        getMovementDiagnostics() {
          let maxCameraJerkMs2 = 0;
          let zeroSpeedFramesWhileWalking = 0;
          for (const s of debugMoveSamples) {
            if (s.cameraJerkMs2 > maxCameraJerkMs2) maxCameraJerkMs2 = s.cameraJerkMs2;
            const hasDes = Math.hypot(s.desiredVel.x, s.desiredVel.z) > 0.2;
            if (hasDes && s.actualHorizVel.speedMs < 0.02) {
              zeroSpeedFramesWhileWalking++;
            }
          }
          return {
            sampleCount: debugMoveSamples.length,
            walkSpeedTargetMs: Number(PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS.toFixed(3)),
            lopeSpeedTargetMs: PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS,
            cameraJerkThresholdMs2: CAMERA_JERK_THRESHOLD_MS2,
            maxCameraJerkMs2: Number(maxCameraJerkMs2.toFixed(3)),
            zeroSpeedFramesWhileWalking,
            samples: [...debugMoveSamples],
          };
        },
        async runSelfTest() {
          const rep = await runLiveDiagnosticsSelfTest({
            outpost,
            physicsWorld,
            crewAgents,
            roverState: roverController,
            cameraMode: simVisualsRef.current?.cameraMode ?? '3p',
            layout: activeLayout,
          });
          lastDebugReport = rep;
          window.dispatchEvent(new Event('mars-debug-sync'));
          return rep;
        },
        getLastReport() {
          return lastDebugReport;
        },
      };
    }

    // Polled InputState: stores physical ev.code strings, ignores repeat, cleared ONLY on blur or visibilitychange
    const keysDown = new Set<string>();
    const MOVE_KEY_CODES = new Set<string>([
      'KeyW',
      'ArrowUp',
      'KeyS',
      'ArrowDown',
      'KeyA',
      'ArrowLeft',
      'KeyD',
      'ArrowRight',
      'ShiftLeft',
      'ShiftRight',
    ]);
    const handleKeyDown = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      // ?debug=1 overlay hotkeys work in any phase when not typing
      if (debugModeRef.current && overlayMgr && !ev.repeat) {
        const keyLower = ev.key.toLowerCase();
        const map: Record<string, DebugOverlayKey> = {
          '1': 'colliders',
          '2': 'crewGizmos',
          '3': 'navGraph',
          '4': 'moduleBounds',
          '5': 'stationSlots',
          '6': 'doorways',
        };
        if (map[keyLower]) {
          overlayMgr.setFlag(map[keyLower], !overlayMgr.flags[map[keyLower]]);
          window.dispatchEvent(new Event('mars-debug-sync'));
          return;
        }
        if (keyLower === 'n') {
          overlayMgr.cycleSelectedCrew();
          window.dispatchEvent(new Event('mars-debug-sync'));
          return;
        }
      }

      if (gamePhaseRef.current !== 'gameplay') return;

      const simState = simVisualsRef.current;
      if (simState?.commandModeOpen || pausedRef.current) return;

      // In-game Free Mouse Cursor key (Alt / K / `) unlocks pointer without opening Pause Menu;
      // pressing it again or left-clicking anywhere on the 3D world re-locks cursor.
      const unlockKeySetting = cursorUnlockKeyRef.current;
      const isCursorUnlockKey =
        (unlockKeySetting === 'Alt' && (ev.code === 'AltLeft' || ev.code === 'AltRight')) ||
        (unlockKeySetting === 'KeyK' && ev.code === 'KeyK') ||
        (unlockKeySetting === 'Backquote' && ev.code === 'Backquote');

      if (isCursorUnlockKey) {
        ev.preventDefault();
        if (ev.repeat || simState?.mapOpen || simState?.quickMenuOpen) return;
        if (!manualCursorUnlock) {
          manualCursorUnlock = true;
          isDraggingFallback = false;
          keysDown.clear();
          if (document.pointerLockElement === renderer.domElement) {
            try {
              document.exitPointerLock?.();
            } catch {
              // ignore exit errors
            }
          }
          renderer.domElement.style.cursor = 'default';
          onCursorUnlockedRef.current?.(true);
        } else {
          manualCursorUnlock = false;
          onCursorUnlockedRef.current?.(false);
          if (!pointerLockBlocked) {
            tryLockPointer();
          }
        }
        return;
      }

      if (ev.code === 'KeyM' && !ev.repeat && !simState?.quickMenuOpen) {
        onToggleMapRef.current?.();
        return;
      }
      if (simState?.mapOpen || simState?.quickMenuOpen) return;

      if (MOVE_KEY_CODES.has(ev.code)) {
        if (ev.code.startsWith('Arrow')) ev.preventDefault();
        if (!ev.repeat) {
          keysDown.add(ev.code);
        }
        return;
      }

      if (ev.repeat) return;

      if (ev.code === 'Space') {
        ev.preventDefault();
        if (playerGrounded) {
          playerJumpQueued = true;
          const localGrav = computeLocalMarsGravity(
            playerPos.x,
            playerPos.y,
            gAt(playerPos.x, playerPos.y),
          );
          lastJumpTelemetry = computeJumpTelemetry(
            PHYSICS_CONSTANTS.SUITED_TAKEOFF_MS,
            localGrav.gravityMs2,
          );
        }
      } else if (ev.code === 'KeyV') {
        onToggleCamRef.current?.();
      } else if (ev.code === 'KeyF') {
        onToggleLensRef.current?.();
      } else if (ev.code === 'KeyR') {
        roverMakeWayRequested = true;
      } else if (ev.code === 'KeyE') {
        fpInteractPulse = 1.0;
        if (simState?.weatherEvent?.active && lastNearbyId === 'habitat') {
          onShelterReachedRef.current?.();
        } else if (lastNearbyCrewId && onInteractCrewRef.current) {
          const ag = crewAgents.find((c) => c.id === lastNearbyCrewId);
          if (ag) {
            const mem = simState?.crew?.find((m) => m.id === ag.id);
            onInteractCrewRef.current(getCrewInspectInfo(ag, mem));
          }
        } else if (lastNearbyZoneId && onInteractZoneRef.current) {
          onInteractZoneRef.current(lastNearbyZoneId);
        } else if (lastNearbyId) {
          onInteractRef.current(lastNearbyId);
        }
      }
    };
    const handleKeyUp = (ev: KeyboardEvent) => {
      if (MOVE_KEY_CODES.has(ev.code)) {
        keysDown.delete(ev.code);
      }
    };

    // Pointer Lock + Fallback Mouse Look
    const pointerNdc = new THREE.Vector2(0, 0);
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;
    const raycaster = new THREE.Raycaster();
    let lastHoverCheck = 0;

    let pointerLocked = document.pointerLockElement === renderer.domElement;
    let pointerLockBlocked = false;
    let manualCursorUnlock = false;
    let isDraggingFallback = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastDragX = 0;
    let lastDragY = 0;
    let dragMovedDist = 0;

    const tryLockPointer = () => {
      if (document.pointerLockElement === renderer.domElement) return;
      try {
        const req = renderer.domElement.requestPointerLock as
          | ((options?: { unadjustedMovement?: boolean }) => Promise<void> | void)
          | undefined;
        const maybePromise = req?.call(renderer.domElement, { unadjustedMovement: true });
        if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
          (maybePromise as Promise<void>).catch(() => {
            try {
              renderer.domElement.requestPointerLock?.();
            } catch {
              pointerLockBlocked = true;
            }
          });
        }
      } catch {
        try {
          renderer.domElement.requestPointerLock?.();
        } catch {
          pointerLockBlocked = true;
        }
      }
    };

    const handlePointerLockChange = () => {
      const wasLocked = pointerLocked;
      pointerLocked = document.pointerLockElement === renderer.domElement;
      if (pointerLocked) {
        manualCursorUnlock = false;
        onCursorUnlockedRef.current?.(false);
      }
      onPointerLockRef.current?.(pointerLocked);
      if (
        wasLocked &&
        !pointerLocked &&
        !manualCursorUnlock &&
        gamePhaseRef.current === 'gameplay' &&
        !simVisualsRef.current?.commandModeOpen &&
        !simVisualsRef.current?.mapOpen &&
        !simVisualsRef.current?.quickMenuOpen &&
        !pausedRef.current
      ) {
        onPauseRequestedRef.current?.();
      }
    };

    const handlePointerLockError = () => {
      pointerLockBlocked = true;
      pointerLocked = false;
      onPointerLockRef.current?.(false);
    };

    const handleBlur = () => {
      keysDown.clear();
      isDraggingFallback = false;
      if (manualCursorUnlock) {
        manualCursorUnlock = false;
        onCursorUnlockedRef.current?.(false);
      }
      if (
        gamePhaseRef.current === 'gameplay' &&
        !simVisualsRef.current?.commandModeOpen &&
        !simVisualsRef.current?.mapOpen &&
        !simVisualsRef.current?.quickMenuOpen &&
        !pausedRef.current
      ) {
        onPauseRequestedRef.current?.();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        keysDown.clear();
        isDraggingFallback = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);

    const applyLookDelta = (dx: number, dy: number) => {
      const sens = Math.max(0.2, Math.min(2.5, sensitivityRef.current));
      const yawDelta = -dx * 0.0024 * sens;
      const pitchDelta = dy * 0.0022 * sens;
      camYaw += yawDelta;
      camPitch = THREE.MathUtils.clamp(
        camPitch + pitchDelta,
        -PHYSICS_CONSTANTS.CAMERA_PITCH_MAX_RAD,
        PHYSICS_CONSTANTS.CAMERA_PITCH_MAX_RAD,
      );

      totalLookDelta += Math.abs(yawDelta) + Math.abs(pitchDelta);
      if (
        tutorialStepRef.current === 'look' &&
        totalLookDelta >= Math.PI / 3 &&
        !lookTutorialReported
      ) {
        lookTutorialReported = true;
        onLookDoneRef.current();
      } else if (tutorialStepRef.current !== 'look') {
        lookTutorialReported = false;
        totalLookDelta = 0;
      }
    };

    const triggerRaycastInteract = (ndcX: number, ndcY: number) => {
      pointerNdc.set(ndcX, ndcY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const hitCrew = hits.find((h) => h.object.userData.crewId)?.object.userData.crewId as
        | CrewMemberId
        | undefined;
      if (hitCrew && onInteractCrewRef.current) {
        const ag = crewAgents.find((c) => c.id === hitCrew);
        if (ag) {
          const mem = simVisualsRef.current?.crew?.find((m) => m.id === ag.id);
          fpInteractPulse = 1.0;
          onInteractCrewRef.current(getCrewInspectInfo(ag, mem));
          return;
        }
      }
      const hitZone = hits.find((h) => h.object.userData.missionZoneId)?.object.userData
        .missionZoneId as MissionZoneId | undefined;
      if (hitZone && onInteractZoneRef.current) {
        fpInteractPulse = 1.0;
        onInteractZoneRef.current(hitZone);
        return;
      }
      const landmarkHits = raycaster.intersectObjects(outpost.interactiveTargets, false);
      if (landmarkHits.length > 0) {
        const hitId = landmarkHits[0].object.userData.landmarkId as OutpostLandmarkId | undefined;
        if (hitId && hitId !== 'astronaut') {
          fpInteractPulse = 1.0;
          onInteractRef.current(hitId);
        }
      }
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (gamePhaseRef.current === 'gameplay') {
        if (
          simVisualsRef.current?.commandModeOpen ||
          simVisualsRef.current?.mapOpen ||
          simVisualsRef.current?.quickMenuOpen ||
          pausedRef.current
        ) {
          renderer.domElement.style.cursor = 'default';
          return;
        }
        if (pointerLocked) {
          applyLookDelta(ev.movementX, ev.movementY);
          renderer.domElement.style.cursor = 'none';
          return;
        }
        if (isDraggingFallback) {
          const dx = ev.clientX - lastDragX;
          const dy = ev.clientY - lastDragY;
          lastDragX = ev.clientX;
          lastDragY = ev.clientY;
          dragMovedDist += Math.hypot(dx, dy);
          applyLookDelta(dx, dy);
          renderer.domElement.style.cursor = 'grabbing';
          return;
        }
        if (manualCursorUnlock) {
          renderer.domElement.style.cursor = 'default';
          return;
        }
        renderer.domElement.style.cursor = pointerLockBlocked ? 'grab' : 'crosshair';
        return;
      }

      if (gamePhaseRef.current !== 'landing') {
        renderer.domElement.style.cursor = 'default';
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      pointerNdc.set(nx, ny);
      targetParallaxX = nx * 0.65;
      targetParallaxY = ny * 0.25;

      const now = performance.now();
      if (now - lastHoverCheck > 65) {
        lastHoverCheck = now;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(outpost.interactiveTargets, false);
        renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'default';
      }
    };

    const handlePointerDown = (ev: PointerEvent) => {
      if (gamePhaseRef.current === 'gameplay') {
        if (
          simVisualsRef.current?.commandModeOpen ||
          simVisualsRef.current?.mapOpen ||
          simVisualsRef.current?.quickMenuOpen ||
          pausedRef.current
        )
          return;

        if (tutorialStepRef.current === 'take-control') {
          onLookDoneRef.current();
        }

        // Left-clicking any spot on the 3D game world re-locks/hides a manually freed cursor
        if (manualCursorUnlock && ev.button === 0) {
          manualCursorUnlock = false;
          onCursorUnlockedRef.current?.(false);
          if (!pointerLockBlocked) {
            tryLockPointer();
            return;
          }
        }

        // If already pointer-locked, a click interacts via centered reticle (0, 0)
        if (pointerLocked) {
          triggerRaycastInteract(0, 0);
          return;
        }

        // Single click requests Pointer Lock immediately (zero drag required)
        if (!pointerLockBlocked) {
          tryLockPointer();
          return;
        }

        // Fallback if sandbox browser explicitly blocked pointer lock
        isDraggingFallback = true;
        dragStartX = ev.clientX;
        dragStartY = ev.clientY;
        lastDragX = ev.clientX;
        lastDragY = ev.clientY;
        dragMovedDist = 0;
        renderer.domElement.style.cursor = 'grabbing';
        return;
      }

      if (gamePhaseRef.current !== 'landing') return;

      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerNdc.set(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(outpost.interactiveTargets, false);
      if (hits.length > 0) {
        const hitId = hits[0].object.userData.landmarkId as OutpostLandmarkId | undefined;
        if (hitId) {
          onSelectRef.current(selectedRef.current === hitId ? null : hitId);
        }
      } else if (selectedRef.current) {
        onSelectRef.current(null);
      }
    };

    const handlePointerUp = () => {
      if (gamePhaseRef.current === 'gameplay' && isDraggingFallback) {
        isDraggingFallback = false;
        renderer.domElement.style.cursor = 'grab';
        if (dragMovedDist < 6) {
          const rect = renderer.domElement.getBoundingClientRect();
          if (rect.width && rect.height) {
            triggerRaycastInteract(
              ((dragStartX - rect.left) / rect.width) * 2 - 1,
              -((dragStartY - rect.top) / rect.height) * 2 + 1,
            );
          }
        }
      }
    };

    const handleWheel = (ev: WheelEvent) => {
      if (gamePhaseRef.current !== 'gameplay') return;
      if (simVisualsRef.current?.commandModeOpen || pausedRef.current) return;
      camDist = THREE.MathUtils.clamp(camDist + ev.deltaY * 0.004, 2.6, 7.4);
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);

    // Native Mobile 3D Canvas Touch Look & Orbit Handlers
    let activeTouchLookId: number | null = null;
    let lastTouchLookX = 0;
    let lastTouchLookY = 0;

    const handleCanvasTouchStart = (ev: TouchEvent) => {
      if (gamePhaseRef.current !== 'gameplay') return;
      if (
        simVisualsRef.current?.commandModeOpen ||
        simVisualsRef.current?.mapOpen ||
        simVisualsRef.current?.quickMenuOpen ||
        pausedRef.current
      ) {
        return;
      }
      const touch = ev.changedTouches[0];
      // Only capture touch look on the right 65% of the screen so left thumb has clean movement
      if (touch && activeTouchLookId === null && touch.clientX > window.innerWidth * 0.35) {
        activeTouchLookId = touch.identifier;
        lastTouchLookX = touch.clientX;
        lastTouchLookY = touch.clientY;
      }
    };

    const handleCanvasTouchMove = (ev: TouchEvent) => {
      if (activeTouchLookId === null) return;
      for (let i = 0; i < ev.changedTouches.length; i++) {
        const touch = ev.changedTouches[i];
        if (touch.identifier === activeTouchLookId) {
          const dx = touch.clientX - lastTouchLookX;
          const dy = touch.clientY - lastTouchLookY;
          lastTouchLookX = touch.clientX;
          lastTouchLookY = touch.clientY;
          applyLookDelta(dx, dy);
          break;
        }
      }
    };

    const handleCanvasTouchEnd = (ev: TouchEvent) => {
      if (activeTouchLookId === null) return;
      for (let i = 0; i < ev.changedTouches.length; i++) {
        const touch = ev.changedTouches[i];
        if (touch.identifier === activeTouchLookId) {
          activeTouchLookId = null;
          break;
        }
      }
    };

    renderer.domElement.addEventListener('touchstart', handleCanvasTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', handleCanvasTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', handleCanvasTouchEnd, { passive: true });
    renderer.domElement.addEventListener('touchcancel', handleCanvasTouchEnd, { passive: true });

    let isMobile = width < 768;
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      isMobile = w < 768;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      outpost.fpCamera.aspect = w / h;
      outpost.fpCamera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer) {
        composer.setPixelRatio(targetPixelRatio);
        composer.setSize(w, h);
      }
      if (stormPass) {
        (stormPass.uniforms.uResolution.value as THREE.Vector2).set(w, h);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Helper: compute exact third-person camera & lookAt from player foot position
    const computeThirdPersonRig = (
      px: number,
      footY: number,
      pz: number,
      yaw: number,
      pitch: number,
      outCam: THREE.Vector3,
      outLook: THREE.Vector3,
    ) => {
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const fwdX = Math.sin(yaw);
      const fwdZ = Math.cos(yaw);

      const cx = px - fwdX * camDist * cosP;
      const cz = pz - fwdZ * camDist * cosP;
      const minFloorY = gAt(cx, cz) + 0.58;
      const cy = Math.max(footY + 1.48 + sinP * camDist, minFloorY);

      outCam.set(cx, cy, cz);
      outLook.set(px + fwdX * 1.8 * cosP, footY + 1.24 - sinP * 1.4, pz + fwdZ * 1.8 * cosP);
    };

    // Reusable scratch vectors (zero GC in loop)
    const _targetCam = new THREE.Vector3();
    const _targetLook = new THREE.Vector3();
    const _sceneA = new THREE.Vector3();
    const _sceneB = new THREE.Vector3();
    const _lookA = new THREE.Vector3();
    const _lookB = new THREE.Vector3();
    const _tpCam = new THREE.Vector3();
    const _tpLook = new THREE.Vector3();
    const _clearFogColor = new THREE.Color('#d8784a');
    const _stormFogColor = new THREE.Color('#a8522b');
    const _tintDustDevil = new THREE.Vector3(1.24, 0.78, 0.50);
    const _tintKatabatic = new THREE.Vector3(1.12, 0.84, 0.68);
    const _tintElectro = new THREE.Vector3(1.26, 0.72, 0.58);

    let frameId = 0;
    let stormPassIntensity = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer!.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed || !renderer) return;
      const delta = Math.min(clock.getDelta(), isSoftwareGl ? 0.35 : 0.12);
      const elapsed = clock.getElapsedTime();
      const isStatic = reducedMotionRef.current;
      const phase = gamePhaseRef.current;

      // Reset astronaut/camera cleanly when returning to Landing or starting Prologue/Briefing
      if (phase !== prevPhase) {
        if (phase === 'landing' || phase === 'prologue') {
          playerPos.set(outpost.astroBasePos.x, outpost.astroBasePos.z);
          playerFootY = gAt(outpost.astroBasePos.x, outpost.astroBasePos.z);
          smoothFootY = playerFootY;
          playerYaw = outpost.astroBasePos.yaw;
          camYaw = initPlayerYaw;
          camPitch = THIRD_PERSON_INIT_PITCH;
          totalDistanceMoved = 0;
          totalLookDelta = 0;
          moveTutorialReported = false;
          lookTutorialReported = false;
          walkPhase = 0;
          walkBlend = 0;
          physicsWorld?.teleportPlayer(outpost.astroBasePos.x, outpost.astroBasePos.z);
          if (document.pointerLockElement === renderer.domElement) {
            document.exitPointerLock?.();
          }
        } else if (phase === 'briefing') {
          playerPos.set(outpost.astroBasePos.x, outpost.astroBasePos.z);
          playerFootY = gAt(outpost.astroBasePos.x, outpost.astroBasePos.z);
          smoothFootY = playerFootY;
          playerYaw = initPlayerYaw;
          camYaw = initPlayerYaw;
          camPitch = THIRD_PERSON_INIT_PITCH;
          physicsWorld?.teleportPlayer(outpost.astroBasePos.x, outpost.astroBasePos.z);
          computeThirdPersonRig(
            playerPos.x,
            playerFootY,
            playerPos.y,
            camYaw,
            camPitch,
            _tpCam,
            _tpLook,
          );
        } else if (phase === 'gameplay' && prevPhase !== 'briefing') {
          playerPos.set(outpost.astroBasePos.x, outpost.astroBasePos.z);
          playerFootY = gAt(outpost.astroBasePos.x, outpost.astroBasePos.z);
          smoothFootY = playerFootY;
          playerYaw = initPlayerYaw;
          camYaw = initPlayerYaw;
          camPitch = THIRD_PERSON_INIT_PITCH;
          totalDistanceMoved = 0;
          moveTutorialReported = false;
          reportedCrystalIds.clear();
          physicsWorld?.teleportPlayer(outpost.astroBasePos.x, outpost.astroBasePos.z);
        }
        prevPhase = phase;
      }

      // Live celestial sky (Phobos 7.65h + Deimos 30.3h + Henyey-Greenstein blue aureole & Beer-Lambert tau)
      const sim = simVisualsRef.current;
      envBuild.updateCelestialAndSky(isStatic ? 0 : elapsed, sim?.dustTau ?? 1.0);

      // Update decal fades & ballistic kicked dust (y'' = -3.73 m/s^2)
      const updateDecalFade = (pool: DecalSlot[]) => {
        for (const slot of pool) {
          if (!slot.mesh.visible) continue;
          slot.age += delta;
          if (slot.age >= slot.maxAge) {
            slot.mesh.visible = false;
          } else {
            slot.mat.opacity = 0.72 * (1 - slot.age / slot.maxAge);
          }
        }
      };
      updateDecalFade(footprintPool);
      updateDecalFade(roverTrackPool);

      let anyDustMoved = false;
      for (let i = 0; i < KICK_PARTICLE_COUNT; i++) {
        if (kickAge[i] >= kickMaxAge[i]) continue;
        anyDustMoved = true;
        kickAge[i] += delta;
        if (kickAge[i] >= kickMaxAge[i]) {
          kickPositions[i * 3 + 1] = -999;
          continue;
        }
        kickVel[i * 3 + 1] -= MARS_FACTS.GRAVITY_MS2 * delta;
        kickPositions[i * 3] += kickVel[i * 3] * delta;
        kickPositions[i * 3 + 1] += kickVel[i * 3 + 1] * delta;
        kickPositions[i * 3 + 2] += kickVel[i * 3 + 2] * delta;
        const gy = groundHeightAt(kickPositions[i * 3], kickPositions[i * 3 + 2], envBuild.terrainGrid);
        if (kickPositions[i * 3 + 1] < gy + 0.02) {
          kickPositions[i * 3 + 1] = gy + 0.02;
          kickVel[i * 3] *= 0.45;
          kickVel[i * 3 + 1] = 0;
          kickVel[i * 3 + 2] *= 0.45;
        }
      }
      if (anyDustMoved) {
        (kickGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }

      // Live lighting & environmental hazards driven by Simulation State
      const alloc = powerAllocRef.current;
      const habFactor = 0.55 + (alloc.habitat / 6) * 0.85;
      const ghFactor = 0.55 + (alloc.greenhouse / 6) * 0.95;
      outpost.matWarmWindow.emissiveIntensity = 1.1 * habFactor;
      if (outpost.habWindowGlow) {
        outpost.habWindowGlow.intensity = 2.1 * habFactor;
      }
      outpost.ghLight.intensity = sim?.greenhouseFrost ? 0.65 : 2.2 * ghFactor;

      // Data-driven Dust Storm lighting (Opportunity curve + active localized weatherEvent surge)
      const wxActive = phase === 'gameplay' && Boolean(sim?.weatherEvent?.active);
      const targetDustFactor = phase === 'gameplay' && sim ? sim.dustFactor : 1.0;
      const targetSunIntensity = 3.05 * Math.max(0.28, targetDustFactor) * (wxActive ? 0.78 : 1.0);
      const targetHemiIntensity = 1.22 * (0.48 + targetDustFactor * 0.52);
      const stormSeverity = THREE.MathUtils.clamp(
        (1.0 - targetDustFactor) / 0.72 + (wxActive ? 0.35 : 0),
        0,
        1,
      );
      const targetFogDensity = 0.0072 + stormSeverity * 0.036;

      sunLight.intensity = THREE.MathUtils.damp(sunLight.intensity, targetSunIntensity, 3.0, delta);
      if (phase === 'gameplay') {
        const shadowTexel = 72 / 1536;
        const sx = Math.round(playerPos.x / shadowTexel) * shadowTexel;
        const sz = Math.round(playerPos.y / shadowTexel) * shadowTexel;
        sunLight.target.position.set(sx, 0, sz);
        sunLight.position.set(sx + 26, 14.5, sz - 24);
      } else {
        sunLight.target.position.set(0, 0, 0);
        sunLight.position.set(26, 14.5, -24);
      }
      sunLight.target.updateMatrixWorld();

      hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, targetHemiIntensity, 3.0, delta);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density = THREE.MathUtils.damp(scene.fog.density, targetFogDensity, 2.5, delta);
        scene.fog.color.lerpColors(_clearFogColor, _stormFogColor, stormSeverity);
      }
      envBuild.dustMat.opacity = 0.68 + stormSeverity * 0.3;

      // High-fidelity 'Dust Storm' shader pass (orange haze blend + grain + radial chromatic aberration)
      stormPassIntensity = THREE.MathUtils.damp(
        stormPassIntensity,
        wxActive ? 1.0 : 0.0,
        3.2,
        delta,
      );
      if (stormPass) {
        stormPass.uniforms.uIntensity.value = stormPassIntensity;
        stormPass.uniforms.uTime.value = isStatic ? 0 : elapsed;

        const wxKind = sim?.weatherEvent?.kind;
        if (wxKind === 'electrostatic-squall') {
          stormPass.uniforms.uAberration.value = isStatic ? 0.006 : 0.0145;
          stormPass.uniforms.uGrainStrength.value = isStatic ? 0.03 : 0.085;
          stormPass.uniforms.uHazeStrength.value = 0.44;
          (stormPass.uniforms.uDustTint.value as THREE.Vector3).lerp(_tintElectro, 0.2);
        } else if (wxKind === 'katabatic-gust') {
          stormPass.uniforms.uAberration.value = isStatic ? 0.004 : 0.0085;
          stormPass.uniforms.uGrainStrength.value = isStatic ? 0.025 : 0.06;
          stormPass.uniforms.uHazeStrength.value = 0.38;
          (stormPass.uniforms.uDustTint.value as THREE.Vector3).lerp(_tintKatabatic, 0.2);
        } else {
          stormPass.uniforms.uAberration.value = isStatic ? 0.005 : 0.0115;
          stormPass.uniforms.uGrainStrength.value = isStatic ? 0.03 : 0.072;
          stormPass.uniforms.uHazeStrength.value = 0.48;
          (stormPass.uniforms.uDustTint.value as THREE.Vector3).lerp(_tintDustDevil, 0.2);
        }
      }

      // Settled solar panel dust coat
      const dustCoatTarget = phase === 'gameplay' && sim?.panelsDusty ? 0.52 : 0.0;
      outpost.solarDustMats.forEach((m) => {
        m.opacity = THREE.MathUtils.damp(m.opacity, dustCoatTarget, 3.5, delta);
      });

      // Greenhouse frost overlay (M4)
      const frostTarget = phase === 'gameplay' && sim?.greenhouseFrost ? 0.64 : 0.0;
      outpost.ghFrostMat.opacity = THREE.MathUtils.damp(outpost.ghFrostMat.opacity, frostTarget, 3.5, delta);

      // Tank 2 O2 vapour leak stream (strictly gated on S1.6 / M1 activeObjective.isTank2)
      const isTank2ActiveNow =
        phase === 'gameplay' &&
        Boolean(sim?.tank2LeakActive) &&
        Boolean(sim?.activeObjective?.isTank2);
      outpost.tank2LeakPoints.visible = isTank2ActiveNow;
      if (isTank2ActiveNow && !isStatic) {
        outpost.tank2ValveWheel.rotation.z = Math.sin(elapsed * 8) * 0.05;
        const lAttr = outpost.tank2LeakPoints.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < lAttr.count; i++) {
          let lz = lAttr.getZ(i) + delta * 1.35;
          let ly = lAttr.getY(i) + delta * 0.55;
          if (lz > 1.45) {
            lz = 0.48;
            ly = 1.12 + (i % 5) * 0.03;
          }
          lAttr.setY(i, ly);
          lAttr.setZ(i, lz);
        }
        lAttr.needsUpdate = true;
      }

      // Water Recycler status gauge (M3)
      if (sim?.recyclerDegraded) {
        outpost.recyclerStatusMat.color.set('#E85D04');
        outpost.recyclerStatusMat.emissive.set('#DC2626');
      } else {
        outpost.recyclerStatusMat.color.set('#22C55E');
        outpost.recyclerStatusMat.emissive.set('#22C55E');
      }

      // Rover Nameplate + Mood Lights (paired with text/icon in HUD)
      if (sim) {
        outpost.updateRoverNameplate(sim.roverName);
        if (sim.roverMood === 'critical') {
          const fastBlink = Math.sin(elapsed * 10) > 0 ? 2.4 : 0.45;
          outpost.roverEyeMat.color.set('#DC2626');
          outpost.roverEyeMat.emissive.set('#DC2626');
          outpost.roverEyeMat.emissiveIntensity = fastBlink;
        } else if (sim.roverMood === 'lowPower') {
          const slowBlink = 0.6 + 0.4 * Math.sin(elapsed * 3.0);
          outpost.roverEyeMat.color.set('#FFB703');
          outpost.roverEyeMat.emissive.set('#FFB703');
          outpost.roverEyeMat.emissiveIntensity = 1.6 * slowBlink;
        } else {
          outpost.roverEyeMat.color.set('#22C55E');
          outpost.roverEyeMat.emissive.set('#22C55E');
          outpost.roverEyeMat.emissiveIntensity = 1.85;
        }
      }

      // Single Source of Truth: ONE 3D Diamond Marker + ONE Ground Ring + Floating Prompt Label + Ground Chevron Path Guide
      const activeObj = phase === 'gameplay' ? sim?.activeObjective : undefined;
      if (activeObj && activeObj.showMarkerAndRing) {
        const objY = gAt(activeObj.x, activeObj.z);
        outpost.zoneBeaconGroup.visible = true;
        outpost.zoneBeaconGroup.position.set(activeObj.x, objY, activeObj.z);
        outpost.zoneBeaconMat.color.set(activeObj.colorHex);
        outpost.zoneBeaconMat.emissive.set(activeObj.colorHex);
        const ringMat = outpost.zoneBeaconRing.material as THREE.MeshBasicMaterial;
        if (ringMat && ringMat.color) {
          ringMat.color.set(activeObj.colorHex);
        }
        const bobOffset = isStatic ? 0 : Math.sin(elapsed * 3.0) * 0.14;
        outpost.zoneBeaconDiamond.position.y = 2.35 + bobOffset;
        outpost.zoneBeaconLabelSprite.position.y = 3.08 + bobOffset;
        const beaconPromptText =
          activeObj.id === 'weather-shelter'
            ? '(E) Enter Shelter'
            : activeObj.id === 'act1-yellow-light'
              ? 'Walk Here'
              : '(E) Open Panel';
        outpost.updateZoneBeaconLabel(beaconPromptText, activeObj.colorHex);
        if (!isStatic) {
          outpost.zoneBeaconDiamond.rotation.y += delta * 1.8;
        }
        outpost.zoneBeaconRing.scale.setScalar(
          1.0 + (isStatic ? 0 : Math.sin(elapsed * 4.0) * 0.12),
        );
      } else {
        outpost.zoneBeaconGroup.visible = false;
      }

      // Ground Chevron Path Guide (available from start when Guide: On, hidden within 3 m; hidden in free-roam)
      if (phase === 'gameplay' && activeObj && activeObj.id !== 'free-roam-exploration') {
        const guideState = computePathGuideState({
          playerX: playerPos.x,
          playerZ: playerPos.y,
          objective: activeObj,
          guideEnabled: sim?.guideEnabled ?? true,
          layout: activeLayout,
          elapsedSec: elapsed,
          reducedMotion: isStatic,
        });
        if (guideState.visible && guideState.chevrons.length > 0) {
          chevronInstancedMesh.visible = true;
          chevronMat.color.set(activeObj.colorHex);
          const count = Math.min(MAX_CHEVRONS, guideState.chevrons.length);
          chevronInstancedMesh.count = count;
          for (let i = 0; i < count; i++) {
            const ch = guideState.chevrons[i];
            const cy = gAt(ch.x, ch.z) + 0.09;
            _chevronPos.set(ch.x, cy, ch.z);
            _chevronEuler.set(0, ch.yaw, 0);
            _chevronQuat.setFromEuler(_chevronEuler);
            const scaleVal = (0.72 + 0.42 * ch.opacity) * ch.pulse;
            _chevronScale.set(scaleVal, 1, scaleVal);
            _chevronMatrix.compose(_chevronPos, _chevronQuat, _chevronScale);
            chevronInstancedMesh.setMatrixAt(i, _chevronMatrix);
          }
          chevronInstancedMesh.instanceMatrix.needsUpdate = true;
        } else {
          chevronInstancedMesh.visible = false;
          chevronInstancedMesh.count = 0;
        }
      } else {
        chevronInstancedMesh.visible = false;
        chevronInstancedMesh.count = 0;
      }

      // Localized Mars Weather Vortex (Dust Devil / Squall) + Habitat Airlock Shelter Ring
      outpost.dustDevilGroup.visible = wxActive;
      outpost.habShelterGroup.visible = wxActive;
      if (!wxActive) {
        shelterSentThisEvent = false;
      }
      if (wxActive && sim?.weatherEvent) {
        const wxX = sim.weatherEvent.x + (isStatic ? 0 : Math.sin(elapsed * 0.45) * 1.45);
        const wxZ = sim.weatherEvent.z + (isStatic ? 0 : Math.cos(elapsed * 0.38) * 1.45);
        outpost.dustDevilGroup.position.set(wxX, gAt(wxX, wxZ), wxZ);

        if (!isStatic) {
          const speedScale = sim.weatherEvent.kind === 'dust-devil' ? 1.0 : 0.72;
          outpost.dustDevilFunnel.rotation.y += delta * 4.2 * speedScale;
          const vAttr = outpost.dustDevilPoints.geometry.attributes.position as THREE.BufferAttribute;
          const seeds = outpost.dustDevilParticleSeeds;
          for (let i = 0; i < vAttr.count; i++) {
            const baseAngle = seeds[i * 3];
            let hNorm = seeds[i * 3 + 1] + delta * 0.28 * speedScale;
            if (hNorm > 1) hNorm -= 1;
            seeds[i * 3 + 1] = hNorm;
            const swirlSpeed = seeds[i * 3 + 2];
            const ang = baseAngle + elapsed * swirlSpeed * speedScale;
            const rad = 0.42 + hNorm * 1.68;
            vAttr.setXYZ(i, Math.cos(ang) * rad, hNorm * 7.2, Math.sin(ang) * rad);
          }
          vAttr.needsUpdate = true;
        }

        const shelterPulse = 0.5 + 0.5 * Math.sin(elapsed * 6.0);
        outpost.habShelterRing.scale.setScalar(1.0 + shelterPulse * 0.24);
        outpost.habShelterDiamond.position.y = 2.75 + Math.sin(elapsed * 4.2) * 0.2;
        outpost.habShelterDiamond.rotation.y += delta * 2.8;
      }

      // Ensure duplicate powerBeacon ring/diamond stay hidden; console screen glows only when Tank 2 is active
      const beaconPulse = 0.5 + 0.5 * Math.sin(elapsed * 4.2);
      outpost.powerBeaconRing.visible = false;
      outpost.powerBeaconDiamond.visible = false;
      outpost.powerBeaconRingMat.opacity = 0;
      const isTank2ObjectiveNow = phase === 'gameplay' && Boolean(activeObj?.isTank2);
      outpost.matConsoleScreen.emissiveIntensity = isTank2ObjectiveNow
        ? 1.8 + beaconPulse * 0.6
        : 0.45;
      if (outpost.bollardLampMat) {
        outpost.bollardLampMat.emissiveIntensity =
          wxActive || sim?.radiationAlert ? 2.3 + Math.sin(elapsed * 5.0) * 0.4 : 1.15;
      }

      // Solar-wind aurora & space weather cue (Prologue Scene 4 OR M5 Radiation Alert)
      let auroraTarget = 0.0;
      if (phase === 'prologue') {
        const pt = prologueElapsedRef.current;
        if (pt >= 21 && pt <= 29) {
          const local = (pt - 21) / 8;
          auroraTarget = Math.sin(local * Math.PI) * 0.92;
        }
      } else if (phase === 'gameplay' && sim?.radiationAlert) {
        auroraTarget = 0.85;
      }
      envBuild.auroraMat.uniforms.uTime.value = elapsed;
      envBuild.auroraMat.uniforms.uIntensity.value = THREE.MathUtils.damp(
        envBuild.auroraMat.uniforms.uIntensity.value,
        auroraTarget,
        3.5,
        delta,
      );

      // Pulse walkway amber beacons brighter during Scene 4 or Radiation Alert + staggered colony lights
      envBuild.beaconLights.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && 'emissiveIntensity' in mat) {
          mat.emissiveIntensity = auroraTarget > 0.15 ? 2.6 + Math.sin(elapsed * 6.0) * 0.8 : 1.75;
        }
      });
      outpost.colonyBlinkingLights.forEach((mesh, idx) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && 'emissiveIntensity' in mat) {
          if (isStatic) {
            mat.emissiveIntensity = 1.5;
          } else {
            const pulse = 0.5 + 0.5 * Math.sin(elapsed * 3.4 + idx * 1.15);
            mat.emissiveIntensity = 0.55 + pulse * 1.65;
          }
        }
      });

      // =========================================================================
      // MODE 1: LANDING SCREEN (Title Screen + Station Close-up Inspection)
      // =========================================================================
      if (phase === 'landing') {
        const activeKey = selectedRef.current ?? 'overview';
        const preset = CAMERA_PRESETS[activeKey];
        _targetCam.set(preset.pos[0], preset.pos[1], preset.pos[2]);
        _targetLook.set(preset.look[0], preset.look[1], preset.look[2]);
        if (isMobile && activeKey === 'overview') {
          _targetCam.set(1.8, 4.4, 16.5);
          _targetLook.set(4.2, 1.35, -0.4);
        }

        if (!isStatic) {
          currentParallaxX = THREE.MathUtils.damp(currentParallaxX, targetParallaxX, 4.0, delta);
          currentParallaxY = THREE.MathUtils.damp(currentParallaxY, targetParallaxY, 4.0, delta);

          const camLerpRate = 6.5;
          currentCamPos.x = THREE.MathUtils.damp(
            currentCamPos.x,
            _targetCam.x + currentParallaxX * (activeKey === 'overview' ? 1.0 : 0.35),
            camLerpRate,
            delta,
          );
          currentCamPos.y = THREE.MathUtils.damp(
            currentCamPos.y,
            _targetCam.y + currentParallaxY * (activeKey === 'overview' ? 0.65 : 0.25),
            camLerpRate,
            delta,
          );
          currentCamPos.z = THREE.MathUtils.damp(currentCamPos.z, _targetCam.z, camLerpRate, delta);

          currentLookAt.x = THREE.MathUtils.damp(currentLookAt.x, _targetLook.x, camLerpRate, delta);
          currentLookAt.y = THREE.MathUtils.damp(currentLookAt.y, _targetLook.y, camLerpRate, delta);
          currentLookAt.z = THREE.MathUtils.damp(currentLookAt.z, _targetLook.z, camLerpRate, delta);
        } else {
          currentCamPos.copy(_targetCam);
          currentLookAt.copy(_targetLook);
        }

        camera.position.copy(currentCamPos);
        camera.lookAt(currentLookAt);

        // Idle natural human pose & elbow-articulated wave
        outpost.astroGroup.position.set(
          outpost.astroBasePos.x,
          gAt(outpost.astroBasePos.x, outpost.astroBasePos.z),
          outpost.astroBasePos.z,
        );
        outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw;

        if (!isStatic) {
          const breath = Math.sin(elapsed * 2.0);
          const sway = Math.sin(elapsed * 0.85);
          outpost.astroPelvisGroup.position.y = 0.858 + breath * 0.008;
          outpost.astroPelvisGroup.rotation.z = sway * 0.024;
          outpost.astroPelvisGroup.rotation.y = sway * 0.035;
          outpost.astroTorsoGroup.rotation.y = -sway * 0.04;
          outpost.astroTorsoGroup.rotation.x = breath * 0.016;

          outpost.astroLeftLegPivot.rotation.x = -0.04 + sway * 0.015;
          outpost.astroRightLegPivot.rotation.x = -0.07 - sway * 0.015;
          outpost.astroLeftKneePivot.rotation.x = 0.06;
          outpost.astroRightKneePivot.rotation.x = 0.1;
          outpost.astroLeftAnklePivot.rotation.x = -0.02;
          outpost.astroRightAnklePivot.rotation.x = -0.03;

          outpost.astroHeadGroup.rotation.y = Math.sin(elapsed * 0.72) * 0.16;
          outpost.astroHeadGroup.rotation.x = Math.sin(elapsed * 0.55) * 0.04;
          outpost.astroHeadGroup.rotation.z = Math.sin(elapsed * 0.72) * 0.035;

          outpost.astroLeftArmPivot.rotation.z = -0.11 + Math.sin(elapsed * 1.5) * 0.025;
          outpost.astroLeftArmPivot.rotation.x = 0.04;
          outpost.astroLeftElbowPivot.rotation.x = -0.36 + Math.sin(elapsed * 1.5) * 0.04;
          outpost.astroLeftElbowPivot.rotation.z = 0;

          const waveCycle = (elapsed % 6.0) / 6.0;
          if (waveCycle < 0.42) {
            const strength = Math.sin((waveCycle / 0.42) * Math.PI);
            outpost.astroRightArmPivot.rotation.z = 0.11 + 1.38 * strength;
            outpost.astroRightArmPivot.rotation.x = -0.34 * strength;
            outpost.astroRightElbowPivot.rotation.x = -0.35 - 0.92 * strength;
            outpost.astroRightElbowPivot.rotation.z = Math.sin(elapsed * 8.2) * 0.34 * strength;
          } else {
            outpost.astroRightArmPivot.rotation.z = THREE.MathUtils.damp(
              outpost.astroRightArmPivot.rotation.z,
              0.11,
              6,
              delta,
            );
            outpost.astroRightArmPivot.rotation.x = THREE.MathUtils.damp(
              outpost.astroRightArmPivot.rotation.x,
              0.04,
              6,
              delta,
            );
            outpost.astroRightElbowPivot.rotation.x = THREE.MathUtils.damp(
              outpost.astroRightElbowPivot.rotation.x,
              -0.36,
              6,
              delta,
            );
            outpost.astroRightElbowPivot.rotation.z = THREE.MathUtils.damp(
              outpost.astroRightElbowPivot.rotation.z,
              0,
              6,
              delta,
            );
          }
        } else {
          outpost.astroPelvisGroup.position.y = 0.86;
          outpost.astroPelvisGroup.rotation.set(0, 0, 0);
          outpost.astroTorsoGroup.rotation.set(0, 0, 0);
          outpost.astroLeftLegPivot.rotation.x = 0;
          outpost.astroRightLegPivot.rotation.x = 0;
          outpost.astroLeftKneePivot.rotation.x = 0.05;
          outpost.astroRightKneePivot.rotation.x = 0.05;
          outpost.astroLeftAnklePivot.rotation.x = 0;
          outpost.astroRightAnklePivot.rotation.x = 0;
          outpost.astroLeftArmPivot.rotation.set(0, 0, -0.1);
          outpost.astroRightArmPivot.rotation.set(0, 0, 0.1);
          outpost.astroLeftElbowPivot.rotation.set(-0.34, 0, 0);
          outpost.astroRightElbowPivot.rotation.set(-0.34, 0, 0);
        }
      }

      // =========================================================================
      // MODE 2: CINEMATIC PROLOGUE (5-Scene 34s Sequence using same 3D scene)
      // =========================================================================
      else if (phase === 'prologue') {
        const t = THREE.MathUtils.clamp(prologueElapsedRef.current, 0, PROLOGUE_DURATION_SEC);
        const ax = outpost.astroBasePos.x;
        const az = outpost.astroBasePos.z;
        const ay = gAt(ax, az);

        outpost.astroGroup.position.set(ax, ay, az);
        outpost.astroPelvisGroup.position.y = isStatic ? 0.86 : 0.858 + Math.sin(elapsed * 1.9) * 0.007;
        outpost.astroPelvisGroup.rotation.set(0, 0, 0);
        outpost.astroTorsoGroup.rotation.set(isStatic ? 0 : Math.sin(elapsed * 1.9) * 0.012, 0, 0);
        outpost.astroLeftLegPivot.rotation.x = -0.04;
        outpost.astroRightLegPivot.rotation.x = -0.04;
        outpost.astroLeftKneePivot.rotation.x = 0.06;
        outpost.astroRightKneePivot.rotation.x = 0.06;
        outpost.astroLeftAnklePivot.rotation.x = -0.02;
        outpost.astroRightAnklePivot.rotation.x = -0.02;
        outpost.astroLeftArmPivot.rotation.set(0.03, 0, -0.11);
        outpost.astroLeftElbowPivot.rotation.set(-0.35, 0, 0);
        outpost.astroRightArmPivot.rotation.x = THREE.MathUtils.damp(
          outpost.astroRightArmPivot.rotation.x,
          0.03,
          6,
          delta,
        );
        outpost.astroRightArmPivot.rotation.z = THREE.MathUtils.damp(
          outpost.astroRightArmPivot.rotation.z,
          0.11,
          5,
          delta,
        );
        outpost.astroRightElbowPivot.rotation.x = THREE.MathUtils.damp(
          outpost.astroRightElbowPivot.rotation.x,
          -0.35,
          6,
          delta,
        );
        outpost.astroRightElbowPivot.rotation.z = THREE.MathUtils.damp(
          outpost.astroRightElbowPivot.rotation.z,
          0,
          6,
          delta,
        );

        // Compute target third-person pose for exact Scene 5 handoff
        computeThirdPersonRig(
          ax,
          ay,
          az,
          THIRD_PERSON_INIT_YAW,
          THIRD_PERSON_INIT_PITCH,
          _tpCam,
          _tpLook,
        );

        if (t < 4) {
          // Shot 1 (0-4s): MARS OUTPOST · SOL 1 — Wide establishing sunrise over outpost
          const u = easeInOutCubic(t / 4);
          _sceneA.set(-12.0, 7.2, 18.5);
          _sceneB.set(-5.5, 5.0, 15.2);
          _lookA.set(3.5, 1.2, 0.0);
          _lookB.set(4.0, 1.5, 0.5);
          _targetCam.lerpVectors(_sceneA, _sceneB, isStatic ? 0.5 : u);
          _targetLook.lerpVectors(_lookA, _lookB, isStatic ? 0.5 : u);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw;
        } else if (t < 8) {
          // Shot 2 (4-8s): HABITAT — your home on Mars
          const u = easeInOutCubic((t - 4) / 4);
          _sceneA.set(-2.5, 3.8, 12.0);
          _sceneB.set(1.5, 3.2, 9.5);
          _lookA.set(0.0, 2.2, 5.2);
          _lookB.set(0.0, 2.0, 4.0);
          _targetCam.lerpVectors(_sceneA, _sceneB, isStatic ? 0.5 : u);
          _targetLook.lerpVectors(_lookA, _lookB, isStatic ? 0.5 : u);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw;
        } else if (t < 12) {
          // Shot 3 (8-12s): GREENHOUSE — fresh food and air
          const u = easeInOutCubic((t - 8) / 4);
          _sceneA.set(-6.5, 3.2, 0.0);
          _sceneB.set(-3.5, 2.6, -3.2);
          _lookA.set(-5.0, 2.2, -6.8);
          _lookB.set(-4.5, 2.0, -7.2);
          _targetCam.lerpVectors(_sceneA, _sceneB, isStatic ? 0.5 : u);
          _targetLook.lerpVectors(_lookA, _lookB, isStatic ? 0.5 : u);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw;
        } else if (t < 16) {
          // Shot 4 (12-16s): OXYGEN TANK 2 — keep it safe
          const u = easeInOutCubic((t - 12) / 4);
          _sceneA.set(2.8, 2.9, -4.2);
          _sceneB.set(4.2, 2.4, -6.0);
          _lookA.set(5.2, 1.8, -8.2);
          _lookB.set(5.5, 1.8, -8.0);
          _targetCam.lerpVectors(_sceneA, _sceneB, isStatic ? 0.5 : u);
          _targetLook.lerpVectors(_lookA, _lookB, isStatic ? 0.5 : u);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw;
        } else if (t < 20) {
          // Shot 5 (16-20s): ROVER RUSTY — your rover friend
          const u = easeInOutCubic((t - 16) / 4);
          _sceneA.set(3.2, 2.2, 7.2);
          _sceneB.set(1.8, 1.8, 8.8);
          _lookA.set(0.8, 1.0, 10.5);
          _lookB.set(0.4, 0.9, 10.8);
          _targetCam.lerpVectors(_sceneA, _sceneB, isStatic ? 0.5 : u);
          _targetLook.lerpVectors(_lookA, _lookB, isStatic ? 0.5 : u);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw;
        } else if (t < 24) {
          // Shot 6 (20-24s): SOLAR ARRAY — power for the base
          const u = easeInOutCubic((t - 20) / 4);
          _sceneA.set(10.5, 3.8, 4.2);
          _sceneB.set(6.8, 3.0, 2.2);
          _lookA.set(12.2, 2.2, -3.2);
          _lookB.set(10.2, 2.0, -4.2);
          _targetCam.lerpVectors(_sceneA, _sceneB, isStatic ? 0.5 : u);
          _targetLook.lerpVectors(_lookA, _lookB, isStatic ? 0.5 : u);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw;
        } else {
          // Shot 7 (24-28s): You are Commander Nova — Seamless swing behind Astronaut
          const u = easeInOutCubic((t - 24) / 4);
          _sceneA.set(2.8, 3.15, 8.2);
          _lookA.set(7.4, 2.35, -3.2);
          _targetCam.lerpVectors(_sceneA, _tpCam, isStatic ? 1 : u);
          _targetLook.lerpVectors(_lookA, _tpLook, isStatic ? 1 : u);

          const turnDiff = shortestAngleDiff(outpost.astroBasePos.yaw, THIRD_PERSON_INIT_YAW);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw + turnDiff * (isStatic ? 1 : u);
          outpost.astroHeadGroup.rotation.y = THREE.MathUtils.damp(
            outpost.astroHeadGroup.rotation.y,
            0,
            6,
            delta,
          );
        }

        const followRate = t >= 24 ? 10.0 : 5.5;
        currentCamPos.lerp(_targetCam, isStatic ? 1 : Math.min(1, delta * followRate));
        currentLookAt.lerp(_targetLook, isStatic ? 1 : Math.min(1, delta * followRate));
        camera.position.copy(currentCamPos);
        camera.lookAt(currentLookAt);
      }

      // =========================================================================
      // MODE 3: MISSION BRIEFING OVERLAY (Held cleanly on Third-Person Framing)
      // =========================================================================
      else if (phase === 'briefing') {
        outpost.astroGroup.position.set(
          playerPos.x,
          gAt(playerPos.x, playerPos.y),
          playerPos.y,
        );
        outpost.astroGroup.rotation.y = playerYaw;
        outpost.astroLeftLegPivot.rotation.x = -0.04;
        outpost.astroRightLegPivot.rotation.x = -0.04;
        outpost.astroLeftKneePivot.rotation.x = 0.06;
        outpost.astroRightKneePivot.rotation.x = 0.06;
        outpost.astroLeftAnklePivot.rotation.x = -0.02;
        outpost.astroRightAnklePivot.rotation.x = -0.02;
        outpost.astroLeftArmPivot.rotation.set(0.03, 0, -0.11);
        outpost.astroLeftElbowPivot.rotation.set(-0.35, 0, 0);
        outpost.astroHeadGroup.rotation.y = isStatic ? 0 : Math.sin(elapsed * 0.8) * 0.08;
        outpost.astroHeadGroup.rotation.x = 0;
        outpost.astroHeadGroup.rotation.z = 0;
        outpost.astroPelvisGroup.position.y = isStatic ? 0.86 : 0.858 + Math.sin(elapsed * 2.0) * 0.008;
        outpost.astroPelvisGroup.rotation.set(0, 0, 0);
        outpost.astroTorsoGroup.rotation.set(isStatic ? 0 : Math.sin(elapsed * 2.0) * 0.012, 0, 0);
        outpost.astroRightArmPivot.rotation.z = THREE.MathUtils.damp(
          outpost.astroRightArmPivot.rotation.z,
          0.11,
          6,
          delta,
        );
        outpost.astroRightArmPivot.rotation.x = THREE.MathUtils.damp(
          outpost.astroRightArmPivot.rotation.x,
          0.03,
          6,
          delta,
        );
        outpost.astroRightElbowPivot.rotation.x = THREE.MathUtils.damp(
          outpost.astroRightElbowPivot.rotation.x,
          -0.35,
          6,
          delta,
        );
        outpost.astroRightElbowPivot.rotation.z = THREE.MathUtils.damp(
          outpost.astroRightElbowPivot.rotation.z,
          0,
          6,
          delta,
        );

        computeThirdPersonRig(
          playerPos.x,
          gAt(playerPos.x, playerPos.y),
          playerPos.y,
          camYaw,
          camPitch,
          _tpCam,
          _tpLook,
        );
        currentCamPos.lerp(_tpCam, isStatic ? 1 : Math.min(1, delta * 8.0));
        currentLookAt.lerp(_tpLook, isStatic ? 1 : Math.min(1, delta * 8.0));
        camera.position.copy(currentCamPos);
        camera.lookAt(currentLookAt);
      }

      // =========================================================================
      // MODE 4: FREE-WALK EXPLORE + COMMAND MODE (3.73 m/s² Mars Gravity, 1P/3P)
      // =========================================================================
      else if (phase === 'gameplay') {
        const simState = simVisualsRef.current;
        const isFrozenInCommandMode =
          Boolean(simState?.commandModeOpen) ||
          Boolean(simState?.mapOpen) ||
          Boolean(simState?.quickMenuOpen) ||
          pausedRef.current;
        if (isFrozenInCommandMode) {
          if (manualCursorUnlock) {
            manualCursorUnlock = false;
            onCursorUnlockedRef.current?.(false);
          }
          if (document.pointerLockElement === renderer.domElement) {
            document.exitPointerLock?.();
          }
        }
        const uiInput = moveInputRef?.current;

        if (uiInput?.jumpRequested) {
          uiInput.jumpRequested = false;
          if (!isFrozenInCommandMode && playerGrounded) {
            playerJumpQueued = true;
            const localGrav = computeLocalMarsGravity(
              playerPos.x,
              playerPos.y,
              gAt(playerPos.x, playerPos.y),
            );
            lastJumpTelemetry = computeJumpTelemetry(
              PHYSICS_CONSTANTS.SUITED_TAKEOFF_MS,
              localGrav.gravityMs2,
            );
          }
        }

        const moveFwd = isFrozenInCommandMode
          ? 0
          : uiInput?.analogY !== undefined && Math.abs(uiInput.analogY) > 0.05
            ? uiInput.analogY
            : (keysDown.has('KeyW') || keysDown.has('ArrowUp') || uiInput?.forward ? 1 : 0) -
              (keysDown.has('KeyS') || keysDown.has('ArrowDown') || uiInput?.back ? 1 : 0);
        const moveStrafe = isFrozenInCommandMode
          ? 0
          : uiInput?.analogX !== undefined && Math.abs(uiInput.analogX) > 0.05
            ? uiInput.analogX
            : (keysDown.has('KeyD') || keysDown.has('ArrowRight') || uiInput?.right ? 1 : 0) -
              (keysDown.has('KeyA') || keysDown.has('ArrowLeft') || uiInput?.left ? 1 : 0);

        if (!isFrozenInCommandMode && uiInput) {
          if (Math.abs(uiInput.lookX) > 0.0001) {
            camYaw += uiInput.lookX * delta;
            totalLookDelta += Math.abs(uiInput.lookX * delta);
          }
          if (uiInput.lookY !== undefined && Math.abs(uiInput.lookY) > 0.0001) {
            camPitch = THREE.MathUtils.clamp(
              camPitch + uiInput.lookY * delta,
              -PHYSICS_CONSTANTS.CAMERA_PITCH_MAX_RAD,
              PHYSICS_CONSTANTS.CAMERA_PITCH_MAX_RAD,
            );
            totalLookDelta += Math.abs(uiInput.lookY * delta);
          }
          if (
            !lookTutorialReported &&
            tutorialStepRef.current === 'look' &&
            totalLookDelta >= Math.PI / 3
          ) {
            lookTutorialReported = true;
            onLookDoneRef.current();
          }
        }

        const isSprinting =
          keysDown.has('ShiftLeft') || keysDown.has('ShiftRight') || Boolean(uiInput?.sprint);
        let horizontalSpeed = 0;

        if (!isStatic && simState) {
          const roverActors: Array<{ x: number; z: number; radius: number }> = [
            { x: playerPos.x, z: playerPos.y, radius: 0.5 },
            ...crewAgents
              .filter((ag) => {
                const mem = simState.crew?.find((m) => m.id === ag.id);
                return !mem || mem.alive;
              })
              .map((ag) => ({ x: ag.x, z: ag.z, radius: 0.45 })),
          ];
          const roverSubSteps = debugModeRef.current && debugSpeedMult > 1 ? Math.ceil(debugSpeedMult) : 1;
          const roverDt = (delta * (debugModeRef.current ? debugSpeedMult : 1)) / roverSubSteps;
          const makeWayReqNow = roverMakeWayRequested;
          roverMakeWayRequested = false;

          // 120s Guidance Ladder: Rusty rolls a few meters toward the active objective (single source of truth)
          let roverFollowTargetX = playerPos.x;
          let roverFollowTargetZ = playerPos.y;
          if ((simState.guidanceStage ?? 0) >= 2 && !isFrozenInCommandMode) {
            const obj = simState.activeObjective;
            if (obj && obj.id !== 'free-roam-exploration') {
              const dxObj = obj.x - playerPos.x;
              const dzObj = obj.z - playerPos.y;
              const dObj = Math.hypot(dxObj, dzObj);
              if (dObj > 2.0) {
                const leadM = Math.min(4.5, dObj * 0.4);
                roverFollowTargetX = playerPos.x + (dxObj / dObj) * leadM;
                roverFollowTargetZ = playerPos.y + (dzObj / dObj) * leadM;
              }
            }
          }

          for (let sIdx = 0; sIdx < roverSubSteps; sIdx++) {
            roverController = stepRoverController(roverController, roverDt, {
              playerX: roverFollowTargetX,
              playerZ: roverFollowTargetZ,
              playerYaw,
              damaged: simState.roverDamaged,
              holdPosition: isFrozenInCommandMode,
              playerPushingIntoRover: lastRoverPushingInto,
              makeWayRequested: sIdx === 0 ? makeWayReqNow : false,
              canRoverOccupy: physicsWorld
                ? (fromX, fromZ, toX, toZ, yawRad) =>
                    physicsWorld!.isRoverPathClear(fromX, fromZ, toX, toZ, yawRad)
                : undefined,
              obstacles: outpostObstacles,
              actors: roverActors,
              rocks: roverRockObstacles,
              grid: envBuild.terrainGrid,
              layout: activeLayout,
            });
            if (roverController.makeWayJustStarted) {
              onRoverMakeWayRef.current?.();
            }
          }
          physicsWorld?.updateRoverTransform(
            roverController.x,
            roverController.y,
            roverController.z,
            roverController.yaw,
          );
        }

        if (physicsWorld && !isFrozenInCommandMode) {
          const prevX = playerPos.x;
          const prevZ = playerPos.y;
          const jumpReq = playerJumpQueued;
          playerJumpQueued = false;

          const subSteps = debugModeRef.current && debugSpeedMult > 1 ? Math.ceil(debugSpeedMult) : 1;
          const simStepDt = (delta * (debugModeRef.current ? debugSpeedMult : 1)) / subSteps;
          let snap = physicsWorld.getSnapshot();
          for (let sIdx = 0; sIdx < subSteps; sIdx++) {
            snap = physicsWorld.stepFrame(simStepDt, {
              moveFwd,
              moveStrafe,
              camYaw,
              sprint: isSprinting,
              jumpRequested: sIdx === 0 ? jumpReq : false,
              quickMode: quickModeRef.current,
            });
          }
          lastRoverPushingInto = snap.roverPushingInto;
          const landingEv = physicsWorld.consumeLastLanding();
          if (landingEv) {
            soundEngine.playLandingThud(landingEv.impactSpeedMs);
            landingDipY = isStatic ? 0 : Math.min(0.16, landingEv.impactSpeedMs * 0.032);
            spawnBallisticDust(snap.x, snap.footY, snap.z, 8, Math.min(1.5, landingEv.impactSpeedMs * 0.32));

            if (lastJumpTelemetry || landingEv.fallHeightM >= 0.32) {
              const ff = computeFreeFallMetrics(landingEv.fallHeightM, MARS_FACTS.GRAVITY_MS2);
              onLandingTelemetryRef.current?.({
                impactMs: Number(landingEv.impactSpeedMs.toFixed(2)),
                fallHeightM: Number(landingEv.fallHeightM.toFixed(2)),
                marsHangOrFallS: Number(
                  (lastJumpTelemetry ? lastJumpTelemetry.hangTimeSeconds : ff.fallTimeSeconds).toFixed(2),
                ),
                earthHangOrFallS: Number(
                  (lastJumpTelemetry ? lastJumpTelemetry.earthHangTimeSeconds : ff.earthFallTimeSeconds).toFixed(2),
                ),
                apexM: Number(
                  (lastJumpTelemetry ? lastJumpTelemetry.peakHeightMeters : landingEv.fallHeightM).toFixed(2),
                ),
                earthApexM: Number(
                  (lastJumpTelemetry ? lastJumpTelemetry.earthPeakHeightMeters : landingEv.fallHeightM * (MARS_FACTS.GRAVITY_MS2 / MARS_FACTS.EARTH_GRAVITY_MS2)).toFixed(2),
                ),
                isJump: Boolean(lastJumpTelemetry),
              });
              lastJumpTelemetry = null;
            }
          }

          playerPos.set(snap.x, snap.z);
          playerFootY = snap.footY;
          playerGrounded = snap.grounded;
          horizontalSpeed = snap.horizontalSpeedMs;
          if (isStatic || !snap.grounded) {
            smoothFootY = snap.footY;
            smoothFootYVel.v = 0;
          } else {
            smoothFootY = smoothDampScalar(smoothFootY, snap.footY, smoothFootYVel, 0.045, delta);
          }

          const actualDist = Math.hypot(snap.x - prevX, snap.z - prevZ);
          if (tutorialStepRef.current === 'move') {
            totalDistanceMoved += actualDist;
            const yellowX = outpost.astroBasePos.x + Math.sin(initPlayerYaw) * 7.0;
            const yellowZ = outpost.astroBasePos.z + Math.cos(initPlayerYaw) * 7.0;
            const distToYellowLight = Math.hypot(snap.x - yellowX, snap.z - yellowZ);
            if (
              !moveTutorialReported &&
              (totalDistanceMoved >= 7.0 || distToYellowLight <= 1.5)
            ) {
              moveTutorialReported = true;
              onMoveDoneRef.current();
            }
          } else {
            moveTutorialReported = false;
            totalDistanceMoved = 0;
          }
        } else {
          playerFootY = gAt(playerPos.x, playerPos.y);
          smoothFootY = playerFootY;
          smoothFootYVel.v = 0;
          lastRoverPushingInto = false;
        }

        visualHorizSpeed = isStatic
          ? horizontalSpeed
          : THREE.MathUtils.damp(visualHorizSpeed, horizontalSpeed, 14, delta);

        const isMoving = horizontalSpeed > 0.08 || moveFwd !== 0 || moveStrafe !== 0;
        walkBlend = isStatic
          ? isMoving && playerGrounded
            ? 1
            : 0
          : THREE.MathUtils.damp(walkBlend, isMoving && playerGrounded ? 1 : 0, 14, delta);
        if (isMoving && !isFrozenInCommandMode) {
          if (moveFwd !== 0 || moveStrafe !== 0) {
            const fwdX = Math.sin(camYaw);
            const fwdZ = Math.cos(camYaw);
            const rightX = -Math.cos(camYaw);
            const rightZ = Math.sin(camYaw);
            const vx = fwdX * moveFwd + rightX * moveStrafe;
            const vz = fwdZ * moveFwd + rightZ * moveStrafe;
            if (Math.hypot(vx, vz) > 0.01) {
              const desiredYaw = Math.atan2(vx, vz);
              playerYaw += shortestAngleDiff(playerYaw, desiredYaw) * Math.min(1, delta * 11);
            }
          }

          const strideCadence = Math.max(2.5, visualHorizSpeed * 3.8);
          walkPhase += delta * strideCadence;

          // Footstep bootprint decals, ballistic kicked dust & thin-CO2 footstep audio on half-cycle crossings
          const halfCycle = Math.floor(walkPhase / Math.PI);
          if (playerGrounded && horizontalSpeed > 0.14 && halfCycle !== lastStepHalfCycle) {
            lastStepHalfCycle = halfCycle;
            const side = halfCycle % 2 === 0 ? 1 : -1;
            const stepRightX = -Math.cos(playerYaw) * 0.14 * side;
            const stepRightZ = Math.sin(playerYaw) * 0.14 * side;
            const fx = playerPos.x + stepRightX;
            const fz = playerPos.y + stepRightZ;
            stampDecal(footprintPool, { idx: footprintCursor++ }, fx, fz, playerYaw);
            spawnBallisticDust(fx, playerFootY, fz, 2, horizontalSpeed > 1.1 ? 1.15 : 0.75);
            soundEngine.playFootstep(
              getSoftSandFactorAt(playerPos.x, playerPos.y, activeLayout.mode),
              horizontalSpeed > PHYSICS_CONSTANTS.MARS_SUITED_TRANSITION_MS,
            );
          }

          if (!playerGrounded) {
            // Mars 0.38g athletic jump tuck driven by grounded state
            outpost.astroLeftLegPivot.rotation.x = THREE.MathUtils.damp(
              outpost.astroLeftLegPivot.rotation.x,
              -0.34,
              10,
              delta,
            );
            outpost.astroRightLegPivot.rotation.x = THREE.MathUtils.damp(
              outpost.astroRightLegPivot.rotation.x,
              -0.12,
              10,
              delta,
            );
            outpost.astroLeftKneePivot.rotation.x = THREE.MathUtils.damp(
              outpost.astroLeftKneePivot.rotation.x,
              0.66,
              10,
              delta,
            );
            outpost.astroRightKneePivot.rotation.x = THREE.MathUtils.damp(
              outpost.astroRightKneePivot.rotation.x,
              0.38,
              10,
              delta,
            );
            outpost.astroLeftAnklePivot.rotation.x = 0.16;
            outpost.astroRightAnklePivot.rotation.x = 0.24;
            outpost.astroLeftArmPivot.rotation.x = -0.32;
            outpost.astroRightArmPivot.rotation.x = 0.18;
            outpost.astroLeftArmPivot.rotation.z = -0.32;
            outpost.astroRightArmPivot.rotation.z = 0.32;
            outpost.astroLeftElbowPivot.rotation.x = -0.78;
            outpost.astroRightElbowPivot.rotation.x = -0.62;
            outpost.astroPelvisGroup.position.y = 0.86;
            outpost.astroPelvisGroup.rotation.set(0, 0, 0);
            outpost.astroTorsoGroup.rotation.set(0.11, 0, 0);
          } else {
            const s = Math.sin(walkPhase);
            const c = Math.cos(walkPhase);
            const strideAmp = THREE.MathUtils.clamp(visualHorizSpeed / 1.4, 0.25, 1.0) * walkBlend;
            const leftHip = s * 0.52 * strideAmp;
            const rightHip = -s * 0.52 * strideAmp;
            const leftSwing = Math.max(0, -c) * strideAmp;
            const rightSwing = Math.max(0, c) * strideAmp;

            outpost.astroLeftLegPivot.rotation.x = leftHip;
            outpost.astroRightLegPivot.rotation.x = rightHip;
            outpost.astroLeftKneePivot.rotation.x = 0.08 + leftSwing * 0.85;
            outpost.astroRightKneePivot.rotation.x = 0.08 + rightSwing * 0.85;
            outpost.astroLeftAnklePivot.rotation.x = -leftHip * 0.32 - leftSwing * 0.22;
            outpost.astroRightAnklePivot.rotation.x = -rightHip * 0.32 - rightSwing * 0.22;

            outpost.astroLeftArmPivot.rotation.x = -s * 0.42 * strideAmp;
            outpost.astroRightArmPivot.rotation.x = s * 0.42 * strideAmp;
            outpost.astroLeftArmPivot.rotation.z = -0.12;
            outpost.astroRightArmPivot.rotation.z = 0.12;
            outpost.astroLeftElbowPivot.rotation.x = -0.42 - Math.max(0, s) * 0.32 * strideAmp;
            outpost.astroRightElbowPivot.rotation.x = -0.42 - Math.max(0, -s) * 0.32 * strideAmp;
            outpost.astroRightElbowPivot.rotation.z = 0;

            outpost.astroPelvisGroup.position.y = 0.848 + Math.abs(c) * 0.028 * strideAmp;
            outpost.astroPelvisGroup.rotation.y = s * 0.08 * strideAmp;
            outpost.astroPelvisGroup.rotation.z = c * 0.028 * strideAmp;
            outpost.astroTorsoGroup.rotation.y = -s * 0.09 * strideAmp;
            outpost.astroTorsoGroup.rotation.x = 0.075 * strideAmp;
          }
        } else {
          outpost.astroLeftLegPivot.rotation.x = THREE.MathUtils.damp(
            outpost.astroLeftLegPivot.rotation.x,
            -0.04,
            10,
            delta,
          );
          outpost.astroRightLegPivot.rotation.x = THREE.MathUtils.damp(
            outpost.astroRightLegPivot.rotation.x,
            -0.04,
            10,
            delta,
          );
          outpost.astroLeftKneePivot.rotation.x = THREE.MathUtils.damp(
            outpost.astroLeftKneePivot.rotation.x,
            0.06,
            10,
            delta,
          );
          outpost.astroRightKneePivot.rotation.x = THREE.MathUtils.damp(
            outpost.astroRightKneePivot.rotation.x,
            0.06,
            10,
            delta,
          );
          outpost.astroLeftAnklePivot.rotation.x = THREE.MathUtils.damp(
            outpost.astroLeftAnklePivot.rotation.x,
            -0.02,
            10,
            delta,
          );
          outpost.astroRightAnklePivot.rotation.x = THREE.MathUtils.damp(
            outpost.astroRightAnklePivot.rotation.x,
            -0.02,
            10,
            delta,
          );
          outpost.astroLeftArmPivot.rotation.x = THREE.MathUtils.damp(
            outpost.astroLeftArmPivot.rotation.x,
            0.03,
            10,
            delta,
          );
          outpost.astroRightArmPivot.rotation.x = THREE.MathUtils.damp(
            outpost.astroRightArmPivot.rotation.x,
            0.03,
            10,
            delta,
          );
          outpost.astroLeftArmPivot.rotation.z = THREE.MathUtils.damp(
            outpost.astroLeftArmPivot.rotation.z,
            -0.11,
            10,
            delta,
          );
          outpost.astroRightArmPivot.rotation.z = THREE.MathUtils.damp(
            outpost.astroRightArmPivot.rotation.z,
            0.11,
            10,
            delta,
          );
          outpost.astroLeftElbowPivot.rotation.x = THREE.MathUtils.damp(
            outpost.astroLeftElbowPivot.rotation.x,
            -0.35,
            10,
            delta,
          );
          outpost.astroRightElbowPivot.rotation.x = THREE.MathUtils.damp(
            outpost.astroRightElbowPivot.rotation.x,
            -0.35,
            10,
            delta,
          );
          outpost.astroRightElbowPivot.rotation.z = THREE.MathUtils.damp(
            outpost.astroRightElbowPivot.rotation.z,
            0,
            10,
            delta,
          );
          outpost.astroPelvisGroup.position.y = isStatic
            ? 0.86
            : 0.858 + Math.sin(elapsed * 2.0) * 0.008;
          outpost.astroPelvisGroup.rotation.y = THREE.MathUtils.damp(
            outpost.astroPelvisGroup.rotation.y,
            0,
            10,
            delta,
          );
          outpost.astroPelvisGroup.rotation.z = THREE.MathUtils.damp(
            outpost.astroPelvisGroup.rotation.z,
            0,
            10,
            delta,
          );
          outpost.astroTorsoGroup.rotation.y = THREE.MathUtils.damp(
            outpost.astroTorsoGroup.rotation.y,
            0,
            10,
            delta,
          );
          outpost.astroTorsoGroup.rotation.x = THREE.MathUtils.damp(
            outpost.astroTorsoGroup.rotation.x,
            isStatic ? 0 : Math.sin(elapsed * 2.0) * 0.014,
            10,
            delta,
          );
        }

        const baseGroundY = gAt(playerPos.x, playerPos.y);
        const showCrystals = Boolean(simState?.showGravityCrystals);
        const collectedSet = new Set(simState?.collectedCrystalIds ?? []);
        if (!showCrystals || collectedSet.size === 0) {
          reportedCrystalIds.clear();
        }
        for (const cNode of crystalNodes) {
          const isCollected = collectedSet.has(cNode.id) || reportedCrystalIds.has(cNode.id);
          cNode.group.visible = showCrystals && !isCollected;
          if (!cNode.group.visible) continue;
          if (!isStatic) {
            cNode.gem.rotation.y += delta * 2.2;
            cNode.gem.position.y = cNode.yOffset + Math.sin(elapsed * 3.4 + cNode.phaseOffset) * 0.12;
            const pulse = 1.0 + Math.sin(elapsed * 4.5 + cNode.phaseOffset) * 0.14;
            cNode.ring.scale.setScalar(pulse);
          }
          const horiz = Math.hypot(playerPos.x - cNode.x, playerPos.y - cNode.z);
          const jumpHeightAboveGround = playerFootY - baseGroundY;
          if (horiz <= 1.75 && (!playerGrounded || jumpHeightAboveGround >= 0.14)) {
            reportedCrystalIds.add(cNode.id);
            cNode.group.visible = false;
            onCrystalCollectedRef.current?.(cNode.id);
          }
        }

        outpost.astroGroup.position.set(playerPos.x, smoothFootY, playerPos.y);
        outpost.astroGroup.rotation.y = playerYaw;
        outpost.astroHeadGroup.rotation.y = THREE.MathUtils.damp(
          outpost.astroHeadGroup.rotation.y,
          0,
          8,
          delta,
        );
        outpost.astroHeadGroup.rotation.x = THREE.MathUtils.damp(
          outpost.astroHeadGroup.rotation.x,
          0,
          8,
          delta,
        );
        outpost.astroHeadGroup.rotation.z = THREE.MathUtils.damp(
          outpost.astroHeadGroup.rotation.z,
          0,
          8,
          delta,
        );

        // Camera Mode: First-Person (1P default) vs Third-Person (3P via V).
        // Zero camera takeover during gameplay (no fly-over after crystals or when modals open).
        const isFirstPerson = (simState?.cameraMode ?? '3p') === '1p';
        outpost.astroGroup.visible = !isFirstPerson;
        if (fpRenderPass) fpRenderPass.enabled = isFirstPerson;

        // Smooth decay of landing dip & 1P interact pulse + dynamic lope FOV widening (40° -> 45°)
        landingDipY *= Math.exp(-delta * 9.5);
        fpInteractPulse = Math.max(0, fpInteractPulse - delta * 3.2);
        const lopingNow =
          horizontalSpeed > PHYSICS_CONSTANTS.MARS_SUITED_TRANSITION_MS &&
          !isStatic &&
          !isFrozenInCommandMode;
        const targetFov = lopingNow ? 45 : 40;
        const nextFov = THREE.MathUtils.damp(camera.fov, targetFov, 7.0, delta);
        if (Math.abs(camera.fov - nextFov) > 0.01) {
          camera.fov = nextFov;
          camera.updateProjectionMatrix();
        }

        const headBobY =
          !isStatic && playerGrounded && visualHorizSpeed > 0.14
            ? Math.sin(walkPhase * 2.0) * 0.026 * Math.min(1, visualHorizSpeed / 1.4)
            : 0;

        if (isFirstPerson) {
          const strideAmp = THREE.MathUtils.clamp(visualHorizSpeed / 1.4, 0, 1);
          const armSwing = !isStatic && playerGrounded ? Math.sin(walkPhase) * 0.045 * strideAmp : 0;
          const jumpTuckY = !playerGrounded ? -0.055 : 0;
          const reachZ = -Math.sin(fpInteractPulse * Math.PI) * 0.14;
          const breathBob = isStatic ? 0 : Math.sin(elapsed * 2.1) * 0.006;

          outpost.fpArmsGroup.position.set(
            !isStatic && playerGrounded ? Math.cos(walkPhase) * 0.016 * strideAmp : 0,
            -0.01 + breathBob + jumpTuckY - landingDipY * 0.6,
            0,
          );
          outpost.fpLeftArm.position.y = armSwing;
          outpost.fpRightArm.position.y = -armSwing;
          outpost.fpRightArm.position.z = reachZ;
        }

        if (isFirstPerson) {
          const eyeY =
            smoothFootY + PHYSICS_CONSTANTS.FIRST_PERSON_EYE_HEIGHT_M + headBobY - landingDipY;
          const cosP = Math.cos(camPitch);
          const fwdX = Math.sin(camYaw) * cosP;
          const fwdZ = Math.cos(camYaw) * cosP;
          const lookY = Math.sin(-camPitch);
          _tpCam.set(playerPos.x, eyeY, playerPos.y);
          _tpLook.set(playerPos.x + fwdX * 4.0, eyeY + lookY * 4.0, playerPos.y + fwdZ * 4.0);
          if (isStatic) {
            currentCamPos.copy(_tpCam);
            currentLookAt.copy(_tpLook);
          } else {
            smoothDampVec3(currentCamPos, _tpCam, camPosSpringVel, 0.036, delta);
            smoothDampVec3(currentLookAt, _tpLook, camLookSpringVel, 0.036, delta);
          }
        } else {
          computeThirdPersonRig(playerPos.x, smoothFootY, playerPos.y, camYaw, camPitch, _tpCam, _tpLook);
          _tpCam.y -= landingDipY * 0.65;
          _tpLook.y -= landingDipY * 0.45;
          if (isStatic) {
            currentCamPos.copy(_tpCam);
            currentLookAt.copy(_tpLook);
          } else {
            smoothDampVec3(currentCamPos, _tpCam, camPosSpringVel, 0.055, delta);
            smoothDampVec3(currentLookAt, _tpLook, camLookSpringVel, 0.055, delta);
          }
        }
        if (debugModeRef.current && debugCamOverride) {
          camera.position.copy(debugCamOverride.pos);
          camera.lookAt(debugCamOverride.look);
        } else {
          camera.position.copy(currentCamPos);
          camera.lookAt(currentLookAt);
        }

        if (debugModeRef.current && physicsWorld) {
          const camDeltaM = camera.position.distanceTo(prevCameraPosForJerk);
          const safeCamDt = Math.max(1e-4, delta);
          const camSpeed = camDeltaM / safeCamDt;
          const camAccel = Math.abs(camSpeed - prevCamSpeedForJerk) / safeCamDt;
          prevCameraPosForJerk.copy(camera.position);
          prevCamSpeedForJerk = camSpeed;
          const snapNow = physicsWorld.getSnapshot();
          debugMoveSamples.push({
            tMs: Number(performance.now().toFixed(2)),
            dtS: Number(delta.toFixed(5)),
            physicsSteps: snapNow.physicsSteps,
            interpAlpha: Number(snapNow.interpAlpha.toFixed(3)),
            keysPressed: Array.from(keysDown),
            desiredVel: {
              x: Number(snapNow.desiredVx.toFixed(3)),
              z: Number(snapNow.desiredVz.toFixed(3)),
            },
            actualHorizVel: {
              x: Number(snapNow.vx.toFixed(3)),
              z: Number(snapNow.vz.toFixed(3)),
              speedMs: Number(snapNow.horizontalSpeedMs.toFixed(3)),
            },
            computedGrounded: snapNow.computedGrounded,
            grounded: snapNow.grounded,
            collisionCount: snapNow.collisionCount,
            roverContact: snapNow.roverContact,
            roverPushingInto: snapNow.roverPushingInto,
            cameraPosDeltaM: Number(camDeltaM.toFixed(5)),
            cameraJerkMs2: Number(camAccel.toFixed(3)),
          });
          if (debugMoveSamples.length > DEBUG_MOVE_RING_SIZE) {
            debugMoveSamples.shift();
          }
        }

        // Proximity detection to active Mission Zones, Crew Members & Outpost Stations
        if (onNearbyZoneRef.current) {
          const zIds: MissionZoneId[] = ['tank2', 'solar', 'recycler', 'greenhouse', 'shelter'];
          let nearZone: MissionZoneId | null = null;
          let nearZDist = Infinity;
          for (const zid of zIds) {
            const zp = outpost.zonePositions[zid];
            const d = Math.hypot(playerPos.x - zp.x, playerPos.y - zp.z);
            const thr = zid === 'greenhouse' || zid === 'solar' ? 3.8 : 3.1;
            if (d <= thr && d < nearZDist) {
              nearZDist = d;
              nearZone = zid;
            }
          }
          if (nearZone !== lastNearbyZoneId) {
            lastNearbyZoneId = nearZone;
            onNearbyZoneRef.current(nearZone);
          }
        }

        // Nearby autonomous Crew Member check (<= 2.6 m)
        let nearCrew: CrewMemberId | null = null;
        let nearCrewDist = Infinity;
        for (const ag of crewAgents) {
          const mem = simState?.crew?.find((m) => m.id === ag.id);
          if (mem && !mem.alive) continue;
          const d = Math.hypot(playerPos.x - ag.x, playerPos.y - ag.z);
          if (d <= 2.6 && d < nearCrewDist) {
            nearCrewDist = d;
            nearCrew = ag.id;
          }
        }
        if (nearCrew !== lastNearbyCrewId) {
          lastNearbyCrewId = nearCrew;
          onNearbyCrewRef.current?.(nearCrew);
        }

        const stationIds: OutpostLandmarkId[] = [
          'power-console',
          'rover',
          'habitat',
          'greenhouse',
          'solar',
          'windmill',
          'ice-drill',
          'landing-pad',
        ];
        let nearestId: OutpostLandmarkId | null = null;
        let nearestDist = Infinity;

        for (const id of stationIds) {
          const pt =
            id === 'rover' ? outpost.roverGroup.position : outpost.stationInteractPoints[id];
          const d = Math.hypot(playerPos.x - pt.x, playerPos.y - pt.z);
          const threshold =
            id === 'landing-pad'
              ? 5.6
              : id === 'habitat'
                ? 4.1
                : id === 'windmill' || id === 'ice-drill'
                  ? 3.8
                  : id === 'power-console'
                    ? 2.85
                    : 3.45;
          if (d <= threshold && d < nearestDist) {
            nearestDist = d;
            nearestId = id;
          }
        }
        if (nearestId !== lastNearbyId) {
          lastNearbyId = nearestId;
          onNearbyRef.current(nearestId);
        }

        // Habitat Airlock Shelter proximity & pressurized interior Web Audio state
        const habShelterPt = outpost.stationInteractPoints.habitat;
        const habDist = Math.hypot(playerPos.x - habShelterPt.x, playerPos.y - habShelterPt.z);
        const habMeters = Math.max(0, Math.round(habDist));
        if (habMeters !== lastHabDistMeters) {
          lastHabDistMeters = habMeters;
          onHabitatDistRef.current?.(habMeters);
        }
        // Habitat & Dynamic Zone Acoustic Transitions (Greenhouse vs Solar Array vs Tank/Recycler vs Outdoors)
        const mMods = activeLayout.modules;
        const ghDist = Math.hypot(playerPos.x - mMods.greenhouse.x, playerPos.y - mMods.greenhouse.z);
        const solarDist = Math.min(
          ...mMods.solarPanels.map(([sx, sz]) => Math.hypot(playerPos.x - sx, playerPos.y - sz)),
          Math.hypot(playerPos.x - mMods.batteryBank.x, playerPos.y - mMods.batteryBank.z),
        );
        const tankRecDist = Math.min(
          Math.hypot(playerPos.x - mMods.tank2.x, playerPos.y - mMods.tank2.z),
          Math.hypot(playerPos.x - mMods.recycler.x, playerPos.y - mMods.recycler.z),
        );
        const windDist = Math.min(
          ...mMods.windmills.map(([wx, wz]) => Math.hypot(playerPos.x - wx, playerPos.y - wz)),
          Math.hypot(playerPos.x - mMods.verticalTurbine.x, playerPos.y - mMods.verticalTurbine.z),
        );

        let detectedZone: OutpostAudioZone = 'outdoors';
        if (habDist <= 3.1 || Math.hypot(playerPos.x - mMods.habitat.x, playerPos.y - mMods.habitat.z) <= 3.3) {
          detectedZone = 'habitat';
        } else if (ghDist <= mMods.greenhouse.floorRadius + 0.85) {
          detectedZone = 'greenhouse';
        } else if (solarDist <= 6.2) {
          detectedZone = 'solar';
        } else if (tankRecDist <= 5.4) {
          detectedZone = 'tank-recycler';
        } else if (windDist <= 7.2) {
          detectedZone = 'wind-field';
        }

        soundEngine.setOutsideEvaActive(true);
        soundEngine.setInsideHabitat(habDist <= 3.1);
        soundEngine.setPlayerZone(detectedZone);
        if (detectedZone !== lastAudioZone) {
          lastAudioZone = detectedZone;
          onAudioZoneRef.current?.(detectedZone);
        }

        if (simState?.weatherEvent?.active && !isFrozenInCommandMode && !shelterSentThisEvent) {
          if (habDist <= 4.35) {
            shelterSentThisEvent = true;
            onShelterReachedRef.current?.();
          }
        }

        // Emit throttled real-time Mars environmental physics telemetry (~4 Hz) + pose telemetry (~10 Hz)
        const nowMs = performance.now();
        if (nowMs - lastPhysicsPushMs > 250) {
          lastPhysicsPushMs = nowMs;
          onPhysicsRef.current?.(
            computeDiurnalMarsWeather(
              simState?.sol ?? 21,
              elapsed,
              simState?.dustFactor ?? 1.0,
              simState?.dustTau ?? 1.0,
              playerPos.x,
              playerPos.y,
              baseGroundY,
              simState?.activeWxWindMs,
              lastJumpTelemetry,
            ),
          );
        }
        // Emit smooth high-rate CustomEvent for compass HUD + throttled React pose telemetry
        const shouldPushCompass = nowMs - lastCompassEventMs > 40;
        const appTelemetryInterval = simState?.mapOpen ? 105 : 480;
        const shouldPushApp = Boolean(onPoseTelemetryRef.current) && nowMs - lastPoseTelemetryMs > appTelemetryInterval;
        if (shouldPushCompass || shouldPushApp) {
          const headingDeg =
            ((Math.atan2(Math.sin(camYaw), -Math.cos(camYaw)) * 180) / Math.PI + 360) % 360;
          if (shouldPushCompass) {
            lastCompassEventMs = nowMs;
            window.dispatchEvent(
              new CustomEvent('mars-pose-telemetry', {
                detail: {
                  x: playerPos.x,
                  z: playerPos.y,
                  headingDeg,
                  speedMs: horizontalSpeed,
                },
              }),
            );
          }
          if (shouldPushApp && onPoseTelemetryRef.current) {
            lastPoseTelemetryMs = nowMs;
            onPoseTelemetryRef.current({
              x: playerPos.x,
              z: playerPos.y,
              headingDeg,
              speedMs: horizontalSpeed,
              roverX: roverController.x,
              roverZ: roverController.z,
              crewDots: crewAgents.map((ag) => {
                const prof = CREW_PROFILES.find((p) => p.id === ag.id);
                return {
                  id: ag.id,
                  name: prof?.name ?? ag.id,
                  color: prof?.avatarColor ?? '#38BDF8',
                  x: ag.x,
                  z: ag.z,
                };
              }),
            });
          }
        }
      } else {
        if (fpRenderPass) fpRenderPass.enabled = false;
        outpost.astroGroup.visible = true;
        soundEngine.setOutsideEvaActive(false);
        soundEngine.setInsideHabitat(false);
        soundEngine.setPlayerZone('outdoors');
        if (lastAudioZone !== 'outdoors') {
          lastAudioZone = 'outdoors';
          onAudioZoneRef.current?.('outdoors');
        }
      }

      // Autonomous 4-Crew EVA Rig Simulation & Pose Updates (driven by Rapier Character Controllers)
      if (
        phase === 'gameplay' &&
        !isStatic &&
        !(Boolean(sim?.commandModeOpen) || Boolean(sim?.mapOpen) || pausedRef.current)
      ) {
        const subSteps = debugModeRef.current && debugSpeedMult > 1 ? Math.ceil(debugSpeedMult) : 1;
        const simStepDt = (delta * (debugModeRef.current ? debugSpeedMult : 1)) / subSteps;
        for (let sIdx = 0; sIdx < subSteps; sIdx++) {
          crewAgents = stepCrewAgents(crewAgents, simStepDt, {
            weatherAlertActive: Boolean(sim?.weatherEvent?.active),
            tank2LeakActive: Boolean(sim?.tank2LeakActive),
            radiationAlert: Boolean(sim?.radiationAlert),
            habitatShelterPos: {
              x: outpost.stationInteractPoints.habitat.x,
              z: outpost.stationInteractPoints.habitat.z,
            },
            crewMembers: sim?.crew ?? [],
            obstacles: outpostObstacles,
            grid: envBuild.terrainGrid,
            layout: activeLayout,
            playerX: playerPos.x,
            playerZ: playerPos.y,
            playerSpeedMs: physicsWorld ? physicsWorld.getSnapshot().horizontalSpeedMs : 0,
            playerDirX: Math.sin(playerYaw),
            playerDirZ: Math.cos(playerYaw),
            moveCrewViaPhysics: physicsWorld
              ? (id, desiredDx, desiredDz, dtStep) => physicsWorld!.stepCrewMember(id, desiredDx, desiredDz, dtStep)
              : undefined,
            afterPhysicsCrewStep: physicsWorld ? () => physicsWorld!.stepWorldOnly() : undefined,
          });
        }
      }
      crewAgents.forEach((ag, idx) => {
        const rig = outpost.crewRigs[idx];
        if (!rig) return;
        const mem = sim?.crew?.find((m) => m.id === ag.id);
        rig.group.visible = mem ? mem.alive : true;
        rig.group.position.set(ag.x, ag.y, ag.z);
        rig.group.rotation.y = ag.yaw;

        if (!isStatic && ag.speedMs > 0.08) {
          const s = Math.sin(ag.walkPhase);
          const c = Math.cos(ag.walkPhase);
          const amp = THREE.MathUtils.clamp(ag.speedMs / 1.2, 0.35, 1.0);
          const limpRightScale = ag.limping ? 0.52 : 1.0;

          rig.leftLeg.rotation.x = s * 0.48 * amp;
          rig.rightLeg.rotation.x = -s * 0.48 * amp * limpRightScale;
          rig.leftKnee.rotation.x = 0.08 + Math.max(0, -c) * 0.72 * amp;
          rig.rightKnee.rotation.x = 0.1 + Math.max(0, c) * 0.72 * amp * limpRightScale;
          rig.leftArm.rotation.x = -s * 0.38 * amp;
          rig.rightArm.rotation.x = s * 0.38 * amp;
          rig.leftElbow.rotation.x = -0.38;
          rig.rightElbow.rotation.x = -0.38;
          rig.pelvis.position.y = 0.85 + Math.abs(c) * 0.022 * amp;
          rig.pelvis.rotation.z = ag.limping ? 0.065 + s * 0.04 : c * 0.02 * amp;
          rig.torso.rotation.x = ag.mode === 'Alarm' ? 0.14 : 0.04;
          rig.head.rotation.y = 0;
        } else {
          const breath = isStatic ? 0 : Math.sin(elapsed * 1.9 + idx * 1.1);
          rig.pelvis.position.y = 0.858 + breath * 0.006;
          rig.pelvis.rotation.z = 0;
          rig.torso.rotation.x = breath * 0.015;
          rig.leftLeg.rotation.x = -0.04;
          rig.rightLeg.rotation.x = -0.04;
          rig.leftKnee.rotation.x = 0.06;
          rig.rightKnee.rotation.x = 0.06;
          rig.leftArm.rotation.x = 0.03;
          rig.rightArm.rotation.x = ag.mode === 'CheckingConsole' ? -0.35 : 0.03;
          rig.leftElbow.rotation.x = -0.35;
          rig.rightElbow.rotation.x = ag.mode === 'CheckingConsole' ? -0.65 : -0.35;
          rig.head.rotation.y = isStatic ? 0 : Math.sin(elapsed * 0.65 + idx * 1.7) * 0.18;
        }
      });

      // Shared Ambient Outpost Motion + Wind Turbines + 6-Wheel Rocker-Bogie Rover FSM
      if (!isStatic) {
        outpost.dishMast.rotation.y = Math.sin(elapsed * 0.42) * 0.6;
        const activeWindSpeed = simVisualsRef.current?.activeWxWindMs
          ? simVisualsRef.current.activeWxWindMs
          : 6.4 + (1 - (simVisualsRef.current?.dustFactor ?? 1)) * 11.5;
        const windSpinRad = Math.min(7.5, Math.max(1.2, activeWindSpeed * 0.24));
        envBuild.anemometerHead.rotation.y += delta * (windSpinRad * 1.45);
        outpost.windmillRotors.forEach((rotor, idx) => {
          rotor.rotation.z -= delta * windSpinRad * (idx === 0 ? 1.0 : 1.08);
        });
        outpost.windmillVerticalRotors.forEach((vRotor) => {
          vRotor.rotation.y += delta * windSpinRad * 1.55;
        });
        outpost.solarWings.forEach((wing, idx) => {
          wing.rotation.x = 0.42 + Math.sin(elapsed * 0.32 + idx * 0.8) * 0.08;
        });

        if (phase === 'gameplay' && sim) {
          const rp = activeLayout.modules.roverPad;
          const lp = activeLayout.modules.landingPad;
          const gh = activeLayout.modules.greenhouse;
          const onRaisedPad =
            Math.hypot(roverController.x - lp.x, roverController.z - lp.z) <= lp.apronRadius ||
            (rp.enabled &&
              Math.abs(roverController.x - rp.x) <= rp.widthM * 0.5 &&
              Math.abs(roverController.z - rp.z) <= rp.depthM * 0.5) ||
            Math.hypot(roverController.x - gh.x, roverController.z - gh.z) <= gh.floorRadius;
          const onRoadStrip =
            activeLayout.mode === 'gameplay' &&
            !onRaisedPad &&
            isOnPavedSurface(roverController.x, roverController.z, activeLayout);
          const roverVisY = roverController.y + (onRoadStrip ? 0.032 : 0);

          outpost.roverGroup.position.set(roverController.x, roverVisY, roverController.z);
          outpost.roverGroup.rotation.order = 'YXZ';
          outpost.roverGroup.rotation.set(
            roverController.pitchRad,
            roverController.yaw,
            roverController.rollRad + (sim.roverDamaged ? Math.sin(elapsed * 6.5) * 0.045 : 0),
          );
          outpost.roverLeftRockerPivot.rotation.x = roverController.leftRockerRad;
          outpost.roverRightRockerPivot.rotation.x = roverController.rightRockerRad;
          outpost.roverDiffBar.rotation.z =
            (roverController.leftRockerRad - roverController.rightRockerRad) * 0.5;
          roverController.wheelOffsetsM.forEach((off, idx) => {
            if (outpost.roverWheelOffsets[idx]) {
              outpost.roverWheelOffsets[idx].position.y =
                PHYSICS_CONSTANTS.ROVER_WHEEL_RADIUS_M + 0.012 + off;
            }
          });
          outpost.roverWheels.forEach((w) => {
            w.rotation.x = roverController.wheelSpinRad;
          });

          if (roverController.tiltWarning !== lastRoverTiltWarn) {
            lastRoverTiltWarn = roverController.tiltWarning;
            onRoverTiltAlertRef.current?.(roverController.tiltWarning, roverController.tiltDeg);
          }

          if (roverController.isDriving) {
            const movedSinceStamp = Math.hypot(
              roverController.x - lastRoverTrackPos.x,
              roverController.z - lastRoverTrackPos.y,
            );
            if (movedSinceStamp >= 0.58) {
              lastRoverTrackPos.set(roverController.x, roverController.z);
              const rx = Math.cos(roverController.yaw) * 0.72;
              const rz = -Math.sin(roverController.yaw) * 0.72;
              stampDecal(
                roverTrackPool,
                { idx: trackCursor++ },
                roverController.x - rx,
                roverController.z - rz,
                roverController.yaw,
              );
              stampDecal(
                roverTrackPool,
                { idx: trackCursor++ },
                roverController.x + rx,
                roverController.z + rz,
                roverController.yaw,
              );
              spawnBallisticDust(roverController.x - rx, roverVisY, roverController.z - rz, 1, 0.7);
              spawnBallisticDust(roverController.x + rx, roverVisY, roverController.z + rz, 1, 0.7);
            }
          }

          soundEngine.updateRoverSpatialAudio(
            roverController.x,
            roverVisY,
            roverController.z,
            playerPos.x,
            smoothFootY + 1.5,
            playerPos.y,
            camYaw,
            roverController.isDriving,
          );

          // Aim Rover camera head & guide beam strictly toward the current activeObjective
          // (matches the exact final destination and color of the walking path arrows).
          const activeTarget = sim.weatherEvent?.active
            ? outpost.stationInteractPoints.habitat
            : sim.activeObjective
              ? { x: sim.activeObjective.x, z: sim.activeObjective.z }
              : outpost.zonePositions[sim.activeZoneId];
          const beamHex = sim.weatherEvent?.active
            ? '#22C55E'
            : (sim.activeObjective?.colorHex ?? '#FFB703');
          outpost.roverGuideBeamMat.color.set(beamHex);
          const dxTarget = activeTarget.x - roverController.x;
          const dzTarget = activeTarget.z - roverController.z;
          const targetWorldYaw = Math.atan2(dxTarget, dzTarget);
          const targetRelYaw = shortestAngleDiff(roverController.yaw, targetWorldYaw);
          const yawErr = shortestAngleDiff(outpost.roverHead.rotation.y, targetRelYaw);
          outpost.roverHead.rotation.y = isStatic
            ? targetRelYaw
            : outpost.roverHead.rotation.y + yawErr * Math.min(1, delta * 9.0);
          const distToTargetXZ = Math.max(1.2, Math.hypot(dxTarget, dzTarget));
          const targetGroundY = gAt(activeTarget.x, activeTarget.z);
          const headWorldY = roverVisY + 1.5;
          const desiredPitch = THREE.MathUtils.clamp(
            Math.atan2(headWorldY - (targetGroundY + 0.9), distToTargetXZ),
            -0.12,
            0.26,
          );
          outpost.roverHead.rotation.x = THREE.MathUtils.damp(
            outpost.roverHead.rotation.x,
            desiredPitch,
            8.0,
            delta,
          );
          outpost.roverGuideBeam.visible = !sim.commandModeOpen && sim.activeObjective?.id !== 'free-roam-exploration';
        } else {
          roverController = createInitialRoverController(
            outpost.roverBasePos.x,
            outpost.roverBasePos.z,
            activeLayout.modules.roverSpawn.yaw,
            envBuild.terrainGrid,
            activeLayout,
          );
          outpost.roverGuideBeam.visible = false;
          const patrolOffset = Math.sin(elapsed * 0.34) * 0.68;
          const rx = outpost.roverBasePos.x + patrolOffset * 0.86;
          const rz = outpost.roverBasePos.z - patrolOffset * 0.44;
          const ry = gAt(rx, rz);
          outpost.roverGroup.position.set(rx, ry, rz);
          outpost.roverGroup.rotation.order = 'YXZ';
          outpost.roverGroup.rotation.set(0, activeLayout.modules.roverSpawn.yaw, 0);
          outpost.roverWheelOffsets.forEach((wg) => {
            wg.position.y = PHYSICS_CONSTANTS.ROVER_WHEEL_RADIUS_M + 0.012;
          });
          physicsWorld?.updateRoverTransform(rx, ry, rz, activeLayout.modules.roverSpawn.yaw);
          outpost.roverHead.rotation.y = Math.sin(elapsed * 0.85) * 0.42;
          outpost.roverHead.rotation.x = Math.sin(elapsed * 1.15) * 0.09;
          const wheelSpin = Math.cos(elapsed * 0.34) * 0.9;
          outpost.roverWheels.forEach((w) => {
            w.rotation.x += wheelSpin * delta;
          });
        }

        if (outpost.distantRover) {
          const drR = activeLayout.mode === 'gameplay' ? 55 : 37;
          const drAng = elapsed * 0.048;
          const drX = Math.cos(drAng) * drR;
          const drZ = Math.sin(drAng) * drR;
          const drYaw = Math.atan2(-Math.sin(drAng), Math.cos(drAng));
          const sinD = Math.sin(drYaw);
          const cosD = Math.cos(drYaw);
          const hF = gAt(drX + sinD * 0.46, drZ + cosD * 0.46);
          const hB = gAt(drX - sinD * 0.46, drZ - cosD * 0.46);
          const hL = gAt(drX + cosD * 0.56, drZ - sinD * 0.56);
          const hR = gAt(drX - cosD * 0.56, drZ + sinD * 0.56);
          const drY = (hF + hB + hL + hR) * 0.25 + 0.02;
          outpost.distantRover.group.position.set(drX, drY, drZ);
          outpost.distantRover.group.rotation.order = 'YXZ';
          outpost.distantRover.group.rotation.set(
            Math.atan2(hB - hF, 0.92),
            drYaw,
            Math.atan2(hL - hR, 1.12),
          );
          outpost.distantRover.wheels.forEach((w) => {
            w.rotation.x += delta * 2.4;
          });
        }

        const dustWind = 0.55 + (1 - (sim?.dustFactor ?? 1)) * 2.1;
        const dustSpan = activeLayout.mode === 'gameplay' ? 42 : 19;
        const dAttr = envBuild.dustPoints.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < envBuild.dustCount; i++) {
          let x = dAttr.getX(i) + delta * dustWind;
          if (x > dustSpan) x = -dustSpan;
          dAttr.setX(i, x);
          const yBob = Math.sin(elapsed * 1.35 + i * 0.37) * delta * 0.16;
          dAttr.setY(i, Math.max(0.25, dAttr.getY(i) + yBob));
        }
        dAttr.needsUpdate = true;
      }

      if (debugModeRef.current && overlayMgr) {
        if (debugCamOverride) {
          camera.position.copy(debugCamOverride.pos);
          camera.lookAt(debugCamOverride.look);
        }
        overlayMgr.update(physicsWorld, crewAgents);
      }

      if (phase !== 'prologue') {
        if (composer) {
          composer.render();
        } else {
          renderer.render(scene, camera);
          if (phase === 'gameplay' && simVisualsRef.current?.cameraMode === '1p' && !Boolean(simVisualsRef.current?.commandModeOpen || pausedRef.current)) {
            const prevAutoClear = renderer.autoClear;
            renderer.autoClear = false;
            renderer.clearDepth();
            renderer.render(outpost.fpScene, outpost.fpCamera);
            renderer.autoClear = prevAutoClear;
          }
        }
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock?.();
      }
      if (canvasElRef) canvasElRef.current = null;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('touchstart', handleCanvasTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleCanvasTouchMove);
      renderer.domElement.removeEventListener('touchend', handleCanvasTouchEnd);
      renderer.domElement.removeEventListener('touchcancel', handleCanvasTouchEnd);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      if (debugModeRef.current) {
        overlayMgr?.dispose();
        delete window.__MARS_DEBUG__;
      }
      physicsWorld?.dispose();
      physicsWorld = null;
      if (fpRenderPass) fpRenderPass.dispose();
      if (stormPass) stormPass.dispose();
      if (outputPass) outputPass.dispose();
      if (composerTarget) composerTarget.dispose();
      if (composer) composer.dispose();
      extraGeos.forEach((g) => g.dispose());
      extraMats.forEach((m) => m.dispose());
      extraTexs.forEach((t) => t.dispose());
      outpost.dispose();
      envBuild.dispose();
    };
  }, [quality, layoutMode]);

  if (webglUnavailable) {
    return (
      <div
        className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#0B1D36] via-[#1B3A5F] to-[#8C3718]"
        aria-label="Mars Outpost Title Scene Fallback"
      />
    );
  }

  return (
    <div className="relative w-full h-full touch-none select-none">
      <div ref={mountRef} className="w-full h-full touch-none select-none" />

      {/* Start Mission Fade-to-Black Transition Curtain + Outpost Loading Pill */}
      <div
        aria-hidden={!curtainOpaque && !loadingGameplayOutpost}
        className={`pointer-events-none fixed inset-0 z-30 flex items-end justify-end bg-[#040812] p-5 transition-opacity duration-500 ${
          curtainOpaque ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {loadingGameplayOutpost && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-[#FFB703]/55 bg-[#071324]/95 px-4 py-2 text-xs font-extrabold text-[#FFB703] shadow-lg"
          >
            Loading spacious outpost &amp; 3.73 m/s² Mars physics…
          </div>
        )}
      </div>
    </div>
  );
});
