import { MutableRefObject, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Compass,
  RotateCcw,
  Volume2,
  VolumeX,
  Home,
  Zap,
  Sparkles,
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  BookOpen,
  Database,
  Eye,
  Radiation,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  OctagonAlert,
  ArrowUpFromLine,
  Wind,
  ShieldCheck,
  Gauge,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  Droplets,
  Sprout,
  Crosshair,
  ScanEye,
  Users,
  Map as MapIcon,
  MapPin,
} from 'lucide-react';
import { OUTPOST_LANDMARKS, OutpostLandmarkId } from '../data/missionData';
import {
  CREW_PROFILES,
  CrewMemberId,
  MARS_FACTS,
  PHYSICS_CONSTANTS,
  ResourceStatus,
  SIM_CONSTANTS,
  getResourceStatus,
} from '../sim/constants';
import { CrewInspectCardData } from '../sim/crewAndRoverSim';
import { MarsEnvironmentSnapshot } from '../sim/marsPhysics';
import { MissionDefinition, MissionZoneId } from '../sim/missionsData';
import { GAMEPLAY_LAYOUT } from '../sim/outpostLayout';
import {
  CampaignState,
  computeRoverMood,
  getResourceDaysSummary,
} from '../sim/simEngine';
import { GameplayInputState, LandingTelemetrySummary } from './MarsOutpost3D';
import { RoverAssistant } from './RoverAssistant';
import { GameplayPoseTelemetry } from './WristMapModal';

interface GameplayHUDProps {
  simState: CampaignState;
  activeMission: MissionDefinition;
  marsPhysics: MarsEnvironmentSnapshot;
  cameraMode: '3p' | '1p';
  onToggleCameraMode: () => void;
  lensOpen?: boolean;
  onToggleLens?: () => void;
  mapOpen?: boolean;
  onToggleMap?: () => void;
  poseTelemetry?: GameplayPoseTelemetry;
  nearbyZone: MissionZoneId | null;
  nearbyStation: OutpostLandmarkId | null;
  nearbyCrewId?: CrewMemberId | null;
  inspectedStation: OutpostLandmarkId | null;
  inspectedCrew?: CrewInspectCardData | null;
  onCloseInspected: () => void;
  onCloseInspectedCrew?: () => void;
  onInteractZone: (zoneId: MissionZoneId) => void;
  onInteractStation: (id: OutpostLandmarkId) => void;
  onInteractCrew?: (id: CrewMemberId) => void;
  onOpenCommandMode: (tab?: 'look' | 'compare') => void;
  onOpenLog: () => void;
  onOpenCredits: () => void;
  onAskRoverHint: (level: 1 | 2) => void;
  onToggleRoverHush: () => void;
  weatherSecondsLeft: number;
  habitatDistMeters: number;
  landingToast?: LandingTelemetrySummary | null;
  roverTiltWarning?: { active: boolean; deg: number };
  onTriggerWeatherTest: () => void;
  onShelterClick: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onReplayPrologue: () => void;
  onReturnTitle: () => void;
  onOpenPauseMenu?: () => void;
  pointerLocked?: boolean;
  quickMode?: boolean;
  moveInputRef: MutableRefObject<GameplayInputState>;
  reducedMotion: boolean;
}

function ResourceAlertIcon({ status }: { status: ResourceStatus }) {
  if (status === 'CRITICAL') {
    return <OctagonAlert className="h-3.5 w-3.5 text-[#EF4444]" aria-label="Critical" />;
  }
  if (status === 'WARNING') {
    return <AlertTriangle className="h-3.5 w-3.5 text-[#FFB703]" aria-label="Warning" />;
  }
  return <CheckCircle2 className="h-3 w-3 text-[#22C55E]/85" aria-label="OK" />;
}

export function GameplayHUD({
  simState,
  activeMission,
  marsPhysics,
  cameraMode,
  onToggleCameraMode,
  lensOpen = false,
  onToggleLens,
  mapOpen = false,
  onToggleMap,
  poseTelemetry,
  nearbyZone,
  nearbyStation,
  nearbyCrewId = null,
  inspectedStation,
  inspectedCrew = null,
  onCloseInspected,
  onCloseInspectedCrew,
  onInteractZone,
  onInteractStation,
  onInteractCrew,
  onOpenCommandMode,
  onOpenLog,
  onOpenCredits,
  onAskRoverHint,
  onToggleRoverHush,
  weatherSecondsLeft,
  habitatDistMeters,
  landingToast = null,
  roverTiltWarning,
  onTriggerWeatherTest,
  onShelterClick,
  soundEnabled,
  onToggleSound,
  onReplayPrologue,
  onReturnTitle,
  onOpenPauseMenu,
  pointerLocked = false,
  quickMode = false,
  moveInputRef,
  reducedMotion,
}: GameplayHUDProps) {
  const [labOpen, setLabOpen] = useState(false);
  const [touchPadOpen, setTouchPadOpen] = useState(false);

  const inspectedInfo = inspectedStation ? OUTPOST_LANDMARKS[inspectedStation] : null;
  const nearbyInfo = nearbyStation ? OUTPOST_LANDMARKS[nearbyStation] : null;
  const nearbyCrewProfile = nearbyCrewId
    ? CREW_PROFILES.find((p) => p.id === nearbyCrewId) ?? null
    : null;
  const days = getResourceDaysSummary(simState);
  const roverMood = computeRoverMood(simState);
  const currentHintLevel = simState.roverHintLevelUsed[activeMission.id] ?? 0;
  const crewAliveCount = simState.crew.filter((c) => c.alive).length;

  const setMoveFlag = (key: 'forward' | 'back' | 'left' | 'right' | 'sprint', val: boolean) => {
    moveInputRef.current[key] = val;
  };

  // Minecraft-style color-coded resource bars: O2 = Cyan, Water = Blue, Food = Green, Power = Yellow/Gold
  const resourceBars = [
    {
      label: 'O₂',
      daysText: `${days.o2Days}d`,
      amountText: `${simState.oxygenKg} kg`,
      pct: Math.max(4, Math.min(100, (simState.oxygenKg / 75) * 100)),
      barHex: '#06B6D4',
      trackBg: 'bg-[#06B6D4]/15',
      Icon: Wind,
      status: getResourceStatus('oxygen', simState.oxygenKg),
    },
    {
      label: 'Water',
      daysText: `${days.waterDays}d`,
      amountText: `${simState.waterKg} kg`,
      pct: Math.max(4, Math.min(100, (simState.waterKg / 240) * 100)),
      barHex: '#3B82F6',
      trackBg: 'bg-[#3B82F6]/15',
      Icon: Droplets,
      status: getResourceStatus('water', simState.waterKg),
    },
    {
      label: 'Food',
      daysText: `${days.foodDays}d`,
      amountText: `${simState.foodKg} kg`,
      pct: Math.max(4, Math.min(100, (simState.foodKg / 100) * 100)),
      barHex: '#22C55E',
      trackBg: 'bg-[#22C55E]/15',
      Icon: Sprout,
      status: getResourceStatus('food', simState.foodKg),
    },
    {
      label: 'Power',
      daysText: `${days.batteryHours}h`,
      amountText: `${simState.batteryKwh} kWh`,
      pct: Math.max(
        4,
        Math.min(100, (simState.batteryKwh / SIM_CONSTANTS.BATTERY_CAPACITY_KWH) * 100),
      ),
      barHex: '#FACC15',
      trackBg: 'bg-[#FACC15]/15',
      Icon: Zap,
      status: getResourceStatus('battery', simState.batteryKwh),
    },
  ];

  const zoneTitleMap: Record<MissionZoneId, string> = {
    tank2: 'O₂ Tank 2',
    solar: 'Solar Farm',
    recycler: 'Water Bay',
    greenhouse: 'Greenhouse',
    shelter: 'Storm Shelter',
  };

  // Top-center Compass Strip + Diegetic Visor Waypoint calculation
  const px = poseTelemetry?.x ?? GAMEPLAY_LAYOUT.modules.astroSpawn.x;
  const pz = poseTelemetry?.z ?? GAMEPLAY_LAYOUT.modules.astroSpawn.z;
  const headingDeg = poseTelemetry?.headingDeg ?? 180;
  const activeGoal = simState.activeWeatherEvent
    ? { label: 'Habitat Shelter', x: GAMEPLAY_LAYOUT.destinationWaypoints.airlock.x, z: GAMEPLAY_LAYOUT.destinationWaypoints.airlock.z }
    : { label: zoneTitleMap[activeMission.zoneId], x: GAMEPLAY_LAYOUT.zoneCoords[activeMission.zoneId].x, z: GAMEPLAY_LAYOUT.zoneCoords[activeMission.zoneId].z };
  const waypointDistM = Math.max(0, Math.round(Math.hypot(activeGoal.x - px, activeGoal.z - pz)));
  const baselineWalkMs =
    PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS * (quickMode ? PHYSICS_CONSTANTS.QUICK_MODE_SPEED_MULT : 1);
  const effectiveSpeedMs = Math.max(poseTelemetry?.speedMs ?? 0, baselineWalkMs);
  const waypointEtaS = waypointDistM <= 2 ? 0 : Math.max(1, Math.round(waypointDistM / effectiveSpeedMs));
  const targetBearingDeg =
    ((Math.atan2(activeGoal.x - px, -(activeGoal.z - pz)) * 180) / Math.PI + 360) % 360;
  const wrapRelDeg = (deg: number) => {
    let d = ((deg - headingDeg + 540) % 360) - 180;
    if (d < -180) d += 360;
    return d;
  };
  const compassTicks: Array<{ label: string; deg: number }> = [
    { label: 'N', deg: 0 },
    { label: 'NE', deg: 45 },
    { label: 'E', deg: 90 },
    { label: 'SE', deg: 135 },
    { label: 'S', deg: 180 },
    { label: 'SW', deg: 225 },
    { label: 'W', deg: 270 },
    { label: 'NW', deg: 315 },
  ];
  const goalRelDeg = wrapRelDeg(targetBearingDeg);
  const clampedGoalRelDeg = Math.max(-72, Math.min(72, goalRelDeg));

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-4 font-[family-name:var(--font-game)]">
      {/* Centered Crosshair Reticle (1P always; 3P when pointer locked) */}
      {(cameraMode === '1p' || pointerLocked) && !inspectedInfo && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#FFB703]/70"
        >
          {cameraMode === '1p' ? (
            <Crosshair className="h-5 w-5" />
          ) : (
            <span className="block h-1.5 w-1.5 rounded-full bg-[#FFB703]/80 shadow-[0_0_6px_rgba(255,183,3,0.9)]" />
          )}
        </div>
      )}

      {/* TOP-CENTER COMPASS STRIP + DIEGETIC VISOR WAYPOINT */}
      <div className="pointer-events-none fixed left-1/2 top-3 z-20 hidden -translate-x-1/2 flex-col items-center gap-1 md:flex">
        <div className="relative h-6 w-[236px] overflow-hidden rounded-lg border border-[#E85D04]/45 bg-[#071324]/82 shadow-[0_0_16px_rgba(7,19,36,0.55)]">
          {/* Center hairline */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 bg-[#FFB703]"
          />
          {compassTicks.map((tick) => {
            const rel = wrapRelDeg(tick.deg);
            if (Math.abs(rel) > 78) return null;
            const leftPct = 50 + (rel / 80) * 50;
            const isMajor = tick.label.length === 1;
            return (
              <span
                key={tick.label}
                style={{ left: `${leftPct}%` }}
                className={`absolute top-1.5 -translate-x-1/2 text-[10px] font-extrabold tabular-nums ${
                  tick.label === 'N'
                    ? 'text-[#FFB703]'
                    : isMajor
                      ? 'text-[#F8F9FA]/90'
                      : 'text-[#F8F9FA]/55'
                }`}
              >
                {tick.label}
              </span>
            );
          })}
          {/* Active Mission / Shelter Target Chevron on Compass */}
          <span
            title={`${activeGoal.label} (${Math.round(targetBearingDeg)}°)`}
            style={{ left: `${50 + (clampedGoalRelDeg / 80) * 50}%` }}
            className={`absolute bottom-0.5 h-2 w-2 -translate-x-1/2 rotate-45 ${
              simState.activeWeatherEvent
                ? 'bg-[#22C55E] shadow-[0_0_8px_#22C55E]'
                : 'bg-[#FFB703] shadow-[0_0_8px_#FFB703]'
            }`}
          />
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide text-[#F8F9FA] drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] tabular-nums">
          <MapPin
            className={`h-3.5 w-3.5 ${simState.activeWeatherEvent ? 'text-[#22C55E]' : 'text-[#FFB703]'}`}
            aria-hidden="true"
          />
          <span>
            {activeGoal.label} · {waypointDistM} m · {waypointEtaS}s ETA
          </span>
        </div>
      </div>

      {/* TOP HUD ROW: Minecraft-Style Resource Bars (Left) + Compact Objective Card (Right) */}
      <div className="flex flex-col items-start justify-between gap-2.5 lg:flex-row">
        {/* Top-Left: Compact Resource Bars + Quick Game Actions */}
        <div className="pointer-events-auto flex w-full max-w-[332px] flex-col gap-1.5">
          <div className="rounded-xl border border-[#E85D04]/50 bg-[#071324]/88 p-2.5 shadow-[0_0_24px_rgba(232,93,4,0.22)]">
            {/* Compact Header Telemetry Strip (Unboxed clean metadata) */}
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold tabular-nums">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[#FFB703] shrink-0">Sol {simState.sol}</span>
                <span className="text-white/25" aria-hidden="true">·</span>
                <span className="text-[#F8F9FA]/85 truncate">{simState.callsign}</span>
              </div>
              <span
                title="NASA DONKI Space Weather Feed"
                className={`text-[10px] font-extrabold shrink-0 ${
                  simState.donki.status === 'LIVE' ? 'text-[#22C55E]' : 'text-[#FFB703]'
                }`}
              >
                DONKI {simState.donki.status}
              </span>
            </div>

            {/* 4 Minecraft-Style Horizontal Resource Bars */}
            <div className="mt-2 space-y-1.5">
              {resourceBars.map((res) => {
                const IconComp = res.Icon;
                const fillColor = res.status === 'CRITICAL' ? '#EF4444' : res.barHex;
                return (
                  <div
                    key={res.label}
                    title={`${res.label}: ${res.amountText} (${res.daysText} left)`}
                    className="flex items-center gap-2"
                  >
                    <div className="flex w-[64px] shrink-0 items-center gap-1.5">
                      <IconComp
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: res.barHex }}
                        aria-hidden="true"
                      />
                      <span className="text-[11px] font-bold text-[#F8F9FA]/95">{res.label}</span>
                    </div>

                    {/* Horizontal Segmented/Smooth Game Fill Bar */}
                    <div
                      className={`relative h-2.5 flex-1 overflow-hidden rounded-sm border border-white/10 ${res.trackBg}`}
                    >
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${res.pct}%`,
                          backgroundColor: fillColor,
                          boxShadow: `0 0 8px ${fillColor}80`,
                        }}
                      />
                      {/* Subtle Minecraft-style 4-segment tick marks */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 grid grid-cols-4"
                      >
                        <span className="border-r border-[#071324]/45" />
                        <span className="border-r border-[#071324]/45" />
                        <span className="border-r border-[#071324]/45" />
                        <span />
                      </div>
                    </div>

                    <div className="flex w-[60px] shrink-0 items-center justify-end gap-1 tabular-nums">
                      <span className="text-xs font-extrabold text-[#F8F9FA]">{res.daysText}</span>
                      <ResourceAlertIcon status={res.status} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compact Mars Physics + Kits Footer & Expand Toggle */}
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-1.5 text-[11px] tabular-nums">
              <button
                type="button"
                onClick={() => setLabOpen((v) => !v)}
                aria-expanded={labOpen}
                className="inline-flex items-center gap-1 font-bold text-[#38BDF8] hover:text-[#FFB703] transition-colors cursor-pointer"
              >
                <Gauge className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {marsPhysics.gravity.gravityMs2} m/s² · {marsPhysics.airTempC}°C · Crew {crewAliveCount}/4
                </span>
                {labOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
                )}
              </button>

              <span className="font-bold text-[#FFB703]">
                {quickMode ? 'Quick ×1.4 (Sim) · ' : ''}Kits {simState.spareParts}
              </span>
            </div>

            {/* Collapsible Mars Lab & Crew Telemetry */}
            <AnimatePresence>
              {labOpen && (
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.16 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2 text-[11px] tabular-nums">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#38BDF8]">
                        {marsPhysics.gravity.zoneLabel} ({marsPhysics.gravity.earthRatioPct}% Earth)
                      </span>
                      <span className="font-semibold text-[#FFB703]">
                        {marsPhysics.localTimeLabel}
                      </span>
                    </div>
                    <p className="text-[#F8F9FA]/80 leading-snug">
                      {marsPhysics.gravity.explanation}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[#F8F9FA]/85">
                      <span>Air {marsPhysics.pressurePa} Pa</span>
                      <span>·</span>
                      <span>Sun {marsPhysics.solarIrradianceWm2} W/m²</span>
                      <span>·</span>
                      <span className="text-[#22C55E] font-semibold">
                        Wind +{marsPhysics.wind.turbineKwhPerSol} kWh/sol
                      </span>
                    </div>
                    {marsPhysics.lastJump && (
                      <p className="font-bold text-[#FFB703]">
                        Jump: {marsPhysics.lastJump.peakHeightMeters}m vs{' '}
                        {marsPhysics.lastJump.earthPeakHeightMeters}m Earth ({marsPhysics.lastJump.heightMultiplier}×)
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[#38BDF8] font-bold">
                      <span className="inline-flex items-center gap-1">
                        <Radiation className="h-3 w-3" aria-hidden="true" />
                        Dose {simState.eventDoseMsv}/250 mSv
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#FFB703]">
                        <Wrench className="h-3 w-3" aria-hidden="true" />
                        Slots {simState.crewSlotsRemaining}/4
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 pt-0.5">
                      {simState.crew.map((member) => {
                        const prof = CREW_PROFILES.find((p) => p.id === member.id)!;
                        return (
                          <div
                            key={member.id}
                            title={`${member.name} (${member.role})`}
                            className="flex items-center justify-between rounded bg-[#0E2038] px-1.5 py-1 border border-white/10"
                          >
                            <span
                              className="inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-black text-[#071324]"
                              style={{ backgroundColor: prof.avatarColor }}
                            >
                              {prof.initials}
                            </span>
                            <span className="font-bold text-[#F8F9FA]">{member.health}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Slim Game Utility Strip */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenLog}
              className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold text-[#F8F9FA] transition-colors cursor-pointer ${
                simState.activeWeatherEvent
                  ? 'border-[#E85D04] bg-[#2D1418]/92 shadow-[0_0_14px_rgba(232,93,4,0.45)]'
                  : 'border-[#E85D04]/40 bg-[#071324]/88 hover:border-[#FFB703]'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
              <span>Journal</span>
              {simState.activeWeatherEvent && (
                <span className="rounded bg-[#E85D04] px-1 text-[10px] font-black">!</span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenCredits}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[#E85D04]/35 bg-[#071324]/88 px-2.5 text-[11px] font-bold text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
            >
              <Database className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
              <span>NASA</span>
            </button>

            {simState.phase === 'active-mission' && !simState.activeWeatherEvent && (
              <button
                type="button"
                onClick={onTriggerWeatherTest}
                title="Test a Mars Dust Devil alert"
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#E85D04]/45 bg-[#071324]/88 px-2.5 text-[11px] font-bold text-[#FFB703] hover:border-[#FFB703] cursor-pointer"
              >
                <Wind className="h-3.5 w-3.5 text-[#E85D04]" aria-hidden="true" />
                <span>Storm</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleSound}
              aria-pressed={soundEnabled}
              title={soundEnabled ? 'Mute sound' : 'Turn sound on'}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#E85D04]/35 bg-[#071324]/88 px-2 text-[11px] font-bold text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
              ) : (
                <VolumeX className="h-3.5 w-3.5 text-[#F8F9FA]/70" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={onReplayPrologue}
              title="Replay story intro"
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#E85D04]/35 bg-[#071324]/88 px-2 text-[11px] font-bold text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onReturnTitle}
              title="Back to Title"
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#E85D04]/35 bg-[#071324]/88 px-2 text-[11px] font-bold text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
            >
              <Home className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
            </button>
            {onToggleMap && (
              <button
                type="button"
                onClick={onToggleMap}
                aria-pressed={mapOpen}
                title="Open Outpost Wrist Map [M]"
                className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg border px-2.5 text-[11px] font-bold transition-colors cursor-pointer ${
                  mapOpen
                    ? 'border-[#FFB703] bg-[#FFB703] text-[#071324]'
                    : 'border-[#E85D04]/35 bg-[#071324]/88 text-[#FFB703] hover:border-[#FFB703]'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Map [M]</span>
              </button>
            )}

            {onToggleLens && (
              <button
                type="button"
                onClick={onToggleLens}
                aria-pressed={lensOpen}
                title="Toggle Mars Science Lens [F]"
                className={`inline-flex min-h-[32px] items-center gap-1 rounded-lg border px-2.5 text-[11px] font-bold transition-colors cursor-pointer ${
                  lensOpen
                    ? 'border-[#38BDF8] bg-[#38BDF8] text-[#071324]'
                    : 'border-[#E85D04]/35 bg-[#071324]/88 text-[#38BDF8] hover:border-[#38BDF8]'
                }`}
              >
                <ScanEye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Lens [F]</span>
              </button>
            )}

            {onOpenPauseMenu && (
              <button
                type="button"
                onClick={onOpenPauseMenu}
                title="Pause & Settings (Esc)"
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#E85D04]/35 bg-[#071324]/88 px-2.5 text-[11px] font-bold text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
              >
                <span>Esc · Pause</span>
              </button>
            )}
          </div>

          {/* Mars Science Lens Telemetry Overlay ([F]) */}
          <AnimatePresence>
            {lensOpen && (
              <motion.aside
                key="mars-science-lens"
                initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="w-full rounded-xl border border-[#38BDF8]/60 bg-[#071324]/94 p-3 text-[11px] shadow-[0_0_26px_rgba(56,189,248,0.24)]"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-[#38BDF8]">
                    <ScanEye className="h-3.5 w-3.5" aria-hidden="true" />
                    Mars Science Lens [F]
                  </span>
                  {onToggleLens && (
                    <button
                      type="button"
                      onClick={onToggleLens}
                      aria-label="Close Mars Lens"
                      className="text-[#F8F9FA]/70 hover:text-[#FFB703] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 tabular-nums">
                  <div>
                    <p className="text-[#F8F9FA]/60">Gravity [REAL]</p>
                    <p className="font-bold text-[#F8F9FA]">
                      {marsPhysics.gravity.gravityMs2} m/s² ({marsPhysics.gravity.earthRatioPct}% Earth)
                    </p>
                  </div>
                  <div>
                    <p className="text-[#F8F9FA]/60">Atmosphere &amp; Wind [REAL]</p>
                    <p className="font-bold text-[#F8F9FA]">
                      {MARS_FACTS.SURFACE_PRESSURE_MB} mb · {MARS_FACTS.MARS_AIR_DENSITY_KGM3} vs{' '}
                      {MARS_FACTS.EARTH_AIR_DENSITY_KGM3} kg/m³ (~76× thinner)
                    </p>
                  </div>
                  <div>
                    <p className="text-[#F8F9FA]/60">Sunlight [REAL]</p>
                    <p className="font-bold text-[#FFB703]">
                      {marsPhysics.solarIrradianceWm2} W/m² ({MARS_FACTS.SOLAR_EARTH_PERCENT}% Earth)
                    </p>
                  </div>
                  <div>
                    <p className="text-[#F8F9FA]/60">Sound @ 100 m [DERIVED]</p>
                    <p className="font-bold text-[#38BDF8]">
                      {MARS_FACTS.SPEED_OF_SOUND_LOW_HZ_MS} m/s ({marsPhysics.soundDelay100mS.toFixed(2)}s lag)
                    </p>
                  </div>
                  <div className="col-span-2 border-t border-white/10 pt-1">
                    <p className="text-[#F8F9FA]/60">Surface Regolith (Golombek k)</p>
                    <p className="font-bold text-[#F8F9FA]">
                      {marsPhysics.terrainZoneName} · k={marsPhysics.rockFractionK.toFixed(2)} · Sand{' '}
                      {Math.round(marsPhysics.softSandFactor * 100)}% · Slope {marsPhysics.slopeDeg}°
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[#F8F9FA]/60">Earth vs Mars Walk Speed [DERIVED]</p>
                    <p className="font-semibold text-[#F8F9FA]/90">
                      Mars {PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS.toFixed(2)} m/s vs{' '}
                      {PHYSICS_CONSTANTS.EARTH_PREFERRED_WALK_MS.toFixed(1)} m/s Earth (hold [Shift] to lope{' '}
                      {PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS.toFixed(2)} m/s) · Rover{' '}
                      {PHYSICS_CONSTANTS.ROVER_SIM_DRIVE_SPEED_MS.toFixed(1)} m/s [SIM] vs 0.042 m/s [REAL]
                    </p>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        {/* Top-Right: Compact Mission Objective Card + Optional Docked Station Info */}
        <div className="pointer-events-auto flex w-full max-w-[296px] flex-col items-end gap-2">
          <section
            aria-live="polite"
            className="w-full rounded-xl border border-[#E85D04]/55 bg-[#071324]/88 p-3 shadow-[0_0_24px_rgba(232,93,4,0.22)]"
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="text-[#FFB703] tabular-nums">
                Mission {activeMission.index}/5
              </span>
              <span className="text-[#22C55E]">{activeMission.zoneLabel}</span>
            </div>

            <h2 className="mt-0.5 text-base font-extrabold text-[#F8F9FA] leading-tight">
              {activeMission.title}
            </h2>

            <p className="mt-1 text-xs text-[#F8F9FA]/85">
              Go to <strong className="text-[#FFB703]">{zoneTitleMap[activeMission.zoneId]}</strong>{' '}
              [E] or open panel.
            </p>

            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => onOpenCommandMode('look')}
                className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#38BDF8]/50 bg-[#0D213B] px-2.5 text-xs font-bold text-[#38BDF8] hover:bg-[#38BDF8] hover:text-[#071324] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Data</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCommandMode('compare')}
                className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-2.5 text-xs font-extrabold text-[#071324] hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
              >
                <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Decide</span>
              </button>
            </div>
          </section>

          {/* Right-Docked Station or Crew Inspection Card */}
          <AnimatePresence>
            {inspectedCrew ? (
              <motion.aside
                key={`crew-${inspectedCrew.id}`}
                initial={reducedMotion ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
                className="w-full rounded-xl border border-[#38BDF8]/65 bg-[#071324]/92 p-3 shadow-[0_0_24px_rgba(56,189,248,0.22)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="inline-flex items-center gap-1 text-[11px] font-bold text-[#38BDF8]">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {inspectedCrew.role}
                    </p>
                    <h3 className="mt-0.5 text-sm font-extrabold text-[#F8F9FA]">
                      {inspectedCrew.name}
                    </h3>
                  </div>
                  {onCloseInspectedCrew && (
                    <button
                      type="button"
                      onClick={onCloseInspectedCrew}
                      aria-label="Close crew info"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#0E2038] text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] font-bold text-[#FFB703]">
                  Status: {inspectedCrew.modeLabel} · {inspectedCrew.stationLabel}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] font-bold tabular-nums">
                  <span className="text-[#22C55E]">Health {inspectedCrew.health}%</span>
                  <span className="text-[#38BDF8]">Stress {inspectedCrew.stress}%</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#F8F9FA]/88">
                  {inspectedCrew.note}
                </p>
              </motion.aside>
            ) : (
              inspectedInfo && (
                <motion.aside
                  key={inspectedInfo.id}
                  initial={reducedMotion ? false : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.18 }}
                  className="w-full rounded-xl border border-[#E85D04]/55 bg-[#071324]/92 p-3 shadow-[0_0_24px_rgba(232,93,4,0.22)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-bold text-[#FFB703]">{inspectedInfo.role}</p>
                      <h3 className="mt-0.5 text-sm font-extrabold text-[#F8F9FA]">
                        {inspectedInfo.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={onCloseInspected}
                      aria-label="Close station info"
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#0E2038] text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#F8F9FA]/88">
                    {inspectedInfo.description}
                  </p>
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-[#FFB703]/25 bg-[#0E2038]/85 px-2.5 py-1.5 text-[11px] font-semibold text-[#FFB703]">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{inspectedInfo.funFact}</span>
                  </p>
                </motion.aside>
              )
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* LIVE WEATHER EVENT, ROVER TILT & EARTH-COMPARISON LANDING TOAST */}
      <AnimatePresence>
        {simState.activeWeatherEvent && (
          <motion.div
            key={simState.activeWeatherEvent.id}
            role="status"
            aria-live="assertive"
            initial={reducedMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto mx-auto mt-1 flex w-full max-w-lg flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#E85D04] bg-[#240F13]/92 px-3.5 py-2 shadow-[0_0_28px_rgba(232,93,4,0.45)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E85D04] text-[#F8F9FA]">
                <Wind className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#FFB703] tabular-nums">
                  {simState.activeWeatherEvent.title} · {simState.activeWeatherEvent.lastGustWindMs} m/s
                </p>
                <p className="text-xs font-bold text-[#F8F9FA]">
                  Seek Habitat Airlock (
                  <span className="text-[#22C55E] tabular-nums">{habitatDistMeters} m</span>)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-lg px-2.5 py-1 text-sm font-extrabold tabular-nums ${
                  weatherSecondsLeft <= 6
                    ? 'bg-[#DC2626] text-[#F8F9FA]'
                    : 'bg-[#FFB703] text-[#071324]'
                }`}
              >
                {weatherSecondsLeft}s
              </span>
              {!soundEnabled && (
                <button
                  type="button"
                  onClick={onToggleSound}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-[#FFB703]/60 bg-[#0E2038] px-2 text-xs font-bold text-[#FFB703] cursor-pointer"
                >
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Audio</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {roverTiltWarning?.active && (
          <motion.div
            key="rover-tilt-warning"
            role="status"
            initial={reducedMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mx-auto mt-1 inline-flex items-center gap-2 rounded-lg border border-[#FFB703]/70 bg-[#2A190C]/90 px-3 py-1 text-[11px] font-bold text-[#FFB703] tabular-nums"
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Rover Slope Caution ({roverTiltWarning.deg}° &gt; 30° — Safe limit 45°)
            </span>
          </motion.div>
        )}

        {landingToast && (
          <motion.div
            key="landing-comparison-toast"
            role="status"
            initial={reducedMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mx-auto mt-1 inline-flex items-center gap-2.5 rounded-xl border border-[#38BDF8]/55 bg-[#071324]/92 px-3.5 py-1.5 text-xs font-bold text-[#F8F9FA] shadow-lg tabular-nums"
          >
            <ArrowUpFromLine className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
            <span>
              {landingToast.isJump ? 'Jump' : `Drop ${landingToast.fallHeightM}m`}:{' '}
              <strong className="text-[#FFB703]">
                {landingToast.apexM}m Mars ({landingToast.marsHangOrFallS}s)
              </strong>{' '}
              vs{' '}
              <strong className="text-[#38BDF8]">
                {landingToast.earthApexM}m Earth ({landingToast.earthHangOrFallS}s)
              </strong>{' '}
              · Impact {landingToast.impactMs} m/s
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM HUD ROW: Rover Bubble (Left) + Interaction Keycap (Center) + Control Hints (Right) */}
      <div className="mt-auto flex flex-col items-center justify-between gap-2.5 lg:flex-row lg:items-end">
        <RoverAssistant
          roverName={simState.roverName}
          mood={roverMood}
          damaged={simState.roverDamaged}
          hushed={simState.roverHushed}
          lastLine={simState.roverLastLine}
          activeHint={simState.roverActiveHint}
          hintLevelUsed={currentHintLevel}
          crewSlotsRemaining={simState.crewSlotsRemaining}
          onAskHint={onAskRoverHint}
          onToggleHush={onToggleRoverHush}
        />

        {/* Bottom-Center Contextual Interaction Prompt */}
        <div className="flex flex-1 justify-center pb-1">
          <AnimatePresence>
            {simState.activeWeatherEvent && nearbyStation === 'habitat' ? (
              <motion.button
                key="habitat-shelter-prompt"
                type="button"
                initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                onClick={onShelterClick}
                className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2.5 rounded-xl border border-[#22C55E] bg-[#071324]/92 px-3.5 py-2 text-sm font-extrabold text-[#F8F9FA] shadow-[0_0_24px_rgba(34,197,94,0.35)] hover:scale-[1.03] cursor-pointer whitespace-nowrap"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#22C55E] text-xs font-black text-[#071324]">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span>E · Enter Shelter</span>
              </motion.button>
            ) : nearbyCrewProfile && onInteractCrew ? (
              <motion.button
                key={`crew-${nearbyCrewProfile.id}`}
                type="button"
                initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                onClick={() => onInteractCrew(nearbyCrewProfile.id)}
                className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2.5 rounded-xl border border-[#38BDF8] bg-[#071324]/92 px-3.5 py-2 text-sm font-extrabold text-[#F8F9FA] shadow-[0_0_24px_rgba(56,189,248,0.32)] hover:scale-[1.03] cursor-pointer whitespace-nowrap"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#38BDF8] text-xs font-black text-[#071324]">
                  E
                </span>
                <span>Check in: {nearbyCrewProfile.name}</span>
              </motion.button>
            ) : nearbyZone ? (
              <motion.button
                key={`zone-${nearbyZone}`}
                type="button"
                initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                onClick={() => onInteractZone(nearbyZone)}
                className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2.5 rounded-xl border border-[#FFB703] bg-[#071324]/92 px-3.5 py-2 text-sm font-extrabold text-[#F8F9FA] shadow-[0_0_24px_rgba(255,183,3,0.32)] hover:scale-[1.03] cursor-pointer whitespace-nowrap"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#FFB703] text-xs font-black text-[#071324]">
                  E
                </span>
                <span>
                  {nearbyZone === activeMission.zoneId
                    ? `Mission: ${zoneTitleMap[nearbyZone]}`
                    : `Inspect ${zoneTitleMap[nearbyZone]}`}
                </span>
              </motion.button>
            ) : (
              nearbyInfo && (
                <motion.button
                  key={nearbyInfo.id}
                  type="button"
                  initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => onInteractStation(nearbyInfo.id)}
                  className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2.5 rounded-xl border border-[#E85D04]/75 bg-[#071324]/92 px-3.5 py-2 text-sm font-extrabold text-[#F8F9FA] shadow-[0_0_22px_rgba(232,93,4,0.3)] hover:scale-[1.03] cursor-pointer whitespace-nowrap"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#FFB703] text-xs font-black text-[#071324]">
                    E
                  </span>
                  <span>Inspect {nearbyInfo.name}</span>
                </motion.button>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Bottom-Right: Control Hints + Compact Action Toggles */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <AnimatePresence>
            {touchPadOpen && (
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                aria-label="On-screen movement pad"
                className="flex items-center gap-2 rounded-xl border border-[#E85D04]/50 bg-[#071324]/92 p-2 shadow-[0_0_22px_rgba(232,93,4,0.22)]"
              >
                <div className="grid grid-cols-3 gap-1">
                  <div />
                  <button
                    type="button"
                    aria-label="Walk Forward"
                    onPointerDown={() => setMoveFlag('forward', true)}
                    onPointerUp={() => setMoveFlag('forward', false)}
                    onPointerLeave={() => setMoveFlag('forward', false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0E2038] text-[#F8F9FA] hover:bg-[#FFB703] hover:text-[#071324] cursor-pointer"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <div />
                  <button
                    type="button"
                    aria-label="Walk Left"
                    onPointerDown={() => setMoveFlag('left', true)}
                    onPointerUp={() => setMoveFlag('left', false)}
                    onPointerLeave={() => setMoveFlag('left', false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0E2038] text-[#F8F9FA] hover:bg-[#FFB703] hover:text-[#071324] cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Walk Back"
                    onPointerDown={() => setMoveFlag('back', true)}
                    onPointerUp={() => setMoveFlag('back', false)}
                    onPointerLeave={() => setMoveFlag('back', false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0E2038] text-[#F8F9FA] hover:bg-[#FFB703] hover:text-[#071324] cursor-pointer"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Walk Right"
                    onPointerDown={() => setMoveFlag('right', true)}
                    onPointerUp={() => setMoveFlag('right', false)}
                    onPointerLeave={() => setMoveFlag('right', false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0E2038] text-[#F8F9FA] hover:bg-[#FFB703] hover:text-[#071324] cursor-pointer"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Turn camera left"
                      onPointerDown={() => {
                        moveInputRef.current.lookX = 1.65;
                      }}
                      onPointerUp={() => {
                        moveInputRef.current.lookX = 0;
                      }}
                      onPointerLeave={() => {
                        moveInputRef.current.lookX = 0;
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0E2038] text-[#FFB703] hover:bg-[#FFB703] hover:text-[#071324] cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Turn camera right"
                      onPointerDown={() => {
                        moveInputRef.current.lookX = -1.65;
                      }}
                      onPointerUp={() => {
                        moveInputRef.current.lookX = 0;
                      }}
                      onPointerLeave={() => {
                        moveInputRef.current.lookX = 0;
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0E2038] text-[#FFB703] hover:bg-[#FFB703] hover:text-[#071324] cursor-pointer"
                    >
                      <RotateCw className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onPointerDown={() => setMoveFlag('sprint', true)}
                    onPointerUp={() => setMoveFlag('sprint', false)}
                    onPointerLeave={() => setMoveFlag('sprint', false)}
                    className="h-9 rounded-lg border border-[#38BDF8]/40 bg-[#0E2038] px-2 text-[11px] font-bold text-[#38BDF8] hover:bg-[#38BDF8] hover:text-[#071324] cursor-pointer"
                  >
                    Hold Run
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* View / Jump / Pad Quick Controls */}
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onToggleCameraMode}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#E85D04]/40 bg-[#071324]/88 px-2.5 text-[11px] font-bold text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
              <span>{cameraMode === '3p' ? '3rd [V]' : '1st [V]'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                moveInputRef.current.jumpRequested = true;
              }}
              title={`Jump in ${marsPhysics.gravity.gravityMs2} m/s² Mars gravity`}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-[#E85D04]/50 bg-[#071324]/88 px-2.5 text-[11px] font-bold text-[#FFB703] hover:bg-[#FFB703] hover:text-[#071324] cursor-pointer tabular-nums"
            >
              <ArrowUpFromLine className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Jump</span>
            </button>

            <button
              type="button"
              onClick={() => setTouchPadOpen((v) => !v)}
              aria-expanded={touchPadOpen}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold cursor-pointer ${
                touchPadOpen
                  ? 'border-[#FFB703] bg-[#FFB703] text-[#071324]'
                  : 'border-[#E85D04]/40 bg-[#071324]/88 text-[#F8F9FA] hover:border-[#FFB703]'
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pad</span>
            </button>
          </div>

          {/* Minimal Control Hints Strip */}
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-[#E85D04]/35 bg-[#071324]/85 px-2.5 py-1 text-[11px] font-semibold text-[#F8F9FA]/85 shadow-[0_0_16px_rgba(232,93,4,0.14)]">
            <span>
              <strong className="text-[#FFB703]">{pointerLocked ? 'Mouse' : 'Click'}</strong> Look
            </span>
            <span className="text-white/25">·</span>
            <span><strong className="text-[#FFB703]">WASD</strong> Move</span>
            <span className="text-white/25">·</span>
            <span><strong className="text-[#FFB703]">Shift</strong> Lope</span>
            <span className="text-white/25">·</span>
            <span><strong className="text-[#FFB703]">Space</strong> Jump</span>
            <span className="text-white/25">·</span>
            <span><strong className="text-[#FFB703]">E</strong> Inspect</span>
            <span className="text-white/25">·</span>
            <span><strong className="text-[#FFB703]">M</strong> Map</span>
            <span className="text-white/25">·</span>
            <span><strong className="text-[#38BDF8]">F</strong> Lens</span>
            <span className="text-white/25">·</span>
            <span><strong className="text-[#FFB703]">Esc</strong> Pause</span>
          </div>
        </div>
      </div>
    </div>
  );
}
