import { useEffect, useRef, useState } from 'react';
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

const INTRO_VIDEO_SRC = '/assets/aistudio/sol-commandor-intro_721a1330.mp4';
const DEFAULT_DURATION_SEC = 29;

interface VideoCue {
  id: number;
  startSec: number;
  endSec: number;
  title: string;
  caption: string;
  advisory?: string;
}

const INTRO_VIDEO_CUES: VideoCue[] = [
  {
    id: 1,
    startSec: 0,
    endSec: 5.4,
    title: 'Earth Liftoff',
    caption: 'Ignition confirmed! Crew 03 launches from Earth toward Mars.',
  },
  {
    id: 2,
    startSec: 5.4,
    endSec: 9.8,
    title: 'Mars Touchdown',
    caption: 'Retro-thrusters firing — descending onto Ares Crater Outpost!',
  },
  {
    id: 3,
    startSec: 9.8,
    endSec: 14.6,
    title: 'A New World',
    caption: 'A new world. A new beginning. Here, every bit of power matters.',
  },
  {
    id: 4,
    startSec: 14.6,
    endSec: 18.2,
    title: 'Your Crew Awaits',
    caption: 'Your crew is counting on you, Commander.',
  },
  {
    id: 5,
    startSec: 18.2,
    endSec: 40,
    title: 'Lead the Mission',
    caption: 'The Sun can change everything. Every decision you make matters.',
    advisory: 'Space Weather Watch: Solar winds & dust storms lie ahead.',
  },
];

function formatTimeSec(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface PrologueHUDProps {
  paused: boolean;
  replayToken: number;
  onTogglePause: () => void;
  onReplay: () => void;
  onSkip: () => void;
  onComplete: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  subtitlesEnabled: boolean;
  onToggleSubtitles: () => void;
  reducedMotion: boolean;
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
  subtitlesEnabled,
  onToggleSubtitles,
  reducedMotion,
}: PrologueHUDProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_DURATION_SEC);
  const [mutedByAutoplayPolicy, setMutedByAutoplayPolicy] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const safePlay = async (video: HTMLVideoElement, wantSound: boolean) => {
    video.muted = !wantSound;
    try {
      await video.play();
      setMutedByAutoplayPolicy(false);
    } catch {
      // If unmuted autoplay is blocked in an embedded context, fall back to muted autoplay cleanly
      video.muted = true;
      setMutedByAutoplayPolicy(wantSound);
      try {
        await video.play();
      } catch {
        // Ignore if user interaction is still pending
      }
    }
  };

  // Start / replay from 0:00 whenever replayToken updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setVideoError(false);
    setCurrentTime(0);
    video.currentTime = 0;
    if (!paused) {
      void safePlay(video, soundEnabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayToken]);

  // Sync Pause / Resume
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
    } else {
      void safePlay(video, soundEnabled && !mutedByAutoplayPolicy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // Sync Sound On / Mute toggle from HUD
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!soundEnabled) {
      video.muted = true;
      setMutedByAutoplayPolicy(false);
    } else {
      video.muted = false;
      if (!paused && video.paused) {
        void safePlay(video, true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled]);

  const handleUnmuteFallback = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setMutedByAutoplayPolicy(false);
    if (!paused && video.paused) {
      void video.play();
    }
  };

  const activeCue =
    INTRO_VIDEO_CUES.find((c) => currentTime >= c.startSec && currentTime < c.endSec) ??
    INTRO_VIDEO_CUES[INTRO_VIDEO_CUES.length - 1];
  const progressPct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between bg-[#040812] font-[family-name:var(--font-game)]">
      {/* Fullscreen Mission Intro Cinematic Video */}
      <video
        ref={videoRef}
        src={INTRO_VIDEO_SRC}
        playsInline
        preload="auto"
        muted={!soundEnabled || mutedByAutoplayPolicy}
        onLoadedMetadata={(ev) => {
          const d = ev.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onTimeUpdate={(ev) => {
          setCurrentTime(ev.currentTarget.currentTime);
        }}
        onEnded={onComplete}
        onError={() => setVideoError(true)}
        className="pointer-events-none absolute inset-0 h-full w-full object-contain bg-[#040812]"
      />

      {/* Subtle Widescreen Cinematic Header Controls */}
      <div className="pointer-events-auto relative z-10 border-b border-white/10 bg-[#071324]/90 px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          {/* Scene Indicator & Progress */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3 tabular-nums">
              <span className="text-xs font-bold text-[#FFB703]">
                Mission Intro · {formatTimeSec(currentTime)} / {formatTimeSec(duration)}
              </span>
              <span className="text-white/25" aria-hidden="true">
                |
              </span>
              <span className="text-xs font-bold text-[#F8F9FA]">
                {activeCue.title}
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
            {mutedByAutoplayPolicy && soundEnabled && (
              <button
                type="button"
                onClick={handleUnmuteFallback}
                className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-[#FFB703] bg-[#0B1D36] px-3 text-xs font-extrabold text-[#FFB703] transition-colors hover:bg-[#1B3A5F] whitespace-nowrap cursor-pointer"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>Tap for Sound</span>
              </button>
            )}

            <button
              type="button"
              onClick={onTogglePause}
              aria-label={paused ? 'Resume intro video' : 'Pause intro video'}
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
              aria-label="Replay intro video"
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-white/15 bg-[#1B3A5F]/80 px-3 text-xs font-bold text-[#F8F9FA] transition-colors hover:border-[#FFB703] focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
              <span className="hidden lg:inline">Replay</span>
            </button>

            <button
              type="button"
              onClick={onToggleSound}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? 'Mute intro audio' : 'Unmute intro audio'}
              className={`inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer ${
                soundEnabled && !mutedByAutoplayPolicy
                  ? 'border-[#FFB703] bg-[#0B1D36] text-[#FFB703]'
                  : 'border-white/15 bg-[#1B3A5F]/80 text-[#F8F9FA]/85 hover:border-[#FFB703]'
              }`}
            >
              {soundEnabled && !mutedByAutoplayPolicy ? (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden md:inline">
                {soundEnabled && !mutedByAutoplayPolicy ? 'Sound On' : 'Mute'}
              </span>
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
              <span>Skip Intro</span>
              <FastForward className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Subtle Space Weather Advisory / Playback Error Recovery */}
      <div className="pointer-events-none relative z-10 flex flex-col items-center gap-3 px-4">
        {videoError && (
          <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl border border-[#FFB703]/55 bg-[#071324]/95 p-5 text-center shadow-2xl">
            <p className="text-sm font-bold text-[#F8F9FA]">
              Mission launch feed ready — proceed directly to your Mars briefing.
            </p>
            <button
              type="button"
              onClick={onSkip}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-5 py-2 text-xs font-extrabold text-[#0B1D36] shadow-lg cursor-pointer"
            >
              <span>Continue to Briefing</span>
              <FastForward className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <AnimatePresence>
          {activeCue.advisory && !videoError && (
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
                {activeCue.advisory}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Cinematic Caption Bar */}
      <div className="pointer-events-auto relative z-10 border-t border-white/10 bg-[#071324]/90 px-4 py-3.5 sm:px-8 sm:py-4">
        <div className="mx-auto flex min-h-[48px] max-w-3xl items-center justify-center text-center">
          <AnimatePresence mode="wait">
            {subtitlesEnabled && (
              <motion.p
                key={activeCue.id}
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28 }}
                aria-live="polite"
                className={`font-bold text-[#F8F9FA] ${
                  activeCue.id === 5
                    ? 'text-base text-[#FFB703] sm:text-xl'
                    : 'text-base sm:text-lg'
                }`}
              >
                {activeCue.caption}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
