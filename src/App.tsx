import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GameplayInputState,
  GraphicsQuality,
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
import {
  COMMANDER_CALLSIGNS,
  GamePhase,
  OutpostLandmarkId,
  PROLOGUE_DURATION_SEC,
  PROLOGUE_SCENES,
  PowerAllocation,
} from './data/missionData';
import { SIM_CONSTANTS } from './sim/constants';
import { MissionZoneId, OptionId } from './sim/missionsData';
import {
  ARCHIVED_DONKI_FALLBACK,
  DonkiSpaceWeather,
  fetchDonkiSpaceWeather,
} from './sim/nasaData';
import { generateNewSeed } from './sim/rng';
import {
  CampaignState,
  advanceRoutineSols,
  applyPostStormPanelCleaning,
  computeRoverMood,
  createInitialCampaignState,
  getActiveMission,
  markDataInspected,
  markMissionControlAsked,
  proceedToNextCriticalSol,
  resolveMissionOption,
  resolveWeatherEventShelter,
  toggleRoverHush,
  triggerLocalizedWeatherEvent,
  triggerWeatherGustPulse,
  useRoverHint,
} from './sim/simEngine';
import {
  MarsEnvironmentSnapshot,
  computeDiurnalMarsWeather,
} from './sim/marsPhysics';
import { soundEngine } from './utils/soundEngine';

export default function App() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('landing');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [voiceOverEnabled, setVoiceOverEnabled] = useState(true);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [quality, setQuality] = useState<GraphicsQuality>('high');
  const [hudHidden, setHudHidden] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState<OutpostLandmarkId | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [missionInfoFocus, setMissionInfoFocus] = useState<
    'explore' | 'survive' | 'discover' | null
  >(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Prologue Clock
  const [prologueElapsed, setPrologueElapsed] = useState(0);
  const [prologuePaused, setProloguePaused] = useState(false);
  const lastCueSceneRef = useRef<number>(-1);

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
  const [commandModeOpen, setCommandModeOpen] = useState(false);
  const [commandInitialTab, setCommandInitialTab] = useState<'look' | 'compare'>('look');
  const [logOpen, setLogOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [mouseSensitivity, setMouseSensitivity] = useState(1.0);
  const [pointerLocked, setPointerLocked] = useState(false);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  const [nearbyZone, setNearbyZone] = useState<MissionZoneId | null>(null);
  const [nearbyStation, setNearbyStation] = useState<OutpostLandmarkId | null>(null);
  const [inspectedStation, setInspectedStation] = useState<OutpostLandmarkId | null>(null);
  const [weatherSecondsLeft, setWeatherSecondsLeft] = useState<number>(0);
  const [habitatDistMeters, setHabitatDistMeters] = useState<number>(7);
  const [marsPhysics, setMarsPhysics] = useState<MarsEnvironmentSnapshot>(() =>
    computeDiurnalMarsWeather(21, 0, 1.0, 1.0, 4.95, 2.65, 0),
  );
  const autoWeatherSolsRef = useRef<Set<number>>(new Set());
  const lastWeatherIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (ev: MediaQueryListEvent) => setReducedMotion(ev.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Deterministic Prologue Playback Clock (0 -> 34s)
  useEffect(() => {
    if (gamePhase !== 'prologue' || prologuePaused) return;

    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.1);
      lastTs = now;

      setPrologueElapsed((prev) => {
        const next = prev + dt;
        if (next >= PROLOGUE_DURATION_SEC) {
          soundEngine.stopNarration();
          setGamePhase('briefing');
          return PROLOGUE_DURATION_SEC;
        }
        return next;
      });

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [gamePhase, prologuePaused]);

  // Trigger timed audio cues & optional voice-over on each Prologue scene boundary
  useEffect(() => {
    if (gamePhase !== 'prologue') {
      lastCueSceneRef.current = -1;
      return;
    }

    const sceneIdx = PROLOGUE_SCENES.findIndex(
      (s) => prologueElapsed >= s.startSec && prologueElapsed < s.endSec,
    );
    if (sceneIdx !== -1 && sceneIdx !== lastCueSceneRef.current) {
      lastCueSceneRef.current = sceneIdx;
      soundEngine.playSceneCue(sceneIdx);
      if (!prologuePaused) {
        soundEngine.speakCaption(PROLOGUE_SCENES[sceneIdx].caption);
      }
    }
  }, [gamePhase, prologueElapsed, prologuePaused]);

  // Global Gameplay Shortcuts: Esc (dismiss modals or toggle Pause Menu), Tab (Log), Q (Rover Hint L1)
  useEffect(() => {
    if (gamePhase !== 'gameplay') return;
    const onKeyDown = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (ev.key === 'Escape') {
        if (creditsOpen) setCreditsOpen(false);
        else if (logOpen) setLogOpen(false);
        else if (commandModeOpen && simState.phase === 'active-mission') setCommandModeOpen(false);
        else if (inspectedStation) setInspectedStation(null);
        else setPaused((prev) => !prev);
      } else if (ev.key === 'Tab') {
        ev.preventDefault();
        soundEngine.playClick();
        setLogOpen((prev) => !prev);
      } else if (ev.key.toLowerCase() === 'q' && !ev.repeat) {
        soundEngine.playInspect();
        setSimState((prev) => useRoverHint(prev, 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gamePhase, creditsOpen, logOpen, commandModeOpen, inspectedStation, simState.phase]);

  const handleToggleSound = () => {
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

  const handleToggleVoiceOver = () => {
    const next = !voiceOverEnabled;
    setVoiceOverEnabled(next);
    soundEngine.setVoiceOverEnabled(next);
    soundEngine.playClick();
  };

  const handleToggleQuality = () => {
    soundEngine.playClick();
    setQuality((prev) => (prev === 'high' ? 'low' : 'high'));
  };

  const handleToggleHud = () => {
    soundEngine.playClick();
    setHudHidden((prev) => !prev);
  };

  const handleSelectLandmark = (id: OutpostLandmarkId | null) => {
    if (id) soundEngine.playInspect();
    else soundEngine.playClick();
    setSelectedLandmark(id);
  };

  // Landing -> Cinematic Prologue
  const handleStartMission = () => {
    soundEngine.playMissionStart();
    setActiveModal(null);
    setSelectedLandmark(null);
    setHudHidden(false);
    setPrologueElapsed(0);
    setProloguePaused(false);
    lastCueSceneRef.current = -1;
    setGamePhase('prologue');
  };

  const handleReplayPrologue = () => {
    soundEngine.stopNarration();
    soundEngine.playMissionStart();
    setInspectedStation(null);
    setCommandModeOpen(false);
    setLogOpen(false);
    setCreditsOpen(false);
    setPrologueElapsed(0);
    setProloguePaused(false);
    lastCueSceneRef.current = -1;
    setGamePhase('prologue');
  };

  const handleSkipPrologue = () => {
    soundEngine.stopNarration();
    soundEngine.playClick();
    setGamePhase('briefing');
  };

  // Briefing -> Start 88-Sol Campaign at Critical Sol 1 (Sol 21)
  const startNewCampaignWithSeed = useCallback(
    (nextSeed: number) => {
      soundEngine.stopWeatherLoop();
      soundEngine.playMissionStart();
      setSeed(nextSeed);
      autoWeatherSolsRef.current.clear();
      lastWeatherIdRef.current = null;
      setWeatherSecondsLeft(0);
      setSimState(createInitialCampaignState(nextSeed, callsign, roverName, donkiWeather));
      setCameraMode('3p');
      setInspectedStation(null);
      setCommandModeOpen(false);
      setLogOpen(false);
      setCreditsOpen(false);
      setPaused(false);
      setNearbyStation(null);
      setNearbyZone(null);
      setGamePhase('gameplay');
    },
    [callsign, roverName, donkiWeather],
  );

  const handleStartExploration = () => {
    startNewCampaignWithSeed(seed);
  };

  const handleReturnTitle = () => {
    soundEngine.stopNarration();
    soundEngine.stopWeatherLoop();
    soundEngine.playClick();
    setInspectedStation(null);
    setCommandModeOpen(false);
    setLogOpen(false);
    setCreditsOpen(false);
    setPaused(false);
    setNearbyStation(null);
    setNearbyZone(null);
    setSelectedLandmark(null);
    setGamePhase('landing');
  };

  const activeMission = useMemo(() => getActiveMission(simState), [simState]);

  // Sync audio, CommandersLogModal notification, and countdown whenever a new localized weather event spawns
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
      setLogOpen(true); // Notify player directly via CommandersLogModal (timer pauses while reading)
      soundEngine.playDustDevilAlert();
      soundEngine.startWeatherLoop(activeWx.kind, activeWx.rumbleIntensity);
    }
  }, [gamePhase, simState.phase, simState.activeWeatherEvent]);

  // Periodic wind-gust bursts + live wind surge updates while a localized storm is active and unpaused
  useEffect(() => {
    const activeWx = simState.activeWeatherEvent;
    if (
      gamePhase !== 'gameplay' ||
      simState.phase !== 'active-mission' ||
      !activeWx ||
      logOpen ||
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
    commandModeOpen,
    creditsOpen,
    paused,
  ]);

  // Auto-trigger a seeded localized weather event ~9.5s into free-walk exploration on a Critical Sol
  useEffect(() => {
    if (
      gamePhase !== 'gameplay' ||
      simState.phase !== 'active-mission' ||
      simState.activeWeatherEvent ||
      commandModeOpen ||
      logOpen ||
      creditsOpen ||
      paused ||
      autoWeatherSolsRef.current.has(simState.missionIndex)
    ) {
      return;
    }

    const timerId = window.setTimeout(() => {
      autoWeatherSolsRef.current.add(simState.missionIndex);
      setSimState((prev) => triggerLocalizedWeatherEvent(prev));
    }, 9500);

    return () => window.clearTimeout(timerId);
  }, [
    gamePhase,
    simState.phase,
    simState.missionIndex,
    simState.activeWeatherEvent,
    commandModeOpen,
    logOpen,
    creditsOpen,
    paused,
  ]);

  // Seek Shelter countdown timer (pauses cleanly while inspecting modals or Pause Menu)
  useEffect(() => {
    if (
      gamePhase !== 'gameplay' ||
      simState.phase !== 'active-mission' ||
      !simState.activeWeatherEvent ||
      logOpen ||
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
    commandModeOpen,
    creditsOpen,
    paused,
  ]);

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

  const handleInteractZone = useCallback(
    (zoneId: MissionZoneId) => {
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
    [activeMission.zoneId, handleOpenCommandMode],
  );

  const handleInteractStation = useCallback(
    (stationId: OutpostLandmarkId) => {
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
      setInspectedStation(stationId);
    },
    [activeMission.zoneId, handleOpenCommandMode],
  );

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
      commandModeOpen: commandModeOpen || logOpen || simState.phase !== 'active-mission',
      cameraMode,
      radiationAlert: activeMission.id === 'm5' || simState.eventDoseMsv > 100,
      sol: simState.sol,
      dustTau: simState.dustTau,
      activeWxWindMs: simState.activeWeatherEvent?.lastGustWindMs,
      weatherEvent: simState.activeWeatherEvent
        ? {
            active: true,
            kind: simState.activeWeatherEvent.kind,
            x: simState.activeWeatherEvent.worldPos.x,
            z: simState.activeWeatherEvent.worldPos.z,
          }
        : null,
    };
  }, [gamePhase, activeMission, simState, commandModeOpen, logOpen, cameraMode]);

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
          tutorialStep="complete"
          powerAllocation={dynamicPowerAlloc}
          simVisuals={simVisuals}
          paused={paused}
          quickMode={quickMode}
          mouseSensitivity={mouseSensitivity}
          canvasElRef={canvasElRef}
          onPointerLockChange={setPointerLocked}
          onPauseRequested={() => {
            if (!commandModeOpen && !logOpen && !creditsOpen) {
              setPaused(true);
            }
          }}
          onToggleCameraMode={() => {
            soundEngine.playClick();
            setCameraMode((prev) => (prev === '3p' ? '1p' : '3p'));
          }}
          onNearbyZoneChange={setNearbyZone}
          onInteractZone={handleInteractZone}
          onShelterReached={handleShelterReached}
          onHabitatDistanceChange={setHabitatDistMeters}
          onPhysicsUpdate={setMarsPhysics}
          onTutorialMoveDone={() => {}}
          onTutorialLookDone={() => {}}
          onNearbyStationChange={setNearbyStation}
          onInteractStation={handleInteractStation}
          moveInputRef={moveInputRef}
          reducedMotion={reducedMotion}
          quality={quality}
        />
      </div>

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
            quality={quality}
            onToggleQuality={handleToggleQuality}
            hudHidden={hudHidden}
            onToggleHud={handleToggleHud}
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

      {/* PHASE 2A: Deterministic 5-Scene Cinematic Prologue */}
      {gamePhase === 'prologue' && (
        <PrologueHUD
          elapsed={prologueElapsed}
          paused={prologuePaused}
          onTogglePause={() => {
            soundEngine.playClick();
            setProloguePaused((prev) => {
              if (!prev) soundEngine.stopNarration();
              return !prev;
            });
          }}
          onReplay={handleReplayPrologue}
          onSkip={handleSkipPrologue}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          voiceOverEnabled={voiceOverEnabled}
          onToggleVoiceOver={handleToggleVoiceOver}
          subtitlesEnabled={subtitlesEnabled}
          onToggleSubtitles={() => {
            soundEngine.playClick();
            setSubtitlesEnabled((prev) => !prev);
          }}
          reducedMotion={reducedMotion}
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
            marsPhysics={marsPhysics}
            cameraMode={cameraMode}
            onToggleCameraMode={() => {
              soundEngine.playClick();
              setCameraMode((prev) => (prev === '3p' ? '1p' : '3p'));
            }}
            nearbyZone={nearbyZone}
            nearbyStation={nearbyStation}
            inspectedStation={inspectedStation}
            onCloseInspected={() => {
              soundEngine.playClick();
              setInspectedStation(null);
            }}
            onInteractZone={handleInteractZone}
            onInteractStation={handleInteractStation}
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
            onTriggerWeatherTest={handleTriggerWeatherTest}
            onShelterClick={handleShelterReached}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onReplayPrologue={handleReplayPrologue}
            onReturnTitle={handleReturnTitle}
            onOpenPauseMenu={() => {
              soundEngine.playClick();
              setPaused(true);
            }}
            pointerLocked={pointerLocked}
            quickMode={quickMode}
            moveInputRef={moveInputRef}
            reducedMotion={reducedMotion}
          />

          <CommandModeModal
            open={
              simState.phase === 'debrief'
                ? false
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
              setSimState((prev) => advanceRoutineSols(prev));
            }}
            onProceedNextCriticalSol={() => {
              soundEngine.playMissionStart();
              setCommandModeOpen(false);
              setSimState((prev) => proceedToNextCriticalSol(prev));
            }}
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
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            quality={quality}
            onToggleQuality={handleToggleQuality}
            onResume={() => {
              soundEngine.playClick();
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
        </>
      )}
    </main>
  );
}
