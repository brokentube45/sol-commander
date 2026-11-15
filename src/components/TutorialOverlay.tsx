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
  const [bannerVisible, setBannerVisible] = useState(true);
  const firstStepRef = useRef(true);

  // Synthesized Rusty beep + Web Speech Voice + 600 ms calm gap when advancing between tutorial instruction banners
  // Only the banner slot orchestrates speech to avoid duplicate mount cancellation
  useEffect(() => {
    if (renderMode === 'modals-only') return;
    if (tutorialStep === 'complete') return;
    soundEngine.playRoverBeep(tutorialStep === 'jump-crystals' ? 'happy' : 'ok');

    const voiceTid = window.setTimeout(() => {
      narrativeVoice.speakTutorialStep(tutorialStep);
    }, 280);

    if (firstStepRef.current) {
      firstStepRef.current = false;
      setBannerVisible(true);
      return () => window.clearTimeout(voiceTid);
    }

    const isInlineBannerStep =
      tutorialStep !== 'gravity-card' &&
      tutorialStep !== 'tutorial-quiz' &&
      tutorialStep !== 'crew-map-intro';

    if (!isInlineBannerStep) {
      setBannerVisible(false);
      return () => window.clearTimeout(voiceTid);
    }

    setBannerVisible(false);
    const tid = window.setTimeout(() => {
      setBannerVisible(true);
    }, POPUP_TUTORIAL_STEP_PAUSE_MS);

    return () => {
      window.clearTimeout(voiceTid);
      window.clearTimeout(tid);
    };
  }, [tutorialStep]);

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

      {/* Step 6: Crew & Habitat Home Intro -> Unlock Mission 1 */}
      {showModalSlot && tutorialStep === 'crew-map-intro' && (
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

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#FFB703]/45 bg-[#1B3A5F]/65 px-3.5 py-2.5 text-xs font-bold text-[#FFB703]">
                <Wind className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Training complete! Wait—Rafi just spotted an alert at Oxygen Tank 2. Let&apos;s
                  start Mission 1!
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
                    soundEngine.playMissionStart();
                    onAdvanceStep('complete');
                  }}
                  className="inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-5 py-2 text-xs font-extrabold text-[#0B1D36] shadow-xl transition-transform hover:scale-[1.02]"
                >
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span>Start Mission 1: Whisper in Tank 2</span>
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
