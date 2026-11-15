import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CursorUnlockKey,
  GameplayInputState,
  GraphicsQuality,
  LandingTelemetrySummary,
  MarsOutpost3D,
  SimVisualState,
} from './components/MarsOutpost3D';
import { TitleScreenHUD } from './components/TitleScreenHUD';
import { ActiveModalType, Modals } from './components/Modals';
import { PrologueHUD } from './components/PrologueHUD';
import { BriefingOverlay } from './components/BriefingOverlay';
import { GameplayHUD } from './components/GameplayHUD';
import { CommandModeModal } from './components/CommandModeModal';
import { CommandersLogModal, DataCreditsModal } from './components/LogCreditsModals';
import { DebriefScreen } from './components/DebriefScreen';
import { PauseMenuModal } from './components/PauseMenuModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { GameplayPoseTelemetry, WristMapModal } from './components/WristMapModal';
import { QuickActionMenuModal, getAudioZoneMeta } from './components/QuickActionMenuModal';
import {
  HudPopupQueueState,
  HudToastItem,
  createInitialPopupQueueState,
  dismissPopupToast,
  enqueuePopupToast,
  tickPopupQueue,
} from './components/hudPopupQueue';
import {
  COMMANDER_CALLSIGNS,
  GamePhase,
  OutpostLandmarkId,
  PowerAllocation,
} from './data/missionData';
import { CREW_PROFILES, CrewMemberId, SIM_CONSTANTS, getResourceStatus } from './sim/constants';
import { CrewInspectCardData } from './sim/crewAndRoverSim';
import { MISSIONS, MissionZoneId, OptionId } from './sim/missionsData';
import { GAMEPLAY_LAYOUT } from './sim/outpostLayout';
import {
  ARCHIVED_DONKI_FALLBACK,
  DonkiSpaceWeather,
  fetchDonkiSpaceWeather,
} from './sim/nasaData';
import { generateNewSeed } from './sim/rng';
import { ChorePlaceId } from './sim/juniorData';
import {
  GUIDANCE_LADDER_THRESHOLDS_SEC,
  JUNIOR_MISSIONS,
  formatWithRoverName,
} from './sim/storyBeats';
import {
  getActiveObjective,
  isTank2SceneActive,
} from './sim/activeObjective';
import {
  CampaignState,
  advanceRoutineSols,
  applyPostStormPanelCleaning,
  collectGravityCrystal,
  completeDebriefQuiz,
  completeMissionMiniActivity,
  completeMissionQuiz,
  completeTutorialQuiz,
  computeRoverMood,
  createInitialCampaignState,
  enterFreeRoam,
  getActiveMission,
  getResourceDaysSummary,
  jumpToMission,
  markDataInspected,
  markMissionControlAsked,
  proceedToNextCriticalSol,
  reopenDebrief,
  resolveMissionOption,
  resolveWeatherEventShelter,
  setTutorialStep,
  toggleGrownUpScience,
  toggleRoverHush,
  triggerLocalizedWeatherEvent,
  triggerWeatherGustPulse,
  unlockScienceCard,
  useRoverHint,
  visitChoreSpot,
} from './sim/simEngine';
import {
  MarsEnvironmentSnapshot,
  computeDiurnalMarsWeather,
} from './sim/marsPhysics';
import { OutpostAudioZone, soundEngine } from './utils/soundEngine';
import { narrativeVoice } from './utils/narrativeVoice';
import { stopCelebration } from './utils/celebration';
import { CelebrationLayer } from './components/CelebrationLayer';
import { isDebugModeEnabled } from './debug/diagnostics';
import { DebugPanel } from './components/DebugPanel';

export default function App() {
  const [debugMode] = useState<boolean>(() => isDebugModeEnabled());
  const [gamePhase, setGamePhase] = useState<GamePhase>('landing');
  const [engineReady, setEngineReady] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundTouchedRef = useRef(false);
  const [quality] = useState<GraphicsQuality>('high');
  const [selectedLandmark, setSelectedLandmark] = useState<OutpostLandmarkId | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [missionInfoFocus, setMissionInfoFocus] = useState<
    'explore' | 'survive' | 'discover' | null
  >(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Intro Video Playback State
  const [prologuePaused, setProloguePaused] = useState(false);
  const [prologueElapsed, setPrologueElapsed] = useState(0);
  const [prologueReplayToken, setPrologueReplayToken] = useState(0);

  // Campaign Setup & Live NASA DONKI Weather
  const [callsign, setCallsign] = useState(COMMANDER_CALLSIGNS[0]);
  const [roverName, setRoverName] = useState('Rusty');
  const [seed, setSeed] = useState<number>(() => 20260709);
  const [donkiWeather, setDonkiWeather] = useState<DonkiSpaceWeather>(ARCHIVED_DONKI_FALLBACK);

  // Full 88-Sol / 5-Critical-Sol Simulation State
  const [simState, setSimState] = useState<CampaignState>(() =>
    createInitialCampaignState(20260709, COMMANDER_CALLSIGNS[0], 'Rusty', ARCHIVED_DONKI_FALLBACK),
  );
  const simStateRef = useRef(simState);
  simStateRef.current = simState;
  const [cameraMode, setCameraMode] = useState<'3p' | '1p'>('3p');
  const [guideEnabled, setGuideEnabled] = useState<boolean>(true);
  const [lensOpen, setLensOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [poseTelemetry, setPoseTelemetry] = useState<GameplayPoseTelemetry>(() => ({
    x: GAMEPLAY_LAYOUT.modules.astroSpawn.x,
    z: GAMEPLAY_LAYOUT.modules.astroSpawn.z,
    headingDeg:
      ((Math.atan2(
        Math.sin(GAMEPLAY_LAYOUT.modules.astroSpawn.yaw),
        -Math.cos(GAMEPLAY_LAYOUT.modules.astroSpawn.yaw),
      ) *
        180) /
        Math.PI +
        360) %
      360,
    speedMs: 0,
    roverX: GAMEPLAY_LAYOUT.modules.roverSpawn.x,
    roverZ: GAMEPLAY_LAYOUT.modules.roverSpawn.z,
    crewDots: CREW_PROFILES.map((p) => {
      const slot = GAMEPLAY_LAYOUT.crewStations[p.id][0];
      return {
        id: p.id,
        name: p.name,
        color: p.avatarColor,
        x: slot.x,
        z: slot.z,
      };
    }),
  }));
  const [commandModeOpen, setCommandModeOpen] = useState(false);
  const [commandInitialTab, setCommandInitialTab] = useState<'look' | 'compare'>('look');
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [audioZone, setAudioZone] = useState<OutpostAudioZone>('outdoors');
  const [popupQueue, setPopupQueue] = useState<HudPopupQueueState>(() =>
    createInitialPopupQueueState(),
  );
  const [controlsStripVisible, setControlsStripVisible] = useState(true);
  const [rustyCollapsed, setRustyCollapsed] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [mouseSensitivity, setMouseSensitivity] = useState(1.0);
  const [cursorUnlockKey, setCursorUnlockKey] = useState<CursorUnlockKey>('Alt');
  const [cursorUnlockedInGame, setCursorUnlockedInGame] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  const [nearbyZone, setNearbyZone] = useState<MissionZoneId | null>(null);
  const [nearbyStation, setNearbyStation] = useState<OutpostLandmarkId | null>(null);
  const [nearbyCrewId, setNearbyCrewId] = useState<CrewMemberId | null>(null);
  const [inspectedStation, setInspectedStation] = useState<OutpostLandmarkId | null>(null);
  const [inspectedCrew, setInspectedCrew] = useState<CrewInspectCardData | null>(null);
  const [roverTiltWarning, setRoverTiltWarning] = useState<{ active: boolean; deg: number }>({
    active: false,
    deg: 0,
  });
  const [weatherSecondsLeft, setWeatherSecondsLeft] = useState<number>(0);
  const [m5ShelterSecondsLeft, setM5ShelterSecondsLeft] = useState<number>(180);
  const [habitatDistMeters, setHabitatDistMeters] = useState<number>(7);
  const [marsPhysics, setMarsPhysics] = useState<MarsEnvironmentSnapshot>(() =>
    computeDiurnalMarsWeather(21, 0, 1.0, 1.0, 4.95, 2.65, 0),
  );
  const autoWeatherSolsRef = useRef<Set<number>>(new Set());
  const lastWeatherIdRef = useRef<string | null>(null);
  const tank2WhisperPlayedRef = useRef(false);
  const [guidanceSeconds, setGuidanceSeconds] = useState<number>(0);
  const guidanceSpokenStageRef = useRef<number>(0);

  useEffect(() => {
    narrativeVoice.setRoverName(simState.roverName || roverName);
  }, [simState.roverName, roverName]);

  const moveInputRef = useRef<GameplayInputState>({
    forward: false,
    back: false,
    left: false,
    right: false,
    lookX: 0,
  });

  // Attempt live NASA DONKI fetch once on mount with transparent 3.5s fallback
  useEffect(() => {
    let active = true;
    fetchDonkiSpaceWeather().then((res) => {
      if (!active) return;
      setDonkiWeather(res);
      setSimState((prev) => ({ ...prev, donki: res }));
    });
    return () => {
      active = false;
    };
  }, []);

  // Quick Direct Jump via URL: ?mission=5 or ?sol=88 jumps straight to Mission 5 (Sol 88 Solar Storm)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mission');
    const s = params.get('sol');
    if (m === '5' || s === '88') {
      soundEngine.setEnabled(true);
      setSoundEnabled(true);
      setGamePhase('gameplay');
      setSimState((prev) => jumpToMission(prev, 4));
    } else if (m === '1' || s === '21') {
      soundEngine.setEnabled(true);
      setSoundEnabled(true);
      setGamePhase('gameplay');
      setSimState((prev) => jumpToMission(prev, 0));
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (ev: MediaQueryListEvent) => setReducedMotion(ev.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Intro video playback timing & audio are driven natively by PrologueHUD's <video> element.

  const tutorialModalOpen =
    simState.tutorialStep === 'gravity-card' ||
    simState.tutorialStep === 'tutorial-quiz' ||
    simState.tutorialStep === 'crew-map-intro';

  const anyModalBlocking =
    creditsOpen ||
    logOpen ||
    mapOpen ||
    quickMenuOpen ||
    commandModeOpen ||
    paused ||
    simState.phase !== 'active-mission' ||
    tutorialModalOpen;
  const anyModalBlockingRef = useRef(anyModalBlocking);
  anyModalBlockingRef.current = anyModalBlocking;

  const enqueueToast = useCallback(
    (toast: Omit<HudToastItem, 'createdAtMs' | 'enqueuedAtMs' | 'expiresAtMs'>) => {
      setPopupQueue((prev) =>
        enqueuePopupToast(prev, toast, performance.now(), anyModalBlockingRef.current),
      );
    },
    [],
  );

  // Popup priority queue tick: enforces >= 2 s pacing, 4 s auto-dismiss, and modal pausing
  useEffect(() => {
    if (gamePhase !== 'gameplay') return;
    const tid = window.setInterval(() => {
      setPopupQueue((prev) =>
        tickPopupQueue(prev, performance.now(), anyModalBlockingRef.current),
      );
    }, 250);
    return () => window.clearInterval(tid);
  }, [gamePhase]);

  // Auto-hide bottom-right controls strip after 20 s of gameplay (toggled anytime via [H])
  useEffect(() => {
    if (gamePhase !== 'gameplay' || !controlsStripVisible) return;
    const tid = window.setTimeout(() => setControlsStripVisible(false), 20000);
    return () => window.clearTimeout(tid);
  }, [gamePhase, controlsStripVisible]);

  const mission1AlertTriggeredRef = useRef(false);

  // Clean up previous step toasts (especially 'landing-comparison' and crystal toasts) whenever tutorialStep changes
  useEffect(() => {
    setPopupQueue((prev) => {
      let next = prev;
      for (const toastId of [
        'landing-comparison',
        'crystal-toast-1',
        'crystal-toast-2',
        'crystal-toast-3',
      ]) {
        next = dismissPopupToast(next, toastId);
      }
      return next;
    });
  }, [simState.tutorialStep]);

  // Expand Rusty companion panel automatically & trigger Mission 1 emergency once training completes
  useEffect(() => {
    if (simState.tutorialStep === 'complete') {
      setRustyCollapsed(false);
      if (!mission1AlertTriggeredRef.current) {
        mission1AlertTriggeredRef.current = true;
        soundEngine.playDustDevilAlert();
        narrativeVoice.speakMissionIncident('m1');
        enqueueToast({
          id: `m1-incident-${Date.now()}`,
          kind: 'hint',
          priority: 'P3',
          title: 'NOTICE · OXYGEN TANK 2',
          detail: 'Rafi: "Notice: Tank 2 pressure is dropping slowly. Can you meet me at the oxygen bay?"',
          tone: 'warn',
        });
      }
    }
  }, [simState.tutorialStep, enqueueToast]);

  // Global Gameplay Shortcuts: Esc, C (Quick Actions), G (Toggle Path Guide), H (Toggle Controls Strip), Hold X (Skip Training), Tab (Log), Q (Rover Hint)
  useEffect(() => {
    if (gamePhase !== 'gameplay') return;
    let skipHoldTid: number | null = null;

    const onKeyDown = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (ev.key === 'Escape') {
        if (creditsOpen) setCreditsOpen(false);
        else if (quickMenuOpen) setQuickMenuOpen(false);
        else if (logOpen) setLogOpen(false);
        else if (mapOpen) setMapOpen(false);
        else if (commandModeOpen && simState.phase === 'active-mission') setCommandModeOpen(false);
        else if (inspectedCrew) setInspectedCrew(null);
        else if (inspectedStation) setInspectedStation(null);
        else if (lensOpen) setLensOpen(false);
        else setPaused((prev) => !prev);
      } else if (ev.code === 'KeyC' && !ev.repeat) {
        if (anyModalBlockingRef.current || mapOpen) return;
        soundEngine.playClick();
        setQuickMenuOpen((prev) => !prev);
      } else if (ev.code === 'KeyG' && !ev.repeat) {
        if (anyModalBlockingRef.current) return;
        soundEngine.playClick();
        setGuideEnabled((prev) => !prev);
      } else if (ev.code === 'KeyH' && !ev.repeat) {
        if (anyModalBlockingRef.current) return;
        soundEngine.playClick();
        setControlsStripVisible((prev) => !prev);
      } else if (
        ev.code === 'KeyX' &&
        !ev.repeat &&
        simState.tutorialStep !== 'complete' &&
        !anyModalBlockingRef.current
      ) {
        if (skipHoldTid === null) {
          skipHoldTid = window.setTimeout(() => {
            skipHoldTid = null;
            soundEngine.playClick();
            setInspectedStation(null);
            setInspectedCrew(null);
            setSimState((prev) => setTutorialStep(prev, 'complete'));
          }, 700);
        }
      } else if (ev.key === 'Tab') {
        ev.preventDefault();
        soundEngine.playClick();
        setLogOpen((prev) => !prev);
      } else if (ev.code === 'KeyQ' && !ev.repeat) {
        soundEngine.playInspect();
        setSimState((prev) => useRoverHint(prev, 1));
      }
    };

    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.code === 'KeyX' && skipHoldTid !== null) {
        window.clearTimeout(skipHoldTid);
        skipHoldTid = null;
      }
    };

    const onBlur = () => {
      if (skipHoldTid !== null) {
        window.clearTimeout(skipHoldTid);
        skipHoldTid = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      if (skipHoldTid !== null) window.clearTimeout(skipHoldTid);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    gamePhase,
    creditsOpen,
    quickMenuOpen,
    logOpen,
    mapOpen,
    commandModeOpen,
    inspectedCrew,
    inspectedStation,
    lensOpen,
    simState.phase,
    simState.tutorialStep,
  ]);

  const handleToggleSound = () => {
    soundTouchedRef.current = true;
    const next = soundEngine.setEnabled(!soundEnabled);
    setSoundEnabled(next);
    if (next && gamePhase === 'gameplay' && simState.activeWeatherEvent) {
      soundEngine.playDustDevilAlert();
      soundEngine.startWeatherLoop(
        simState.activeWeatherEvent.kind,
        simState.activeWeatherEvent.rumbleIntensity,
      );
    }
  };

  const handleSelectLandmark = (id: OutpostLandmarkId | null) => {
    if (id) soundEngine.playInspect();
    else soundEngine.playClick();
    setSelectedLandmark(id);
  };

  // Landing -> 29s Cinematic Intro Video
  const handleStartMission = () => {
    if (!soundTouchedRef.current && !soundEnabled) {
      const enabled = soundEngine.setEnabled(true);
      setSoundEnabled(enabled);
    }
    soundEngine.playMissionStart();
    setActiveModal(null);
    setSelectedLandmark(null);
    setProloguePaused(false);
    setPrologueElapsed(0);
    setPrologueReplayToken((t) => t + 1);
    setGamePhase('prologue');
  };

  const handleReplayPrologue = () => {
    soundEngine.playMissionStart();
    setInspectedStation(null);
    setInspectedCrew(null);
    setMapOpen(false);
    setQuickMenuOpen(false);
    setPopupQueue(createInitialPopupQueueState());
    setCommandModeOpen(false);
    setLogOpen(false);
    setCreditsOpen(false);
    setProloguePaused(false);
    setPrologueElapsed(0);
    setPrologueReplayToken((t) => t + 1);
    setGamePhase('prologue');
  };

  const handleSkipPrologue = () => {
    soundEngine.playClick();
    setGamePhase('briefing');
  };

  const handleCompletePrologue = useCallback(() => {
    setGamePhase('briefing');
  }, []);

  // Briefing -> Start 88-Sol Campaign at Critical Sol 1 (Sol 21)
  const startNewCampaignWithSeed = useCallback(
    (nextSeed: number) => {
      soundEngine.stopWeatherLoop();
      const enabled = soundEngine.setEnabled(true);
      setSoundEnabled(enabled);
      soundEngine.playMissionStart();
      setSeed(nextSeed);
      mission1AlertTriggeredRef.current = false;
      tank2WhisperPlayedRef.current = false;
      autoWeatherSolsRef.current.clear();
      lastWeatherIdRef.current = null;
      setWeatherSecondsLeft(0);
      setM5ShelterSecondsLeft(180);
      setSimState(createInitialCampaignState(nextSeed, callsign, roverName, donkiWeather));
      setCameraMode('3p');
      setGuideEnabled(true);
      setLensOpen(false);
      setMapOpen(false);
      setQuickMenuOpen(false);
      setPopupQueue(createInitialPopupQueueState());
      setControlsStripVisible(true);
      setRustyCollapsed(true);
      setAudioZone('outdoors');
      setInspectedStation(null);
      setInspectedCrew(null);
      setCommandModeOpen(false);
      setLogOpen(false);
      setCreditsOpen(false);
      setPaused(false);
      setCursorUnlockedInGame(false);
      setNearbyStation(null);
      setNearbyZone(null);
      setNearbyCrewId(null);
      setGamePhase('gameplay');
    },
    [callsign, roverName, donkiWeather],
  );

  const handleStartExploration = () => {
    startNewCampaignWithSeed(seed);
  };

  const handleReturnTitle = () => {
    stopCelebration();
    soundEngine.stopWeatherLoop();
    soundEngine.playClick();
    setInspectedStation(null);
    setInspectedCrew(null);
    setLensOpen(false);
    setMapOpen(false);
    setQuickMenuOpen(false);
    setPopupQueue(createInitialPopupQueueState());
    setAudioZone('outdoors');
    setCommandModeOpen(false);
    setLogOpen(false);
    setCreditsOpen(false);
    setPaused(false);
    setNearbyStation(null);
    setNearbyZone(null);
    setNearbyCrewId(null);
    setSelectedLandmark(null);
    setGamePhase('landing');
  };

  const activeMission = useMemo(() => getActiveMission(simState), [simState]);

  const activeObjective = useMemo(
    () => getActiveObjective(simState, GAMEPLAY_LAYOUT, poseTelemetry.x, poseTelemetry.z),
    [simState, poseTelemetry.x, poseTelemetry.z],
  );

  useEffect(() => {
    if (!debugMode || gamePhase !== 'gameplay') return;
    console.info('[DEBUG OBJECTIVE]', {
      tutorialStep: simState.tutorialStep,
      choresVisited: simState.choresVisited,
      activeObjectiveId: activeObjective.id,
      activeObjectiveLabel: activeObjective.label,
      ownerScene: activeObjective.ownerScene,
      pos: { x: activeObjective.x, z: activeObjective.z },
      showMarkerAndRing: activeObjective.showMarkerAndRing,
      isTank2: activeObjective.isTank2,
      tank2SceneActive: isTank2SceneActive(simState),
      guideEnabled,
      cameraTakeover: false,
    });
  }, [
    debugMode,
    gamePhase,
    simState.tutorialStep,
    simState.choresVisited,
    activeObjective.id,
    activeObjective.label,
    activeObjective.ownerScene,
    activeObjective.x,
    activeObjective.z,
    activeObjective.showMarkerAndRing,
    activeObjective.isTank2,
    simState,
    guideEnabled,
  ]);

  // Sync audio & P0 non-blocking HUD weather alert whenever a localized weather event spawns
  useEffect(() => {
    const activeWx = simState.activeWeatherEvent;
    if (gamePhase !== 'gameplay' || simState.phase !== 'active-mission' || !activeWx) {
      if (!activeWx) {
        lastWeatherIdRef.current = null;
        soundEngine.stopWeatherLoop();
      }
      return;
    }

    if (lastWeatherIdRef.current !== activeWx.id) {
      lastWeatherIdRef.current = activeWx.id;
      setWeatherSecondsLeft(activeWx.durationSeconds);
      setInspectedStation(null);
      enqueueToast({
        id: `wx-${activeWx.id}`,
        kind: 'hint',
        priority: 'P3',
        title: `${activeWx.title} · Shelter Alert`,
        detail: `Head inside the Habitat Airlock before countdown ends! Press [Tab] for Journal.`,
        tone: 'critical',
      });
      soundEngine.playDustDevilAlert();
      soundEngine.startWeatherLoop(activeWx.kind, activeWx.rumbleIntensity);
    }
  }, [gamePhase, simState.phase, simState.activeWeatherEvent, enqueueToast]);

  // Periodic wind-gust bursts + live wind surge updates while a localized storm is active and unpaused
  useEffect(() => {
    const activeWx = simState.activeWeatherEvent;
    if (
      gamePhase !== 'gameplay' ||
      simState.phase !== 'active-mission' ||
      !activeWx ||
      logOpen ||
      mapOpen ||
      commandModeOpen ||
      creditsOpen ||
      paused
    ) {
      return;
    }

    const fireGust = () => {
      const curr = simStateRef.current;
      if (!curr.activeWeatherEvent) return;
      const { nextState, gustStrength } = triggerWeatherGustPulse(curr);
      setSimState(nextState);
      soundEngine.playWindGust(gustStrength, curr.activeWeatherEvent.kind);
    };

    const initialTimerId = window.setTimeout(() => {
      if (simStateRef.current.activeWeatherEvent?.gustCount === 0) {
        fireGust();
      }
    }, 350);

    const intervalMs = Math.max(2200, Math.round(activeWx.gustIntervalSeconds * 1000));
    const intervalId = window.setInterval(fireGust, intervalMs);

    return () => {
      window.clearTimeout(initialTimerId);
      window.clearInterval(intervalId);
    };
  }, [
    gamePhase,
    simState.phase,
    simState.activeWeatherEvent?.id,
    simState.activeWeatherEvent?.gustIntervalSeconds,
    logOpen,
    mapOpen,
    commandModeOpen,
    creditsOpen,
    paused,
  ]);

  // Bible S3 Role 2 Guidance Ladder: 60 s Rusty hint, 120 s Rusty rolls toward objective, 240 s dotted path.
  // Resources stay frozen while a card is open or while the player explores.
  useEffect(() => {
    setGuidanceSeconds(0);
    guidanceSpokenStageRef.current = 0;
  }, [
    simState.missionIndex,
    simState.phase,
    simState.tutorialStep,
    commandModeOpen,
    simState.missionMiniActivityDone[activeMission.id],
    simState.missionQuizDone[activeMission.id],
  ]);

  useEffect(() => {
    if (
      gamePhase !== 'gameplay' ||
      simState.phase !== 'active-mission' ||
      simState.tutorialStep !== 'complete' ||
      anyModalBlocking
    ) {
      return;
    }

    const tid = window.setInterval(() => {
      setGuidanceSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(tid);
  }, [gamePhase, simState.phase, simState.tutorialStep, anyModalBlocking]);

  const guidanceStage: 0 | 1 | 2 | 3 =
    guidanceSeconds >= GUIDANCE_LADDER_THRESHOLDS_SEC.dottedPath
      ? 3
      : guidanceSeconds >= GUIDANCE_LADDER_THRESHOLDS_SEC.roverLead
        ? 2
        : guidanceSeconds >= GUIDANCE_LADDER_THRESHOLDS_SEC.hintQuestion
          ? 1
          : 0;

  useEffect(() => {
    if (guidanceStage <= guidanceSpokenStageRef.current) return;
    guidanceSpokenStageRef.current = guidanceStage;
    const jMission = JUNIOR_MISSIONS[activeMission.id];
    const rName = simState.roverName;
    if (guidanceStage === 1 && jMission) {
      soundEngine.playRoverBeep('curious');
      const hintLine = formatWithRoverName(jMission.guidanceHint60s, rName);
      setSimState((prev) => ({
        ...prev,
        roverHintLevelUsed: {
          ...prev.roverHintLevelUsed,
          [activeMission.id]: Math.max(prev.roverHintLevelUsed[activeMission.id] ?? 0, 1),
        },
        roverActiveHint: hintLine,
        roverLastLine: hintLine,
      }));
      narrativeVoice.speakAs('rusty', hintLine, `guidance-60s-${activeMission.id}`, 600);
      enqueueToast({
        id: `guidance-60s-${activeMission.id}-${Date.now()}`,
        kind: 'hint',
        priority: 'P3',
        title: `${rName} · Gentle Hint`,
        detail: `${rName}: "${hintLine}"`,
        tone: 'info',
      });
    } else if (guidanceStage === 2 && jMission) {
      soundEngine.playRoverBeep('alert');
      const leadLine = formatWithRoverName(jMission.guidanceLead120s, rName);
      setSimState((prev) => ({
        ...prev,
        roverHintLevelUsed: {
          ...prev.roverHintLevelUsed,
          [activeMission.id]: Math.max(prev.roverHintLevelUsed[activeMission.id] ?? 0, 2),
        },
        roverActiveHint: leadLine,
        roverLastLine: leadLine,
      }));
      narrativeVoice.speakAs('rusty', leadLine, `guidance-120s-${activeMission.id}`, 600);
      enqueueToast({
        id: `guidance-120s-${activeMission.id}-${Date.now()}`,
        kind: 'hint',
        priority: 'P3',
        title: `${rName} Leading the Way`,
        detail: `${rName}: "${leadLine}"`,
        tone: 'info',
      });
    }
  }, [guidanceStage, activeMission.id, simState.roverName, enqueueToast]);

  // Seek Shelter countdown timer (pauses cleanly while inspecting modals or Pause Menu)
  useEffect(() => {
    if (
      gamePhase !== 'gameplay' ||
      simState.phase !== 'active-mission' ||
      !simState.activeWeatherEvent ||
      logOpen ||
      mapOpen ||
      commandModeOpen ||
      creditsOpen ||
      paused
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setWeatherSecondsLeft((prev) => {
        if (prev <= 1) {
          soundEngine.stopWeatherLoop();
          soundEngine.playWeatherExposed();
          setSimState((curr) => resolveWeatherEventShelter(curr, 'exposed'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [
    gamePhase,
    simState.phase,
    simState.activeWeatherEvent,
    logOpen,
    mapOpen,
    commandModeOpen,
    creditsOpen,
    paused,
  ]);

  // Calm 3:00 (180s) Shelter Bell timer during Mission 5 (Story Bible S2.5: pauses while cards/modals are open)
  useEffect(() => {
    if (activeMission.id === 'm5' && simState.phase === 'active-mission') {
      setM5ShelterSecondsLeft((prev) => (prev <= 0 ? 180 : prev));
    }
  }, [activeMission.id, simState.phase]);

  useEffect(() => {
    if (
      gamePhase !== 'gameplay' ||
      simState.phase !== 'active-mission' ||
      activeMission.id !== 'm5' ||
      anyModalBlocking
    ) {
      return;
    }
    const tid = window.setInterval(() => {
      setM5ShelterSecondsLeft((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(tid);
  }, [gamePhase, simState.phase, activeMission.id, anyModalBlocking]);

  // Tank 2 quiet tick-hiss foreshadowing when approaching Tank 2 during Act 1 inspect-oxygen (Story Bible S1.6)
  useEffect(() => {
    if (
      gamePhase === 'gameplay' &&
      simState.tutorialStep === 'inspect-oxygen' &&
      nearbyZone === 'tank2' &&
      !tank2WhisperPlayedRef.current
    ) {
      tank2WhisperPlayedRef.current = true;
      soundEngine.playInspect();
      narrativeVoice.speakTutorialStep('inspect-oxygen');
      enqueueToast({
        id: 'tank2-foreshadow-whisper',
        kind: 'hint',
        priority: 'P3',
        title: 'Oxygen Tank 2 · Quiet Tick-Hiss',
        detail: `${simState.roverName}: "This is Tank 2. It holds our air." (Press [E] to check the gauge)`,
        tone: 'info',
      });
    }
  }, [gamePhase, simState.tutorialStep, nearbyZone, simState.roverName, enqueueToast]);

  // Advance 'take-control' -> 'look' automatically when pointer locks at the airlock
  useEffect(() => {
    if (gamePhase === 'gameplay' && pointerLocked && simState.tutorialStep === 'take-control') {
      setSimState((prev) =>
        prev.tutorialStep === 'take-control' ? setTutorialStep(prev, 'look') : prev,
      );
    }
  }, [gamePhase, pointerLocked, simState.tutorialStep]);

  useEffect(() => {
    return () => {
      soundEngine.stopWeatherLoop();
    };
  }, []);

  const handleShelterReached = useCallback(() => {
    soundEngine.stopWeatherLoop();
    soundEngine.playShelterSafe();
    setSimState((prev) => resolveWeatherEventShelter(prev, 'sheltered'));
  }, []);

  const handleTriggerWeatherTest = useCallback(() => {
    autoWeatherSolsRef.current.add(simState.missionIndex);
    setSimState((prev) => triggerLocalizedWeatherEvent(prev));
  }, [simState.missionIndex]);

  const handleOpenCommandMode = useCallback(
    (tab: 'look' | 'compare' = 'look') => {
      soundEngine.playConsoleActivate();
      setInspectedStation(null);
      setCommandInitialTab(tab);
      setCommandModeOpen(true);
      if (tab === 'look') {
        setSimState((prev) => markDataInspected(prev));
      }
    },
    [],
  );

  const handleTutorialMoveDone = useCallback(() => {
    setSimState((prev) =>
      prev.tutorialStep === 'move' ? setTutorialStep(prev, 'jump-crystals') : prev,
    );
  }, []);

  const handleVisitChore = useCallback(
    (spot: ChorePlaceId) => {
      soundEngine.playInspect();
      narrativeVoice.speakChoreSpot(spot);
      const spotTitle =
        spot === 'greenhouse'
          ? 'Chore 1/3 · Greenhouse (Rafi)'
          : spot === 'solar'
            ? 'Chore 2/3 · Solar Field (Kenji)'
            : 'Chore 3/3 · Habitat Core (Amara & Lucía)';
      const spotLine =
        spot === 'greenhouse'
          ? 'Rafi: "Welcome to my garden! These tomato seeds are my babies. They need light, water and warmth."'
          : spot === 'solar'
            ? 'Kenji: "These panels turn sunlight into power. Keep them clean and they keep us cozy."'
            : 'Amara: "Drink some water. Mars air is very dry." · Lucía: "Look at this rock! It has stripes."';
      enqueueToast({
        id: `chore-${spot}-${Date.now()}`,
        kind: 'hint',
        priority: 'P3',
        title: spotTitle,
        detail: spotLine,
        tone: 'good',
      });
      setSimState((prev) => visitChoreSpot(prev, spot));
    },
    [enqueueToast],
  );

  const handleCrystalCollected = useCallback(
    (crystalId: string) => {
      setSimState((prev) => {
        if (prev.tutorialStep !== 'jump-crystals') return prev;
        const next = collectGravityCrystal(prev, crystalId);
        if (next.crystalsCollected > prev.crystalsCollected) {
          soundEngine.playCrystalCollect(next.crystalsCollected);
          const count = next.crystalsCollected;
          const rustyJumpLine =
            count === 1
              ? 'One!'
              : count === 2
                ? 'Two!'
                : 'Three! Wow, look how high you went!';
          narrativeVoice.speakAs('rusty', rustyJumpLine, `crystal-${count}`, 500, undefined, true);
          enqueueToast({
            id: `crystal-toast-${count}`,
            kind: 'hint',
            priority: 'P3',
            title: `Gravity Crystal ${count}/3`,
            detail: `${prev.roverName}: "${rustyJumpLine}"`,
            tone: 'good',
          });
        }
        return next;
      });
    },
    [enqueueToast],
  );

  const handleInteractZone = useCallback(
    (zoneId: MissionZoneId) => {
      const currTutorial = simStateRef.current.tutorialStep;
      if (currTutorial === 'inspect-rover') {
        soundEngine.playInspect();
        setSimState((prev) => setTutorialStep(prev, 'jump-crystals'));
        return;
      }
      if (currTutorial === 'chores') {
        if (zoneId === 'greenhouse') {
          handleVisitChore('greenhouse');
          return;
        }
        if (zoneId === 'solar') {
          handleVisitChore('solar');
          return;
        }
        if (zoneId === 'shelter') {
          handleVisitChore('habitat');
          return;
        }
        return;
      }
      if (currTutorial === 'inspect-oxygen') {
        soundEngine.playInspect();
        if (zoneId === 'tank2') {
          setSimState((prev) => setTutorialStep(prev, 'tutorial-quiz'));
        } else if (zoneId === 'solar') {
          setInspectedStation('solar');
        } else if (zoneId === 'greenhouse') {
          setInspectedStation('greenhouse');
        }
        return;
      }
      if (currTutorial !== 'complete') {
        soundEngine.playInspect();
        if (zoneId === 'solar') setInspectedStation('solar');
        else if (zoneId === 'greenhouse') setInspectedStation('greenhouse');
        return;
      }
      if (simStateRef.current.phase === 'free-roam') {
        soundEngine.playInspect();
        narrativeVoice.speakLandmark(zoneId);
        if (zoneId === 'solar') setInspectedStation('solar');
        else if (zoneId === 'greenhouse') setInspectedStation('greenhouse');
        return;
      }
      if (zoneId === activeMission.zoneId) {
        handleOpenCommandMode('look');
        return;
      }
      // Map secondary mission zones to helpful inspection popovers
      soundEngine.playInspect();
      if (zoneId === 'solar') setInspectedStation('solar');
      else if (zoneId === 'greenhouse') setInspectedStation('greenhouse');
      else handleOpenCommandMode('look');
    },
    [activeMission.zoneId, handleOpenCommandMode, handleVisitChore],
  );

  const handleInteractStation = useCallback(
    (stationId: OutpostLandmarkId) => {
      const currTutorial = simStateRef.current.tutorialStep;
      if (currTutorial === 'inspect-rover') {
        soundEngine.playInspect();
        narrativeVoice.speakLandmark(stationId);
        setInspectedCrew(null);
        setInspectedStation(stationId);
        setSimState((prev) => setTutorialStep(prev, 'jump-crystals'));
        return;
      }
      if (currTutorial === 'chores') {
        if (stationId === 'greenhouse') {
          handleVisitChore('greenhouse');
          return;
        }
        if (stationId === 'solar') {
          handleVisitChore('solar');
          return;
        }
        if (stationId === 'habitat') {
          handleVisitChore('habitat');
          return;
        }
      }
      if (currTutorial !== 'complete') {
        soundEngine.playInspect();
        narrativeVoice.speakLandmark(stationId);
        setInspectedCrew(null);
        setInspectedStation(stationId);
        return;
      }
      if (stationId === 'power-console') {
        handleOpenCommandMode('look');
        return;
      }
      if (
        (stationId === 'solar' && activeMission.zoneId === 'solar') ||
        (stationId === 'greenhouse' && activeMission.zoneId === 'greenhouse')
      ) {
        handleOpenCommandMode('look');
        return;
      }
      soundEngine.playInspect();
      narrativeVoice.speakLandmark(stationId);
      setInspectedCrew(null);
      setInspectedStation(stationId);
    },
    [activeMission.zoneId, handleOpenCommandMode, handleVisitChore],
  );

  const handleInteractCrewFromHud = useCallback(
    (crewId: CrewMemberId) => {
      const currTutorial = simStateRef.current.tutorialStep;
      if (currTutorial === 'chores') {
        if (crewId === 'rafi') handleVisitChore('greenhouse');
        else if (crewId === 'kenji') handleVisitChore('solar');
        else if (crewId === 'amara' || crewId === 'lucia') handleVisitChore('habitat');
      }
      const prof = CREW_PROFILES.find((p) => p.id === crewId);
      const mem = simState.crew.find((c) => c.id === crewId);
      if (!prof) return;
      soundEngine.playInspect();
      narrativeVoice.speakCrewMember(crewId);
      setInspectedStation(null);
      setInspectedCrew({
        id: crewId,
        name: prof.name,
        role: prof.role,
        specialty: prof.specialty,
        modeLabel: simState.activeWeatherEvent ? 'Seek Shelter Protocol' : 'EVA Outpost Duty',
        health: mem?.health ?? 95,
        stress: mem?.stress ?? 20,
        stationLabel: prof.specialty,
        note: `${prof.name} is monitoring ${prof.specialty.toLowerCase()}.`,
      });
    },
    [simState.crew, simState.activeWeatherEvent, handleVisitChore],
  );

  const handleQuickCheckOxygen = useCallback(() => {
    if (simState.tutorialStep === 'inspect-oxygen' && nearbyZone === 'tank2') {
      soundEngine.playInspect();
      setSimState((prev) => setTutorialStep(prev, 'tutorial-quiz'));
      return;
    }
    soundEngine.playInspect();
    setSimState((prev) => markDataInspected(prev));
    const days = getResourceDaysSummary(simState);
    const o2Status = getResourceStatus('oxygen', simState.oxygenKg);
    const tankStatus = simState.tank2LeakActive
      ? 'Tank 2 pressure dropping — valve inspection needed!'
      : simState.tank2Isolated
        ? 'Tank 2 sealed safely · Main supply steady.'
        : 'All O₂ manifolds steady · Mars outdoor air ~96% CO₂ (unbreathable).';

    enqueueToast({
      id: `o2-${Date.now()}`,
      kind: 'quick-action',
      priority: 'P4',
      title: `Oxygen Check: ${simState.oxygenKg} kg (${days.o2Days} days)`,
      detail: tankStatus,
      tone: simState.tank2LeakActive || o2Status !== 'NOMINAL' ? 'warn' : 'good',
    });
  }, [simState, nearbyZone, enqueueToast]);

  const handleQuickScan = useCallback(() => {
    soundEngine.playQuickScan();
    setSimState((prev) => markDataInspected(prev));
    const zoneMeta = getAudioZoneMeta(audioZone);

    let detail = `${marsPhysics.terrainZoneName} · ${marsPhysics.gravity.gravityMs2} m/s² gravity · ${marsPhysics.airTempC}°C surface.`;
    if (audioZone === 'greenhouse') {
      detail = simState.greenhouseFrost
        ? `Frost detected on Bio-Dome glass! Food stock: ${simState.foodKg} kg.`
        : `Hydroponic mist steady · Crops healthy · Food stock: ${simState.foodKg} kg.`;
    } else if (audioZone === 'solar') {
      detail = `Receiving ${marsPhysics.solarIrradianceWm2} W/m² sunlight · Battery at ${simState.batteryKwh}/${SIM_CONSTANTS.BATTERY_CAPACITY_KWH} kWh.`;
    } else if (audioZone === 'tank-recycler') {
      detail = `Recycler efficiency ${Math.round(simState.recyclerEfficiency * 100)}% · Subsurface radar sees possible ice traces nearby.`;
    } else if (audioZone === 'habitat') {
      detail = `Pressurized cabin safe · Airlock ${habitatDistMeters} m · Crew OK (${simState.crew.filter((c) => c.alive).length}/4).`;
    } else if (audioZone === 'wind-field') {
      detail = `Turbine blades harvesting ${marsPhysics.wind.turbineKwhPerSol} kWh/sol in thin CO₂ gusts.`;
    }

    enqueueToast({
      id: `scan-${Date.now()}`,
      kind: 'quick-action',
      priority: 'P4',
      title: `Quick Scan: ${zoneMeta.label}`,
      detail,
      tone: audioZone === 'greenhouse' && simState.greenhouseFrost ? 'warn' : 'info',
    });
  }, [audioZone, marsPhysics, simState, habitatDistMeters, enqueueToast]);

  const handleEmergencyComms = useCallback(() => {
    soundEngine.playCommsPing();
    if (simState.activeWeatherEvent) {
      enqueueToast({
        id: `comms-${Date.now()}`,
        kind: 'quick-action',
        priority: 'P3',
        title: `Emergency Comms · ${simState.activeWeatherEvent.title}`,
        detail: `${simState.roverName}: "Head to the Habitat Airlock (${habitatDistMeters} m away) for shelter!"`,
        tone: 'warn',
      });
      return;
    }

    setSimState((prev) => markMissionControlAsked(useRoverHint(prev, 1), true));
    enqueueToast({
      id: `comms-${Date.now()}`,
      kind: 'quick-action',
      priority: 'P4',
      title: `Comms Link · Mission Control & ${simState.roverName}`,
      detail: `Signal confirmed (${simState.donki.status}). Active goal: ${activeMission.title}. Check ${simState.roverName}'s tip below!`,
      tone: 'good',
    });
  }, [simState.activeWeatherEvent, simState.roverName, simState.donki.status, activeMission.title, habitatDistMeters, enqueueToast]);

  const handleQuickInteractContext = useCallback(() => {
    if (nearbyCrewId) {
      handleInteractCrewFromHud(nearbyCrewId);
    } else if (nearbyZone) {
      handleInteractZone(nearbyZone);
    } else if (nearbyStation) {
      handleInteractStation(nearbyStation);
    }
  }, [nearbyCrewId, nearbyZone, nearbyStation, handleInteractCrewFromHud, handleInteractZone, handleInteractStation]);

  const handleQuickOpenMapOrShelter = useCallback(() => {
    if (simState.activeWeatherEvent && habitatDistMeters <= 5) {
      handleShelterReached();
      return;
    }
    soundEngine.playClick();
    setMapOpen(true);
  }, [simState.activeWeatherEvent, habitatDistMeters, handleShelterReached]);

  const handlePauseRequested = useCallback(() => {
    if (!anyModalBlockingRef.current) {
      setPaused(true);
    }
  }, []);

  const handleToggleCameraModeWorld = useCallback(() => {
    soundEngine.playClick();
    setCameraMode((prev) => (prev === '3p' ? '1p' : '3p'));
  }, []);

  const handleToggleLensWorld = useCallback(() => {
    soundEngine.playClick();
    setLensOpen((prev) => !prev);
  }, []);

  const handleToggleMapWorld = useCallback(() => {
    soundEngine.playClick();
    setMapOpen((prev) => !prev);
  }, []);

  const handleEngineReady = useCallback(() => {
    setEngineReady(true);
  }, []);

  const handleInteractCrewWorld = useCallback((card: CrewInspectCardData) => {
    soundEngine.playInspect();
    setInspectedStation(null);
    setInspectedCrew(card);
  }, []);

  const handleLandingTelemetryWorld = useCallback(
    (summary: LandingTelemetrySummary) => {
      const currStep = simStateRef.current.tutorialStep;
      // Do not show the Mars Jump toast if the Gravity card step or another modal is open/opening
      if (
        currStep === 'gravity-card' ||
        currStep === 'chores' ||
        currStep === 'inspect-oxygen' ||
        currStep === 'tutorial-quiz' ||
        anyModalBlockingRef.current
      ) {
        return;
      }
      enqueueToast({
        id: 'landing-comparison',
        kind: 'landing',
        priority: 'P4',
        title: summary.isJump
          ? `Mars Jump: ${summary.apexM}m (${summary.marsHangOrFallS}s)`
          : `Mars Drop ${summary.fallHeightM}m (${summary.marsHangOrFallS}s)`,
        detail: `Earth equivalent: ${summary.earthApexM}m (${summary.earthHangOrFallS}s) · Impact ${summary.impactMs} m/s`,
        tone: 'info',
      });
    },
    [enqueueToast],
  );

  const handleRoverTiltAlert = useCallback((active: boolean, deg: number) => {
    setRoverTiltWarning({ active, deg });
  }, []);

  const handleTutorialLookDone = useCallback(() => {
    setSimState((prev) => {
      if (prev.tutorialStep === 'take-control') return setTutorialStep(prev, 'look');
      if (prev.tutorialStep === 'look') return setTutorialStep(prev, 'move');
      return prev;
    });
  }, []);

  const handleRoverMakeWay = useCallback(() => {
    soundEngine.playRoverBeep('happy');
    const rName = simStateRef.current.roverName;
    setSimState((prev) => ({
      ...prev,
      roverLastLine: 'Oops, making room!',
    }));
    enqueueToast({
      id: 'rover-make-way',
      kind: 'rover-yield',
      priority: 'P3',
      title: `${rName} Yielding`,
      detail: 'Oops, making room!',
      tone: 'info',
    });
  }, [enqueueToast]);

  const handleSkipTutorial = useCallback(() => {
    setInspectedStation(null);
    setInspectedCrew(null);
    setSimState((prev) => setTutorialStep(prev, 'complete'));
  }, []);

  const handleJumpToMission = useCallback((targetIndex: number) => {
    soundEngine.playMissionStart();
    setInspectedStation(null);
    setInspectedCrew(null);
    setSimState((prev) => jumpToMission(prev, targetIndex));
    narrativeVoice.speakMissionIncident(MISSIONS[targetIndex].id);
  }, []);

  // Derive 3D visuals directly from Simulation State
  const simVisuals: SimVisualState | undefined = useMemo(() => {
    if (gamePhase !== 'gameplay') return undefined;
    return {
      activeZoneId: activeMission.zoneId,
      dustFactor: simState.dustFactor,
      panelsDusty: simState.panelsDusty,
      tank2LeakActive: simState.tank2LeakActive,
      greenhouseFrost: simState.greenhouseFrost,
      recyclerDegraded: simState.recyclerEfficiency < SIM_CONSTANTS.WATER_RECYCLER_NOMINAL,
      roverName: simState.roverName,
      roverMood: computeRoverMood(simState),
      roverDamaged: simState.roverDamaged,
      commandModeOpen:
        commandModeOpen ||
        logOpen ||
        (simState.phase !== 'active-mission' && simState.phase !== 'free-roam') ||
        tutorialModalOpen,
      mapOpen,
      quickMenuOpen,
      cameraMode,
      radiationAlert: activeMission.id === 'm5' || simState.eventDoseMsv > 100,
      showGravityCrystals: simState.tutorialStep === 'jump-crystals',
      collectedCrystalIds: simState.collectedCrystalIds,
      sol: simState.sol,
      dustTau: simState.dustTau,
      activeWxWindMs: simState.activeWeatherEvent?.lastGustWindMs,
      crew: simState.crew,
      weatherEvent: simState.activeWeatherEvent
        ? {
            active: true,
            kind: simState.activeWeatherEvent.kind,
            x: simState.activeWeatherEvent.worldPos.x,
            z: simState.activeWeatherEvent.worldPos.z,
          }
        : null,
      guidanceStage,
      activeObjective,
      guideEnabled,
    };
  }, [
    gamePhase,
    activeMission,
    simState,
    commandModeOpen,
    logOpen,
    mapOpen,
    quickMenuOpen,
    cameraMode,
    tutorialModalOpen,
    guidanceStage,
    activeObjective,
    guideEnabled,
  ]);

  const dynamicPowerAlloc: PowerAllocation = useMemo(
    () => ({
      habitat: Math.max(1, Math.round((simState.batteryKwh / 300) * 5)),
      greenhouse: simState.greenhouseDisabled || simState.greenhouseFrost ? 1 : 4,
      rover: simState.roverDamaged ? 1 : 3,
    }),
    [simState.batteryKwh, simState.greenhouseDisabled, simState.greenhouseFrost, simState.roverDamaged],
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0B1D36] text-[#F8F9FA] select-none">
      {/* Persistent Single Full-Viewport 3D Mars Outpost World */}
      <div className="absolute inset-0 z-0">
        <MarsOutpost3D
          gamePhase={gamePhase}
          selectedLandmark={selectedLandmark}
          onSelectLandmark={handleSelectLandmark}
          prologueElapsed={prologueElapsed}
          tutorialStep={simState.tutorialStep}
          powerAllocation={dynamicPowerAlloc}
          simVisuals={simVisuals}
          paused={paused}
          quickMode={quickMode}
          mouseSensitivity={mouseSensitivity}
          cursorUnlockKey={cursorUnlockKey}
          onCursorUnlockedChange={setCursorUnlockedInGame}
          canvasElRef={canvasElRef}
          onPointerLockChange={setPointerLocked}
          onPauseRequested={handlePauseRequested}
          onToggleCameraMode={handleToggleCameraModeWorld}
          onToggleLens={handleToggleLensWorld}
          onToggleMap={handleToggleMapWorld}
          onAudioZoneChange={setAudioZone}
          onEngineReady={handleEngineReady}
          onNearbyZoneChange={setNearbyZone}
          onInteractZone={handleInteractZone}
          onNearbyCrewChange={setNearbyCrewId}
          onInteractCrew={handleInteractCrewWorld}
          onLandingTelemetry={handleLandingTelemetryWorld}
          onRoverTiltAlert={handleRoverTiltAlert}
          onShelterReached={handleShelterReached}
          onHabitatDistanceChange={setHabitatDistMeters}
          onPhysicsUpdate={setMarsPhysics}
          onPoseTelemetry={setPoseTelemetry}
          onTutorialMoveDone={handleTutorialMoveDone}
          onTutorialLookDone={handleTutorialLookDone}
          onCrystalCollected={handleCrystalCollected}
          onNearbyStationChange={setNearbyStation}
          onInteractStation={handleInteractStation}
          onRoverMakeWay={handleRoverMakeWay}
          moveInputRef={moveInputRef}
          reducedMotion={reducedMotion}
          quality={quality}
          debugMode={debugMode}
          onDebugForcePhase={debugMode ? setGamePhase : undefined}
        />
      </div>

      {/* Non-blocking Physics/WebGL Initialization Pill until Rapier WASM finishes booting */}
      {!engineReady && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-40 rounded-xl border border-[#FFB703]/45 bg-[#071324]/92 px-3.5 py-2 text-xs font-bold text-[#FFB703] shadow-lg"
        >
          Initializing Mars Terrain &amp; 3.73 m/s² Physics…
        </div>
      )}

      {/* PHASE 1: Title Screen HUD Overlay */}
      {gamePhase === 'landing' && (
        <>
          <TitleScreenHUD
            selectedLandmark={selectedLandmark}
            onSelectLandmark={handleSelectLandmark}
            onStartMission={handleStartMission}
            onOpenHowToPlay={() => {
              soundEngine.playClick();
              setActiveModal('how-to-play');
            }}
            onOpenMissionInfo={() => {
              soundEngine.playClick();
              setMissionInfoFocus(null);
              setActiveModal('mission-info');
            }}
            onOpenAbout={() => {
              soundEngine.playClick();
              setActiveModal('about');
            }}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            reducedMotion={reducedMotion}
          />

          <Modals
            activeModal={activeModal}
            missionInfoFocus={missionInfoFocus}
            onClose={() => setActiveModal(null)}
            onPlayClick={() => soundEngine.playClick()}
            onPlayLaunch={() => soundEngine.playMissionStart()}
            reducedMotion={reducedMotion}
          />
        </>
      )}

      {/* PHASE 2A: Cinematic Intro Video (Earth -> Mars Launch & Crew Intro) */}
      {gamePhase === 'prologue' && (
        <PrologueHUD
          paused={prologuePaused}
          replayToken={prologueReplayToken}
          onTogglePause={() => {
            soundEngine.playClick();
            setProloguePaused((prev) => !prev);
          }}
          onReplay={handleReplayPrologue}
          onSkip={handleSkipPrologue}
          onComplete={handleCompletePrologue}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          reducedMotion={reducedMotion}
          onElapsedTick={setPrologueElapsed}
          roverName={roverName}
        />
      )}

      {/* PHASE 2B: Mission Brief & Name-Your-Rover Screen */}
      {gamePhase === 'briefing' && (
        <BriefingOverlay
          callsign={callsign}
          onChangeCallsign={setCallsign}
          roverName={roverName}
          onChangeRoverName={setRoverName}
          seed={seed}
          onShuffleSeed={() => {
            soundEngine.playClick();
            setSeed(generateNewSeed());
          }}
          onStartExploration={handleStartExploration}
          onReplayPrologue={handleReplayPrologue}
          reducedMotion={reducedMotion}
        />
      )}

      {/* PHASE 3: 88-Sol Gameplay (3D Free-Walk + Command Mode + Rover + Debrief) */}
      {gamePhase === 'gameplay' && (
        <>
          <GameplayHUD
            simState={simState}
            activeMission={activeMission}
            activeObjective={activeObjective}
            guideEnabled={guideEnabled}
            onToggleGuide={() => {
              soundEngine.playClick();
              setGuideEnabled((prev) => !prev);
            }}
            marsPhysics={marsPhysics}
            cameraMode={cameraMode}
            onToggleCameraMode={handleToggleCameraModeWorld}
            lensOpen={lensOpen}
            onToggleLens={handleToggleLensWorld}
            mapOpen={mapOpen}
            onToggleMap={handleToggleMapWorld}
            quickMenuOpen={quickMenuOpen}
            onToggleQuickMenu={() => {
              soundEngine.playClick();
              setQuickMenuOpen((prev) => !prev);
            }}
            audioZone={audioZone}
            tutorialBannerNode={
              simState.tutorialStep !== 'complete' ? (
                <TutorialOverlay
                  tutorialStep={simState.tutorialStep}
                  crystalsCollected={simState.crystalsCollected}
                  choresVisited={simState.choresVisited}
                  roverName={simState.roverName}
                  renderMode="banner-only"
                  onAdvanceStep={(next) => {
                    setInspectedStation(null);
                    setInspectedCrew(null);
                    setSimState((prev) => setTutorialStep(prev, next));
                  }}
                  onVisitChore={handleVisitChore}
                  onCompleteTutorialQuiz={() => {
                    setSimState((prev) => completeTutorialQuiz(prev));
                  }}
                  onUnlockCard={(cardId) => {
                    setSimState((prev) => unlockScienceCard(prev, cardId));
                  }}
                  onOpenMap={() => setMapOpen(true)}
                  reducedMotion={reducedMotion}
                />
              ) : null
            }
            queuedToasts={popupQueue.visibleToasts}
            onDismissToast={(id) => {
              soundEngine.playClick();
              setPopupQueue((prev) => dismissPopupToast(prev, id));
            }}
            controlsStripVisible={controlsStripVisible}
            onToggleControlsStrip={() => {
              soundEngine.playClick();
              setControlsStripVisible((prev) => !prev);
            }}
            rustyCollapsed={rustyCollapsed}
            onToggleRustyCollapsed={() => {
              soundEngine.playClick();
              setRustyCollapsed((prev) => !prev);
            }}
            poseTelemetry={poseTelemetry}
            nearbyZone={nearbyZone}
            nearbyStation={nearbyStation}
            nearbyCrewId={nearbyCrewId}
            inspectedStation={inspectedStation}
            inspectedCrew={inspectedCrew}
            onCloseInspected={() => {
              soundEngine.playClick();
              setInspectedStation(null);
            }}
            onCloseInspectedCrew={() => {
              soundEngine.playClick();
              setInspectedCrew(null);
            }}
            onInteractZone={handleInteractZone}
            onInteractStation={handleInteractStation}
            onInteractCrew={handleInteractCrewFromHud}
            onOpenCommandMode={handleOpenCommandMode}
            onOpenLog={() => {
              soundEngine.playClick();
              setLogOpen(true);
            }}
            onOpenCredits={() => {
              soundEngine.playClick();
              setCreditsOpen(true);
            }}
            onAskRoverHint={(lvl) => {
              soundEngine.playInspect();
              setSimState((prev) => useRoverHint(prev, lvl));
            }}
            onToggleRoverHush={() => {
              soundEngine.playClick();
              setSimState((prev) => toggleRoverHush(prev));
            }}
            weatherSecondsLeft={weatherSecondsLeft}
            habitatDistMeters={habitatDistMeters}
            roverTiltWarning={roverTiltWarning}
            onTriggerWeatherTest={handleTriggerWeatherTest}
            onShelterClick={handleShelterReached}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onReplayPrologue={handleReplayPrologue}
            onReturnTitle={handleReturnTitle}
            onOpenPauseMenu={() => {
              soundEngine.playClick();
              setCursorUnlockedInGame(false);
              setPaused(true);
            }}
            pointerLocked={pointerLocked}
            cursorUnlockKey={cursorUnlockKey}
            cursorUnlockedInGame={cursorUnlockedInGame}
            quickMode={quickMode}
            m5ShelterSecondsLeft={m5ShelterSecondsLeft}
            onOpenDebrief={() => setSimState((prev) => reopenDebrief(prev))}
            moveInputRef={moveInputRef}
            reducedMotion={reducedMotion}
          />

          {simState.tutorialStep !== 'complete' && (
            <TutorialOverlay
              tutorialStep={simState.tutorialStep}
              crystalsCollected={simState.crystalsCollected}
              choresVisited={simState.choresVisited}
              roverName={simState.roverName}
              renderMode="modals-only"
              onAdvanceStep={(next) => {
                setInspectedStation(null);
                setInspectedCrew(null);
                setSimState((prev) => setTutorialStep(prev, next));
              }}
              onVisitChore={handleVisitChore}
              onCompleteTutorialQuiz={() => {
                setSimState((prev) => completeTutorialQuiz(prev));
              }}
              onUnlockCard={(cardId) => {
                setSimState((prev) => unlockScienceCard(prev, cardId));
              }}
              onOpenMap={() => setMapOpen(true)}
              reducedMotion={reducedMotion}
            />
          )}

          <CommandModeModal
            open={
              simState.phase === 'debrief' || simState.phase === 'free-roam'
                ? commandModeOpen
                : commandModeOpen || simState.phase !== 'active-mission'
            }
            state={simState}
            mission={activeMission}
            initialTab={commandInitialTab}
            onClose={() => {
              soundEngine.playClick();
              setCommandModeOpen(false);
            }}
            onMarkInspected={() => setSimState((prev) => markDataInspected(prev))}
            onRequestMissionControl={(arrived) => {
              if (arrived) soundEngine.playInspect();
              setSimState((prev) => markMissionControlAsked(prev, arrived));
            }}
            onSelectOption={(optId: OptionId) => {
              soundEngine.playTutorialComplete();
              setSimState((prev) => resolveMissionOption(prev, optId));
            }}
            onCleanPanelsBonus={() => {
              soundEngine.playTutorialComplete();
              setSimState((prev) => applyPostStormPanelCleaning(prev));
            }}
            onAdvanceRoutineSols={() => {
              soundEngine.playClick();
              if (simState.missionIndex >= 4 || simState.campaignFailedReason) {
                setCommandModeOpen(false);
              }
              setSimState((prev) => advanceRoutineSols(prev));
            }}
            onProceedNextCriticalSol={() => {
              soundEngine.playMissionStart();
              setCommandModeOpen(false);
              setSimState((prev) => {
                const next = proceedToNextCriticalSol(prev);
                const nextMission = MISSIONS[next.missionIndex];
                if (nextMission) {
                  soundEngine.playDustDevilAlert();
                  narrativeVoice.speakMissionIncident(nextMission.id);
                  enqueueToast({
                    id: `incident-${nextMission.id}-${Date.now()}`,
                    kind: 'hint',
                    priority: 'P3',
                    title: `SOL ${next.sol} · ${nextMission.title.toUpperCase()}`,
                    detail: nextMission.subtitle,
                    tone: 'warn',
                  });
                }
                return next;
              });
            }}
            onCompleteMiniActivity={(mId) => {
              setSimState((prev) => completeMissionMiniActivity(prev, mId));
            }}
            onCompleteQuiz={(mId) => {
              setSimState((prev) => completeMissionQuiz(prev, mId));
            }}
            onUnlockCard={(cardId) => {
              setSimState((prev) => unlockScienceCard(prev, cardId));
            }}
            onToggleGrownUpScience={() => {
              setSimState((prev) => toggleGrownUpScience(prev));
            }}
            reducedMotion={reducedMotion}
          />

          {simState.phase === 'debrief' && (
            <DebriefScreen
              state={simState}
              onReplaySameSeed={() => startNewCampaignWithSeed(seed)}
              onPlayNewSeed={() => startNewCampaignWithSeed(generateNewSeed())}
              onOpenDataCredits={() => {
                soundEngine.playClick();
                setCreditsOpen(true);
              }}
              onReturnTitle={handleReturnTitle}
              onEnterFreeRoam={() => {
                soundEngine.playMissionStart();
                setCommandModeOpen(false);
                setSimState((prev) => enterFreeRoam(prev));
              }}
              onCompleteDebriefQuiz={() => {
                soundEngine.playBadgeUnlock();
                setSimState((prev) => completeDebriefQuiz(prev));
              }}
              reducedMotion={reducedMotion}
            />
          )}

          <CommandersLogModal
            open={logOpen}
            onClose={() => {
              soundEngine.playClick();
              setLogOpen(false);
            }}
            log={simState.log}
            activeWeatherEvent={simState.activeWeatherEvent}
            weatherSecondsLeft={weatherSecondsLeft}
            habitatDistMeters={habitatDistMeters}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            ripples={simState.ripples}
            unlockedBadges={simState.unlockedBadges}
            unlockedScienceCards={simState.unlockedScienceCards}
            roverName={simState.roverName}
          />

          <DataCreditsModal
            open={creditsOpen}
            onClose={() => {
              soundEngine.playClick();
              setCreditsOpen(false);
            }}
            donkiStatus={simState.donki.status}
            donkiDateLabel={simState.donki.dateLabel}
          />

          <PauseMenuModal
            open={paused}
            quickMode={quickMode}
            onToggleQuickMode={() => {
              soundEngine.playClick();
              setQuickMode((q) => !q);
            }}
            mouseSensitivity={mouseSensitivity}
            onChangeSensitivity={setMouseSensitivity}
            cursorUnlockKey={cursorUnlockKey}
            onChangeCursorUnlockKey={setCursorUnlockKey}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            tutorialActive={simState.tutorialStep !== 'complete'}
            onSkipTutorial={handleSkipTutorial}
            onJumpToMission={handleJumpToMission}
            onResume={() => {
              soundEngine.playClick();
              setCursorUnlockedInGame(false);
              setPaused(false);
              try {
                canvasElRef.current?.requestPointerLock?.();
              } catch {
                // Safe fallback if browser restricts pointer lock
              }
            }}
            onQuitToTitle={handleReturnTitle}
            reducedMotion={reducedMotion}
          />
          <WristMapModal
            open={mapOpen}
            onClose={() => {
              soundEngine.playClick();
              setMapOpen(false);
            }}
            telemetry={poseTelemetry}
            activeMission={activeMission}
            activeObjective={activeObjective}
            weatherAlertActive={Boolean(simState.activeWeatherEvent)}
            quickMode={quickMode}
            roverName={simState.roverName}
            showGuidancePath={guideEnabled}
            reducedMotion={reducedMotion}
          />

          <QuickActionMenuModal
            open={quickMenuOpen}
            onClose={() => {
              soundEngine.playClick();
              setQuickMenuOpen(false);
            }}
            simState={simState}
            activeMission={activeMission}
            marsPhysics={marsPhysics}
            audioZone={audioZone}
            nearbyZone={nearbyZone}
            nearbyStation={nearbyStation}
            nearbyCrewId={nearbyCrewId}
            habitatDistMeters={habitatDistMeters}
            soundEnabled={soundEnabled}
            onCheckOxygen={handleQuickCheckOxygen}
            onQuickScan={handleQuickScan}
            onEmergencyComms={handleEmergencyComms}
            onInteractContext={handleQuickInteractContext}
            onOpenMissionConsole={() => handleOpenCommandMode('look')}
            onOpenMapOrShelter={handleQuickOpenMapOrShelter}
            onToggleSound={handleToggleSound}
            reducedMotion={reducedMotion}
          />
        </>
      )}

      {/* Fullscreen 2D celebratory particles (above scene/HUD/scrims, below z-40 modal cards) */}
      <CelebrationLayer reducedMotion={reducedMotion} />

      {debugMode && <DebugPanel gamePhase={gamePhase} onStartGameplayDirect={handleStartExploration} />}
    </main>
  );
}
