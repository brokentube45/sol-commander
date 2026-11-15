import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Compass,
  Droplets,
  Leaf,
  Radio,
  Radar,
  ScanEye,
  ShieldCheck,
  Sun,
  Volume2,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { OUTPOST_LANDMARKS, OutpostLandmarkId } from '../data/missionData';
import { CREW_PROFILES, CrewMemberId, SIM_CONSTANTS, getResourceStatus } from '../sim/constants';
import { MarsEnvironmentSnapshot } from '../sim/marsPhysics';
import { MissionDefinition, MissionZoneId } from '../sim/missionsData';
import { CampaignState, getResourceDaysSummary } from '../sim/simEngine';
import { OutpostAudioZone } from '../utils/soundEngine';

export interface QuickActionResultToast {
  id: string;
  title: string;
  detail: string;
  tone: 'info' | 'good' | 'warn';
}

export interface QuickActionItem {
  id: string;
  keyHint: string;
  label: string;
  detail: string;
  tone: 'urgent' | 'primary' | 'science' | 'neutral';
  icon:
    | 'oxygen'
    | 'scan'
    | 'comms'
    | 'shelter'
    | 'mission'
    | 'plant'
    | 'solar'
    | 'rover'
    | 'map'
    | 'audio';
  onTrigger: () => void;
}

interface QuickActionMenuModalProps {
  open: boolean;
  onClose: () => void;
  simState: CampaignState;
  activeMission: MissionDefinition;
  marsPhysics: MarsEnvironmentSnapshot;
  audioZone: OutpostAudioZone;
  nearbyZone: MissionZoneId | null;
  nearbyStation: OutpostLandmarkId | null;
  nearbyCrewId: CrewMemberId | null;
  habitatDistMeters: number;
  soundEnabled: boolean;
  onCheckOxygen: () => void;
  onQuickScan: () => void;
  onEmergencyComms: () => void;
  onInteractContext: () => void;
  onOpenMissionConsole: () => void;
  onOpenMapOrShelter: () => void;
  onToggleSound: () => void;
  reducedMotion?: boolean;
}

export function getAudioZoneMeta(zone: OutpostAudioZone): {
  label: string;
  ambienceNote: string;
} {
  switch (zone) {
    case 'habitat':
      return {
        label: 'Habitat Interior',
        ambienceNote: 'Pressurized air fans & quiet life-support hum',
      };
    case 'greenhouse':
      return {
        label: 'Bio-Dome Greenhouse',
        ambienceNote: 'Warm grow-light hum & hydroponic water trickle',
      };
    case 'solar':
      return {
        label: 'Solar Array',
        ambienceNote: 'Photovoltaic inverter hum & Martian breeze',
      };
    case 'tank-recycler':
      return {
        label: 'Tank Farm & Recycler',
        ambienceNote: 'Cryogenic circulation pump & condenser pulse',
      };
    case 'wind-field':
      return {
        label: 'Aeolus Wind Field',
        ambienceNote: 'Sweeping Martian gusts & turbine blade swish',
      };
    default:
      return {
        label: 'Mars Surface',
        ambienceNote: 'Thin CO₂ wind whisper & spacesuit breathing',
      };
  }
}

function ActionIcon({ icon }: { icon: QuickActionItem['icon'] }) {
  const cls = 'h-5 w-5 shrink-0';
  switch (icon) {
    case 'oxygen':
      return <Wind className={cls} aria-hidden="true" />;
    case 'scan':
      return <Radar className={cls} aria-hidden="true" />;
    case 'comms':
      return <Radio className={cls} aria-hidden="true" />;
    case 'shelter':
      return <ShieldCheck className={cls} aria-hidden="true" />;
    case 'mission':
      return <Zap className={cls} aria-hidden="true" />;
    case 'plant':
      return <Leaf className={cls} aria-hidden="true" />;
    case 'solar':
      return <Sun className={cls} aria-hidden="true" />;
    case 'rover':
      return <Bot className={cls} aria-hidden="true" />;
    case 'map':
      return <Compass className={cls} aria-hidden="true" />;
    case 'audio':
      return <Volume2 className={cls} aria-hidden="true" />;
  }
}

export function QuickActionMenuModal({
  open,
  onClose,
  simState,
  activeMission,
  marsPhysics,
  audioZone,
  nearbyZone,
  nearbyStation,
  nearbyCrewId,
  habitatDistMeters,
  soundEnabled,
  onCheckOxygen,
  onQuickScan,
  onEmergencyComms,
  onInteractContext,
  onOpenMissionConsole,
  onOpenMapOrShelter,
  onToggleSound,
  reducedMotion = false,
}: QuickActionMenuModalProps) {
  const zoneMeta = getAudioZoneMeta(audioZone);
  const days = getResourceDaysSummary(simState);
  const o2Status = getResourceStatus('oxygen', simState.oxygenKg);

  const nearbyCrew = nearbyCrewId
    ? CREW_PROFILES.find((p) => p.id === nearbyCrewId) ?? null
    : null;
  const nearbyLandmark = nearbyStation ? OUTPOST_LANDMARKS[nearbyStation] : null;

  const actions = useMemo<QuickActionItem[]>(() => {
    const list: QuickActionItem[] = [];

    // 1) Situational priority: Storm Shelter or Nearby Zone/Crew Inspection
    if (simState.activeWeatherEvent) {
      list.push({
        id: 'shelter-now',
        keyHint: String(list.length + 1),
        label: habitatDistMeters <= 5 ? 'Enter Shelter Now' : 'Shelter Route',
        detail:
          habitatDistMeters <= 5
            ? 'Airlock in reach — step inside now!'
            : `Habitat Airlock ${habitatDistMeters} m away · View map`,
        tone: 'urgent',
        icon: 'shelter',
        onTrigger: () => {
          onOpenMapOrShelter();
          onClose();
        },
      });
    } else if (nearbyCrew) {
      list.push({
        id: 'context-crew',
        keyHint: String(list.length + 1),
        label: `Check In: ${nearbyCrew.name}`,
        detail: `${nearbyCrew.role} · Quick wellness update`,
        tone: 'primary',
        icon: 'rover',
        onTrigger: () => {
          onInteractContext();
          onClose();
        },
      });
    } else if (nearbyZone || nearbyLandmark) {
      const targetName =
        nearbyLandmark?.name ??
        (nearbyZone === 'tank2'
          ? 'O₂ Tank 2'
          : nearbyZone === 'solar'
            ? 'Solar Array'
            : nearbyZone === 'recycler'
              ? 'Water Recycler'
              : nearbyZone === 'greenhouse'
                ? 'Greenhouse Bio-Dome'
                : 'Storm Shelter');
      const iconKind: QuickActionItem['icon'] =
        nearbyZone === 'greenhouse'
          ? 'plant'
          : nearbyZone === 'solar'
            ? 'solar'
            : nearbyZone === 'tank2'
              ? 'oxygen'
              : nearbyZone === 'shelter'
                ? 'shelter'
                : 'mission';

      list.push({
        id: 'context-nearby',
        keyHint: String(list.length + 1),
        label: `Inspect ${targetName}`,
        detail: 'Right beside you — open station or activity',
        tone: 'primary',
        icon: iconKind,
        onTrigger: () => {
          onInteractContext();
          onClose();
        },
      });
    }

    // 2) Check Oxygen (Always situational: leak warning, tank status, or days left)
    list.push({
      id: 'check-oxygen',
      keyHint: String(list.length + 1),
      label: 'Check Oxygen',
      detail: simState.tank2LeakActive
        ? `Tank 2 alert · ${simState.oxygenKg} kg (${days.o2Days}d left)`
        : `${simState.oxygenKg} kg stored · ${days.o2Days} days · ${
            o2Status === 'NOMINAL' ? 'Normal pressure' : 'Save air'
          }`,
      tone: simState.tank2LeakActive || o2Status !== 'NOMINAL' ? 'urgent' : 'science',
      icon: 'oxygen',
      onTrigger: () => {
        onCheckOxygen();
        onClose();
      },
    });

    // 3) Quick Scan (Zone-aware telemetry & geological radar sweep)
    const scanLabel =
      audioZone === 'greenhouse'
        ? 'Quick Scan: Plants'
        : audioZone === 'solar'
          ? 'Quick Scan: Solar'
          : audioZone === 'tank-recycler'
            ? 'Quick Scan: Water & Ice'
            : audioZone === 'habitat'
              ? 'Quick Scan: Base Systems'
              : audioZone === 'wind-field'
                ? 'Quick Scan: Wind Power'
                : 'Quick Scan: Terrain';

    const scanDetail =
      audioZone === 'solar'
        ? `${marsPhysics.solarIrradianceWm2} W/m² sunlight · Battery ${simState.batteryKwh}/${SIM_CONSTANTS.BATTERY_CAPACITY_KWH} kWh`
        : audioZone === 'greenhouse'
          ? simState.greenhouseFrost
            ? 'Cold frost warning inside Bio-Dome'
            : `Hydroponics OK · Food ${simState.foodKg} kg`
          : `${marsPhysics.terrainZoneName} · ${marsPhysics.gravity.gravityMs2} m/s² · ${marsPhysics.airTempC}°C`;

    list.push({
      id: 'quick-scan',
      keyHint: String(list.length + 1),
      label: scanLabel,
      detail: scanDetail,
      tone: 'science',
      icon: 'scan',
      onTrigger: () => {
        onQuickScan();
        onClose();
      },
    });

    // 4) Emergency Comms (Hails Mission Control & Rover for immediate guidance)
    list.push({
      id: 'emergency-comms',
      keyHint: String(list.length + 1),
      label: 'Emergency Comms',
      detail: simState.activeWeatherEvent
        ? `Relay storm shelter coordinates with ${simState.roverName}`
        : `Ping Earth Relay & ask ${simState.roverName} for status`,
      tone: simState.activeWeatherEvent || simState.donki.status === 'LIVE' ? 'urgent' : 'neutral',
      icon: 'comms',
      onTrigger: () => {
        onEmergencyComms();
        onClose();
      },
    });

    // 5) Open Active Mission Console (when training is complete)
    if (simState.tutorialStep === 'complete' && !simState.activeWeatherEvent) {
      list.push({
        id: 'mission-console',
        keyHint: String(list.length + 1),
        label: 'Mission Console',
        detail: `${activeMission.title} · Look, play & decide`,
        tone: 'primary',
        icon: 'mission',
        onTrigger: () => {
          onOpenMissionConsole();
          onClose();
        },
      });
    }

    // 6) Zone Audio Toggle when muted (helps discover the dynamic audio landscape)
    if (!soundEnabled && list.length < 6) {
      list.push({
        id: 'enable-audio',
        keyHint: String(list.length + 1),
        label: 'Turn On Zone Audio',
        detail: `Hear ${zoneMeta.label.toLowerCase()} & Mars soundscapes`,
        tone: 'neutral',
        icon: 'audio',
        onTrigger: () => {
          onToggleSound();
        },
      });
    }

    return list;
  }, [
    simState,
    activeMission.title,
    marsPhysics,
    audioZone,
    nearbyCrew,
    nearbyZone,
    nearbyLandmark,
    habitatDistMeters,
    soundEnabled,
    days.o2Days,
    o2Status,
    zoneMeta.label,
    onCheckOxygen,
    onQuickScan,
    onEmergencyComms,
    onInteractContext,
    onOpenMissionConsole,
    onOpenMapOrShelter,
    onToggleSound,
    onClose,
  ]);

  // Keyboard shortcuts 1..6 while open
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.repeat) return;
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      const idx = Number(ev.key) - 1;
      if (!Number.isNaN(idx) && idx >= 0 && idx < actions.length) {
        ev.preventDefault();
        actions[idx].onTrigger();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, actions]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#040A15]/60 p-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-action-title"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#FFB703]/60 bg-[#071324]/96 text-[#F8F9FA] shadow-[0_0_40px_rgba(255,183,3,0.22)] font-[family-name:var(--font-game)]"
          >
            <div className="h-1 w-full bg-gradient-to-r from-[#FFB703] via-[#38BDF8] to-[#22C55E]" />

            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#38BDF8]">
                    <span>Zone: {zoneMeta.label}</span>
                    <span className="text-white/30" aria-hidden="true">·</span>
                    <span className="text-[#F8F9FA]/75">{zoneMeta.ambienceNote}</span>
                  </div>
                  <h2
                    id="quick-action-title"
                    className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight text-[#F8F9FA] sm:text-2xl"
                  >
                    Commander&apos;s Quick Actions
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close quick actions"
                  className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-[#0E2038] text-[#F8F9FA] hover:border-[#FFB703]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {actions.map((item) => {
                  const toneClasses =
                    item.tone === 'urgent'
                      ? 'border-[#E85D04] bg-[#241215]/90 hover:border-[#FFB703]'
                      : item.tone === 'primary'
                        ? 'border-[#FFB703]/70 bg-[#1B3A5F]/75 hover:border-[#FFB703]'
                        : item.tone === 'science'
                          ? 'border-[#38BDF8]/45 bg-[#0D213B]/85 hover:border-[#38BDF8]'
                          : 'border-white/15 bg-[#0D213B]/70 hover:border-[#FFB703]';

                  const iconClasses =
                    item.tone === 'urgent'
                      ? 'bg-[#E85D04] text-[#F8F9FA]'
                      : item.tone === 'primary'
                        ? 'bg-[#FFB703] text-[#071324]'
                        : item.tone === 'science'
                          ? 'bg-[#38BDF8] text-[#071324]'
                          : 'bg-[#1B3A5F] text-[#FFB703]';

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.onTrigger}
                      className={`group flex min-h-[64px] cursor-pointer items-center gap-3.5 rounded-xl border px-3.5 py-3 text-left transition-all hover:scale-[1.01] ${toneClasses}`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClasses}`}
                      >
                        <ActionIcon icon={item.icon} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-extrabold text-[#F8F9FA]">
                            {item.label}
                          </span>
                          <kbd className="shrink-0 rounded border border-white/20 bg-[#061020]/80 px-1.5 py-0.5 text-[10px] font-black text-[#FFB703] tabular-nums">
                            {item.keyHint}
                          </kbd>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[#F8F9FA]/80">
                          {item.detail}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-[#F8F9FA]/70">
                <span>
                  Press <strong className="text-[#FFB703]">1–{actions.length}</strong> to trigger quickly
                </span>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5 text-[#3B82F6]" aria-hidden="true" />
                    H₂O {simState.waterKg} kg
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
                    Kits {simState.spareParts}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ScanEye className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                    {soundEnabled ? 'Zone Audio ON' : 'Audio OFF'}
                  </span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
