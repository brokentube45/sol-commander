import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bot,
  Sparkles,
  ArrowRight,
  Map as MapIcon,
  Users,
  Footprints,
  ArrowUpFromLine,
  Search,
  Volume2,
  Moon,
  Eye,
  CheckCircle2,
  MousePointerClick,
} from 'lucide-react';
import {
  ACT1_CHORE_SPOTS,
  ACT1_CRYSTAL_CALLOUTS,
  ACT1_SUNSET_LOG,
  ACT1_TANK2_LINES,
  ChorePlaceId,
  formatWithRoverName,
  JUNIOR_SCIENCE_CARDS,
  JUNIOR_TUTORIAL_QUIZ,
  JUNIOR_TUTORIAL_STEPS,
  STORY_POSTCARDS,
  TutorialStepId,
} from '../sim/storyBeats';
import { CREW_PROFILES } from '../sim/constants';
import { JuniorQuizCard } from './JuniorQuizCard';
import { ScienceCardModal } from './ScienceCardModal';
import { POPUP_TUTORIAL_STEP_PAUSE_MS } from './hudPopupQueue';
import { soundEngine } from '../utils/soundEngine';
import { narrativeVoice } from '../utils/narrativeVoice';

interface TutorialOverlayProps {
  tutorialStep: TutorialStepId;
  crystalsCollected: number;
  choresVisited?: Record<ChorePlaceId, boolean>;
  roverName: string;
  renderMode?: 'banner-only' | 'modals-only' | 'all';
  onAdvanceStep: (next: TutorialStepId) => void;
  onVisitChore?: (spot: ChorePlaceId) => void;
  onCompleteTutorialQuiz: () => void;
  onUnlockCard: (cardId: string) => void;
  onOpenMap: () => void;
  reducedMotion: boolean;
}

const ACT1_POSTCARDS = STORY_POSTCARDS['sol-2-20'];

export function TutorialOverlay({
  tutorialStep,
  crystalsCollected,
  choresVisited = { greenhouse: false, solar: false, habitat: false },
  roverName,
  renderMode = 'all',
  onAdvanceStep,
  onVisitChore,
  onCompleteTutorialQuiz,
  onUnlockCard,
  onOpenMap,
  reducedMotion,
}: TutorialOverlayProps) {
  const [act1Phase, setAct1Phase] = useState<'sunset-log' | 'postcards'>('sunset-log');
  const [postcardIdx, setPostcardIdx] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(true);
  const firstStepRef = useRef(true);

  const displayRover = roverName.trim() || 'Rusty';

  // Sync roverName with narrativeVoice
  useEffect(() => {
    narrativeVoice.setRoverName(displayRover);
  }, [displayRover]);

  // Time-lapse Sols 2-20: 4 seconds each per Story Bible S1.8, with Next/Skip
  useEffect(() => {
    if (act1Phase !== 'postcards') return;
    const currentCard = ACT1_POSTCARDS[postcardIdx];
    if (currentCard) {
      narrativeVoice.speakAs(
        currentCard.speaker,
        formatWithRoverName(currentCard.caption, displayRover),
        `act1-postcard-${postcardIdx}`,
        1000,
        undefined,
        true,
      );
    }
    const timer = window.setTimeout(() => {
      if (postcardIdx < ACT1_POSTCARDS.length - 1) {
        setPostcardIdx((prev) => prev + 1);
      } else {
        soundEngine.playMissionStart();
        onAdvanceStep('complete');
      }
    }, reducedMotion ? 2000 : 4000);
    return () => window.clearTimeout(timer);
  }, [act1Phase, postcardIdx, onAdvanceStep, reducedMotion, displayRover]);

  // Reset act1Phase to sunset-log when entering crew-map-intro
  useEffect(() => {
    if (tutorialStep === 'crew-map-intro') {
      setAct1Phase('sunset-log');
      setPostcardIdx(0);
    }
  }, [tutorialStep]);

  // Synthesized Rusty beep + procedural chime + 600 ms calm gap when advancing between tutorial instruction banners
  useEffect(() => {
    if (renderMode === 'modals-only') return;
    if (tutorialStep === 'complete') return;
    soundEngine.playRoverBeep(tutorialStep === 'jump-crystals' ? 'happy' : 'ok');

    narrativeVoice.speakTutorialStep(tutorialStep);

    if (firstStepRef.current) {
      firstStepRef.current = false;
      setBannerVisible(true);
      return;
    }

    const isInlineBannerStep =
      tutorialStep !== 'gravity-card' &&
      tutorialStep !== 'tutorial-quiz' &&
      tutorialStep !== 'crew-map-intro';

    if (!isInlineBannerStep) {
      setBannerVisible(false);
      return;
    }

    setBannerVisible(false);
    const tid = window.setTimeout(() => {
      setBannerVisible(true);
    }, POPUP_TUTORIAL_STEP_PAUSE_MS);

    return () => window.clearTimeout(tid);
  }, [tutorialStep, renderMode]);

  if (tutorialStep === 'complete') return null;

  const stepInfo = JUNIOR_TUTORIAL_STEPS[tutorialStep];
  const formattedRustyLine = formatWithRoverName(stepInfo.rustyLine, displayRover);
  const formattedActionPrompt = formatWithRoverName(stepInfo.actionPrompt, displayRover);

  const StepIcon =
    tutorialStep === 'take-control'
      ? MousePointerClick
      : tutorialStep === 'look'
        ? Eye
        : tutorialStep === 'move'
          ? Footprints
          : tutorialStep === 'jump-crystals'
            ? ArrowUpFromLine
            : tutorialStep === 'chores'
              ? Users
              : tutorialStep === 'inspect-rover' || tutorialStep === 'inspect-oxygen'
                ? Search
                : Sparkles;

  const showBannerSlot = renderMode === 'all' || renderMode === 'banner-only';
  const showModalSlot = renderMode === 'all' || renderMode === 'modals-only';
  const isInlineStep =
    tutorialStep !== 'gravity-card' &&
    tutorialStep !== 'tutorial-quiz' &&
    tutorialStep !== 'crew-map-intro';

  const choresDoneCount =
    (choresVisited.greenhouse ? 1 : 0) +
    (choresVisited.solar ? 1 : 0) +
    (choresVisited.habitat ? 1 : 0);

  const crystalCalloutText =
    crystalsCollected >= 1 && crystalsCollected <= 3
      ? ACT1_CRYSTAL_CALLOUTS[crystalsCollected - 1]
      : null;

  return (
    <>
      {/* Top-Center In-Flow Rusty Tutorial Banner (never overlaps Top-Left Vitals) */}
      {showBannerSlot && isInlineStep && bannerVisible && (
        <motion.div
          key={tutorialStep}
          initial={reducedMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto w-full max-w-[440px] rounded-xl border border-[#22C55E]/60 bg-[#071324]/92 px-3.5 py-2.5 text-[#F8F9FA] shadow-[0_0_24px_rgba(34,197,94,0.22)] font-[family-name:var(--font-game)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#22C55E]">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                Sol 01 First Steps · Step {stepInfo.stepNumber} of {stepInfo.totalSteps}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  narrativeVoice.speakTutorialStep(tutorialStep);
                }}
                title={`Listen to ${displayRover}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E] hover:text-[#071324] transition-colors cursor-pointer"
              >
                <Volume2 className="h-3 w-3" aria-hidden="true" />
              </button>
              <span className="text-[10px] font-semibold text-[#F8F9FA]/50">
                Hold [X] or Esc → Skip
              </span>
            </div>
          </div>

          <div className="mt-1 flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#22C55E]/20 text-[#22C55E]">
              <StepIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-[#F8F9FA]">{stepInfo.title}</p>
              <p className="mt-0.5 text-[11px] font-bold text-[#FFB703]">
                {displayRover}: &ldquo;{formattedRustyLine}&rdquo;
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#F8F9FA]/88">
                {formattedActionPrompt}
              </p>
            </div>
          </div>

          {tutorialStep === 'take-control' && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onAdvanceStep('look');
                }}
                className="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-lg bg-[#22C55E] px-3 py-1 text-[11px] font-extrabold text-[#071324] shadow-md hover:scale-[1.02] transition-transform"
              >
                <span>Take Control at Airlock</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}

          {tutorialStep === 'look' && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[#38BDF8]/40 bg-[#0D213B]/85 px-2.5 py-1.5">
              <span className="text-[11px] font-bold text-[#38BDF8]">
                Turn 60 degrees with mouse or Look keys
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onAdvanceStep('move');
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded bg-[#38BDF8]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#38BDF8] hover:bg-[#38BDF8] hover:text-[#071324] transition-colors"
              >
                <span>Done Looking →</span>
              </button>
            </div>
          )}

          {tutorialStep === 'jump-crystals' && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-[#38BDF8]/40 bg-[#0D213B]/85 px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#38BDF8]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Glowing Crystals</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((idx) => (
                    <span
                      key={idx}
                      className={`h-2.5 w-2.5 rounded-full border ${
                        idx < crystalsCollected
                          ? 'border-[#22C55E] bg-[#22C55E] shadow-[0_0_8px_#22C55E]'
                          : 'border-white/30 bg-[#071324]'
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-[11px] font-black tabular-nums text-[#F8F9FA]">
                    {crystalsCollected}/3
                  </span>
                </div>
              </div>
              {crystalCalloutText && (
                <p className="text-[11px] font-extrabold text-[#22C55E]">
                  {displayRover}: &ldquo;{crystalCalloutText}&rdquo;
                </p>
              )}
            </div>
          )}

          {tutorialStep === 'chores' && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-[#FFB703]/45 bg-[#0D213B]/90 p-2.5">
              <div className="flex items-center justify-between text-[11px] font-extrabold text-[#FFB703]">
                <span>First-Day Chores (3 Places)</span>
                <span>{choresDoneCount}/3 Visited</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                {ACT1_CHORE_SPOTS.map((chore) => {
                  const visited = choresVisited[chore.id];
                  return (
                    <button
                      key={chore.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onVisitChore?.(chore.id);
                      }}
                      className={`flex cursor-pointer items-center justify-between gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[10px] font-bold transition-all ${
                        visited
                          ? 'border-[#22C55E]/70 bg-[#22C55E]/20 text-[#22C55E]'
                          : 'border-white/15 bg-[#071324]/80 text-[#F8F9FA] hover:border-[#FFB703]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-extrabold">{chore.label}</p>
                        <p className="truncate text-[9px] text-[#F8F9FA]/70">
                          {chore.secondSpeaker
                            ? `${chore.speaker} & ${chore.secondSpeaker}`
                            : chore.speaker}
                        </p>
                      </div>
                      {visited ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
                      ) : (
                        <span className="shrink-0 rounded bg-[#FFB703]/20 px-1 py-0.5 text-[9px] text-[#FFB703]">
                          [E]
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tutorialStep === 'inspect-oxygen' && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-[#FFB703]/45 bg-[#0D213B]/90 p-2.5">
              <p className="text-[11px] font-bold text-[#F8F9FA]">
                {displayRover}: &ldquo;{ACT1_TANK2_LINES.intro}&rdquo;
              </p>
              <p className="text-[11px] italic text-[#FFB703]">
                {displayRover}: &ldquo;{ACT1_TANK2_LINES.afterTickHiss}&rdquo;
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    narrativeVoice.speakAs('rusty', ACT1_TANK2_LINES.afterTickHiss, 'tank2-tick', 500, undefined, true);
                    onAdvanceStep('tutorial-quiz');
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#FFB703] px-2.5 py-1 text-[10px] font-extrabold text-[#071324] hover:scale-[1.02] transition-transform"
                >
                  <span>Check Tank 2 [E] →</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* S1.4: Mars Gravity Card (Kid text only; numbers in Grown-up note) -> advances to Chores (3 places) */}
      {showModalSlot && tutorialStep === 'gravity-card' && (
        <ScienceCardModal
          card={JUNIOR_SCIENCE_CARDS['tut-gravity']}
          continueLabel="First-Day Chores (3 Places) →"
          reducedMotion={reducedMotion}
          onContinue={() => {
            onUnlockCard('tut-gravity');
            onAdvanceStep('chores');
          }}
        />
      )}

      {/* S1.6: Tank 2 Quiz -> Sunset Log + Sleep */}
      {showModalSlot && tutorialStep === 'tutorial-quiz' && (
        <JuniorQuizCard
          quiz={JUNIOR_TUTORIAL_QUIZ}
          roverName={displayRover}
          continueLabel="Sunset: Commander's Log →"
          reducedMotion={reducedMotion}
          onPassed={() => {
            onUnlockCard('tut-air');
            onUnlockCard('tut-sol');
            onCompleteTutorialQuiz();
          }}
        />
      )}

      {/* S1.7: Sunset — Commander's Log and Sleep */}
      {showModalSlot && tutorialStep === 'crew-map-intro' && act1Phase === 'sunset-log' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#040A15]/78 p-4 backdrop-blur-[3px]">
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sunset-log-title"
            initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#38BDF8]/60 bg-[#071324]/96 text-[#F8F9FA] shadow-[0_0_36px_rgba(56,189,248,0.25)] font-[family-name:var(--font-game)]"
          >
            <div className="h-1 w-full bg-gradient-to-r from-[#38BDF8] via-[#FFB703] to-[#E85D04]" />
            <div className="p-6">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#38BDF8]">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  <span id="sunset-log-title">Sunset — Commander&apos;s Log and Sleep</span>
                </span>
                <span className="text-[11px] text-[#F8F9FA]/60">Sol 1 · Blue Martian Sunset</span>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#22C55E]/40 bg-[#0D213B]/80 px-3.5 py-2.5 text-xs font-bold text-[#22C55E]">
                <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {displayRover}: &ldquo;{ACT1_SUNSET_LOG.rustyLine}&rdquo;
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CREW_PROFILES.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1B3A5F]/45 px-2.5 py-1.5"
                  >
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-extrabold text-[#0B1D36]"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-extrabold text-[#F8F9FA]">
                        {member.name.split(' ').pop()}
                      </p>
                      <p className="truncate text-[9px] font-bold text-[#22C55E]">Safe Inside</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-[#040A15]/80 p-4">
                <p className="text-xs uppercase tracking-wider text-[#FFB703] font-bold">
                  Commander&apos;s Log · Sol 1
                </p>
                <p className="mt-1.5 text-sm sm:text-base italic leading-relaxed text-[#F8F9FA]">
                  &ldquo;{ACT1_SUNSET_LOG.logEntry}&rdquo;
                </p>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-[#F8F9FA]/70">
                The sky turns warm orange, then a soft blue around the setting Sun. Click Sleep to advance through Sols 2–20.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenMap();
                  }}
                  className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-[#1B3A5F] px-4 text-xs font-bold text-[#F8F9FA] hover:border-[#FFB703]"
                >
                  <MapIcon className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
                  <span>Peek at Base Map</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    soundEngine.playSpeakerChime('log');
                    setAct1Phase('postcards');
                    setPostcardIdx(0);
                  }}
                  className="inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#1D4ED8] px-6 py-2.5 font-[family-name:var(--font-display)] text-xs font-extrabold tracking-wider text-white shadow-xl transition-transform hover:scale-[1.02]"
                >
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  <span>{ACT1_SUNSET_LOG.sleepButtonLabel}</span>
                </button>
              </div>
            </div>
          </motion.section>
        </div>
      )}

      {/* S1.8: Postcards Sols 2–20 (Bible S1.8: 3 cards, 4 seconds each, Next / Skip) */}
      {showModalSlot && tutorialStep === 'crew-map-intro' && act1Phase === 'postcards' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#040A15]/85 p-4 backdrop-blur-[3px]">
          <motion.section
            key={postcardIdx}
            role="dialog"
            aria-modal="true"
            aria-labelledby="postcard-title"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#FFB703]/60 bg-[#071324]/96 text-[#F8F9FA] shadow-[0_0_42px_rgba(255,183,3,0.28)] font-[family-name:var(--font-game)]"
          >
            <div className="h-1 w-full bg-gradient-to-r from-[#E85D04] via-[#FFB703] to-[#22C55E]" />
            <div className="p-6">
              <div className="flex items-center justify-between text-xs font-bold text-[#FFB703]">
                <span className="flex items-center gap-1.5 uppercase tracking-wider" id="postcard-title">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span>{ACT1_POSTCARDS[postcardIdx].title}</span>
                </span>
                <span className="text-[11px] text-[#F8F9FA]/60">
                  {postcardIdx + 1} of {ACT1_POSTCARDS.length}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-[#040A15]/85 p-5 text-center">
                <p className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-extrabold text-[#F8F9FA] leading-snug">
                  &ldquo;{formatWithRoverName(ACT1_POSTCARDS[postcardIdx].caption, displayRover)}&rdquo;
                </p>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5">
                {ACT1_POSTCARDS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i === postcardIdx ? 'w-6 bg-[#FFB703]' : 'w-2 bg-white/20'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    soundEngine.playMissionStart();
                    onAdvanceStep('complete');
                  }}
                  className="min-h-[40px] cursor-pointer rounded-xl border border-[#FFB703]/60 bg-[#1B3A5F]/80 px-4 text-xs font-bold text-[#FFB703] hover:border-[#FFB703] hover:bg-[#1B3A5F] transition-all"
                >
                  Skip →
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    if (postcardIdx < ACT1_POSTCARDS.length - 1) {
                      setPostcardIdx(postcardIdx + 1);
                    } else {
                      soundEngine.playMissionStart();
                      onAdvanceStep('complete');
                    }
                  }}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-5 py-2 font-[family-name:var(--font-display)] text-xs font-extrabold text-[#0B1D36] shadow-xl hover:scale-[1.02]"
                >
                  <span>{postcardIdx < ACT1_POSTCARDS.length - 1 ? 'Next' : 'Start Mission 1 (Sol 21)'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.section>
        </div>
      )}
    </>
  );
}
