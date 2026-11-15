import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bot,
  Sparkles,
  ArrowRight,
  Map as MapIcon,
  Users,
  Wind,
  Footprints,
  ArrowUpFromLine,
  Search,
  Volume2,
  Moon,
} from 'lucide-react';
import {
  JUNIOR_SCIENCE_CARDS,
  JUNIOR_TUTORIAL_QUIZ,
  JUNIOR_TUTORIAL_STEPS,
  TutorialStepId,
} from '../sim/juniorData';
import { CREW_PROFILES } from '../sim/constants';
import { JuniorQuizCard } from './JuniorQuizCard';
import { ScienceCardModal } from './ScienceCardModal';
import { POPUP_TUTORIAL_STEP_PAUSE_MS } from './hudPopupQueue';
import { soundEngine } from '../utils/soundEngine';
import { narrativeVoice } from '../utils/narrativeVoice';

interface TutorialOverlayProps {
  tutorialStep: TutorialStepId;
  crystalsCollected: number;
  roverName: string;
  renderMode?: 'banner-only' | 'modals-only' | 'all';
  onAdvanceStep: (next: TutorialStepId) => void;
  onCompleteTutorialQuiz: () => void;
  onUnlockCard: (cardId: string) => void;
  onOpenMap: () => void;
  reducedMotion: boolean;
}

const ACT1_POSTCARDS = [
  { sol: 3, text: 'Lucía finds striped rocks near the crater.' },
  { sol: 8, text: "Rafi's first tomato seed pops up!" },
  { sol: 12, text: 'Message from Earth: The sky looks calm for now. (Sent 12 minutes ago.)' },
  { sol: 17, text: 'Kenji checks Tank 2 again. It is a little lower than Tank 1.' },
];

export function TutorialOverlay({
  tutorialStep,
  crystalsCollected,
  roverName,
  renderMode = 'all',
  onAdvanceStep,
  onCompleteTutorialQuiz,
  onUnlockCard,
  onOpenMap,
  reducedMotion,
}: TutorialOverlayProps) {
  const [airCardStage, setAirCardStage] = useState<'none' | 'air' | 'sol'>('none');
  const [act1Phase, setAct1Phase] = useState<'normal' | 'sunset-log' | 'postcards'>('normal');
  const [postcardIdx, setPostcardIdx] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(true);
  const firstStepRef = useRef(true);

  // Time-lapse Sols 2-20: 4 seconds each, auto-advance or skip (Bible Section 5.1)
  useEffect(() => {
    if (act1Phase !== 'postcards') return;
    const timer = window.setTimeout(() => {
      if (postcardIdx < ACT1_POSTCARDS.length - 1) {
        setPostcardIdx((prev) => prev + 1);
      } else {
        soundEngine.playMissionStart();
        onAdvanceStep('complete');
      }
    }, reducedMotion ? 2500 : 4000);
    return () => window.clearTimeout(timer);
  }, [act1Phase, postcardIdx, onAdvanceStep, reducedMotion]);

  // Synthesized Rusty beep + Web Speech Voice + 600 ms calm gap when advancing between tutorial instruction banners
  // Only the banner slot orchestrates speech to avoid duplicate mount cancellation
  useEffect(() => {
    if (renderMode === 'modals-only') return;
    if (tutorialStep === 'complete') return;
    soundEngine.playRoverBeep(tutorialStep === 'jump-crystals' ? 'happy' : 'ok');

    // Speak the step instruction line directly without fragile delayed timers
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

  const StepIcon =
    tutorialStep === 'move'
      ? Footprints
      : tutorialStep === 'jump-crystals'
        ? ArrowUpFromLine
        : tutorialStep === 'inspect-rover' || tutorialStep === 'inspect-oxygen'
          ? Search
          : Sparkles;

  const showBannerSlot = renderMode === 'all' || renderMode === 'banner-only';
  const showModalSlot = renderMode === 'all' || renderMode === 'modals-only';
  const isInlineStep =
    tutorialStep !== 'gravity-card' &&
    tutorialStep !== 'tutorial-quiz' &&
    tutorialStep !== 'crew-map-intro';

  return (
    <>
      {/* Top-Center In-Flow Rusty Tutorial Banner (never overlaps Top-Left Vitals) */}
      {showBannerSlot && isInlineStep && bannerVisible && (
        <motion.div
          key={tutorialStep}
          initial={reducedMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto w-full max-w-[420px] rounded-xl border border-[#22C55E]/60 bg-[#071324]/92 px-3.5 py-2.5 text-[#F8F9FA] shadow-[0_0_24px_rgba(34,197,94,0.22)] font-[family-name:var(--font-game)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#22C55E]">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                Training · Step {stepInfo.stepNumber} of {stepInfo.totalSteps}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  narrativeVoice.speakTutorialStep(tutorialStep);
                }}
                title="Listen to Rusty"
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
                {roverName}: &ldquo;{stepInfo.rustyLine}&rdquo;
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#F8F9FA]/88">
                {stepInfo.actionPrompt}
              </p>
            </div>
          </div>

          {tutorialStep === 'jump-crystals' && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[#38BDF8]/40 bg-[#0D213B]/85 px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#38BDF8]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Gravity Crystals</span>
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
          )}
        </motion.div>
      )}

      {/* Step 4: Mars Gravity Science Card */}
      {showModalSlot && tutorialStep === 'gravity-card' && (
        <ScienceCardModal
          card={JUNIOR_SCIENCE_CARDS['tut-gravity']}
          continueLabel="Check Oxygen Tank →"
          reducedMotion={reducedMotion}
          onContinue={() => {
            onUnlockCard('tut-gravity');
            onAdvanceStep('inspect-oxygen');
          }}
        />
      )}

      {/* Step 5B: Tutorial Quiz -> Mars Air & A Mars Day Science Cards */}
      {showModalSlot && tutorialStep === 'tutorial-quiz' && airCardStage === 'none' && (
        <JuniorQuizCard
          quiz={JUNIOR_TUTORIAL_QUIZ}
          roverName={roverName}
          continueLabel="See Mars Air Fact"
          reducedMotion={reducedMotion}
          onPassed={() => setAirCardStage('air')}
        />
      )}

      {showModalSlot && tutorialStep === 'tutorial-quiz' && airCardStage === 'air' && (
        <ScienceCardModal
          card={JUNIOR_SCIENCE_CARDS['tut-air']}
          continueLabel="Next: What is a Sol?"
          reducedMotion={reducedMotion}
          onContinue={() => {
            onUnlockCard('tut-air');
            setAirCardStage('sol');
          }}
          onSkip={() => {
            setAirCardStage('none');
            onCompleteTutorialQuiz();
          }}
        />
      )}

      {showModalSlot && tutorialStep === 'tutorial-quiz' && airCardStage === 'sol' && (
        <ScienceCardModal
          card={JUNIOR_SCIENCE_CARDS['tut-sol']}
          continueLabel="Meet Your Crew →"
          reducedMotion={reducedMotion}
          onContinue={() => {
            setAirCardStage('none');
            onCompleteTutorialQuiz();
          }}
          onSkip={() => {
            setAirCardStage('none');
            onCompleteTutorialQuiz();
          }}
        />
      )}

      {/* Step 6: Crew & Habitat Home Intro */}
      {showModalSlot && tutorialStep === 'crew-map-intro' && act1Phase === 'normal' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#040A15]/72 p-4 backdrop-blur-[2px]">
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="tut-home-title"
            initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#22C55E]/60 bg-[#071324]/96 text-[#F8F9FA] shadow-[0_0_36px_rgba(34,197,94,0.24)] font-[family-name:var(--font-game)]"
          >
            <div className="h-1 w-full bg-gradient-to-r from-[#22C55E] via-[#FFB703] to-[#38BDF8]" />

            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#22C55E]">
                <Bot className="h-4 w-4" aria-hidden="true" />
                <span>{roverName}: &ldquo;This home keeps our crew safe.&rdquo;</span>
              </div>

              <h3
                id="tut-home-title"
                className="mt-2 font-[family-name:var(--font-display)] text-xl font-extrabold text-[#F8F9FA] sm:text-2xl"
              >
                Your Mars Home &amp; Crew
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#F8F9FA]/90">
                Outside Mars has thin, unbreathable air, so our sealed Habitat, Water Tanks,
                Solar Farm, and Greenhouse protect all 4 crew members!
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CREW_PROFILES.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1B3A5F]/55 px-3 py-2"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold text-[#0B1D36]"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-[#F8F9FA]">
                        {member.name}
                      </p>
                      <p className="truncate text-[11px] font-bold text-[#FFB703]">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#22C55E]/45 bg-[#1B3A5F]/65 px-3.5 py-2.5 text-xs font-bold text-[#22C55E]">
                <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {roverName}: &ldquo;Great job! You learned the controls and checked our systems. Let&apos;s watch the Sol 1 sunset!&rdquo;
                </span>
              </div>

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
                    soundEngine.playSpeakerChime('rusty');
                    setAct1Phase('sunset-log');
                  }}
                  className="inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-5 py-2 text-xs font-extrabold text-[#0B1D36] shadow-xl transition-transform hover:scale-[1.02]"
                >
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  <span>Sol 1 Sunset Log</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.section>
        </div>
      )}

      {/* Step 7: Sol 1 Sunset Log Modal (Bible Section 5.1 / S1.7) */}
      {showModalSlot && tutorialStep === 'crew-map-intro' && act1Phase === 'sunset-log' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#040A15]/78 p-4 backdrop-blur-[3px]">
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sunset-log-title"
            initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#38BDF8]/60 bg-[#071324]/96 text-[#F8F9FA] shadow-[0_0_36px_rgba(56,189,248,0.25)] font-[family-name:var(--font-game)]"
          >
            <div className="h-1 w-full bg-gradient-to-r from-[#38BDF8] via-[#FFB703] to-[#E85D04]" />
            <div className="p-6">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#38BDF8]">
                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  <span id="sunset-log-title">Sol 01 · Sunset Log</span>
                </span>
                <span className="text-[11px] text-[#F8F9FA]/60">Ares Crater Outpost</span>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#22C55E]/40 bg-[#0D213B]/80 px-3.5 py-2 text-xs font-bold text-[#22C55E]">
                <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{roverName}: &ldquo;This is our home. Everyone is safe inside.&rdquo;</span>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-[#040A15]/80 p-4">
                <p className="text-xs uppercase tracking-wider text-[#FFB703] font-bold">Commander&apos;s Evening Log</p>
                <p className="mt-1.5 text-sm sm:text-base italic leading-relaxed text-[#F8F9FA]">
                  &ldquo;Sol 1. We are home. The crew is great. Tank 2 made a funny little noise.&rdquo;
                </p>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-[#F8F9FA]/70">
                The sky turns a calm Martian blue around the setting Sun. Time to rest before routine outpost maintenance.
              </p>

              <div className="mt-5 flex justify-end">
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
                  <span>SLEEP (TIME-LAPSE SOLS 2–20)</span>
                </button>
              </div>
            </div>
          </motion.section>
        </div>
      )}

      {/* Step 8: Sols 2-20 Time-Lapse Postcards (Bible Section 5.1 / S1.8) */}
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
                  <span>Sol {ACT1_POSTCARDS[postcardIdx].sol} Postcard</span>
                </span>
                <span className="text-[11px] text-[#F8F9FA]/60">
                  {postcardIdx + 1} of {ACT1_POSTCARDS.length}
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-[#040A15]/85 p-5 text-center">
                <p className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-extrabold text-[#F8F9FA] leading-snug">
                  &ldquo;{ACT1_POSTCARDS[postcardIdx].text}&rdquo;
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
                  className="min-h-[40px] cursor-pointer rounded-xl border border-white/20 bg-[#1B3A5F]/60 px-4 text-xs font-bold text-[#F8F9FA]/80 hover:border-[#FFB703]"
                >
                  Skip Time-Lapse
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
                  <span>{postcardIdx < ACT1_POSTCARDS.length - 1 ? 'Next Sol' : 'Start Sol 21'}</span>
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
