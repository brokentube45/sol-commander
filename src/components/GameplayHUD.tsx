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
} from 'lucide-react';
import { OUTPOST_LANDMARKS, OutpostLandmarkId } from '../data/missionData';
import {
  CREW_PROFILES,
  ResourceStatus,
  SIM_CONSTANTS,
  getResourceStatus,
} from '../sim/constants';
import { MarsEnvironmentSnapshot } from '../sim/marsPhysics';
import { MissionDefinition, MissionZoneId } from '../sim/missionsData';
import {
  CampaignState,
  computeRoverMood,
  getResourceDaysSummary,
} from '../sim/simEngine';
import { GameplayInputState } from './MarsOutpost3D';
import { RoverAssistant } from './RoverAssistant';

interface GameplayHUDProps {
  simState: CampaignState;
  activeMission: MissionDefinition;
  marsPhysics: MarsEnvironmentSnapshot;
  cameraMode: '3p' | '1p';
  onToggleCameraMode: () => void;
  nearbyZone: MissionZoneId | null;
  nearbyStation: OutpostLandmarkId | null;
  inspectedStation: OutpostLandmarkId | null;
  onCloseInspected: () => void;
  onInteractZone: (zoneId: MissionZoneId) => void;
  onInteractStation: (id: OutpostLandmarkId) => void;
  onOpenCommandMode: (tab?: 'look' | 'compare') => void;
  onOpenLog: () => void;
  onOpenCredits: () => void;
  onAskRoverHint: (level: 1 | 2) => void;
  onToggleRoverHush: () => void;
  weatherSecondsLeft: number;
  habitatDistMeters: number;
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
  nearbyZone,
  nearbyStation,
  inspectedStation,
  onCloseInspected,
  onInteractZone,
  onInteractStation,
  onOpenCommandMode,
  onOpenLog,
  onOpenCredits,
  onAskRoverHint,
  onToggleRoverHush,
  weatherSecondsLeft,
  habitatDistMeters,
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

          {/* Right-Docked Station Inspection Card (No overlapping modal!) */}
          <AnimatePresence>
            {inspectedInfo && (
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
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* LIVE WEATHER EVENT: SEEK SHELTER HUD BAR */}
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
            <span><strong className="text-[#FFB703]">Esc</strong> Pause</span>
          </div>
        </div>
      </div>
    </div>
  );
}
