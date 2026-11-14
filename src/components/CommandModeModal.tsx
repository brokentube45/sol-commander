import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Eye,
  Scale,
  Radio,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sun,
  ShieldAlert,
  CloudSun,
  Wind,
  Wrench,
  ShieldCheck,
  PauseCircle,
  OctagonAlert,
  BatteryCharging,
  PowerOff,
  Bot,
  Droplets,
  Flame,
  HardHat,
  Users,
} from 'lucide-react';
import { CREW_PROFILES, ProvenanceTag } from '../sim/constants';
import { MissionDefinition, OptionId } from '../sim/missionsData';
import { ARCHIVED_MEDA_SOLS } from '../sim/nasaData';
import { CampaignState } from '../sim/simEngine';

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
}

function ProvenanceTagText({ tag }: { tag: ProvenanceTag }) {
  if (tag === 'REAL') {
    return <span className="text-[10px] font-extrabold text-[#22C55E]">[REAL]</span>;
  }
  if (tag === 'DERIVED') {
    return <span className="text-[10px] font-extrabold text-[#38BDF8]">[DERIVED]</span>;
  }
  return <span className="text-[10px] font-extrabold text-[#FFB703]">[SIM]</span>;
}

function getOptionIcon(missionId: string, optionId: OptionId) {
  if (missionId === 'm1') {
    if (optionId === 'A') return Wrench;
    if (optionId === 'B') return ShieldCheck;
    if (optionId === 'C') return PauseCircle;
    return OctagonAlert;
  }
  if (missionId === 'm2') {
    if (optionId === 'A') return BatteryCharging;
    if (optionId === 'B') return PowerOff;
    if (optionId === 'C') return Bot;
    return OctagonAlert;
  }
  if (missionId === 'm3') {
    if (optionId === 'A') return Wrench;
    if (optionId === 'B') return Droplets;
    if (optionId === 'C') return Bot;
    return ShieldAlert;
  }
  if (missionId === 'm4') {
    if (optionId === 'A') return Wrench;
    if (optionId === 'B') return Flame;
    if (optionId === 'C') return ShieldCheck;
    return PowerOff;
  }
  // m5
  if (optionId === 'A') return ShieldCheck;
  if (optionId === 'B') return Bot;
  if (optionId === 'C') return Droplets;
  return HardHat;
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
}: CommandModeModalProps) {
  const [activeTab, setActiveTab] = useState<'look' | 'compare'>(initialTab);
  const [mcSecondsLeft, setMcSecondsLeft] = useState<number | null>(null);
  const [medaIndex, setMedaIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      if (initialTab === 'look' && state.phase === 'active-mission') {
        onMarkInspected();
      }
    }
  }, [open, initialTab, mission.id]);

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

  const handleOpenLook = () => {
    setActiveTab('look');
    onMarkInspected();
  };

  const handleAskMc = () => {
    if (state.mcReplyArrived || mcSecondsLeft !== null) return;
    onRequestMissionControl(false);
    setMcSecondsLeft(mission.mcDelayMinutes);
  };

  return (
    <AnimatePresence>
      <div
        className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-gradient-to-t from-[#040B16]/80 via-[#040B16]/30 to-transparent p-2.5 sm:p-4 overflow-y-auto"
        onClick={state.phase === 'active-mission' ? onClose : undefined}
      >
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-labelledby="cmd-panel-title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="my-auto sm:my-0 w-full max-w-5xl max-h-[86vh] flex flex-col overflow-hidden rounded-2xl border border-[#E85D04]/60 bg-[#071324]/94 text-[#F8F9FA] shadow-[0_0_38px_rgba(232,93,4,0.28)] font-[family-name:var(--font-game)]"
        >
          {/* Warm Orange Rim Line */}
          <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#E85D04] via-[#FFB703] to-[#22C55E]" />

          {/* Compact Header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tabular-nums">
                <span className="text-[#FFB703]">Sol {state.sol}</span>
                <span className="text-white/25" aria-hidden="true">·</span>
                <span className="text-[#38BDF8]">{mission.zoneLabel}</span>
                <span className="text-white/25" aria-hidden="true">·</span>
                <span className="text-[#F8F9FA]/75">{mission.subtitle}</span>
              </div>
              <h2
                id="cmd-panel-title"
                className="mt-0.5 truncate text-lg font-extrabold tracking-tight text-[#F8F9FA] sm:text-xl"
              >
                {isRoutine
                  ? `Routine Days · Sol ${state.lastRoutineSummary!.fromSol} → Sol ${state.lastRoutineSummary!.toSol}`
                  : mission.title}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {state.phase === 'active-mission' && (
                <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0D213B] p-1">
                  <button
                    type="button"
                    onClick={handleOpenLook}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-extrabold transition-colors cursor-pointer ${
                      activeTab === 'look'
                        ? 'bg-[#FFB703] text-[#071324]'
                        : 'text-[#F8F9FA]/85 hover:text-[#FFB703]'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>1. Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('compare')}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-extrabold transition-colors cursor-pointer ${
                      activeTab === 'compare'
                        ? 'bg-[#FFB703] text-[#071324]'
                        : 'text-[#F8F9FA]/85 hover:text-[#FFB703]'
                    }`}
                  >
                    <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>2. Decide</span>
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

          {/* Scrollable Console Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">
            {/* ================================================================
                VIEW 1: ACTIVE MISSION (1. DATA  |  2. GAME DECISION BUTTONS)
                ================================================================ */}
            {state.phase === 'active-mission' && (
              <>
                {activeTab === 'look' ? (
                  <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
                    <div className="space-y-3 lg:col-span-7">
                      <p className="text-sm leading-snug text-[#F8F9FA]/92">{mission.story}</p>

                      <div className="rounded-xl border border-white/12 bg-[#0D213B]/75 p-3">
                        <p className="text-[11px] font-bold text-[#FFB703]">Sensor Readings</p>
                        <div className="mt-2 space-y-1.5">
                          {mission.sensorReadings.map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between gap-2 rounded-lg bg-[#071324]/80 px-2.5 py-1.5 text-xs"
                            >
                              <span className="font-semibold text-[#F8F9FA]/85">{item.label}</span>
                              <div className="flex items-center gap-1.5 tabular-nums">
                                <span className="font-extrabold text-[#F8F9FA]">{item.value}</span>
                                <ProvenanceTagText tag={item.tag} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#38BDF8]/35 bg-[#0D213B]/60 p-3 text-xs leading-relaxed text-[#F8F9FA]/90">
                        <span className="font-bold text-[#38BDF8]">Mars Science: </span>
                        {mission.scienceReason}
                      </div>
                    </div>

                    <div className="space-y-3 lg:col-span-5">
                      {/* Earth Radio Control Card */}
                      <div className="rounded-xl border border-white/12 bg-[#0D213B]/75 p-3">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-[#FFB703]">
                            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                            Earth Control
                          </span>
                          <span className="text-[11px] font-bold text-[#F8F9FA]/75 tabular-nums">
                            {mission.mcDelayMinutes} min lag
                          </span>
                        </div>

                        {!state.mcReplyArrived && mcSecondsLeft === null && (
                          <div className="mt-2">
                            <p className="text-xs text-[#F8F9FA]/85">
                              Radio takes {mission.mcDelayMinutes} min one-way. Ask Houston for a tip!
                            </p>
                            <button
                              type="button"
                              onClick={handleAskMc}
                              className="mt-2 inline-flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-[#FFB703]/60 bg-[#071324] px-3 text-xs font-bold text-[#FFB703] hover:bg-[#FFB703] hover:text-[#071324] cursor-pointer"
                            >
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Ask Earth ({mission.mcDelayMinutes}s wait)</span>
                            </button>
                          </div>
                        )}

                        {mcSecondsLeft !== null && mcSecondsLeft > 0 && (
                          <div className="mt-2 rounded-lg bg-[#071324]/85 p-2.5 text-xs">
                            <p className="font-bold text-[#FFB703] tabular-nums">
                              Radio beam flying… {mcSecondsLeft}s left
                            </p>
                          </div>
                        )}

                        {state.mcReplyArrived && (
                          <div className="mt-2 rounded-lg border border-[#22C55E]/40 bg-[#071324]/90 p-2.5 text-xs leading-relaxed text-[#F8F9FA]">
                            {mission.mcAdvice}
                          </div>
                        )}
                      </div>

                      {mission.id === 'm2' && (
                        <div className="rounded-xl border border-[#FFB703]/35 bg-[#0D213B]/75 p-3 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 font-bold text-[#FFB703]">
                              <CloudSun className="h-4 w-4" aria-hidden="true" />
                              MEDA Weather
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
                              NASA DONKI Forecast
                            </span>
                            <span className="text-[10px] font-extrabold text-[#22C55E]">
                              {state.donki.dateLabel}
                            </span>
                          </div>
                          <p className="mt-1 font-extrabold text-[#F8F9FA]">
                            {state.donki.flareLabel} · {state.donki.impactType}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#38BDF8] tabular-nums">
                            Arrival: {state.donki.marsArrivalTime}
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveTab('compare')}
                        className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-4 text-sm font-extrabold text-[#071324] shadow-lg hover:brightness-110 cursor-pointer"
                      >
                        <span>Choose Action (A–D)</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* TAB B: GAME DECISION PANEL — 4 LARGE TACTILE OPTION BUTTONS */
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-[#FFB703] sm:text-base">
                        {mission.playerQuestion}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#38BDF8] tabular-nums">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        Crew Slots: {state.crewSlotsRemaining}/4
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                      {mission.options.map((opt) => {
                        const notEnoughSlots = opt.crewSlotsCost > state.crewSlotsRemaining;
                        const OptionIcon = getOptionIcon(mission.id, opt.id);
                        const affectedProfiles = CREW_PROFILES.filter((c) =>
                          opt.affectedCrew.includes(c.id),
                        );

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={notEnoughSlots}
                            onClick={() => onSelectOption(opt.id)}
                            className="group flex flex-col justify-between rounded-xl border border-[#E85D04]/45 bg-[#0D213B]/80 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[#FFB703] hover:bg-[#132C4E] hover:shadow-[0_0_24px_rgba(255,183,3,0.22)] disabled:opacity-45 disabled:hover:translate-y-0 cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                {/* Game Option Badge + Icon */}
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFB703] text-[#071324] shadow-md transition-transform group-hover:scale-105">
                                  <OptionIcon className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-sm font-extrabold text-[#F8F9FA] sm:text-base leading-snug">
                                    <span className="text-[#FFB703] mr-1">{opt.id}.</span>
                                    {opt.label}
                                  </h3>
                                  <p className="mt-0.5 text-xs text-[#F8F9FA]/82 leading-snug">
                                    {opt.actionSummary}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`shrink-0 text-xs font-extrabold tabular-nums ${
                                  opt.riskPercent >= 60
                                    ? 'text-[#EF4444]'
                                    : opt.riskPercent >= 30
                                      ? 'text-[#FFB703]'
                                      : 'text-[#22C55E]'
                                }`}
                              >
                                {opt.riskPercent}% Risk
                              </span>
                            </div>

                            {/* Clean Cost & Crew Footer */}
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[11px]">
                              <span className="font-bold text-[#38BDF8] tabular-nums">
                                {opt.costSummary.join(' · ')}
                              </span>

                              <div className="flex items-center gap-1">
                                {affectedProfiles.map((p) => (
                                  <span
                                    key={p.id}
                                    title={`${p.name} (${p.role})`}
                                    className="inline-flex h-5 w-5 items-center justify-center rounded text-[9px] font-black text-[#071324]"
                                    style={{ backgroundColor: p.avatarColor }}
                                  >
                                    {p.initials}
                                  </span>
                                ))}
                                <span className="ml-1 inline-flex items-center gap-1 font-extrabold text-[#FFB703] group-hover:translate-x-0.5 transition-transform">
                                  {notEnoughSlots ? `Need ${opt.crewSlotsCost} Slots` : 'Select'}
                                  {!notEnoughSlots && (
                                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ================================================================
                VIEW 2: MISSION OUTCOME + SCIENCE CARD
                ================================================================ */}
            {isReview && (
              <div className="space-y-3">
                <div
                  className={`rounded-xl border p-3.5 ${
                    state.lastOutcome!.passedObjective
                      ? 'border-[#22C55E]/55 bg-[#0D213B]/80'
                      : 'border-[#E85D04]/65 bg-[#240F13]/80'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-extrabold text-[#FFB703]">
                    {state.lastOutcome!.passedObjective ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-[#22C55E]" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="h-4.5 w-4.5 text-[#FFB703]" aria-hidden="true" />
                    )}
                    <span>
                      {state.lastOutcome!.passedObjective ? 'Mission Goal Met!' : 'Rough Outcome'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#F8F9FA]">
                    {state.lastOutcome!.immediateText}
                  </p>
                  {state.lastOutcome!.rippleTriggered && (
                    <p className="mt-1.5 text-xs font-bold text-[#FFB703]">
                      Later Effect: {state.lastOutcome!.rippleTriggered}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[#38BDF8]/45 bg-[#0D213B]/70 p-3.5">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-[#38BDF8]">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      {state.roverName} Science Card
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#F8F9FA]/92">
                      {state.lastOutcome!.scienceCard}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/12 bg-[#0D213B]/60 p-3.5 text-xs space-y-1">
                    <p className="font-bold text-[#FFB703]">
                      Cost: {state.lastOutcome!.afterAction.whatItCost}
                    </p>
                    <p className="text-[#22C55E] font-semibold">
                      {state.lastOutcome!.afterAction.goodProcessNote}
                    </p>
                    <p className="text-[#F8F9FA]/85">
                      <strong className="text-[#FFB703]">Tip:</strong>{' '}
                      {state.lastOutcome!.afterAction.betterAction}
                    </p>
                  </div>
                </div>

                {mission.id === 'm2' && !state.panelsCleanedBonus && !state.campaignFailedReason && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#22C55E]/50 bg-[#0E2923]/85 p-3">
                    <div className="text-xs">
                      <p className="font-extrabold text-[#22C55E]">Bonus: Sky Is Clearing!</p>
                      <p className="text-[#F8F9FA]/90">
                        Brush dust off solar panels now for +25% power.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onCleanPanelsBonus}
                      className="min-h-[36px] rounded-lg bg-[#22C55E] px-3.5 text-xs font-extrabold text-[#071324] hover:brightness-110 cursor-pointer whitespace-nowrap"
                    >
                      Clean Panels (+25%)
                    </button>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onAdvanceRoutineSols}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-5 text-sm font-extrabold text-[#071324] shadow-lg hover:brightness-110 cursor-pointer"
                  >
                    <span>
                      {state.campaignFailedReason || state.missionIndex >= 4
                        ? 'See Final Score'
                        : 'Next Days'}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* ================================================================
                VIEW 3: ROUTINE SOLS SUMMARY
                ================================================================ */}
            {isRoutine && (
              <div className="space-y-3">
                <p className="text-xs text-[#F8F9FA]/90 sm:text-sm">
                  Over the next <strong>{state.lastRoutineSummary!.solsElapsed} days</strong>, your
                  4 crew used daily air, water, food, and power:
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
                      label: 'Radiation',
                      val: `+${state.lastRoutineSummary!.radiationDelta} mSv`,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-white/12 bg-[#0D213B]/75 p-2.5 text-center"
                    >
                      <p className="text-[11px] font-bold text-[#FFB703]">{stat.label}</p>
                      <p className="mt-0.5 text-sm font-extrabold tabular-nums">{stat.val}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-white/12 bg-[#0D213B]/60 p-3 text-xs space-y-1">
                  {state.lastRoutineSummary!.notes.map((n) => (
                    <p key={n} className="flex items-start gap-2 text-[#F8F9FA]/90">
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFB703]" aria-hidden="true" />
                      <span>{n}</span>
                    </p>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onProceedNextCriticalSol}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-5 text-sm font-extrabold text-[#071324] shadow-lg hover:brightness-110 cursor-pointer"
                  >
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
