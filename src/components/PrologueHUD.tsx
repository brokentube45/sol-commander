import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FastForward } from 'lucide-react';
import { BIBLE_S02_CAPTIONS, formatWithRoverName } from '../sim/storyBeats';
import { soundEngine } from '../utils/soundEngine';

export const PROLOGUE_DURATION_SEC = 28;

interface PrologueHUDProps {
  paused: boolean;
  replayToken: number;
  onTogglePause: () => void;
  onReplay: () => void;
  onSkip: () => void;
  onComplete: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  reducedMotion: boolean;
  roverName?: string;
  onElapsedTick?: (elapsedSec: number) => void;
}

export function PrologueHUD({
  paused,
  replayToken,
  onComplete,
  reducedMotion,
  roverName = 'Rusty',
  onElapsedTick,
}: PrologueHUDProps) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [closingCard, setClosingCard] = useState(false);
  const hasCompletedRef = useRef(false);
  const onElapsedTickRef = useRef(onElapsedTick);
  onElapsedTickRef.current = onElapsedTick;

  const triggerMissionBeginsBanner = useCallback(() => {
    if (closingCard || hasCompletedRef.current) return;
    soundEngine.playMissionStart();
    setClosingCard(true);
  }, [closingCard]);

  const finishPrologue = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Auto-advance to Briefing after the top/bottom black shutters close into a full black screen and display the mission title
  useEffect(() => {
    if (!closingCard) return;
    const tid = window.setTimeout(
      () => {
        finishPrologue();
      },
      reducedMotion ? 2800 : 5200,
    );
    return () => window.clearTimeout(tid);
  }, [closingCard, finishPrologue, reducedMotion]);

  // Reset and start on mount or replayToken change
  useEffect(() => {
    hasCompletedRef.current = false;
    setElapsedSec(0);
    setClosingCard(false);
    onElapsedTickRef.current?.(0);
  }, [replayToken]);

  // Real-time 28 s in-engine Three.js cinematic timer
  useEffect(() => {
    if (closingCard || paused) return;
    const interval = window.setInterval(() => {
      setElapsedSec((prev) => {
        const next = Math.min(PROLOGUE_DURATION_SEC, prev + 0.1);
        onElapsedTickRef.current?.(next);
        if (next >= PROLOGUE_DURATION_SEC) {
          window.clearInterval(interval);
          triggerMissionBeginsBanner();
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [closingCard, paused, triggerMissionBeginsBanner]);

  // Keyboard: Escape or Enter triggers the closing mission banner (or finishes immediately if already in banner)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Enter') {
        e.preventDefault();
        if (closingCard) {
          finishPrologue();
        } else {
          triggerMissionBeginsBanner();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closingCard, finishPrologue, triggerMissionBeginsBanner]);

  const currentShot =
    BIBLE_S02_CAPTIONS.find(
      (shot) => elapsedSec >= shot.startSec && elapsedSec < shot.endSec,
    ) ?? BIBLE_S02_CAPTIONS[BIBLE_S02_CAPTIONS.length - 1];

  return (
    <div className="pointer-events-none fixed inset-0 z-30 h-screen w-screen overflow-hidden bg-transparent font-[family-name:var(--font-game)] select-none">
      {/* In-engine 28 s Three.js Cinematic Captions (Bible S0.2) */}
      {!closingCard && currentShot && (
        <div className="pointer-events-none fixed inset-x-0 bottom-8 z-40 flex flex-col items-center px-6">
          <div className="rounded-2xl border border-[#FFB703]/45 bg-[#040A15]/82 px-6 py-3 text-center shadow-2xl backdrop-blur-md">
            <p className="font-[family-name:var(--font-indicator)] text-[10px] font-extrabold uppercase tracking-[0.26em] text-[#FFB703]">
              SHOT {currentShot.shot} OF 7 · {Math.floor(elapsedSec)}s / 28s
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-extrabold tracking-wide text-[#F8F9FA] sm:text-2xl">
              {formatWithRoverName(currentShot.caption, roverName)}
            </p>
          </div>
        </div>
      )}

      {/* Single Game-Cutscene Skip Button (visible while video or fallback plays) */}
      {!closingCard && (
        <button
          type="button"
          onClick={triggerMissionBeginsBanner}
          aria-label="Skip Intro"
          className="pointer-events-auto fixed bottom-6 right-6 z-40 inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-lg border border-white/25 bg-[#040A15]/75 px-5 py-2 text-xs font-black uppercase tracking-widest text-[#F8F9FA] shadow-lg backdrop-blur-md transition-all hover:border-[#FFB703] hover:bg-[#0B1D36]/90 hover:text-[#FFB703]"
        >
          <span>Skip</span>
          <FastForward className="h-4 w-4 text-[#FFB703]" />
        </button>
      )}

      {/* Post-Video Top & Bottom Black Shutter Screen -> Seamless Full Black Screen + Mission Name */}
      <AnimatePresence>
        {closingCard && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={finishPrologue}
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center overflow-hidden cursor-pointer"
          >
            {/* Full-screen black fade layer so there is never a seam in the middle */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reducedMotion ? 0.25 : 1.15, ease: 'easeInOut' }}
              className="absolute inset-0 bg-black"
            />

            {/* Top Black Shutter sliding smoothly down (51% height overlaps center with zero line) */}
            <motion.div
              initial={reducedMotion ? { y: '0%' } : { y: '-100%' }}
              animate={{ y: '0%' }}
              transition={{ duration: reducedMotion ? 0.25 : 1.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-0 h-[51%] bg-black"
            />

            {/* Bottom Black Shutter sliding smoothly up (51% height overlaps center with zero line) */}
            <motion.div
              initial={reducedMotion ? { y: '0%' } : { y: '100%' }}
              animate={{ y: '0%' }}
              transition={{ duration: reducedMotion ? 0.25 : 1.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 bottom-0 h-[51%] bg-black"
            />

            {/* Center Mission Title Reveal */}
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: reducedMotion ? 0.25 : 0.9,
                delay: reducedMotion ? 0.1 : 0.95,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative z-10 flex flex-col items-center px-6 text-center"
            >
              <img
                src="/assets/sol-commander-icon.png"
                alt="Sol Commander icon"
                className="mb-3 h-14 w-14 rounded-full object-cover ring-2 ring-[#FFB703]/70 shadow-[0_0_30px_rgba(255,183,3,0.35)]"
              />

              <p className="font-[family-name:var(--font-indicator)] text-xs font-extrabold uppercase tracking-[0.32em] text-[#FFB703] sm:text-sm">
                YOUR MISSION BEGINS NOW
              </p>

              <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-black uppercase tracking-wider text-[#F8F9FA] drop-shadow-[0_0_24px_rgba(232,93,4,0.45)] sm:text-4xl md:text-5xl">
                SOL COMMANDER: 88 DAYS ON MARS
              </h1>

              <p className="mt-3 text-xs font-bold tracking-widest uppercase text-[#38BDF8] sm:text-sm">
                Act 1 · Settling In at Ares Crater Outpost
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
