import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  Droplets,
  Home,
  Leaf,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  Smile,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Wind,
  Compass,
  Radio,
} from 'lucide-react';
import { CREW_PROFILES, SCORE_WEIGHTS } from '../sim/constants';
import {
  BADGE_DISCLAIMER,
  JUNIOR_CLOSING_LINE,
  JUNIOR_DEBRIEF_QUIZ,
  JUNIOR_MISSIONS,
  JUNIOR_SCIENCE_CARDS,
} from '../sim/juniorData';
import { MissionId } from '../sim/roverData';
import { CampaignState, computeCampaignEvaluation } from '../sim/simEngine';
import { soundEngine } from '../utils/soundEngine';
import { JuniorQuizCard } from './JuniorQuizCard';

interface DebriefScreenProps {
  state: CampaignState;
  onReplaySameSeed: () => void;
  onPlayNewSeed: () => void;
  onOpenDataCredits: () => void;
  onReturnTitle: () => void;
  onEnterFreeRoam?: () => void;
  onCompleteDebriefQuiz?: () => void;
  reducedMotion?: boolean;
}

const ALL_MISSION_IDS: MissionId[] = ['m1', 'm2', 'm3', 'm4', 'm5'];

const JOURNAL_RECAP_ORDER = [
  'tut-gravity',
  'tut-air',
  'tut-sol',
  'm1',
  'm2',
  'm3',
  'm4',
  'm5',
];

const CONFETTI_STARS = [
  { id: 's1', left: '6%', top: '12%', delay: 0, color: '#FFB703' },
  { id: 's2', left: '18%', top: '8%', delay: 0.25, color: '#22C55E' },
  { id: 's3', left: '34%', top: '14%', delay: 0.5, color: '#38BDF8' },
  { id: 's4', left: '66%', top: '10%', delay: 0.15, color: '#FFB703' },
  { id: 's5', left: '82%', top: '15%', delay: 0.4, color: '#E85D04' },
  { id: 's6', left: '93%', top: '9%', delay: 0.65, color: '#22C55E' },
];

function MissionBadgeIcon({
  icon,
  earned,
}: {
  icon: 'oxygen' | 'sun' | 'ice' | 'leaf' | 'shield';
  earned: boolean;
}) {
  const cls = `h-6 w-6 ${earned ? 'text-[#071324]' : 'text-[#F8F9FA]/40'}`;
  switch (icon) {
    case 'oxygen':
      return <Wind className={cls} aria-hidden="true" />;
    case 'sun':
      return <Sun className={cls} aria-hidden="true" />;
    case 'ice':
      return <Snowflake className={cls} aria-hidden="true" />;
    case 'leaf':
      return <Leaf className={cls} aria-hidden="true" />;
    case 'shield':
      return <ShieldCheck className={cls} aria-hidden="true" />;
  }
}

export function DebriefScreen({
  state,
  onReplaySameSeed,
  onPlayNewSeed,
  onOpenDataCredits,
  onReturnTitle,
  onEnterFreeRoam,
  onCompleteDebriefQuiz,
  reducedMotion = false,
}: DebriefScreenProps) {
  const [grownUpOpen, setGrownUpOpen] = useState(false);
  const evalRes = computeCampaignEvaluation(state);

  useEffect(() => {
    soundEngine.playBadgeUnlock();
  }, []);

  const badgeCount = state.unlockedBadges.length;

  const categories = [
    { label: 'Crew Safety', score: evalRes.breakdown.crewSafety, max: SCORE_WEIGHTS.crewSafety },
    {
      label: 'Resource Efficiency',
      score: evalRes.breakdown.resourceEfficiency,
      max: SCORE_WEIGHTS.resourceEfficiency,
    },
    {
      label: 'Mission Objectives',
      score: evalRes.breakdown.missionObjectives,
      max: SCORE_WEIGHTS.missionObjectives,
    },
    {
      label: 'Decision Quality',
      score: evalRes.breakdown.decisionQuality,
      max: SCORE_WEIGHTS.decisionQuality,
    },
    { label: 'Exploration (Ice)', score: evalRes.breakdown.exploration, max: SCORE_WEIGHTS.exploration },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#061020]/84 p-4 sm:p-6">
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="debrief-title"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-[#FFB703]/55 bg-[#071324]/96 text-[#F8F9FA] shadow-[0_0_42px_rgba(255,183,3,0.22)] font-[family-name:var(--font-game)]"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#22C55E] via-[#FFB703] to-[#E85D04]" />

        {/* Celebratory floating stars (respects reducedMotion) */}
        {!reducedMotion && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden" aria-hidden="true">
            {CONFETTI_STARS.map((star) => (
              <motion.div
                key={star.id}
                initial={{ opacity: 0, y: 8, scale: 0.7 }}
                animate={{
                  opacity: [0.35, 0.95, 0.35],
                  y: [0, -8, 0],
                  scale: [0.9, 1.15, 0.9],
                }}
                transition={{
                  duration: 2.8,
                  delay: star.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{ left: star.left, top: star.top, color: star.color }}
                className="absolute"
              >
                <Star className="h-4 w-4 fill-current" />
              </motion.div>
            ))}
          </div>
        )}

        <div className="relative p-5 sm:p-7 space-y-5">
          {/* Top Celebration Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#FFB703] tabular-nums">
                Sol {state.sol} · {state.callsign} · Seed #{state.seed}
              </p>
              <h1
                id="debrief-title"
                className="mt-1 flex items-center gap-2.5 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[#F8F9FA] sm:text-3xl"
              >
                <Sparkles className="h-7 w-7 shrink-0 text-[#FFB703]" aria-hidden="true" />
                <span>Great work, Commander!</span>
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#F8F9FA]/90">
                You led your Mars outpost across {state.sol} sols with {state.roverName} by your side and earned{' '}
                <strong className="text-[#22C55E]">{badgeCount} of 5</strong> Explorer Badges!
              </p>
            </div>

            <div className="rounded-xl border border-[#22C55E]/45 bg-[#0E2923]/80 px-4 py-2.5 text-center">
              <p className="text-[11px] font-bold text-[#22C55E]">Badges Unlocked</p>
              <p className="font-[family-name:var(--font-display)] text-2xl font-black text-[#F8F9FA] tabular-nums">
                {badgeCount} / 5
              </p>
            </div>
          </div>

          {/* Message from Earth (Story Bible S3.1) */}
          <div className="rounded-xl border border-[#38BDF8]/45 bg-[#0D213B]/85 px-4 py-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-[#38BDF8]">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Radio className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
                <span>Message from Earth Team</span>
              </span>
              <span className="text-[#F8F9FA]/65">Sent 12 minutes ago</span>
            </div>
            <p className="mt-1 font-bold leading-relaxed text-[#F8F9FA]">
              &ldquo;Great job, Commander. Your crew is safe. You looked, listened and thought before you chose. That is what astronauts do.&rdquo;
            </p>
          </div>

          {/* 4 Crew + Rover Friendly Safety Status */}
          <div>
            <p className="text-xs font-extrabold text-[#FFB703]">
              Your Crew &amp; {state.roverName}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {state.crew.map((member) => {
                const profile = CREW_PROFILES.find((p) => p.id === member.id)!;
                const safeAndHappy = member.alive && member.health >= 70;
                const statusLine = !member.alive
                  ? 'Rescue team arrived — resting in medical bay.'
                  : safeAndHappy
                    ? 'Safe, healthy, and cheering for you!'
                    : 'Resting safely inside the warm habitat!';

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/12 bg-[#1B3A5F]/45 px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-extrabold text-[#0B1D36]"
                        style={{ backgroundColor: profile.avatarColor }}
                      >
                        {profile.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-[#F8F9FA]">
                          {member.name}
                        </p>
                        <p className="text-xs text-[#F8F9FA]/80">{statusLine}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-extrabold ${
                        safeAndHappy
                          ? 'bg-[#22C55E]/20 text-[#22C55E]'
                          : 'bg-[#FFB703]/20 text-[#FFB703]'
                      }`}
                    >
                      {safeAndHappy ? (
                        <Smile className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{safeAndHappy ? 'Happy' : 'Safe'}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-[#22C55E]/30 bg-[#0E2923]/45 px-3.5 py-2.5 text-xs text-[#F8F9FA]/90">
              <Bot className="h-4.5 w-4.5 shrink-0 text-[#22C55E]" aria-hidden="true" />
              <span>
                <strong className="text-[#22C55E]">{state.roverName}:</strong>{' '}
                {state.roverDamaged
                  ? 'Bumped a wheel in the dust storm, kept beeping helpful hints all expedition!'
                  : state.iceSiteFound
                    ? 'Scanned the soil for possible buried ice and cheered every step of your mission!'
                    : 'Rolled right beside you across Mars and helped keep everyone safe.'}
              </span>
            </div>
          </div>

          {/* Unlocked Mission Badges */}
          <div className="rounded-2xl border border-[#FFB703]/35 bg-[#0D213B]/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-extrabold text-[#FFB703]">
                <Award className="h-4 w-4" aria-hidden="true" />
                <span>Explorer Mission Badges</span>
              </p>
              <span className="text-[11px] text-[#F8F9FA]/75">{BADGE_DISCLAIMER}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {ALL_MISSION_IDS.map((mId) => {
                const badge = JUNIOR_MISSIONS[mId].badge;
                const earned = state.unlockedBadges.includes(mId);
                return (
                  <div
                    key={mId}
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-colors ${
                      earned
                        ? 'border-[#FFB703]/70 bg-[#1B3A5F]/75 shadow-[0_0_18px_rgba(255,183,3,0.16)]'
                        : 'border-white/10 bg-[#071324]/70 opacity-60'
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        earned
                          ? 'bg-gradient-to-br from-[#FFB703] to-[#22C55E]'
                          : 'bg-white/10'
                      }`}
                    >
                      <MissionBadgeIcon icon={badge.icon} earned={earned} />
                    </div>
                    <p className="mt-2 text-xs font-extrabold text-[#F8F9FA] leading-tight">
                      {badge.title}
                    </p>
                    <p
                      className={`mt-1 text-[10px] font-bold ${
                        earned ? 'text-[#22C55E]' : 'text-[#F8F9FA]/55'
                      }`}
                    >
                      {earned ? 'Earned!' : 'Play again to earn'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discovery Journal 1-Line Recaps */}
          <div className="rounded-2xl border border-[#38BDF8]/30 bg-[#0D213B]/55 p-4">
            <p className="flex items-center gap-2 text-xs font-extrabold text-[#38BDF8]">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>Discovery Journal — What You Learned on Mars</span>
            </p>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {JOURNAL_RECAP_ORDER.map((cardId) => {
                const card = JUNIOR_SCIENCE_CARDS[cardId];
                if (!card) return null;
                const unlocked =
                  state.unlockedScienceCards.includes(cardId) ||
                  (cardId.startsWith('m') && state.unlockedBadges.includes(cardId as MissionId));
                return (
                  <div
                    key={card.id}
                    className={`rounded-xl border px-3 py-2 text-xs ${
                      unlocked
                        ? 'border-[#38BDF8]/40 bg-[#071324]/80'
                        : 'border-white/10 bg-[#071324]/45 opacity-75'
                    }`}
                  >
                    <p className="font-extrabold text-[#FFB703]">{card.title}</p>
                    <p className="mt-0.5 text-[#F8F9FA]/90 leading-snug">{card.oneSentence}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Final Debrief Quiz & Closing Explorer Message */}
          {!state.debriefQuizDone ? (
            <JuniorQuizCard
              inline
              quiz={JUNIOR_DEBRIEF_QUIZ}
              roverName={state.roverName}
              continueLabel="Claim Explorer Message!"
              onPassed={() => onCompleteDebriefQuiz?.()}
              reducedMotion={reducedMotion}
            />
          ) : (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-[#22C55E]/70 bg-gradient-to-r from-[#0E2923]/90 via-[#1B3A5F]/80 to-[#0E2923]/90 p-5 text-center shadow-[0_0_28px_rgba(34,197,94,0.22)]"
            >
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#22C55E]">
                Junior Astronaut Reflection Complete
              </p>
              <p className="mt-1.5 font-[family-name:var(--font-display)] text-lg font-extrabold text-[#F8F9FA] sm:text-xl">
                {JUNIOR_CLOSING_LINE}
              </p>
              <p className="mt-1 text-xs text-[#F8F9FA]/80">
                {BADGE_DISCLAIMER}
              </p>
            </motion.div>
          )}

          {/* Optional Grown-up Campaign Summary */}
          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setGrownUpOpen((prev) => !prev);
              }}
              aria-expanded={grownUpOpen}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#F8F9FA]/70 hover:text-[#FFB703]"
            >
              {grownUpOpen ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Grown-up Campaign Summary (Educator Metrics)</span>
            </button>

            {grownUpOpen && (
              <div className="mt-3 space-y-3 rounded-xl border border-white/12 bg-[#061020]/80 p-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-[#F8F9FA]">
                      Outcome: {evalRes.status} — {evalRes.outcomeLabel}
                    </p>
                    <p className="text-[#F8F9FA]/75">{evalRes.statusReason}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-bold text-[#FFB703]">
                      Engine Score: {evalRes.totalScore}/100 · Process: {evalRes.decisionQualityScore}%
                    </p>
                    <p className="text-[#F8F9FA]/75">
                      O₂ {state.oxygenKg} kg · H₂O {state.waterKg} kg · Food {state.foodKg} kg ·{' '}
                      <Droplets className="inline h-3 w-3 text-[#38BDF8]" aria-hidden="true" /> Event Dose{' '}
                      {Math.round(state.eventDoseMsv)} mSv
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {categories.map((cat) => (
                    <div
                      key={cat.label}
                      className="rounded-lg border border-white/10 bg-[#1B3A5F]/40 px-2.5 py-2"
                    >
                      <p className="text-[10px] font-bold text-[#F8F9FA]/70">{cat.label}</p>
                      <p className="mt-0.5 text-sm font-extrabold text-[#FFB703] tabular-nums">
                        {cat.score}/{cat.max}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Replay & Navigation Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onOpenDataCredits}
                className="min-h-[42px] cursor-pointer rounded-xl border border-white/20 bg-[#1B3A5F] px-4 text-xs font-bold text-[#F8F9FA] hover:border-[#FFB703]"
              >
                NASA Data Credits
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-xl border border-white/20 bg-[#1B3A5F] px-4 text-xs font-bold text-[#F8F9FA] hover:border-[#FFB703]"
              >
                <Home className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
                <span>Title Screen</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {onEnterFreeRoam && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onEnterFreeRoam();
                  }}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#38BDF8] px-5 text-xs font-extrabold text-[#071324] shadow-lg hover:scale-[1.02] transition-transform"
                >
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  <span>Free Roam (Explore Base)</span>
                </button>
              )}
              <button
                type="button"
                onClick={onReplaySameSeed}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-[#FFB703] bg-[#1B3A5F] px-4 text-xs font-extrabold text-[#FFB703] hover:bg-[#FFB703] hover:text-[#0B1D36]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Play Again (Same Seed)</span>
              </button>
              <button
                type="button"
                onClick={onPlayNewSeed}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-5 text-xs font-extrabold text-[#0B1D36] shadow-lg hover:scale-[1.02]"
              >
                <Shuffle className="h-4 w-4" aria-hidden="true" />
                <span>New Game</span>
              </button>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
