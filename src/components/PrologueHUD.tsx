import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';

const INTRO_VIDEO_SRC = '/assets/aistudio/sol-commandor-intro_721a1330.mp4';
const DEFAULT_DURATION_SEC = 23.835;

interface VideoCue {
  id: number;
  startSec: number;
  endSec: number;
  title: string;
}

const INTRO_VIDEO_CUES: VideoCue[] = [
  {
    id: 1,
    startSec: 0,
    endSec: 5.4,
    title: 'Earth Liftoff',
  },
  {
    id: 2,
    startSec: 5.4,
    endSec: 9.8,
    title: 'Mars Touchdown',
  },
  {
    id: 3,
    startSec: 9.8,
    endSec: 14.6,
    title: 'A New World',
  },
  {
    id: 4,
    startSec: 14.6,
    endSec: 18.2,
    title: 'Your Crew Awaits',
  },
  {
    id: 5,
    startSec: 18.2,
    endSec: 40,
    title: 'Lead the Mission',
  },
];

type EndingStage = 'playing' | 'curtain' | 'tagline' | 'title';

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
  reducedMotion,
}: PrologueHUDProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mountedRef = useRef(false);
  const endingTriggeredRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_DURATION_SEC);
  const [mutedByAutoplayPolicy, setMutedByAutoplayPolicy] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [endingStage, setEndingStage] = useState<EndingStage>('playing');

  const safePlay = async (video: HTMLVideoElement, wantSound: boolean) => {
    video.muted = !wantSound;
    try {
      await video.play();
      setMutedByAutoplayPolicy(false);
      setNeedsManualPlay(false);
    } catch {
      // If unmuted autoplay is blocked, fall back to muted autoplay cleanly
      video.muted = true;
      setMutedByAutoplayPolicy(wantSound);
      try {
        await video.play();
        setNeedsManualPlay(false);
      } catch {
        // Browser requires direct user tap on the video surface
        setNeedsManualPlay(true);
      }
    }
  };

  // Start / replay from 0:00 whenever replayToken updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    endingTriggeredRef.current = false;
    setEndingStage('playing');
    setVideoError(false);
    setNeedsManualPlay(false);
    setCurrentTime(0);
    video.currentTime = 0;
    if (!paused) {
      void safePlay(video, soundEnabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayToken]);

  // Sync Pause / Resume (skip initial mount to avoid racing replayToken effect)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const video = videoRef.current;
    if (!video || endingStage !== 'playing') return;
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
      setMutedByAutoplayPolicy(false);
      if (!paused && video.paused && endingStage === 'playing') {
        void safePlay(video, true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled]);

  // Sequenced cinematic ending timers once the video reaches the end
  useEffect(() => {
    if (endingStage === 'playing') return;

    const curtainDurationMs = reducedMotion ? 150 : 850;
    const taglineHoldMs = reducedMotion ? 600 : 1200;
    const titleHoldMs = reducedMotion ? 1200 : 2500;

    if (endingStage === 'curtain') {
      const t = window.setTimeout(() => setEndingStage('tagline'), curtainDurationMs);
      return () => window.clearTimeout(t);
    }
    if (endingStage === 'tagline') {
      const t = window.setTimeout(() => setEndingStage('title'), taglineHoldMs);
      return () => window.clearTimeout(t);
    }
    if (endingStage === 'title') {
      const t = window.setTimeout(() => onComplete(), titleHoldMs);
      return () => window.clearTimeout(t);
    }
  }, [endingStage, onComplete, reducedMotion]);

  const startEndingSequence = () => {
    if (endingTriggeredRef.current) return;
    endingTriggeredRef.current = true;
    setEndingStage('curtain');
  };

  const handleUnmuteFallback = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setMutedByAutoplayPolicy(false);
    if (!paused && video.paused && endingStage === 'playing') {
      void video.play();
    }
  };

  const handleManualPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    setNeedsManualPlay(false);
    void safePlay(video, soundEnabled);
  };

  const handleRetryVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    setVideoError(false);
    video.load();
    void safePlay(video, soundEnabled);
  };

  const activeCue =
    INTRO_VIDEO_CUES.find((c) => currentTime >= c.startSec && currentTime < c.endSec) ??
    INTRO_VIDEO_CUES[INTRO_VIDEO_CUES.length - 1];
  const progressPct =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const isEnding = endingStage !== 'playing';

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between overflow-hidden bg-[#040812] font-[family-name:var(--font-game)]">
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
        onEnded={startEndingSequence}
        onError={() => setVideoError(true)}
        className="pointer-events-none absolute inset-0 h-full w-full bg-[#040812] object-cover object-center"
      />

      {/* Top & Bottom Black Letterbox Curtains closing to full black screen at video ending */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ height: isEnding ? '50.5%' : '0%' }}
        transition={{
          duration: reducedMotion ? 0.12 : 0.85,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-black"
      />
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ height: isEnding ? '50.5%' : '0%' }}
        transition={{
          duration: reducedMotion ? 0.12 : 0.85,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-black"
      />

      {/* Subtle Widescreen Cinematic Header Controls (fades out cleanly during ending curtains) */}
      <motion.div
        initial={false}
        animate={{ opacity: isEnding ? 0 : 1 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.35 }}
        className={`relative z-10 border-b border-white/10 bg-[#071324]/88 px-4 py-3 sm:px-8 ${
          isEnding ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
      >
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
              <span className="text-xs font-bold text-[#F8F9FA]">{activeCue.title}</span>
            </div>
            <div className="h-1.5 w-52 overflow-hidden rounded-full bg-[#1B3A5F] sm:w-72">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FFB703] to-[#E85D04] transition-[width] duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Cinematic Playback Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {mutedByAutoplayPolicy && soundEnabled && (
              <button
                type="button"
                onClick={handleUnmuteFallback}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#FFB703] bg-[#0B1D36] px-3 text-xs font-extrabold text-[#FFB703] transition-colors hover:bg-[#1B3A5F]"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>Tap for Sound</span>
              </button>
            )}

            <button
              type="button"
              onClick={onTogglePause}
              aria-label={paused ? 'Resume intro video' : 'Pause intro video'}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/15 bg-[#1B3A5F]/80 px-3 text-xs font-bold text-[#F8F9FA] transition-colors hover:border-[#FFB703] focus-visible:outline-2 focus-visible:outline-[#FFB703]"
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
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/15 bg-[#1B3A5F]/80 px-3 text-xs font-bold text-[#F8F9FA] transition-colors hover:border-[#FFB703] focus-visible:outline-2 focus-visible:outline-[#FFB703]"
            >
              <RotateCcw className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
              <span className="hidden lg:inline">Replay</span>
            </button>

            <button
              type="button"
              onClick={onToggleSound}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? 'Mute intro audio' : 'Unmute intro audio'}
              className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#FFB703] ${
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
              onClick={onSkip}
              className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-4 py-2 text-xs font-extrabold text-[#0B1D36] shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-[#FFB703]"
            >
              <span>Skip Intro</span>
              <FastForward className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Center Overlay: Autoplay-blocked prompt / Error Recovery / Ending Title Reveal */}
      <div className="pointer-events-none relative z-30 flex flex-1 flex-col items-center justify-center px-6">
        {needsManualPlay && !videoError && endingStage === 'playing' && (
          <button
            type="button"
            onClick={handleManualPlay}
            className="pointer-events-auto inline-flex min-h-[54px] cursor-pointer items-center gap-3 rounded-2xl border border-[#FFB703] bg-[#071324]/92 px-6 py-3 font-[family-name:var(--font-display)] text-sm font-extrabold tracking-wider text-[#FFB703] shadow-2xl transition-transform hover:scale-[1.03]"
          >
            <Play className="h-5 w-5 fill-current" aria-hidden="true" />
            <span>PLAY MISSION INTRO</span>
          </button>
        )}

        {videoError && (
          <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl border border-[#FFB703]/55 bg-[#071324]/95 p-5 text-center shadow-2xl">
            <p className="text-sm font-bold text-[#F8F9FA]">
              Unable to load mission intro video feed.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleRetryVideo}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-[#1B3A5F] px-4 py-2 text-xs font-bold text-[#F8F9FA]"
              >
                <RotateCcw className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
                <span>Retry Video</span>
              </button>
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-5 py-2 text-xs font-extrabold text-[#0B1D36] shadow-lg"
              >
                <span>Continue to Briefing</span>
                <FastForward className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Cinematic Ending Text & Mission Title Reveal on Full Black Screen */}
        <AnimatePresence>
          {(endingStage === 'tagline' || endingStage === 'title') && (
            <motion.div
              key="ending-title-sequence"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.1 : 0.45 }}
              className="relative flex max-w-4xl flex-col items-center text-center"
            >
              {/* Subtle warm Martian horizon glow behind title */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-44 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E85D04]/18 blur-3xl sm:h-56 sm:w-[32rem]"
              />

              <motion.p
                initial={reducedMotion ? false : { opacity: 0, y: 12, letterSpacing: '0.35em' }}
                animate={{ opacity: 1, y: 0, letterSpacing: '0.24em' }}
                transition={{
                  duration: reducedMotion ? 0.1 : 0.7,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="font-[family-name:var(--font-display)] text-base font-bold uppercase text-[#F8F9FA]/95 sm:text-xl md:text-2xl"
              >
                Your Mission Begins Now
              </motion.p>

              {endingStage === 'title' && (
                <>
                  <motion.div
                    aria-hidden="true"
                    initial={reducedMotion ? false : { scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{
                      duration: reducedMotion ? 0.1 : 0.6,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="my-5 h-[2px] w-48 origin-center bg-gradient-to-r from-transparent via-[#FFB703] to-transparent sm:my-6 sm:w-72"
                  />

                  <motion.h1
                    initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: reducedMotion ? 0.1 : 0.75,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="bg-gradient-to-r from-[#F8F9FA] via-[#FFB703] to-[#E85D04] bg-clip-text font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-[0.14em] text-transparent drop-shadow-[0_4px_28px_rgba(255,183,3,0.28)] sm:text-6xl md:text-7xl"
                  >
                    SOL COMMANDER
                  </motion.h1>

                  <motion.p
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reducedMotion ? 0.1 : 0.55,
                      delay: reducedMotion ? 0 : 0.25,
                    }}
                    className="mt-3 font-[family-name:var(--font-indicator)] text-xs font-bold tracking-[0.34em] text-[#FFB703]/90 sm:text-sm"
                  >
                    JUNIOR ASTRONAUT PROGRAM · MARS OUTPOST
                  </motion.p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Discreet Continue Button only during the ending black-screen title reveal */}
      <div className="relative z-30 flex min-h-[56px] items-center justify-end px-6 pb-5">
        {isEnding && (
          <motion.button
            type="button"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 0.75 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.6 }}
            onClick={onComplete}
            className="pointer-events-auto inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-1.5 font-[family-name:var(--font-indicator)] text-xs font-bold tracking-[0.16em] text-[#F8F9FA] transition-colors hover:border-[#FFB703]/60 hover:text-[#FFB703]"
          >
            <span>CONTINUE</span>
            <FastForward className="h-3.5 w-3.5" aria-hidden="true" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
