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
  Lock,
  Users,
  Bell,
} from 'lucide-react';
import { CREW_PROFILES, ProvenanceTag } from '../sim/constants';
import { MissionDefinition, OptionId } from '../sim/missionsData';
import { ARCHIVED_MEDA_SOLS } from '../sim/nasaData';
import {
  BADGE_DISCLAIMER,
  formatWithRoverName,
  JUNIOR_MISSIONS,
  JUNIOR_SCIENCE_CARDS,
  JuniorDecisionOption,
  M5_SHELTER_SEQUENCE,
  STORY_POSTCARDS,
} from '../sim/storyBeats';
import { MissionId } from '../sim/roverData';
import { CampaignState } from '../sim/simEngine';
import { MissionMiniActivity } from './MissionMiniActivities';
import { JuniorQuizCard } from './JuniorQuizCard';
import { ScienceCardModal } from './ScienceCardModal';
import { soundEngine } from '../utils/soundEngine';
import { narrativeVoice } from '../utils/narrativeVoice';
import { celebrate, CelebrationMissionId } from '../utils/celebration';

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

type MissionStepTab = 'look' | 'activity' | 'quiz' | 'compare' | 'action';

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
  const [pendingOptionId, setPendingOptionId] = useState<OptionId | null>(null);
  const [sentRoverInStorm, setSentRoverInStorm] = useState(false);

  // M1.6 Action state (Hold E to turn red wheel on Valve 2)
  const [m1ValveProgress, setM1ValveProgress] = useState(0);
  const [m1HoldingValve, setM1HoldingValve] = useState(false);

  // M5 Shelter Bell timer (~180 s, calm pulse, no strobe, pauses during every card: quiz, compare, review)
  const [m5BellSeconds, setM5BellSeconds] = useState<number>(
    M5_SHELTER_SEQUENCE.shelterBellSeconds,
  );
  // M5.6–M5.8 Action -> Wait -> All Clear state
  const [m5CrewInsideCount, setM5CrewInsideCount] = useState(1);
  const [m5HatchProgress, setM5HatchProgress] = useState(0);
  const [m5HoldingHatch, setM5HoldingHatch] = useState(false);
  const [m5DoseStage, setM5DoseStage] = useState<'idle' | 'rising' | 'falling' | 'all-clear'>('idle');

  const badgeChimePlayedRef = useRef<string | null>(null);
  const badgeIconRef = useRef<HTMLDivElement | null>(null);

  const displayRover = state.roverName.trim() || 'Rusty';
  const juniorMission = JUNIOR_MISSIONS[mission.id];
  const scienceCard = JUNIOR_SCIENCE_CARDS[juniorMission.scienceCardId];
  const activityDone = Boolean(state.missionMiniActivityDone[mission.id]);
  const quizDone = Boolean(state.missionQuizDone[mission.id]);

  // Sync roverName in narrativeVoice
  useEffect(() => {
    narrativeVoice.setRoverName(displayRover);
  }, [displayRover]);

  useEffect(() => {
    if (open) {
      const gatedTab: MissionStepTab =
        initialTab === 'compare' && !activityDone
          ? 'activity'
          : initialTab === 'compare' && !quizDone
            ? 'quiz'
            : initialTab;
      setActiveTab(gatedTab);
      setMoreChoicesOpen(false);
      setPendingOptionId(null);
      setSentRoverInStorm(false);
      setM1ValveProgress(0);
      setM1HoldingValve(false);
      setM5CrewInsideCount(1);
      setM5HatchProgress(0);
      setM5HoldingHatch(false);
      setM5DoseStage('idle');
      if (gatedTab === 'look' && state.phase === 'active-mission') {
        onMarkInspected();
      }
    }
  }, [open, initialTab, mission.id]);

  // Reset M5 Shelter Bell timer when M5 starts
  useEffect(() => {
    if (mission.id === 'm5') {
      setM5BellSeconds(M5_SHELTER_SEQUENCE.shelterBellSeconds);
    }
  }, [mission.id]);

  // M5 Shelter Bell ~180 s countdown (pauses during Quiz, Decision, and Science Card/Review per Bible M5.2/M5.4/M5.5)
  const m5TimerPaused =
    mission.id !== 'm5' ||
    state.phase !== 'active-mission' ||
    activeTab === 'quiz' ||
    activeTab === 'compare';

  useEffect(() => {
    if (m5TimerPaused) return;
    const interval = window.setInterval(() => {
      setM5BellSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [m5TimerPaused]);

  // Hold E or hold button to close Valve 2 in M1.6 Action
  useEffect(() => {
    if (activeTab !== 'action' || mission.id !== 'm1' || pendingOptionId !== 'A') return;
    if (!m1HoldingValve || m1ValveProgress >= 100) return;
    const tid = window.setInterval(() => {
      setM1ValveProgress((prev) => {
        const next = Math.min(100, prev + 20);
        if (next >= 100) {
          soundEngine.playSuccess();
          narrativeVoice.speakDecisionResolution('m1', 'a');
        } else {
          soundEngine.playClick();
        }
        return next;
      });
    }, 150);
    return () => window.clearInterval(tid);
  }, [activeTab, mission.id, pendingOptionId, m1HoldingValve, m1ValveProgress]);

  // Hold E or hold button to seal the hatch in M5.6 Action
  useEffect(() => {
    if (activeTab !== 'action' || mission.id !== 'm5' || m5CrewInsideCount < 4) return;
    if (!m5HoldingHatch || m5HatchProgress >= 100) return;
    const tid = window.setInterval(() => {
      setM5HatchProgress((prev) => {
        const next = Math.min(100, prev + 25);
        if (next >= 100) {
          soundEngine.playAirlockCycle();
          soundEngine.playSuccess();
          setM5DoseStage('rising');
        } else {
          soundEngine.playClick();
        }
        return next;
      });
    }, 160);
    return () => window.clearInterval(tid);
  }, [activeTab, mission.id, m5CrewInsideCount, m5HoldingHatch, m5HatchProgress]);

  // M5.7 The Wait (dose bar rises then falls, no numbers) -> M5.8 All Clear
  useEffect(() => {
    if (m5DoseStage === 'rising') {
      narrativeVoice.speakAs(
        'amara',
        M5_SHELTER_SEQUENCE.waitAmaraLine.text,
        'm5-wait-amara',
        500,
        undefined,
        true,
      );
      const t1 = window.setTimeout(() => {
        setM5DoseStage('falling');
      }, 1400);
      return () => window.clearTimeout(t1);
    }
    if (m5DoseStage === 'falling') {
      const t2 = window.setTimeout(() => {
        setM5DoseStage('all-clear');
        soundEngine.playBadgeUnlock();
        narrativeVoice.speakAs(
          'hab',
          M5_SHELTER_SEQUENCE.allClearHabLine.text,
          'm5-all-clear-hab',
          500,
          () => {
            narrativeVoice.speakAs(
              'rusty',
              M5_SHELTER_SEQUENCE.allClearRustyLine.text,
              'm5-all-clear-rusty',
              500,
              undefined,
              true,
            );
          },
          true,
        );
      }, 1400);
      return () => window.clearTimeout(t2);
    }
  }, [m5DoseStage]);

  // Keyboard KeyE support for M1 Valve 2 wheel and M5 Hatch seal
  useEffect(() => {
    if (!open || activeTab !== 'action') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') {
        if (mission.id === 'm1' && pendingOptionId === 'A') {
          setM1HoldingValve(true);
        } else if (mission.id === 'm5') {
          if (m5CrewInsideCount < 4) {
            setM5CrewInsideCount((c) => Math.min(4, c + 1));
            soundEngine.playRoverBeep('ok');
          } else {
            setM5HoldingHatch(true);
          }
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') {
        setM1HoldingValve(false);
        setM5HoldingHatch(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [open, activeTab, mission.id, pendingOptionId, m5CrewInsideCount]);

  // Play celebratory chime + Mars confetti burst when mission review opens for the first time on a mission
  useEffect(() => {
    if (!open || state.phase !== 'mission-review') {
      badgeChimePlayedRef.current = null;
      return;
    }
    if (
      state.lastOutcome &&
      badgeChimePlayedRef.current !== `${mission.id}-${state.sol}`
    ) {
      badgeChimePlayedRef.current = `${mission.id}-${state.sol}`;
      soundEngine.playBadgeUnlock();

      const rawId = Number(mission.id.replace('m', ''));
      const missionNum: CelebrationMissionId =
        rawId >= 1 && rawId <= 5 ? (rawId as CelebrationMissionId) : 1;

      const rafId = window.requestAnimationFrame(() => {
        const rect = badgeIconRef.current?.getBoundingClientRect();
        const origin =
          rect && rect.width > 0
            ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
            : undefined;
        celebrate({
          kind: 'mission',
          missionId: missionNum,
          origin,
          reducedMotion,
        });
      });

      return () => window.cancelAnimationFrame(rafId);
    }
  }, [open, state.phase, state.lastOutcome, mission.id, state.sol, reducedMotion]);

  // Read mission decisions aloud when opening the compare choices tab
  useEffect(() => {
    if (open && activeTab === 'compare' && juniorMission?.decisions?.length >= 2) {
      narrativeVoice.speakMissionDecisions(
        mission.id,
        juniorMission.decisions[0].title,
        juniorMission.decisions[1].title,
      );
    }
  }, [open, activeTab, mission.id, juniorMission.decisions]);

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

  const handleChooseDecision = (optId: OptionId, fromStormRoverChoice = false) => {
    soundEngine.playDecisionMade('safe');
    setPendingOptionId(optId);
    setSentRoverInStorm(fromStormRoverChoice);
    if (fromStormRoverChoice && juniorMission.rustyOffer) {
      narrativeVoice.speakAs(
        'rusty',
        juniorMission.rustyOffer.chosenBraveLine,
        'm2-rover-brave',
        500,
        () => {
          narrativeVoice.speakAs(
            'rusty',
            juniorMission.rustyOffer!.stuckLine,
            'm2-rover-stuck',
            500,
            undefined,
            true,
          );
        },
        true,
      );
    } else if (mission.id === 'm2' && juniorMission.rustyOffer) {
      narrativeVoice.speakAs(
        'rusty',
        juniorMission.rustyOffer.waitedSafeLine,
        'm2-rover-waited-safe',
        500,
        undefined,
        true,
      );
    }
    if (mission.id === 'm5') {
      // Trigger Lucía and {roverName} return call in M5.6 Action
      narrativeVoice.speakAs(
        'lucia',
        M5_SHELTER_SEQUENCE.luciaReturnLine.text,
        'm5-lucia-return',
        500,
        () => {
          narrativeVoice.speakAs(
            'rusty',
            M5_SHELTER_SEQUENCE.rustyReturnLine.text,
            'm5-rusty-return',
            500,
            undefined,
            true,
          );
        },
        true,
      );
    }
    setActiveTab('action');
  };

  const handleCommitActionToResult = () => {
    const chosenId = pendingOptionId ?? juniorMission.decisions[0].engineOptionId;
    const isPrimaryA = chosenId === juniorMission.decisions[0].engineOptionId;
    narrativeVoice.speakDecisionResolution(mission.id, isPrimaryA ? 'a' : 'b');
    onSelectOption(chosenId);
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
  const postcardGroupKey = juniorMission.postcardsRange
    ? `sol-${juniorMission.postcardsRange[0]}-${juniorMission.postcardsRange[1]}`
    : null;
  const interludePostcards = postcardGroupKey ? (STORY_POSTCARDS[postcardGroupKey] ?? []) : [];

  const chosenWasOptionA =
    state.lastOutcome?.optionId === juniorMission.decisions[0].engineOptionId;
  const bibleResultLine = chosenWasOptionA
    ? juniorMission.resultLines.optionA
    : juniorMission.resultLines.optionB;

  if (!open || state.phase === 'free-roam' || state.phase === 'debrief') {
    return null;
  }

  return (
    <AnimatePresence>
      <div
        aria-hidden="true"
        className="pointer-events-auto fixed inset-0 z-30 bg-gradient-to-t from-[#040B16]/82 via-[#040B16]/35 to-transparent"
        onClick={state.phase === 'active-mission' ? onClose : undefined}
      />
      <div
        className="pointer-events-none fixed inset-0 z-40 flex items-end justify-center p-2.5 sm:p-4 overflow-y-auto"
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
          className="pointer-events-auto my-auto sm:my-0 w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border border-[#E85D04]/60 bg-[#071324]/96 text-[#F8F9FA] shadow-[0_0_38px_rgba(232,93,4,0.28)] font-[family-name:var(--font-game)]"
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
                  ? `Postcards · Sol ${state.lastRoutineSummary!.fromSol} → Sol ${state.lastRoutineSummary!.toSol}`
                  : mission.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* M5 Shelter Bell Timer (~180 s, calm pulse, no strobe, pauses on every card) */}
              {mission.id === 'm5' && state.phase === 'active-mission' && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-[#FFB703]/45 bg-[#0D213B] px-3 py-1.5 text-xs font-extrabold text-[#FFB703]">
                  <Bell className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
                  <span>
                    Shelter Bell: {Math.floor(m5BellSeconds / 60)}:
                    {String(m5BellSeconds % 60).padStart(2, '0')}
                  </span>
                  {m5TimerPaused && (
                    <span className="rounded bg-[#22C55E]/20 px-1.5 py-0.5 text-[10px] text-[#22C55E]">
                      PAUSED
                    </span>
                  )}
                </div>
              )}

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
                    disabled={!activityDone}
                    title={!activityDone ? 'Complete 2. Activity first' : undefined}
                    onClick={() => activityDone && handleOpenTab('quiz')}
                    className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-extrabold transition-colors ${
                      !activityDone
                        ? 'opacity-45 cursor-not-allowed text-[#F8F9FA]/45'
                        : activeTab === 'quiz'
                          ? 'bg-[#22C55E] text-[#071324] cursor-pointer'
                          : 'text-[#F8F9FA]/85 hover:text-[#22C55E] cursor-pointer'
                    }`}
                  >
                    <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>3. Quiz</span>
                    {quizDone && <CheckCircle2 className="h-3 w-3 text-[#22C55E]" />}
                  </button>
                  <button
                    type="button"
                    disabled={!activityDone || !quizDone}
                    title={!activityDone || !quizDone ? 'Complete 2. Activity and 3. Quiz first' : undefined}
                    onClick={() => activityDone && quizDone && handleOpenTab('compare')}
                    className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-extrabold transition-colors ${
                      !activityDone || !quizDone
                        ? 'opacity-45 cursor-not-allowed text-[#F8F9FA]/45'
                        : activeTab === 'compare'
                          ? 'bg-[#E85D04] text-[#F8F9FA] cursor-pointer'
                          : 'text-[#F8F9FA]/85 hover:text-[#FFB703] cursor-pointer'
                    }`}
                  >
                    <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>4. Decision</span>
                  </button>
                  {pendingOptionId && (
                    <button
                      type="button"
                      onClick={() => handleOpenTab('action')}
                      className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-extrabold transition-colors cursor-pointer ${
                        activeTab === 'action'
                          ? 'bg-[#22C55E] text-[#071324]'
                          : 'text-[#F8F9FA]/85 hover:text-[#22C55E]'
                      }`}
                    >
                      <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>5. Action</span>
                    </button>
                  )}
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
                VIEW 1: ACTIVE MISSION (Quiet Signal + Look -> Activity -> Quiz -> Decision -> Action)
                ================================================================ */}
            {state.phase === 'active-mission' && (
              <>
                {activeTab === 'look' && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="space-y-3 lg:col-span-7">
                      {/* Phase 1: Quiet Signal Speaker Ladder (Hab Computer -> Specialist by Radio -> {roverName}) */}
                      <div className="rounded-xl border border-[#FFB703]/40 bg-[#0D213B]/90 p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FFB703]">
                            Quiet Signal · Speaker Ladder (1 Voice at a Time)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick();
                              narrativeVoice.speakMissionIncident(mission.id);
                            }}
                            className="inline-flex cursor-pointer items-center gap-1 rounded bg-[#FFB703]/20 px-2 py-0.5 text-[10px] font-bold text-[#FFB703] hover:bg-[#FFB703] hover:text-[#071324]"
                          >
                            <Volume2 className="h-3 w-3" aria-hidden="true" />
                            <span>Replay Ladder</span>
                          </button>
                        </div>
                        {juniorMission.quietSignal.map((lineItem, idx) => (
                          <p key={idx} className="text-xs leading-snug text-[#F8F9FA]/95">
                            <strong
                              className={
                                lineItem.speaker === 'hab'
                                  ? 'text-[#FFB703]'
                                  : lineItem.speaker === 'rusty'
                                    ? 'text-[#22C55E]'
                                    : 'text-[#38BDF8]'
                              }
                            >
                              {formatWithRoverName(lineItem.speakerName, displayRover)}
                              {lineItem.channel === 'radio' ? ' (radio)' : ''}:{' '}
                            </strong>
                            &ldquo;{formatWithRoverName(lineItem.text, displayRover)}&rdquo;
                          </p>
                        ))}
                      </div>

                      {/* Phase 2: Look */}
                      <div className="rounded-xl border border-[#38BDF8]/40 bg-[#071324]/85 p-3.5">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#38BDF8]">
                          Look · Station Observation
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#F8F9FA]">
                          {formatWithRoverName(juniorMission.lookLine.speakerName, displayRover)}:{' '}
                          &ldquo;{formatWithRoverName(juniorMission.lookLine.text, displayRover)}&rdquo;
                        </p>
                      </div>

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
                                ? 'Hide Grown-up Note'
                                : 'Grown-up Note (Numbers & Sources)'}
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
                                <strong className="text-[#38BDF8]">Grown-up Note: </strong>
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
                        <div className="rounded-xl border border-[#FFB703]/45 bg-[#0D213B]/80 p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 font-bold text-[#FFB703]">
                              <Sun className="h-4 w-4" aria-hidden="true" />
                              Space-Weather Watch (Calm Pulse)
                            </span>
                            <span className="text-[10px] font-extrabold text-[#22C55E]">
                              {state.donki.status} · {state.donki.dateLabel}
                            </span>
                          </div>
                          <p className="mt-1 font-extrabold text-[#F8F9FA]">
                            Watch. The space weather team reports a solar storm. Water walls help block space radiation.
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
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <MissionMiniActivity
                    missionId={mission.id}
                    roverName={displayRover}
                    onComplete={() => {
                      onCompleteMiniActivity?.(mission.id);
                      handleOpenTab('quiz');
                    }}
                  />
                )}

                {activeTab === 'quiz' && (
                  <div className="space-y-3">
                    <JuniorQuizCard
                      inline
                      quiz={juniorMission.quiz}
                      roverName={displayRover}
                      continueLabel="4. Continue to Decision →"
                      reducedMotion={reducedMotion}
                      onPassed={() => {
                        onCompleteQuiz?.(mission.id);
                        handleOpenTab('compare');
                      }}
                    />
                  </div>
                )}

                {activeTab === 'compare' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div>
                          <p className="text-base font-extrabold text-[#FFB703] sm:text-lg">
                            Decision · Choose a Plan, Commander!
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

                    {/* Mission 2 Emotional Beat — {roverName}'s Offer (Bible M2.5) */}
                    {mission.id === 'm2' && juniorMission.rustyOffer && (
                      <div className="rounded-xl border border-[#FFB703]/45 bg-[#0D213B]/90 p-3.5 text-xs space-y-1.5">
                        <p className="font-extrabold text-[#FFB703]">
                          <Bot className="inline h-3.5 w-3.5 mr-1 text-[#22C55E]" aria-hidden="true" />
                          {displayRover}: &ldquo;{juniorMission.rustyOffer.rustyLine}&rdquo;
                        </p>
                        <p className="font-bold text-[#38BDF8]">
                          {juniorMission.rustyOffer.specialistName}: &ldquo;
                          {juniorMission.rustyOffer.specialistLine}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* 2 Primary Bible Decision Cards */}
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
                            onClick={() => handleChooseDecision(jOpt.engineOptionId, false)}
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
                                {slotsCost > 0 ? `Uses ${slotsCost} Crew Helper` : 'Team Action'}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[#FFB703]">
                                {notEnoughSlots ? `Need ${slotsCost} Helpers` : 'Pick This Plan →'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* "More choices" drawer (includes Bible M2.6 "Send {roverName} to clean now") */}
                    <div className="border-t border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setMoreChoicesOpen((v) => !v);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F8F9FA]/75 hover:text-[#FFB703] cursor-pointer"
                      >
                        <span>More choices</span>
                        {moreChoicesOpen ? (
                          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>

                      {moreChoicesOpen && (
                        <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                          {/* Explicit Bible M2.6 More Choice: "Send {roverName} to clean now" */}
                          {mission.id === 'm2' && juniorMission.rustyOffer && (
                            <button
                              type="button"
                              onMouseEnter={() => soundEngine.playHoverSound()}
                              onClick={() => handleChooseDecision('C', true)}
                              className="flex flex-col justify-between rounded-xl border border-[#FFB703]/55 bg-[#1F1711]/90 p-3.5 text-left hover:border-[#FFB703] cursor-pointer transition-colors"
                            >
                              <div>
                                <p className="text-xs font-extrabold text-[#FFB703]">
                                  {formatWithRoverName(
                                    juniorMission.rustyOffer.moreChoiceLabel,
                                    displayRover,
                                  )}
                                </p>
                                <p className="mt-1 text-xs text-[#F8F9FA]/90">
                                  {displayRover}: &ldquo;{juniorMission.rustyOffer.chosenBraveLine}&rdquo;
                                </p>
                                <p className="mt-1 text-[11px] text-[#FFB703]/90">
                                  Risk in wild wind: &ldquo;{juniorMission.rustyOffer.stuckLine}&rdquo;
                                </p>
                              </div>
                            </button>
                          )}

                          {juniorMission.moreOptions
                            .filter((optId) => !(mission.id === 'm2' && optId === 'C'))
                            .map((optId) => {
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
                                  onClick={() => handleChooseDecision(opt.id, false)}
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

                {/* ================================================================
                    PHASE 6: ACTION (M1.6 Valve 2 / Backup Room, M2.6 Rover Outcome, M5.6–M5.8 Shelter Counter, Hatch Seal, Dose Bar & All Clear)
                    ================================================================ */}
                {activeTab === 'action' && (
                  <div className="space-y-4 rounded-2xl border border-[#22C55E]/50 bg-[#0D213B]/90 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#22C55E]">
                        Phase 6 · Mission Action
                      </span>
                      <span className="text-xs font-bold text-[#FFB703]">
                        Plan Selected: Option {pendingOptionId ?? 'A'}
                      </span>
                    </div>

                    {/* M1.6 Action: Option A (Hold E to turn red wheel on Valve 2) vs Option B (Crew walk to backup room) */}
                    {mission.id === 'm1' && (
                      <div className="space-y-3 rounded-xl border border-white/15 bg-[#071324]/85 p-4">
                        {pendingOptionId === 'A' ? (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-extrabold text-[#F8F9FA]">
                                M1.6 Action · Turn the Big Red Wheel on Valve 2
                              </p>
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                                  m1ValveProgress >= 100
                                    ? 'bg-[#22C55E]/20 text-[#22C55E]'
                                    : 'bg-[#FFB703]/20 text-[#FFB703]'
                                }`}
                              >
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    m1ValveProgress >= 100
                                      ? 'bg-[#22C55E]'
                                      : 'animate-ping bg-[#FFB703]'
                                  }`}
                                />
                                {m1ValveProgress >= 100
                                  ? 'Green Light · Hiss Stopped!'
                                  : 'Amber Light · Whisper Hiss'}
                              </span>
                            </div>
                            <p className="text-xs text-[#F8F9FA]/85">
                              {juniorMission.actionSpec.optionAPrompt}
                            </p>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <button
                                type="button"
                                disabled={m1ValveProgress >= 100}
                                onMouseDown={() => setM1HoldingValve(true)}
                                onMouseUp={() => setM1HoldingValve(false)}
                                onMouseLeave={() => setM1HoldingValve(false)}
                                onTouchStart={() => setM1HoldingValve(true)}
                                onTouchEnd={() => setM1HoldingValve(false)}
                                onClick={() =>
                                  setM1ValveProgress((p) => {
                                    const next = Math.min(100, p + 50);
                                    if (next >= 100) soundEngine.playSuccess();
                                    return next;
                                  })
                                }
                                className={`min-h-[42px] cursor-pointer rounded-xl px-5 py-2 text-xs font-extrabold transition-all ${
                                  m1ValveProgress >= 100
                                    ? 'border border-[#22C55E] bg-[#22C55E]/20 text-[#22C55E]'
                                    : 'bg-gradient-to-r from-[#E85D04] to-[#FFB703] text-[#071324]'
                                }`}
                              >
                                {m1ValveProgress >= 100
                                  ? 'Valve 2 Closed ✓'
                                  : `Hold [E] — Turn Red Wheel (${m1ValveProgress}%)`}
                              </button>
                              <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#1B3A5F]">
                                <div
                                  className="h-full bg-gradient-to-r from-[#FFB703] to-[#22C55E] transition-all"
                                  style={{ width: `${m1ValveProgress}%` }}
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-extrabold text-[#FFB703]">
                              M1.6 Action · Crew Walk to the Backup Room
                            </p>
                            <p className="text-xs text-[#F8F9FA]/85">
                              {juniorMission.actionSpec.optionBPrompt}
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* M2.6 Action: {roverName} outcome lines */}
                    {mission.id === 'm2' && juniorMission.rustyOffer && (
                      <div className="space-y-2 rounded-xl border border-[#FFB703]/45 bg-[#071324]/85 p-4 text-xs">
                        {sentRoverInStorm ? (
                          <>
                            <p className="font-extrabold text-[#FFB703]">
                              {displayRover}: &ldquo;{juniorMission.rustyOffer.chosenBraveLine}&rdquo;
                            </p>
                            <p className="font-bold text-[#E85D04]">
                              {displayRover}: &ldquo;{juniorMission.rustyOffer.stuckLine}&rdquo;
                            </p>
                          </>
                        ) : (
                          <p className="font-extrabold text-[#22C55E]">
                            {displayRover}: &ldquo;{juniorMission.rustyOffer.waitedSafeLine}&rdquo;
                          </p>
                        )}
                      </div>
                    )}

                    {/* M3 & M4 Action */}
                    {(mission.id === 'm3' || mission.id === 'm4') && (
                      <div className="rounded-xl border border-white/15 bg-[#071324]/85 p-4 text-xs">
                        <p className="text-sm font-extrabold text-[#F8F9FA]">
                          {pendingOptionId === juniorMission.decisions[0].engineOptionId
                            ? juniorMission.actionSpec.optionAPrompt
                            : juniorMission.actionSpec.optionBPrompt}
                        </p>
                      </div>
                    )}

                    {/* M5.6 Action -> M5.7 The Wait -> M5.8 All Clear */}
                    {mission.id === 'm5' && (
                      <div className="space-y-3 rounded-xl border border-[#38BDF8]/45 bg-[#071324]/90 p-4">
                        {/* If Option B chosen, show Amara's If-B line immediately */}
                        {pendingOptionId === 'D' && (
                          <div className="rounded-xl border border-[#FFB703]/50 bg-[#1F1711]/90 p-3 text-xs font-bold text-[#FFB703]">
                            Amara: &ldquo;{juniorMission.resultLines.optionB.text}&rdquo;
                          </div>
                        )}

                        {/* Lucía and {roverName} return from the ice site */}
                        <div className="space-y-1 rounded-xl border border-[#38BDF8]/35 bg-[#0C4A6E]/30 p-3 text-xs">
                          <p className="font-extrabold text-[#38BDF8]">
                            Lucía (radio): &ldquo;{M5_SHELTER_SEQUENCE.luciaReturnLine.text}&rdquo;
                          </p>
                          <p className="font-bold text-[#22C55E]">
                            {displayRover}: &ldquo;{M5_SHELTER_SEQUENCE.rustyReturnLine.text}&rdquo;
                          </p>
                        </div>

                        {/* Live Crew Counter 1 of 4 ... 4 of 4 */}
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 bg-[#0D213B] p-3">
                          <div className="flex items-center gap-2 text-xs font-extrabold text-[#F8F9FA]">
                            <Users className="h-4 w-4 text-[#38BDF8]" aria-hidden="true" />
                            <span>Crew Inside Shelter: {m5CrewInsideCount} of 4</span>
                          </div>
                          <button
                            type="button"
                            disabled={m5CrewInsideCount >= 4}
                            onClick={() => {
                              soundEngine.playRoverBeep('ok');
                              setM5CrewInsideCount((c) => Math.min(4, c + 1));
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-extrabold cursor-pointer ${
                              m5CrewInsideCount >= 4
                                ? 'bg-[#22C55E]/20 text-[#22C55E]'
                                : 'bg-[#38BDF8] text-[#071324]'
                            }`}
                          >
                            {m5CrewInsideCount >= 4
                              ? '4 of 4 Crew Inside ✓'
                              : `Welcome Crew Inside (${m5CrewInsideCount}/4)`}
                          </button>
                        </div>

                        {/* Hold E to seal the hatch */}
                        <div
                          className={`rounded-xl border border-white/15 bg-[#0D213B] p-3 ${
                            m5CrewInsideCount < 4 ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#F8F9FA]">
                              <Lock className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
                              <span>Hold [E] to Seal the Shelter Hatch</span>
                            </span>
                            <button
                              type="button"
                              disabled={m5HatchProgress >= 100}
                              onMouseDown={() => setM5HoldingHatch(true)}
                              onMouseUp={() => setM5HoldingHatch(false)}
                              onMouseLeave={() => setM5HoldingHatch(false)}
                              onTouchStart={() => setM5HoldingHatch(true)}
                              onTouchEnd={() => setM5HoldingHatch(false)}
                              onClick={() =>
                                setM5HatchProgress((prev) => {
                                  const next = Math.min(100, prev + 50);
                                  if (next >= 100) {
                                    soundEngine.playAirlockCycle();
                                    soundEngine.playSuccess();
                                    setM5DoseStage('rising');
                                  }
                                  return next;
                                })
                              }
                              className={`rounded-lg px-4 py-1.5 text-xs font-extrabold cursor-pointer ${
                                m5HatchProgress >= 100
                                  ? 'bg-[#22C55E]/20 text-[#22C55E]'
                                  : 'bg-[#FFB703] text-[#071324]'
                              }`}
                            >
                              {m5HatchProgress >= 100 ? 'Hatch Sealed ✓' : 'Hold [E] to Seal Hatch'}
                            </button>
                          </div>
                          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#1B3A5F]">
                            <div
                              className="h-full bg-gradient-to-r from-[#FFB703] to-[#22C55E] transition-all"
                              style={{ width: `${m5HatchProgress}%` }}
                            />
                          </div>
                        </div>

                        {/* M5.7 The Wait (Dose bar with NO numbers rising then falling) & M5.8 All Clear */}
                        {m5HatchProgress >= 100 && (
                          <div className="space-y-2.5 rounded-xl border border-[#22C55E]/45 bg-[#0D213B] p-3.5 text-xs">
                            <p className="font-extrabold text-[#38BDF8]">
                              Amara: &ldquo;{M5_SHELTER_SEQUENCE.waitAmaraLine.text}&rdquo;
                            </p>
                            <div>
                              <div className="flex items-center justify-between text-[11px] font-bold text-[#F8F9FA]/85">
                                <span>Outside Storm Radiation Dose Bar</span>
                                <span className="text-[#22C55E]">
                                  {m5DoseStage === 'rising'
                                    ? 'Storm Passing Overhead...'
                                    : 'Returning to Calm'}
                                </span>
                              </div>
                              {/* Dose bar with NO numbers per Bible M5.7 */}
                              <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-[#1B3A5F]">
                                <div
                                  className={`h-full transition-all duration-700 ${
                                    m5DoseStage === 'rising'
                                      ? 'w-2/3 bg-gradient-to-r from-[#38BDF8] to-[#FFB703]'
                                      : 'w-1/6 bg-[#22C55E]'
                                  }`}
                                />
                              </div>
                            </div>

                            {m5DoseStage === 'all-clear' && (
                              <div className="space-y-1 rounded-lg border border-[#22C55E]/50 bg-[#071324]/90 p-2.5">
                                <p className="font-extrabold text-[#FFB703]">
                                  Hab Computer: &ldquo;{M5_SHELTER_SEQUENCE.allClearHabLine.text}&rdquo;
                                </p>
                                <p className="font-extrabold text-[#22C55E]">
                                  {displayRover}: &ldquo;{M5_SHELTER_SEQUENCE.allClearRustyLine.text}&rdquo;
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        disabled={
                          (mission.id === 'm1' &&
                            pendingOptionId === 'A' &&
                            m1ValveProgress < 100) ||
                          (mission.id === 'm5' && m5HatchProgress < 100)
                        }
                        onClick={handleCommitActionToResult}
                        className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] px-6 py-2 text-xs font-extrabold text-[#071324] shadow-xl disabled:opacity-45 hover:scale-[1.02] transition-transform"
                      >
                        <span>See Result, Science Card &amp; Badge →</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ================================================================
                VIEW 2: RESULT (Phase 7) + SCIENCE CARD & BADGE (Phase 8) + HOOK (Phase 9)
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
                  {/* Exact Bible Result Line */}
                  <p className="text-base font-extrabold text-[#22C55E]">
                    {formatWithRoverName(bibleResultLine.speakerName, displayRover)}: &ldquo;
                    {formatWithRoverName(bibleResultLine.text, displayRover)}&rdquo;
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#F8F9FA]">
                    {state.lastOutcome!.immediateText}
                  </p>
                  {state.lastOutcome!.rippleTriggered && (
                    <p className="mt-2 rounded-lg border border-[#FFB703]/35 bg-[#071324]/80 px-3 py-1.5 text-xs font-bold text-[#FFB703]">
                      What happens next: {state.lastOutcome!.rippleTriggered}
                    </p>
                  )}
                </div>

                {/* M5 Crew Shelter Counter 4 of 4 & All Clear (Bible M5.6–M5.8) */}
                {mission.id === 'm5' && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#38BDF8]/55 bg-[#0D213B]/90 p-3.5">
                    <div className="flex items-center gap-2.5 text-xs font-extrabold text-[#38BDF8]">
                      <ShieldCheck className="h-5 w-5 text-[#22C55E]" aria-hidden="true" />
                      <span>Water-Wall Storm Shelter · Crew Inside: 4 of 4 Safe</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {CREW_PROFILES.map((member) => (
                        <span
                          key={member.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#22C55E]/20 px-2 py-1 text-[10px] font-extrabold text-[#22C55E]"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {member.name.split(' ').pop()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phase 9: Story Bible Mission Hook */}
                {juniorMission.hook && (
                  <div className="rounded-xl border border-[#38BDF8]/40 bg-[#071324]/90 px-4 py-3 text-xs space-y-1">
                    <p className="font-extrabold text-[#FFB703]">
                      {formatWithRoverName(juniorMission.hook.speakerName, displayRover)} (
                      {juniorMission.hook.speakerRole}):{' '}
                      <span className="font-semibold italic text-[#F8F9FA]">
                        &ldquo;{formatWithRoverName(juniorMission.hook.text, displayRover)}&rdquo;
                      </span>
                    </p>
                    {juniorMission.hook.followUpRusty && (
                      <p className="font-bold text-[#22C55E]">
                        {displayRover}: &ldquo;
                        {formatWithRoverName(juniorMission.hook.followUpRusty, displayRover)}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Bonus M2 Post-Storm Solar Panel Cleaning */}
                {mission.id === 'm2' && !state.panelsCleanedBonus && !state.campaignFailedReason && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#22C55E]/55 bg-[#0E2923]/88 p-3.5">
                    <div className="text-xs">
                      <p className="font-extrabold text-[#22C55E]">
                        Sky Is Clearing After the Storm!
                      </p>
                      <p className="mt-0.5 text-[#F8F9FA]/90">
                        {displayRover}: &ldquo;Thank you for keeping me safe. I will polish the panels after the storm.&rdquo;
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onCleanPanelsBonus}
                      className="min-h-[38px] rounded-xl bg-[#22C55E] px-4 text-xs font-extrabold text-[#071324] hover:brightness-110 cursor-pointer whitespace-nowrap"
                    >
                      Polish Panels Now (+25%)
                    </button>
                  </div>
                )}

                {/* Phase 8: Science Card and Badge */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-7">
                    {scienceCard && (
                      <ScienceCardModal
                        inline
                        card={scienceCard}
                        continueLabel={
                          state.campaignFailedReason || state.missionIndex >= 4
                            ? 'See Final Debrief →'
                            : 'Next Sol Postcards →'
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
                        <div
                          ref={badgeIconRef}
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFB703] to-[#E85D04] text-[#071324] shadow-[0_0_24px_rgba(255,183,3,0.35)]"
                        >
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
                VIEW 3: ROUTINE SOLS POSTCARDS SUMMARY
                ================================================================ */}
            {isRoutine && (
              <div className="space-y-4">
                <p className="text-sm text-[#F8F9FA]/90">
                  Over the next <strong>{state.lastRoutineSummary!.solsElapsed} Mars sols</strong>,
                  your 4 crew members lived and worked at the outpost:
                </p>

                {/* Interlude Sol Postcards from storyBeats.ts */}
                {interludePostcards.length > 0 && (
                  <div className="rounded-xl border border-[#FFB703]/45 bg-[#071324]/90 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-extrabold text-[#FFB703]">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          Postcards · Sols {juniorMission.postcardsRange?.[0]}–
                          {juniorMission.postcardsRange?.[1]}
                        </span>
                      </span>
                      <span className="text-[11px] text-[#38BDF8]">Mission Diary</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {interludePostcards.map((pc) => (
                        <div
                          key={pc.title}
                          className="rounded-xl border border-white/10 bg-[#0D213B]/80 p-3"
                        >
                          <p className="text-[11px] font-black uppercase tracking-wider text-[#FFB703]">
                            {pc.title}
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-snug text-[#F8F9FA]">
                            &ldquo;{formatWithRoverName(pc.caption, displayRover)}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      onClose();
                    }}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#38BDF8]/50 bg-[#0D213B] px-4 text-xs font-extrabold text-[#38BDF8] hover:border-[#38BDF8] hover:bg-[#132C4E] cursor-pointer"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span>Explore Base First</span>
                  </button>

                  <button
                    type="button"
                    onClick={onProceedNextCriticalSol}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-5 text-sm font-extrabold text-[#071324] shadow-lg hover:brightness-110 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    <span>Continue to Sol {state.lastRoutineSummary!.toSol} →</span>
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
