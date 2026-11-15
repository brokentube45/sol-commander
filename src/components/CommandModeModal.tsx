import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Eye,
  Scale,
  Radio,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sun,
  ShieldAlert,
  CloudSun,
  Wind,
  Wrench,
  ShieldCheck,
  BatteryCharging,
  PowerOff,
  Bot,
  Droplets,
  Flame,
  HardHat,
  Award,
  FlaskConical,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Leaf,
  Snowflake,
  FastForward,
  Volume2,
} from 'lucide-react';
import { CREW_PROFILES, ProvenanceTag } from '../sim/constants';
import { MissionDefinition, OptionId } from '../sim/missionsData';
import { ARCHIVED_MEDA_SOLS } from '../sim/nasaData';
import {
  BADGE_DISCLAIMER,
  JUNIOR_MISSIONS,
  JUNIOR_SCIENCE_CARDS,
  JuniorDecisionOption,
} from '../sim/juniorData';
import { MissionId } from '../sim/roverData';
import { CampaignState } from '../sim/simEngine';
import { MissionMiniActivities } from './MissionMiniActivities';
import { JuniorQuizCard } from './JuniorQuizCard';
import { ScienceCardModal } from './ScienceCardModal';
import { soundEngine } from '../utils/soundEngine';
import { narrativeVoice } from '../utils/narrativeVoice';

interface CommandModeModalProps {
  open: boolean;
  state: CampaignState;
  mission: MissionDefinition;
  initialTab?: 'look' | 'compare';
  onClose: () => void;
  onMarkInspected: () => void;
  onRequestMissionControl: (arrived: boolean) => void;
  onSelectOption: (optionId: OptionId) => void;
  onCleanPanelsBonus: () => void;
  onAdvanceRoutineSols: () => void;
  onProceedNextCriticalSol: () => void;
  onCompleteMiniActivity?: (missionId: MissionId) => void;
  onCompleteQuiz?: (missionId: MissionId) => void;
  onUnlockCard?: (cardId: string) => void;
  onToggleGrownUpScience?: () => void;
  reducedMotion?: boolean;
}

type MissionStepTab = 'look' | 'activity' | 'quiz' | 'compare';

function ProvenanceTagText({ tag }: { tag: ProvenanceTag }) {
  if (tag === 'REAL') {
    return <span className="text-[10px] font-extrabold text-[#22C55E]">[REAL]</span>;
  }
  if (tag === 'DERIVED') {
    return <span className="text-[10px] font-extrabold text-[#38BDF8]">[DERIVED]</span>;
  }
  return <span className="text-[10px] font-extrabold text-[#FFB703]">[SIM]</span>;
}

function JuniorDecisionIcon({ icon }: { icon: JuniorDecisionOption['icon'] }) {
  const cls = 'h-5 w-5';
  switch (icon) {
    case 'valve':
    case 'wrench':
      return <Wrench className={cls} aria-hidden="true" />;
    case 'shield':
      return <ShieldCheck className={cls} aria-hidden="true" />;
    case 'battery':
      return <BatteryCharging className={cls} aria-hidden="true" />;
    case 'power':
      return <PowerOff className={cls} aria-hidden="true" />;
    case 'water':
      return <Droplets className={cls} aria-hidden="true" />;
    case 'heater':
      return <Flame className={cls} aria-hidden="true" />;
    case 'food':
      return <Leaf className={cls} aria-hidden="true" />;
    default:
      return <HardHat className={cls} aria-hidden="true" />;
  }
}

function BadgeIcon({ icon }: { icon: 'oxygen' | 'sun' | 'ice' | 'leaf' | 'shield' }) {
  const cls = 'h-6 w-6';
  switch (icon) {
    case 'oxygen':
      return <Wind className={cls} aria-hidden="true" />;
    case 'sun':
      return <Sun className={cls} aria-hidden="true" />;
    case 'ice':
      return <Snowflake className={cls} aria-hidden="true" />;
    case 'leaf':
      return <Leaf className={cls} aria-hidden="true" />;
    default:
      return <ShieldCheck className={cls} aria-hidden="true" />;
  }
}

export function CommandModeModal({
  open,
  state,
  mission,
  initialTab = 'look',
  onClose,
  onMarkInspected,
  onRequestMissionControl,
  onSelectOption,
  onCleanPanelsBonus,
  onAdvanceRoutineSols,
  onProceedNextCriticalSol,
  onCompleteMiniActivity,
  onCompleteQuiz,
  onUnlockCard,
  onToggleGrownUpScience,
  reducedMotion = false,
}: CommandModeModalProps) {
  const [activeTab, setActiveTab] = useState<MissionStepTab>(initialTab);
  const [mcSecondsLeft, setMcSecondsLeft] = useState<number | null>(null);
  const [medaIndex, setMedaIndex] = useState(0);
  const [moreChoicesOpen, setMoreChoicesOpen] = useState(false);
  const badgeChimePlayedRef = useRef<string | null>(null);

  const juniorMission = JUNIOR_MISSIONS[mission.id];
  const scienceCard = JUNIOR_SCIENCE_CARDS[juniorMission.scienceCardId];
  const activityDone = Boolean(state.missionMiniActivityDone[mission.id]);
  const quizDone = Boolean(state.missionQuizDone[mission.id]);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setMoreChoicesOpen(false);
      if (initialTab === 'look' && state.phase === 'active-mission') {
        onMarkInspected();
      }
    }
  }, [open, initialTab, mission.id]);

  // Play celebratory chime when mission review opens for the first time on a mission
  useEffect(() => {
    if (
      open &&
      state.phase === 'mission-review' &&
      state.lastOutcome &&
      badgeChimePlayedRef.current !== `${mission.id}-${state.sol}`
    ) {
      badgeChimePlayedRef.current = `${mission.id}-${state.sol}`;
      soundEngine.playBadgeUnlock();
    }
  }, [open, state.phase, state.lastOutcome, mission.id, state.sol]);

  // Read mission decisions aloud when opening the compare choices tab
  useEffect(() => {
    if (open && activeTab === 'compare' && juniorMission?.decisions?.length >= 2) {
      narrativeVoice.speakMissionDecisions(
        mission.id,
        juniorMission.decisions[0].title,
        juniorMission.decisions[1].title,
      );
    }
  }, [open, activeTab, mission.id]);

  // Scaled Earth-Mars speed-of-light delay countdown (1 real second = 1 simulated minute)
  useEffect(() => {
    if (mcSecondsLeft === null || mcSecondsLeft <= 0) return;
    const t = window.setTimeout(() => {
      setMcSecondsLeft((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next <= 0) {
          onRequestMissionControl(true);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => window.clearTimeout(t);
  }, [mcSecondsLeft, onRequestMissionControl]);

  useEffect(() => {
    setMcSecondsLeft(null);
  }, [mission.id]);

  if (!open) return null;

  const isReview = state.phase === 'mission-review' && state.lastOutcome;
  const isRoutine = state.phase === 'routine-summary' && state.lastRoutineSummary;
  const meda = ARCHIVED_MEDA_SOLS[medaIndex];

  const handleOpenTab = (tab: MissionStepTab) => {
    soundEngine.playClick();
    setActiveTab(tab);
    if (tab === 'look') onMarkInspected();
  };

  const handleAskMc = () => {
    if (state.mcReplyArrived || mcSecondsLeft !== null) return;
    soundEngine.playClick();
    onRequestMissionControl(false);
    setMcSecondsLeft(mission.mcDelayMinutes);
  };

  const handleFinishScienceAndAdvance = () => {
    onUnlockCard?.(juniorMission.scienceCardId);
    onAdvanceRoutineSols();
  };

  const juniorStatusSummary: Record<MissionId, { label: string; stateText: string; ok: boolean }> = {
    m1: {
      label: 'Oxygen Tank 2',
      stateText: state.tank2LeakActive ? 'Leaking air' : 'Valve closed',
      ok: !state.tank2LeakActive,
    },
    m2: {
      label: 'Solar Panels',
      stateText: state.panelsDusty ? 'Sky dusty — lower power' : 'Sunlight steady',
      ok: !state.panelsDusty,
    },
    m3: {
      label: 'Water Recycler',
      stateText: state.recyclerEfficiency < 0.8 ? 'Needs repair' : 'Working',
      ok: state.recyclerEfficiency >= 0.8,
    },
    m4: {
      label: 'Greenhouse',
      stateText: state.greenhouseFrost ? 'Cold & frosty' : 'Warm & growing',
      ok: !state.greenhouseFrost,
    },
    m5: {
      label: 'Space Weather',
      stateText: 'Storm warning — shelter ready',
      ok: false,
    },
  };

  const stationStatus = juniorStatusSummary[mission.id];

  return (
    <AnimatePresence>
      <div
        className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-gradient-to-t from-[#040B16]/82 via-[#040B16]/35 to-transparent p-2.5 sm:p-4 overflow-y-auto"
        onClick={state.phase === 'active-mission' ? onClose : undefined}
      >
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="cmd-panel-title"
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="my-auto sm:my-0 w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border border-[#E85D04]/60 bg-[#071324]/96 text-[#F8F9FA] shadow-[0_0_38px_rgba(232,93,4,0.28)] font-[family-name:var(--font-game)]"
        >
          {/* Warm Rim Accent */}
          <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#E85D04] via-[#FFB703] to-[#22C55E]" />

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tabular-nums">
                <span className="text-[#FFB703]">Sol {state.sol}</span>
                <span className="text-white/25" aria-hidden="true">
                  ·
                </span>
                <span className="text-[#38BDF8]">{mission.zoneLabel}</span>
                <span className="text-white/25" aria-hidden="true">
                  ·
                </span>
                <span className="text-[#F8F9FA]/80">{juniorMission.simpleSubtitle}</span>
              </div>
              <h2
                id="cmd-panel-title"
                className="mt-0.5 truncate font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight text-[#F8F9FA] sm:text-xl"
              >
                {isRoutine
                  ? `Next Days on Mars · Sol ${state.lastRoutineSummary!.fromSol} → Sol ${state.lastRoutineSummary!.toSol}`
                  : mission.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {state.phase === 'active-mission' && (
                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#0D213B] p-1">
                  <button
                    type="button"
                    onClick={() => handleOpenTab('look')}
                    className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-extrabold transition-colors cursor-pointer ${
                      activeTab === 'look'
                        ? 'bg-[#FFB703] text-[#071324]'
                        : 'text-[#F8F9FA]/85 hover:text-[#FFB703]'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>1. Look</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenTab('activity')}
                    className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-extrabold transition-colors cursor-pointer ${
                      activeTab === 'activity'
                        ? 'bg-[#38BDF8] text-[#071324]'
                        : 'text-[#F8F9FA]/85 hover:text-[#38BDF8]'
                    }`}
                  >
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>2. Activity</span>
                    {activityDone && <CheckCircle2 className="h-3 w-3 text-[#22C55E]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenTab('quiz')}
                    className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-extrabold transition-colors cursor-pointer ${
                      activeTab === 'quiz'
                        ? 'bg-[#22C55E] text-[#071324]'
                        : 'text-[#F8F9FA]/85 hover:text-[#22C55E]'
                    }`}
                  >
                    <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>3. Quiz</span>
                    {quizDone && <CheckCircle2 className="h-3 w-3 text-[#22C55E]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenTab('compare')}
                    className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-extrabold transition-colors cursor-pointer ${
                      activeTab === 'compare'
                        ? 'bg-[#E85D04] text-[#F8F9FA]'
                        : 'text-[#F8F9FA]/85 hover:text-[#FFB703]'
                    }`}
                  >
                    <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>4. Decide</span>
                  </button>
                </div>
              )}

              {state.phase === 'active-mission' && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close command deck"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E85D04]/45 bg-[#0E2038] text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">
            {/* ================================================================
                VIEW 1: ACTIVE MISSION (1. LOOK | 2. ACTIVITY | 3. QUIZ | 4. DECIDE)
                ================================================================ */}
            {state.phase === 'active-mission' && (
              <>
                {activeTab === 'look' && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="space-y-3 lg:col-span-7">
                      <p className="text-base font-bold leading-relaxed text-[#F8F9FA]">
                        {juniorMission.storyKid}
                      </p>

                      {/* Simple Station Status + Learning Goal */}
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/15 bg-[#0D213B]/80 p-3">
                          <p className="text-[11px] font-bold text-[#38BDF8]">Station Check</p>
                          <p className="mt-1 text-sm font-extrabold text-[#F8F9FA]">
                            {stationStatus.label}:{' '}
                            <span
                              className={
                                stationStatus.ok ? 'text-[#22C55E]' : 'text-[#FFB703]'
                              }
                            >
                              {stationStatus.stateText}
                            </span>
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#22C55E]/35 bg-[#0D213B]/80 p-3">
                          <p className="text-[11px] font-bold text-[#22C55E]">What We Learn</p>
                          <p className="mt-1 text-xs font-semibold leading-snug text-[#F8F9FA]/90">
                            {juniorMission.learnGoal}
                          </p>
                        </div>
                      </div>

                      {/* Optional Grown-Up Science Data Drawer */}
                      {onToggleGrownUpScience && (
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              onToggleGrownUpScience();
                            }}
                            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-white/15 bg-[#1B3A5F]/55 px-3 text-xs font-bold text-[#38BDF8] hover:border-[#38BDF8] cursor-pointer"
                          >
                            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {state.grownUpScienceOpen
                                ? 'Hide Grown-up Science'
                                : 'Grown-up Science Details'}
                            </span>
                            {state.grownUpScienceOpen ? (
                              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </button>

                          {state.grownUpScienceOpen && (
                            <div className="mt-2.5 space-y-2 rounded-xl border border-[#38BDF8]/35 bg-[#0D213B]/80 p-3 text-xs">
                              <div className="space-y-1.5">
                                {mission.sensorReadings.map((item) => (
                                  <div
                                    key={item.label}
                                    className="flex items-center justify-between gap-2 rounded-lg bg-[#071324]/85 px-2.5 py-1.5"
                                  >
                                    <span className="font-semibold text-[#F8F9FA]/85">
                                      {item.label}
                                    </span>
                                    <div className="flex items-center gap-1.5 tabular-nums">
                                      <span className="font-extrabold text-[#F8F9FA]">
                                        {item.value}
                                      </span>
                                      <ProvenanceTagText tag={item.tag} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="leading-relaxed text-[#F8F9FA]/90">
                                <strong className="text-[#38BDF8]">Detailed Note: </strong>
                                {mission.scienceReason}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 lg:col-span-5">
                      {/* Earth Radio Control Card */}
                      <div className="rounded-xl border border-white/12 bg-[#0D213B]/75 p-3">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-[#FFB703]">
                            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                            Earth Control Radio
                          </span>
                          <span className="text-[11px] font-bold text-[#F8F9FA]/75 tabular-nums">
                            {mission.mcDelayMinutes} min travel time
                          </span>
                        </div>

                        {!state.mcReplyArrived && mcSecondsLeft === null && (
                          <div className="mt-2">
                            <p className="text-xs text-[#F8F9FA]/85">
                              Radio waves take time to cross space! Ask Earth for a helpful tip.
                            </p>
                            <button
                              type="button"
                              onClick={handleAskMc}
                              className="mt-2 inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border border-[#FFB703]/60 bg-[#071324] px-3 text-xs font-bold text-[#FFB703] hover:bg-[#FFB703] hover:text-[#071324] cursor-pointer"
                            >
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Ask Earth ({mission.mcDelayMinutes}s wait)</span>
                            </button>
                          </div>
                        )}

                        {mcSecondsLeft !== null && mcSecondsLeft > 0 && (
                          <div className="mt-2 rounded-lg bg-[#071324]/85 p-2.5 text-xs">
                            <p className="font-bold text-[#FFB703] tabular-nums">
                              Radio signal traveling… {mcSecondsLeft}s left
                            </p>
                          </div>
                        )}

                        {state.mcReplyArrived && (
                          <div className="mt-2 rounded-lg border border-[#22C55E]/40 bg-[#071324]/90 p-2.5 text-xs leading-relaxed text-[#F8F9FA]">
                            {mission.mcAdvice}
                          </div>
                        )}
                      </div>

                      {mission.id === 'm2' && state.grownUpScienceOpen && (
                        <div className="rounded-xl border border-[#FFB703]/35 bg-[#0D213B]/75 p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 font-bold text-[#FFB703]">
                              <CloudSun className="h-4 w-4" aria-hidden="true" />
                              ARCHIVED Mars Weather
                            </span>
                            <span className="text-[10px] font-bold text-[#38BDF8]">
                              {meda.earthDate}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] tabular-nums">
                            <div className="rounded bg-[#071324]/80 px-2 py-1">
                              Temp: <strong>{meda.airTempMinC} to {meda.airTempMaxC}°C</strong>
                            </div>
                            <div className="rounded bg-[#071324]/80 px-2 py-1">
                              Dust Tau: <strong>{meda.dustTau}</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMedaIndex((i) => (i + 1) % ARCHIVED_MEDA_SOLS.length)}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#FFB703] hover:underline cursor-pointer"
                          >
                            <Wind className="h-3 w-3" aria-hidden="true" />
                            <span>Switch Clear vs Dusty Sol</span>
                          </button>
                        </div>
                      )}

                      {mission.id === 'm5' && (
                        <div className="rounded-xl border border-[#E85D04]/60 bg-[#0D213B]/80 p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 font-bold text-[#FFB703]">
                              <Sun className="h-4 w-4" aria-hidden="true" />
                              Space-Weather Warning
                            </span>
                            <span className="text-[10px] font-extrabold text-[#22C55E]">
                              {state.donki.status} · {state.donki.dateLabel}
                            </span>
                          </div>
                          <p className="mt-1 font-extrabold text-[#F8F9FA]">
                            Fast energy particles heading toward Mars — model forecast.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenTab('activity')}
                          className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#22C55E] px-4 text-sm font-extrabold text-[#071324] shadow-lg hover:brightness-110 cursor-pointer"
                        >
                          <span>2. Start {juniorMission.miniActivity.title}</span>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenTab('compare')}
                          className="inline-flex min-h-[34px] w-full items-center justify-center gap-1 rounded-lg border border-white/15 bg-[#0D213B] px-3 text-xs font-bold text-[#F8F9FA]/80 hover:border-[#FFB703] hover:text-[#FFB703] cursor-pointer"
                        >
                          <span>Skip straight to Decide</span>
                          <FastForward className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <MissionMiniActivities
                    missionId={mission.id}
                    roverName={state.roverName}
                    alreadyCompleted={activityDone}
                    onComplete={() => onCompleteMiniActivity?.(mission.id)}
                    onSkip={() => handleOpenTab('quiz')}
                    reducedMotion={reducedMotion}
                  />
                )}

                {activeTab === 'quiz' && (
                  <div className="space-y-3">
                    <JuniorQuizCard
                      inline
                      quiz={juniorMission.quiz}
                      roverName={state.roverName}
                      continueLabel="4. Choose Our Plan"
                      reducedMotion={reducedMotion}
                      onPassed={() => {
                        onCompleteQuiz?.(mission.id);
                        handleOpenTab('compare');
                      }}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenTab('compare')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#F8F9FA]/65 hover:text-[#FFB703] cursor-pointer"
                      >
                        <span>Skip Quiz to Decide</span>
                        <FastForward className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'compare' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div>
                          <p className="text-base font-extrabold text-[#FFB703] sm:text-lg">
                            Choose a safe plan, Commander!
                          </p>
                          <p className="text-xs text-[#F8F9FA]/80">
                            Both choices have pros and trade-offs — there is no free choice on Mars.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            if (juniorMission?.decisions?.length >= 2) {
                              narrativeVoice.speakMissionDecisions(
                                mission.id,
                                juniorMission.decisions[0].title,
                                juniorMission.decisions[1].title,
                              );
                            }
                          }}
                          title="Listen to choices"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#FFB703]/20 text-[#FFB703] hover:bg-[#FFB703] hover:text-[#071324] transition-colors cursor-pointer"
                        >
                          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#38BDF8]/35 bg-[#0D213B] px-3 py-1.5 text-xs font-bold text-[#38BDF8] tabular-nums">
                        Crew Ready: {state.crewSlotsRemaining}/4
                      </span>
                    </div>

                    {/* 2 Big Junior Explorer Choice Cards */}
                    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                      {juniorMission.decisions.map((jOpt) => {
                        const engineOpt = mission.options.find(
                          (o) => o.id === jOpt.engineOptionId,
                        );
                        const slotsCost = engineOpt?.crewSlotsCost ?? 0;
                        const notEnoughSlots = slotsCost > state.crewSlotsRemaining;

                        return (
                          <button
                            key={jOpt.engineOptionId}
                            type="button"
                            disabled={notEnoughSlots}
                            onMouseEnter={() => soundEngine.playHoverSound()}
                            onClick={() => {
                              soundEngine.playDecisionMade('safe');
                              narrativeVoice.speakDecisionResolution(mission.id);
                              onSelectOption(jOpt.engineOptionId);
                            }}
                            className="group flex flex-col justify-between rounded-2xl border-2 border-[#FFB703]/45 bg-[#0D213B]/85 p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#FFB703] hover:bg-[#132C4E] hover:shadow-[0_0_26px_rgba(255,183,3,0.24)] disabled:opacity-45 cursor-pointer active:scale-[0.99]"
                          >
                            <div>
                              <div className="flex items-start gap-3.5">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFB703] text-[#071324] shadow-md transition-transform group-hover:scale-105">
                                  <JuniorDecisionIcon icon={jOpt.icon} />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[11px] font-extrabold text-[#FFB703]">
                                    {jOpt.badgeLabel}
                                  </span>
                                  <h3 className="mt-0.5 text-base font-extrabold text-[#F8F9FA] leading-snug">
                                    {jOpt.title}
                                  </h3>
                                </div>
                              </div>

                              <p className="mt-3 text-sm font-semibold leading-snug text-[#F8F9FA]/92">
                                {jOpt.summary}
                              </p>

                              <div className="mt-3 rounded-xl border border-[#FFB703]/30 bg-[#071324]/80 px-3 py-2 text-xs font-bold text-[#FFB703]">
                                Trade-off: {jOpt.tradeOff}
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs font-extrabold text-[#22C55E]">
                              <span className="text-[#38BDF8]">
                                {slotsCost > 0 ? `Uses ${slotsCost} Crew Helper` : 'Instant Team Action'}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[#FFB703]">
                                {notEnoughSlots ? `Need ${slotsCost} Helpers` : 'Pick This Plan'}
                                {!notEnoughSlots && (
                                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                )}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Optional "More Choices" drawer preserving original A-D engine options */}
                    <div className="border-t border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setMoreChoicesOpen((v) => !v);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F8F9FA]/75 hover:text-[#FFB703] cursor-pointer"
                      >
                        <span>More choices (Advanced Engine Plans)</span>
                        {moreChoicesOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>

                      {moreChoicesOpen && (
                        <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                          {juniorMission.moreOptions.map((optId) => {
                            const opt = mission.options.find((o) => o.id === optId);
                            if (!opt) return null;
                            const notEnoughSlots = opt.crewSlotsCost > state.crewSlotsRemaining;
                            const affectedProfiles = CREW_PROFILES.filter((c) =>
                              opt.affectedCrew.includes(c.id),
                            );
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={notEnoughSlots}
                                onMouseEnter={() => soundEngine.playHoverSound()}
                                onClick={() => {
                                  soundEngine.playDecisionMade('safe');
                                  narrativeVoice.speakDecisionResolution(mission.id);
                                  onSelectOption(opt.id);
                                }}
                                className="flex flex-col justify-between rounded-xl border border-white/15 bg-[#0D213B]/65 p-3 text-left hover:border-[#38BDF8] hover:bg-[#132C4E] disabled:opacity-45 cursor-pointer transition-colors active:scale-[0.99]"
                              >
                                <div>
                                  <p className="text-xs font-extrabold text-[#F8F9FA]">
                                    <span className="text-[#38BDF8] mr-1">{opt.id}.</span>
                                    {opt.label}
                                  </p>
                                  <p className="mt-0.5 text-xs text-[#F8F9FA]/80">
                                    {opt.actionSummary}
                                  </p>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-[#FFB703]">
                                  <span>{opt.costSummary.join(' · ')}</span>
                                  <div className="flex items-center gap-1">
                                    {affectedProfiles.map((p) => (
                                      <span
                                        key={p.id}
                                        className="inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-black text-[#071324]"
                                        style={{ backgroundColor: p.avatarColor }}
                                      >
                                        {p.initials}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ================================================================
                VIEW 2: MISSION OUTCOME + SCIENCE CARD + BADGE
                ================================================================ */}
            {isReview && (
              <div className="space-y-4">
                <div
                  className={`rounded-2xl border p-4 ${
                    state.lastOutcome!.passedObjective
                      ? 'border-[#22C55E]/60 bg-[#0D213B]/85'
                      : 'border-[#FFB703]/60 bg-[#1F1711]/85'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#22C55E]">
                    <Bot className="h-5 w-5" aria-hidden="true" />
                    <span>
                      {state.lastOutcome!.passedObjective
                        ? `${state.roverName}: "Great plan, Commander! We helped our crew!"`
                        : `${state.roverName}: "Whew—that was tricky! Here is what happened:"`}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#F8F9FA]">
                    {state.lastOutcome!.immediateText}
                  </p>
                  {state.lastOutcome!.rippleTriggered && (
                    <p className="mt-2 rounded-lg border border-[#FFB703]/35 bg-[#071324]/80 px-3 py-1.5 text-xs font-bold text-[#FFB703]">
                      What happens next: {state.lastOutcome!.rippleTriggered}
                    </p>
                  )}
                </div>

                {/* Bonus M2 Post-Storm Solar Panel Cleaning */}
                {mission.id === 'm2' && !state.panelsCleanedBonus && !state.campaignFailedReason && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#22C55E]/55 bg-[#0E2923]/88 p-3.5">
                    <div className="text-xs">
                      <p className="font-extrabold text-[#22C55E]">
                        Bonus: Sky Is Clearing After the Storm!
                      </p>
                      <p className="mt-0.5 text-[#F8F9FA]/90">
                        Now is the safe time to brush settled dust off solar panels for +25% power!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onCleanPanelsBonus}
                      className="min-h-[38px] rounded-xl bg-[#22C55E] px-4 text-xs font-extrabold text-[#071324] hover:brightness-110 cursor-pointer whitespace-nowrap"
                    >
                      Clean Panels Now (+25%)
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  {/* Inline Science Card with Continue & Skip */}
                  <div className="lg:col-span-7">
                    {scienceCard && (
                      <ScienceCardModal
                        inline
                        card={scienceCard}
                        continueLabel={
                          state.campaignFailedReason || state.missionIndex >= 4
                            ? 'See Final Debrief →'
                            : 'Next Days on Mars →'
                        }
                        reducedMotion={reducedMotion}
                        onContinue={handleFinishScienceAndAdvance}
                        onSkip={handleFinishScienceAndAdvance}
                      />
                    )}
                  </div>

                  {/* Unlocked Badge Card */}
                  <div className="flex flex-col justify-between rounded-2xl border border-[#FFB703]/55 bg-gradient-to-b from-[#1B3A5F]/85 to-[#0D213B]/95 p-5 lg:col-span-5">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB703]/20 px-2.5 py-1 text-xs font-extrabold text-[#FFB703]">
                        <Award className="h-4 w-4" aria-hidden="true" />
                        <span>Badge Unlocked!</span>
                      </span>

                      <div className="mt-4 flex items-center gap-3.5">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFB703] to-[#E85D04] text-[#071324] shadow-[0_0_24px_rgba(255,183,3,0.35)]">
                          <BadgeIcon icon={juniorMission.badge.icon} />
                        </div>
                        <div>
                          <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[#F8F9FA]">
                            {juniorMission.badge.title}
                          </h3>
                          <p className="text-xs font-bold text-[#22C55E]">
                            Added to your Discovery Journal
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 rounded-xl border border-white/10 bg-[#071324]/75 p-3 text-xs leading-relaxed text-[#F8F9FA]/90">
                        <strong className="text-[#38BDF8]">Journal Fact: </strong>
                        {juniorMission.badge.journalFact}
                      </p>
                    </div>

                    <p className="mt-3 text-[11px] font-bold text-[#F8F9FA]/60">
                      {BADGE_DISCLAIMER}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================
                VIEW 3: ROUTINE SOLS SUMMARY
                ================================================================ */}
            {isRoutine && (
              <div className="space-y-4">
                <p className="text-sm text-[#F8F9FA]/90">
                  Over the next <strong>{state.lastRoutineSummary!.solsElapsed} Mars sols</strong>,
                  your 4 crew members used air, water, food, and power:
                </p>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                  {[
                    {
                      label: 'O₂ Air',
                      val: `${state.lastRoutineSummary!.o2Delta > 0 ? '+' : ''}${state.lastRoutineSummary!.o2Delta} kg`,
                    },
                    {
                      label: 'Water',
                      val: `${state.lastRoutineSummary!.waterDelta > 0 ? '+' : ''}${state.lastRoutineSummary!.waterDelta} kg`,
                    },
                    {
                      label: 'Food',
                      val: `${state.lastRoutineSummary!.foodDelta > 0 ? '+' : ''}${state.lastRoutineSummary!.foodDelta} kg`,
                    },
                    {
                      label: 'Power',
                      val: `${state.lastRoutineSummary!.batteryDelta > 0 ? '+' : ''}${state.lastRoutineSummary!.batteryDelta} kWh`,
                    },
                    {
                      label: 'Shelter Shield',
                      val: state.grownUpScienceOpen
                        ? `+${state.lastRoutineSummary!.radiationDelta} mSv [SIM]`
                        : 'Crew Protected',
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-white/12 bg-[#0D213B]/75 p-3 text-center"
                    >
                      <p className="text-[11px] font-bold text-[#FFB703]">{stat.label}</p>
                      <p className="mt-0.5 text-sm font-extrabold tabular-nums">{stat.val}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/12 bg-[#0D213B]/60 p-3 text-xs space-y-1.5">
                  {state.lastRoutineSummary!.notes.map((n) => (
                    <p key={n} className="flex items-start gap-2 text-[#F8F9FA]/90">
                      <ShieldAlert
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB703]"
                        aria-hidden="true"
                      />
                      <span>{n}</span>
                    </p>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onProceedNextCriticalSol}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-5 text-sm font-extrabold text-[#071324] shadow-lg hover:brightness-110 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span>Go to Sol {state.lastRoutineSummary!.toSol}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </AnimatePresence>
  );
}
