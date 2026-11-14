import { motion, AnimatePresence } from 'motion/react';
import {
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Subtitles,
  Sun,
} from 'lucide-react';
import { PROLOGUE_DURATION_SEC, PROLOGUE_SCENES } from '../data/missionData';

interface PrologueHUDProps {
  elapsed: number;
  paused: boolean;
  onTogglePause: () => void;
  onReplay: () => void;
  onSkip: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  subtitlesEnabled: boolean;
  onToggleSubtitles: () => void;
  reducedMotion: boolean;
}

export function PrologueHUD({
  elapsed,
  paused,
  onTogglePause,
  onReplay,
  onSkip,
  soundEnabled,
  onToggleSound,
  subtitlesEnabled,
  onToggleSubtitles,
  reducedMotion,
}: PrologueHUDProps) {
  const activeScene =
    PROLOGUE_SCENES.find((s) => elapsed >= s.startSec && elapsed < s.endSec) ??
    PROLOGUE_SCENES[PROLOGUE_SCENES.length - 1];
  const progressPct = Math.min(100, Math.max(0, (elapsed / PROLOGUE_DURATION_SEC) * 100));

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between font-[family-name:var(--font-game)]">
      {/* Subtle Widescreen Cinematic Letterbox Top Bar */}
      <div className="pointer-events-auto border-b border-white/10 bg-[#071324]/95 px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          {/* Scene Indicator & Progress */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#FFB703]">
                Story · Scene 0{activeScene.id} / 0{PROLOGUE_SCENES.length}
              </span>
              <span className="text-white/25" aria-hidden="true">
                |
              </span>
              <span className="text-xs font-bold text-[#F8F9FA]">
                {activeScene.title}
              </span>
            </div>
            <div className="h-1.5 w-52 overflow-hidden rounded-full bg-[#1B3A5F] sm:w-72">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FFB703] to-[#E85D04] transition-[width] duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Cinematic Playback & Accessibility Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onTogglePause}
              aria-label={paused ? 'Resume cinematic' : 'Pause cinematic'}
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-white/15 bg-[#1B3A5F]/80 px-3 text-xs font-bold text-[#F8F9FA] transition-colors hover:border-[#FFB703] focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer"
            >
              {paused ? (
                <Play className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
              ) : (
                <Pause className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
              )}
              <span className="hidden md:inline">{paused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              type="button"
              onClick={onReplay}
              aria-label="Replay prologue"
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-white/15 bg-[#1B3A5F]/80 px-3 text-xs font-bold text-[#F8F9FA] transition-colors hover:border-[#FFB703] focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
              <span className="hidden lg:inline">Replay</span>
            </button>

            <button
              type="button"
              onClick={onToggleSound}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? 'Mute cinematic audio' : 'Unmute cinematic audio'}
              className={`inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer ${
                soundEnabled
                  ? 'border-[#FFB703] bg-[#0B1D36] text-[#FFB703]'
                  : 'border-white/15 bg-[#1B3A5F]/80 text-[#F8F9FA]/85 hover:border-[#FFB703]'
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden md:inline">{soundEnabled ? 'Sound On' : 'Mute'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleSubtitles}
              aria-pressed={subtitlesEnabled}
              aria-label={subtitlesEnabled ? 'Hide captions' : 'Show captions'}
              className={`inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer ${
                subtitlesEnabled
                  ? 'border-[#FFB703]/70 bg-[#0B1D36] text-[#FFB703]'
                  : 'border-white/15 bg-[#1B3A5F]/80 text-[#F8F9FA]/80 hover:border-[#FFB703]'
              }`}
            >
              <Subtitles className="h-4 w-4" aria-hidden="true" />
              <span className="hidden lg:inline">Captions</span>
            </button>

            <button
              type="button"
              onClick={onSkip}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-4 py-2 text-xs font-extrabold text-[#0B1D36] shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer"
            >
              <span>Skip Story</span>
              <FastForward className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle Scene 4 Space Weather Advisory Banner */}
      <div className="flex flex-col items-center px-4">
        <AnimatePresence>
          {activeScene.advisory && (
            <motion.div
              key="space-weather-advisory"
              initial={reducedMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="inline-flex items-center gap-2.5 rounded-2xl border border-[#FFB703]/55 bg-[#0B1D36]/92 px-4 py-2.5 shadow-xl"
            >
              <Sun className="h-4 w-4 shrink-0 text-[#FFB703]" aria-hidden="true" />
              <span className="text-xs font-bold text-[#FFB703] sm:text-sm">
                {activeScene.advisory}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Cinematic Letterbox + Timed Storytelling Caption */}
      <div className="border-t border-white/10 bg-[#071324]/95 px-4 py-4 sm:px-8 sm:py-5">
        <div className="mx-auto flex min-h-[56px] max-w-3xl items-center justify-center text-center">
          <AnimatePresence mode="wait">
            {subtitlesEnabled && (
              <motion.p
                key={activeScene.id}
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                aria-live="polite"
                className={`font-bold text-[#F8F9FA] ${
                  activeScene.id === 5
                    ? 'text-xl text-[#FFB703] sm:text-2xl'
                    : 'text-lg sm:text-xl'
                }`}
              >
                {activeScene.caption}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
