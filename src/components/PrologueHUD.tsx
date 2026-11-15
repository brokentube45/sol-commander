import { useEffect, useRef, useState } from 'react';
import { FastForward, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

export const PROLOGUE_DURATION_SEC = 60; // generous upper bound; actual video length drives completion

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
  onElapsedTick?: (elapsedSec: number) => void;
}

export function PrologueHUD({
  paused,
  replayToken,
  onTogglePause,
  onReplay,
  onSkip,
  onComplete,
  soundEnabled,
  onToggleSound,
  reducedMotion,
  onElapsedTick,
}: PrologueHUDProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const hasCompletedRef = useRef(false);

  // Reset on replay
  useEffect(() => {
    hasCompletedRef.current = false;
    setVideoError(false);
    setElapsed(0);
    const vid = videoRef.current;
    if (vid) {
      vid.currentTime = 0;
      vid.play().catch(() => setVideoError(true));
    }
    onElapsedTick?.(0);
  }, [replayToken, onElapsedTick]);

  // Pause / play sync
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (paused) {
      vid.pause();
    } else {
      vid.play().catch(() => setVideoError(true));
    }
  }, [paused]);

  // Keyboard: Space/K = pause, Enter/Escape = skip
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault();
        onTogglePause();
      } else if (e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onTogglePause, onSkip]);

  const handleVideoEnded = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete();
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setElapsed(vid.currentTime);
    onElapsedTick?.(vid.currentTime);
  };

  const handleLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setDuration(vid.duration);
    vid.play().catch(() => setVideoError(true));
  };

  const handleError = () => {
    setVideoError(true);
  };

  const progressPercent = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

  function formatTime(sec: number) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  // Fallback: if video fails, auto-advance after short delay
  useEffect(() => {
    if (!videoError) return;
    soundEngine.playSpeakerChime('rusty');
    const tid = window.setTimeout(() => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete();
      }
    }, reducedMotion ? 3000 : 10000);
    return () => window.clearTimeout(tid);
  }, [videoError, onComplete, reducedMotion]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col font-[family-name:var(--font-game)] select-none">

      {/* Top bar */}
      <div className="pointer-events-auto flex h-14 w-full shrink-0 items-center justify-between border-b border-white/10 bg-[#040A15]/95 px-5 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E85D04] opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#E85D04]" />
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-[#FFB703]">
            SOL COMMANDER · INTRO
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-[#1B3A5F]/60 text-[#F8F9FA] hover:border-[#FFB703] transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-red-400" />}
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-[32px] cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-[#1B3A5F]/70 px-3.5 text-xs font-bold text-[#F8F9FA] hover:border-[#FFB703] transition-colors"
          >
            <span>Skip [Esc]</span>
            <FastForward className="h-3.5 w-3.5 text-[#FFB703]" />
          </button>
        </div>
      </div>

      {/* Video area */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {!videoError ? (
          <video
            ref={videoRef}
            src="/sol-commandor-intro.mp4"
            className="h-full w-full object-contain"
            playsInline
            muted={!soundEnabled}
            onEnded={handleVideoEnded}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleError}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center px-8">
            <span className="text-5xl">🚀</span>
            <p className="font-[family-name:var(--font-display)] text-2xl font-black text-[#FFB703]">
              SOL COMMANDER
            </p>
            <p className="text-sm text-[#F8F9FA]/70">88 days on Mars. Your crew needs you, Commander.</p>
            <button
              type="button"
              onClick={onSkip}
              className="pointer-events-auto mt-4 inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#E85D04] to-[#FFB703] px-8 font-[family-name:var(--font-display)] text-sm font-black text-[#0B1D36] shadow-xl"
            >
              Continue →
            </button>
          </div>
        )}
      </div>

      {/* Bottom controls (only when video loads) */}
      {!videoError && (
        <div className="pointer-events-auto flex h-16 w-full shrink-0 flex-col justify-between border-t border-white/10 bg-[#040A15]/95 px-5 py-2.5 shadow-2xl">
          <div className="w-full overflow-hidden rounded-full bg-white/10 h-1.5">
            <div
              className="h-full bg-gradient-to-r from-[#22C55E] via-[#FFB703] to-[#E85D04] transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-[#F8F9FA]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onTogglePause}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFB703] text-[#0B1D36] hover:scale-105 transition-transform cursor-pointer text-xs font-black"
                title={paused ? 'Resume [Space]' : 'Pause [Space]'}
              >
                {paused ? '▶' : '⏸'}
              </button>

              <button
                type="button"
                onClick={onReplay}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-[#1B3A5F]/70 text-[#F8F9FA] hover:border-[#FFB703] transition-colors cursor-pointer text-xs"
                title="Restart"
              >
                ↺
              </button>

              <span className="tabular-nums text-[#F8F9FA]/60 text-xs">
                {formatTime(elapsed)}{duration > 0 ? ` / ${formatTime(duration)}` : ''}
              </span>
            </div>

            <span className="text-[11px] text-[#F8F9FA]/40 hidden sm:inline">
              Press Esc to skip
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
