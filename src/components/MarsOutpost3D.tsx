import { MutableRefObject, useEffect, useRef, useState } from 'react';
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
  TutorialStepId,
} from '../data/missionData';
import { PHYSICS_CONSTANTS } from '../sim/constants';
import { groundHeightAt } from '../sim/terrainField';
import { buildMarsEnvironment } from '../three/marsEnvironment';
import { buildOutpostAssets } from '../three/outpostAssets';
import { MartianStormShader } from '../three/martianStormShader';
import { MarsPhysicsWorld } from '../sim/rapierWorld';

import { MissionZoneId } from '../sim/missionsData';
import { RoverMood } from '../sim/roverData';
import { WeatherEventKind } from '../sim/simEngine';
import {
  MarsEnvironmentSnapshot,
  MarsJumpTelemetry,
  computeDiurnalMarsWeather,
  computeJumpTelemetry,
  computeLocalMarsGravity,
} from '../sim/marsPhysics';

export type GraphicsQuality = 'high' | 'low';

export interface GameplayInputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint?: boolean;
  lookX: number;
  jumpRequested?: boolean;
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
  cameraMode: '3p' | '1p';
  radiationAlert: boolean;
  sol?: number;
  dustTau?: number;
  activeWxWindMs?: number;
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
  canvasElRef?: MutableRefObject<HTMLCanvasElement | null>;
  onPointerLockChange?: (locked: boolean) => void;
  onPauseRequested?: () => void;
  onToggleCameraMode?: () => void;
  onNearbyZoneChange?: (zoneId: MissionZoneId | null) => void;
  onInteractZone?: (zoneId: MissionZoneId) => void;
  onShelterReached?: () => void;
  onHabitatDistanceChange?: (meters: number) => void;
  onPhysicsUpdate?: (snapshot: MarsEnvironmentSnapshot) => void;
  onTutorialMoveDone: () => void;
  onTutorialLookDone: () => void;
  onNearbyStationChange: (stationId: OutpostLandmarkId | null) => void;
  onInteractStation: (stationId: OutpostLandmarkId) => void;
  moveInputRef?: MutableRefObject<GameplayInputState>;
  reducedMotion: boolean;
  quality: GraphicsQuality;
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

export function MarsOutpost3D({
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
  onNearbyStationChange,
  onInteractStation,
  moveInputRef,
  reducedMotion,
  quality,
}: MarsOutpost3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

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

  const onNearbyRef = useRef(onNearbyStationChange);
  onNearbyRef.current = onNearbyStationChange;

  const onInteractRef = useRef(onInteractStation);
  onInteractRef.current = onInteractStation;

  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    const isSoftwareGl = detectSoftwareGl();

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: quality === 'high' && !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    const targetPixelRatio =
      isSoftwareGl || quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(targetPixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl && quality === 'high';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D Mars Outpost environment');

    container.appendChild(renderer.domElement);
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
    scene.background = new THREE.Color('#241724');
    scene.fog = new THREE.FogExp2('#5c2e26', 0.0115);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 220);
    const currentCamPos = new THREE.Vector3(...CAMERA_PRESETS.overview.pos);
    const currentLookAt = new THREE.Vector3(...CAMERA_PRESETS.overview.look);
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);

    // Cinematic Sunset Lighting Rig
    const hemiLight = new THREE.HemisphereLight('#476ea8', '#9e4425', 0.85);
    hemiLight.position.set(0, 35, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#ffbe73', 2.65);
    sunLight.position.set(24, 10.5, -22);
    sunLight.castShadow = !isSoftwareGl && quality === 'high';
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 4;
    sunLight.shadow.camera.far = 75;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 18;
    sunLight.shadow.camera.bottom = -16;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.025;
    scene.add(sunLight);

    const skyFillLight = new THREE.DirectionalLight('#5c85c9', 0.65);
    skyFillLight.position.set(-16, 10, 14);
    scene.add(skyFillLight);

    const rimLight = new THREE.DirectionalLight('#ff8243', 0.45);
    rimLight.position.set(12, 4, 16);
    scene.add(rimLight);

    // Full-screen post-processing pipeline on GPU (skipped on software WebGL per Three.js perf budget)
    let composer: EffectComposer | null = null;
    let composerTarget: THREE.WebGLRenderTarget | null = null;
    let stormPass: ShaderPass | null = null;
    let outputPass: OutputPass | null = null;

    if (!isSoftwareGl) {
      const msaaSamples = renderer.capabilities.isWebGL2 && quality === 'high' ? 4 : 0;
      composerTarget = new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        samples: msaaSamples,
      });
      composer = new EffectComposer(renderer, composerTarget);
      composer.setPixelRatio(targetPixelRatio);
      composer.setSize(width, height);
      composer.addPass(new RenderPass(scene, camera));

      stormPass = new ShaderPass(MartianStormShader);
      (stormPass.uniforms.uResolution.value as THREE.Vector2).set(width, height);
      composer.addPass(stormPass);

      outputPass = new OutputPass();
      composer.addPass(outputPass);
    }

    // Build Environment & Detailed Outpost Assets (single-source TerrainHeightGrid)
    const envBuild = buildMarsEnvironment(scene, renderer, quality, isSoftwareGl);
    const outpost = buildOutpostAssets(scene, renderer, quality, isSoftwareGl);

    // Initialize authoritative Rapier WASM physics world
    let physicsWorld: MarsPhysicsWorld | null = null;
    let disposed = false;

    void MarsPhysicsWorld.create({
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
    });

    // Gameplay state driven by Rapier physics
    const playerPos = new THREE.Vector2(outpost.astroBasePos.x, outpost.astroBasePos.z);
    let playerFootY = groundHeightAt(outpost.astroBasePos.x, outpost.astroBasePos.z);
    let playerYaw = THIRD_PERSON_INIT_YAW;
    let playerGrounded = true;
    let playerJumpQueued = false;
    let camYaw = THIRD_PERSON_INIT_YAW;
    let camPitch = THIRD_PERSON_INIT_PITCH;
    let camDist = THIRD_PERSON_DIST;
    let walkPhase = 0;
    let totalDistanceMoved = 0;
    let totalLookDelta = 0;
    let moveTutorialReported = false;
    let lookTutorialReported = false;
    let lastNearbyId: OutpostLandmarkId | null = null;
    let lastNearbyZoneId: MissionZoneId | null = null;
    let lastHabDistMeters = -1;
    let shelterSentThisEvent = false;
    let prevPhase: GamePhase = gamePhaseRef.current;
    let lastJumpTelemetry: MarsJumpTelemetry | null = null;
    let lastPhysicsPushMs = 0;

    const roverPos = new THREE.Vector2(outpost.roverBasePos.x, outpost.roverBasePos.z);
    let roverYaw = -1.02;

    // Keyboard state for WASD / Arrow Keys / Shift Lope / Space Jump / V 1P-3P / E Interact
    const keysDown = new Set<string>();
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (gamePhaseRef.current !== 'gameplay') return;
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const simState = simVisualsRef.current;
      if (simState?.commandModeOpen || pausedRef.current) return;

      const k = ev.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keysDown.add(k);
      } else if (k === ' ' && !ev.repeat) {
        ev.preventDefault();
        if (playerGrounded) {
          playerJumpQueued = true;
          const localGrav = computeLocalMarsGravity(
            playerPos.x,
            playerPos.y,
            groundHeightAt(playerPos.x, playerPos.y),
          );
          lastJumpTelemetry = computeJumpTelemetry(
            PHYSICS_CONSTANTS.SUITED_TAKEOFF_MS,
            localGrav.gravityMs2,
          );
        }
      } else if (k === 'v' && !ev.repeat) {
        onToggleCamRef.current?.();
      } else if (k === 'e' && !ev.repeat) {
        if (simState?.weatherEvent?.active && lastNearbyId === 'habitat') {
          onShelterReachedRef.current?.();
        } else if (lastNearbyZoneId && onInteractZoneRef.current) {
          onInteractZoneRef.current(lastNearbyZoneId);
        } else if (lastNearbyId) {
          onInteractRef.current(lastNearbyId);
        }
      }
    };
    const handleKeyUp = (ev: KeyboardEvent) => {
      keysDown.delete(ev.key.toLowerCase());
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
      onPointerLockRef.current?.(pointerLocked);
      if (
        wasLocked &&
        !pointerLocked &&
        gamePhaseRef.current === 'gameplay' &&
        !simVisualsRef.current?.commandModeOpen &&
        !pausedRef.current
      ) {
        keysDown.clear();
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
      if (
        gamePhaseRef.current === 'gameplay' &&
        !simVisualsRef.current?.commandModeOpen &&
        !pausedRef.current
      ) {
        onPauseRequestedRef.current?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
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
      if (!lookTutorialReported && tutorialStepRef.current === 2 && totalLookDelta >= 0.14) {
        lookTutorialReported = true;
        onLookDoneRef.current();
      }
    };

    const triggerRaycastInteract = (ndcX: number, ndcY: number) => {
      pointerNdc.set(ndcX, ndcY);
      raycaster.setFromCamera(pointerNdc, camera);
      const zoneTargets = Object.values(outpost.zonePositions).length > 0 ? scene.children : [];
      const hits = raycaster.intersectObjects(zoneTargets, true);
      const hitZone = hits.find((h) => h.object.userData.missionZoneId)?.object.userData
        .missionZoneId as MissionZoneId | undefined;
      if (hitZone && onInteractZoneRef.current) {
        onInteractZoneRef.current(hitZone);
        return;
      }
      const landmarkHits = raycaster.intersectObjects(outpost.interactiveTargets, false);
      if (landmarkHits.length > 0) {
        const hitId = landmarkHits[0].object.userData.landmarkId as OutpostLandmarkId | undefined;
        if (hitId && hitId !== 'astronaut') {
          onInteractRef.current(hitId);
        }
      }
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (gamePhaseRef.current === 'gameplay') {
        if (simVisualsRef.current?.commandModeOpen || pausedRef.current) {
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
        if (simVisualsRef.current?.commandModeOpen || pausedRef.current) return;

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

    let isMobile = width < 768;
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      isMobile = w < 768;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
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
      const minFloorY = groundHeightAt(cx, cz) + 0.58;
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
    const _clearFogColor = new THREE.Color('#5c2e26');
    const _stormFogColor = new THREE.Color('#8f4722');
    const _tintDustDevil = new THREE.Vector3(1.24, 0.78, 0.50);
    const _tintKatabatic = new THREE.Vector3(1.12, 0.84, 0.68);
    const _tintElectro = new THREE.Vector3(1.26, 0.72, 0.58);

    let frameId = 0;
    let stormPassIntensity = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
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
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), isSoftwareGl ? 0.35 : 0.12);
      const elapsed = clock.getElapsedTime();
      const isStatic = reducedMotionRef.current;
      const phase = gamePhaseRef.current;

      // Reset astronaut/camera cleanly when returning to Landing or starting Prologue/Briefing
      if (phase !== prevPhase) {
        if (phase === 'landing' || phase === 'prologue') {
          playerPos.set(outpost.astroBasePos.x, outpost.astroBasePos.z);
          playerFootY = groundHeightAt(outpost.astroBasePos.x, outpost.astroBasePos.z);
          playerYaw = outpost.astroBasePos.yaw;
          camYaw = THIRD_PERSON_INIT_YAW;
          camPitch = THIRD_PERSON_INIT_PITCH;
          totalDistanceMoved = 0;
          totalLookDelta = 0;
          moveTutorialReported = false;
          lookTutorialReported = false;
          walkPhase = 0;
          physicsWorld?.teleportPlayer(outpost.astroBasePos.x, outpost.astroBasePos.z);
          if (document.pointerLockElement === renderer.domElement) {
            document.exitPointerLock?.();
          }
        } else if (phase === 'briefing') {
          playerPos.set(outpost.astroBasePos.x, outpost.astroBasePos.z);
          playerFootY = groundHeightAt(outpost.astroBasePos.x, outpost.astroBasePos.z);
          playerYaw = THIRD_PERSON_INIT_YAW;
          camYaw = THIRD_PERSON_INIT_YAW;
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
          playerFootY = groundHeightAt(outpost.astroBasePos.x, outpost.astroBasePos.z);
          playerYaw = THIRD_PERSON_INIT_YAW;
          camYaw = THIRD_PERSON_INIT_YAW;
          camPitch = THIRD_PERSON_INIT_PITCH;
          physicsWorld?.teleportPlayer(outpost.astroBasePos.x, outpost.astroBasePos.z);
        }
        prevPhase = phase;
      }

      // Live lighting & environmental hazards driven by Simulation State
      const sim = simVisualsRef.current;
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
      const targetSunIntensity = 2.65 * Math.max(0.25, targetDustFactor) * (wxActive ? 0.78 : 1.0);
      const targetHemiIntensity = 0.85 * (0.45 + targetDustFactor * 0.55);
      const stormSeverity = THREE.MathUtils.clamp(
        (1.0 - targetDustFactor) / 0.72 + (wxActive ? 0.35 : 0),
        0,
        1,
      );
      const targetFogDensity = 0.0115 + stormSeverity * 0.038;

      sunLight.intensity = THREE.MathUtils.damp(sunLight.intensity, targetSunIntensity, 3.0, delta);
      hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, targetHemiIntensity, 3.0, delta);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density = THREE.MathUtils.damp(scene.fog.density, targetFogDensity, 2.5, delta);
        scene.fog.color.lerpColors(_clearFogColor, _stormFogColor, stormSeverity);
      }
      envBuild.dustMat.opacity = 0.65 + stormSeverity * 0.32;

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

      // Tank 2 O2 vapour leak stream (M1)
      const leakActive = phase === 'gameplay' && Boolean(sim?.tank2LeakActive);
      outpost.tank2LeakPoints.visible = leakActive;
      if (leakActive && !isStatic) {
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

      // Active Mission Zone World Beacon
      if (phase === 'gameplay' && sim) {
        const zp = outpost.zonePositions[sim.activeZoneId];
        outpost.zoneBeaconGroup.visible = true;
        outpost.zoneBeaconGroup.position.copy(zp);
        outpost.zoneBeaconDiamond.position.y = 2.35 + Math.sin(elapsed * 3.0) * 0.14;
        outpost.zoneBeaconDiamond.rotation.y += delta * 1.8;
        outpost.zoneBeaconRing.scale.setScalar(1.0 + Math.sin(elapsed * 4.0) * 0.12);
      } else {
        outpost.zoneBeaconGroup.visible = false;
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
        outpost.dustDevilGroup.position.set(wxX, groundHeightAt(wxX, wxZ), wxZ);

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

      // Power Console Beacon pulse
      const isTutorial4 = phase === 'gameplay' && tutorialStepRef.current === 4;
      const beaconPulse = 0.5 + 0.5 * Math.sin(elapsed * 4.2);
      outpost.powerBeaconRingMat.opacity = isTutorial4 ? 0.55 + beaconPulse * 0.35 : 0.22;
      outpost.powerBeaconRing.scale.setScalar(isTutorial4 ? 1.0 + beaconPulse * 0.22 : 0.95);
      outpost.powerBeaconDiamond.visible = phase === 'gameplay' && !sim;
      outpost.powerBeaconDiamond.position.y = 1.82 + Math.sin(elapsed * 2.8) * 0.12;
      outpost.powerBeaconDiamond.rotation.y += delta * 1.6;
      outpost.matConsoleScreen.emissiveIntensity = isTutorial4 ? 1.8 + beaconPulse * 0.6 : 1.35;

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

      // Pulse walkway amber beacons brighter during Scene 4 or Radiation Alert
      envBuild.beaconLights.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat && 'emissiveIntensity' in mat) {
          mat.emissiveIntensity = auroraTarget > 0.15 ? 2.6 + Math.sin(elapsed * 6.0) * 0.8 : 1.7;
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
          groundHeightAt(outpost.astroBasePos.x, outpost.astroBasePos.z),
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
        const ay = groundHeightAt(ax, az);

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

        if (t < 6) {
          // Scene 1 (0-6s): A New World — Wide establishing shot revealing Mars Outpost
          const u = easeInOutCubic(t / 6);
          _sceneA.set(-10.5, 6.4, 18.2);
          _sceneB.set(-4.2, 4.1, 14.4);
          _lookA.set(4.5, 1.2, -1.8);
          _lookB.set(4.8, 1.5, -1.2);
          _targetCam.lerpVectors(_sceneA, _sceneB, isStatic ? 0.5 : u);
          _targetLook.lerpVectors(_lookA, _lookB, isStatic ? 0.5 : u);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw;
        } else if (t < 13) {
          // Scene 2 (6-13s): The Outpost — Sweep past Solar Arrays, Habitat & Greenhouse with ROVER-7 moving
          const u = easeInOutCubic((t - 6) / 7);
          _sceneA.set(12.2, 3.6, 5.4);
          _sceneB.set(5.4, 2.75, 6.5);
          _lookA.set(5.5, 1.5, -2.1);
          _lookB.set(2.4, 0.95, 2.5);
          _targetCam.lerpVectors(_sceneA, _sceneB, isStatic ? 0.5 : u);
          _targetLook.lerpVectors(_lookA, _lookB, isStatic ? 0.5 : u);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw;
        } else if (t < 21) {
          // Scene 3 (13-21s): Your Mission — Close-up reveal of Junior Commander face & gold-tinted visor
          const u = easeInOutCubic((t - 13) / 8);
          _sceneA.set(4.15, ay + 1.54, 3.85);
          _sceneB.set(4.72, ay + 1.62, 3.92);
          _lookA.set(ax, ay + 1.48, az);
          _lookB.set(ax, ay + 1.52, az);
          _targetCam.lerpVectors(_sceneA, _sceneB, isStatic ? 0.5 : u);
          _targetLook.lerpVectors(_lookA, _lookB, isStatic ? 0.5 : u);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw;
          outpost.astroHeadGroup.rotation.y = Math.sin(u * Math.PI) * 0.14;
        } else if (t < 29) {
          // Scene 4 (21-29s): The Challenge — Space-weather shimmer & solar arrays framing the horizon
          const u = easeInOutCubic((t - 21) / 8);
          _sceneA.set(6.4, 2.35, 5.4);
          _sceneB.set(2.8, 3.15, 8.2);
          _lookA.set(8.8, 2.1, -3.8);
          _lookB.set(7.4, 2.35, -3.2);
          _targetCam.lerpVectors(_sceneA, _sceneB, isStatic ? 0.5 : u);
          _targetLook.lerpVectors(_lookA, _lookB, isStatic ? 0.5 : u);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw;
        } else {
          // Scene 5 (29-34s): Take Command — Seamless swing behind Astronaut into exact third-person gameplay camera
          const u = easeInOutCubic((t - 29) / 5);
          _sceneA.set(2.8, 3.15, 8.2);
          _lookA.set(7.4, 2.35, -3.2);
          _targetCam.lerpVectors(_sceneA, _tpCam, isStatic ? 1 : u);
          _targetLook.lerpVectors(_lookA, _tpLook, isStatic ? 1 : u);

          // Smoothly rotate Astronaut to face into the outpost ready to explore
          const turnDiff = shortestAngleDiff(outpost.astroBasePos.yaw, THIRD_PERSON_INIT_YAW);
          outpost.astroGroup.rotation.y = outpost.astroBasePos.yaw + turnDiff * (isStatic ? 1 : u);
          outpost.astroHeadGroup.rotation.y = THREE.MathUtils.damp(
            outpost.astroHeadGroup.rotation.y,
            0,
            6,
            delta,
          );
        }

        const followRate = t >= 29 ? 10.0 : 5.5;
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
          groundHeightAt(playerPos.x, playerPos.y),
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
          groundHeightAt(playerPos.x, playerPos.y),
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
        const isFrozenInCommandMode = Boolean(simState?.commandModeOpen) || pausedRef.current;
        if (isFrozenInCommandMode && document.pointerLockElement === renderer.domElement) {
          document.exitPointerLock?.();
        }
        const uiInput = moveInputRef?.current;

        if (uiInput?.jumpRequested) {
          uiInput.jumpRequested = false;
          if (!isFrozenInCommandMode && playerGrounded) {
            playerJumpQueued = true;
            const localGrav = computeLocalMarsGravity(
              playerPos.x,
              playerPos.y,
              groundHeightAt(playerPos.x, playerPos.y),
            );
            lastJumpTelemetry = computeJumpTelemetry(
              PHYSICS_CONSTANTS.SUITED_TAKEOFF_MS,
              localGrav.gravityMs2,
            );
          }
        }

        const moveFwd = isFrozenInCommandMode
          ? 0
          : (keysDown.has('w') || keysDown.has('arrowup') || uiInput?.forward ? 1 : 0) -
            (keysDown.has('s') || keysDown.has('arrowdown') || uiInput?.back ? 1 : 0);
        const moveStrafe = isFrozenInCommandMode
          ? 0
          : (keysDown.has('d') || keysDown.has('arrowright') || uiInput?.right ? 1 : 0) -
            (keysDown.has('a') || keysDown.has('arrowleft') || uiInput?.left ? 1 : 0);

        if (!isFrozenInCommandMode && uiInput && Math.abs(uiInput.lookX) > 0.0001) {
          camYaw += uiInput.lookX * delta;
          totalLookDelta += Math.abs(uiInput.lookX * delta);
          if (!lookTutorialReported && tutorialStepRef.current === 2 && totalLookDelta >= 0.14) {
            lookTutorialReported = true;
            onLookDoneRef.current();
          }
        }

        const isSprinting = keysDown.has('shift') || Boolean(uiInput?.sprint);
        let horizontalSpeed = 0;

        if (physicsWorld && !isFrozenInCommandMode) {
          const prevX = playerPos.x;
          const prevZ = playerPos.y;
          const jumpReq = playerJumpQueued;
          playerJumpQueued = false;

          const snap = physicsWorld.stepFrame(delta, {
            moveFwd,
            moveStrafe,
            camYaw,
            sprint: isSprinting,
            jumpRequested: jumpReq,
            quickMode: quickModeRef.current,
          });
          physicsWorld.consumeLastLanding();

          playerPos.set(snap.x, snap.z);
          playerFootY = snap.footY;
          playerGrounded = snap.grounded;
          horizontalSpeed = snap.horizontalSpeedMs;

          const actualDist = Math.hypot(snap.x - prevX, snap.z - prevZ);
          totalDistanceMoved += actualDist;
          if (!moveTutorialReported && tutorialStepRef.current === 1 && totalDistanceMoved >= 0.25) {
            moveTutorialReported = true;
            onMoveDoneRef.current();
          }
        } else {
          playerFootY = groundHeightAt(playerPos.x, playerPos.y);
        }

        const isMoving = horizontalSpeed > 0.08 || moveFwd !== 0 || moveStrafe !== 0;
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

          const strideCadence = Math.max(2.5, horizontalSpeed * 3.8);
          walkPhase += delta * strideCadence;

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
            const strideAmp = THREE.MathUtils.clamp(horizontalSpeed / 1.4, 0.25, 1.0);
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

        const baseGroundY = groundHeightAt(playerPos.x, playerPos.y);
        outpost.astroGroup.position.set(playerPos.x, playerFootY, playerPos.y);
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

        // Camera Mode: Command Mode Focus vs First-Person (1P) vs Third-Person (3P)
        const isFirstPerson = simState?.cameraMode === '1p' && !isFrozenInCommandMode;
        outpost.astroGroup.visible = !isFirstPerson;

        if (isFrozenInCommandMode && simState && !pausedRef.current) {
          const zp = outpost.zonePositions[simState.activeZoneId];
          _targetCam.set(zp.x - 2.6, zp.y + 2.35, zp.z + 3.85);
          _targetLook.set(zp.x, zp.y + 0.95, zp.z);
          currentCamPos.lerp(_targetCam, isStatic ? 1 : Math.min(1, delta * 5.0));
          currentLookAt.lerp(_targetLook, isStatic ? 1 : Math.min(1, delta * 5.0));
        } else if (isFirstPerson) {
          const eyeY = playerFootY + PHYSICS_CONSTANTS.FIRST_PERSON_EYE_HEIGHT_M;
          const cosP = Math.cos(camPitch);
          const fwdX = Math.sin(camYaw) * cosP;
          const fwdZ = Math.cos(camYaw) * cosP;
          const lookY = Math.sin(-camPitch);
          _tpCam.set(playerPos.x, eyeY, playerPos.y);
          _tpLook.set(playerPos.x + fwdX * 4.0, eyeY + lookY * 4.0, playerPos.y + fwdZ * 4.0);
          currentCamPos.lerp(_tpCam, isStatic ? 1 : Math.min(1, delta * 24.0));
          currentLookAt.lerp(_tpLook, isStatic ? 1 : Math.min(1, delta * 24.0));
        } else {
          computeThirdPersonRig(playerPos.x, playerFootY, playerPos.y, camYaw, camPitch, _tpCam, _tpLook);
          currentCamPos.lerp(_tpCam, isStatic ? 1 : Math.min(1, delta * 18.0));
          currentLookAt.lerp(_tpLook, isStatic ? 1 : Math.min(1, delta * 18.0));
        }
        camera.position.copy(currentCamPos);
        camera.lookAt(currentLookAt);

        // Proximity detection to active Mission Zones & Outpost Stations
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

        // Habitat Airlock Shelter proximity tracking during active localized weather event
        const habShelterPt = outpost.stationInteractPoints.habitat;
        const habDist = Math.hypot(playerPos.x - habShelterPt.x, playerPos.y - habShelterPt.z);
        const habMeters = Math.max(0, Math.round(habDist));
        if (habMeters !== lastHabDistMeters) {
          lastHabDistMeters = habMeters;
          onHabitatDistRef.current?.(habMeters);
        }
        if (simState?.weatherEvent?.active && !isFrozenInCommandMode && !shelterSentThisEvent) {
          if (habDist <= 4.35) {
            shelterSentThisEvent = true;
            onShelterReachedRef.current?.();
          }
        }

        // Emit throttled real-time Mars environmental physics telemetry (~4 Hz)
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
      } else {
        outpost.astroGroup.visible = true;
      }

      // Shared Ambient Outpost Motion + Wind Turbines + Companion Rover Follow & Beam
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

        const sim = simVisualsRef.current;
        if (phase === 'gameplay' && sim) {
          // Companion Rover follows player smoothly at ~2.6m side-trailing distance
          const followTargetX = playerPos.x - Math.sin(playerYaw + 0.65) * 2.6;
          const followTargetZ = playerPos.y - Math.cos(playerYaw + 0.65) * 2.6;
          const dx = followTargetX - roverPos.x;
          const dz = followTargetZ - roverPos.y;
          const dist = Math.hypot(dx, dz);

          if (dist > 0.35) {
            const roverSpeed = sim.roverDamaged ? 1.55 : 2.65;
            const step = Math.min(dist, roverSpeed * delta);
            roverPos.x += (dx / dist) * step;
            roverPos.y += (dz / dist) * step;
            const targetYaw = Math.atan2(dx, dz);
            roverYaw += shortestAngleDiff(roverYaw, targetYaw) * Math.min(1, delta * 5.5);
            outpost.roverWheels.forEach((w) => {
              w.rotation.x += step * 3.8;
            });
          }
          const ry = groundHeightAt(roverPos.x, roverPos.y);
          outpost.roverGroup.position.set(roverPos.x, ry, roverPos.y);
          outpost.roverGroup.rotation.y = roverYaw;
          outpost.roverGroup.rotation.z = sim.roverDamaged ? Math.sin(elapsed * 6.5) * 0.045 : 0;
          physicsWorld?.updateRoverTransform(roverPos.x, ry, roverPos.y, roverYaw);

          // Aim Rover camera head & guide beam toward Habitat Shelter during weather alert, else active zone
          const activeTarget = sim.weatherEvent?.active
            ? outpost.stationInteractPoints.habitat
            : outpost.zonePositions[sim.activeZoneId];
          outpost.roverGuideBeamMat.color.set(sim.weatherEvent?.active ? '#22C55E' : '#FFB703');
          const toZoneAngle =
            Math.atan2(activeTarget.x - roverPos.x, activeTarget.z - roverPos.y) - roverYaw;
          outpost.roverHead.rotation.y = shortestAngleDiff(0, toZoneAngle) * 0.85;
          outpost.roverHead.rotation.x = 0.05;
          outpost.roverGuideBeam.visible = !sim.commandModeOpen;
        } else {
          roverPos.set(outpost.roverBasePos.x, outpost.roverBasePos.z);
          outpost.roverGuideBeam.visible = false;
          const patrolOffset = Math.sin(elapsed * 0.34) * 0.68;
          const rx = outpost.roverBasePos.x + patrolOffset * 0.86;
          const rz = outpost.roverBasePos.z - patrolOffset * 0.44;
          const ry = groundHeightAt(rx, rz);
          outpost.roverGroup.position.set(rx, ry, rz);
          outpost.roverGroup.rotation.y = -1.02;
          outpost.roverGroup.rotation.z = 0;
          physicsWorld?.updateRoverTransform(rx, ry, rz, -1.02);
          outpost.roverHead.rotation.y = Math.sin(elapsed * 0.85) * 0.42;
          outpost.roverHead.rotation.x = Math.sin(elapsed * 1.15) * 0.09;
          const wheelSpin = Math.cos(elapsed * 0.34) * 0.9;
          outpost.roverWheels.forEach((w) => {
            w.rotation.x += wheelSpin * delta;
          });
        }

        const dustWind = 0.55 + (1 - (sim?.dustFactor ?? 1)) * 2.1;
        const dAttr = envBuild.dustPoints.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < envBuild.dustCount; i++) {
          let x = dAttr.getX(i) + delta * dustWind;
          if (x > 19) x = -15;
          dAttr.setX(i, x);
        }
        dAttr.needsUpdate = true;
      }

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
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
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      physicsWorld?.dispose();
      physicsWorld = null;
      if (stormPass) stormPass.dispose();
      if (outputPass) outputPass.dispose();
      if (composerTarget) composerTarget.dispose();
      if (composer) composer.dispose();
      outpost.dispose();
      envBuild.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [quality]);

  if (webglUnavailable) {
    return (
      <div
        className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#0B1D36] via-[#1B3A5F] to-[#8C3718]"
        aria-label="Mars Outpost Title Scene Fallback"
      />
    );
  }

  return <div ref={mountRef} className="w-full h-full touch-none select-none" />;
}
