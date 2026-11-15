import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

export const PROLOGUE_DURATION_SEC = 28;

interface CinematicCue {
  id: number;
  startSec: number;
  endSec: number;
  caption: string;
  subtitle: string;
}

const CINEMATIC_CUES: CinematicCue[] = [
  {
    id: 1,
    startSec: 0,
    endSec: 4,
    caption: 'MARS OUTPOST · SOL 1',
    subtitle: 'Sunrise over your new home on Mars',
  },
  {
    id: 2,
    startSec: 4,
    endSec: 8,
    caption: 'HABITAT — your home on Mars',
    subtitle: 'Pressurized living quarters keeping the crew safe',
  },
  {
    id: 3,
    startSec: 8,
    endSec: 12,
    caption: 'GREENHOUSE — fresh food and air',
    subtitle: "Rafi's garden providing oxygen and fresh food",
  },
  {
    id: 4,
    startSec: 12,
    endSec: 16,
    caption: 'OXYGEN TANK 2 — keep it safe',
    subtitle: 'Critical life support storing breathable oxygen',
  },
  {
    id: 5,
    startSec: 16,
    endSec: 20,
    caption: 'ROVER RUSTY — your rover friend',
    subtitle: 'Autonomous scouting companion with multi-spectral sensors',
  },
  {
    id: 6,
    startSec: 20,
    endSec: 24,
    caption: 'SOLAR ARRAY — power for the base',
    subtitle: 'Tracking solar panels harvesting Martian sunlight',
  },
  {
    id: 7,
    startSec: 24,
    endSec: 28,
    caption: 'You are Commander Nova',
    subtitle: 'Lead your crew through 88 sols on the red planet',
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
  const [elapsed, setElapsed] = useState(0);
  const lastShotRef = useRef<number>(-1);
  const lastTimeRef = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);

  // Reset when replay token changes
  useEffect(() => {
    setElapsed(0);
    lastShotRef.current = -1;
    lastTimeRef.current = performance.now();
    onElapsedTick?.(0);
  }, [replayToken, onElapsedTick]);

  // Real-time animation clock for the 28s in-engine Three.js cinematic
  useEffect(() => {
    if (paused) return;

    let localElapsed = elapsed;
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      localElapsed = Math.min(PROLOGUE_DURATION_SEC, localElapsed + dt);
      setElapsed(localElapsed);
      onElapsedTick?.(localElapsed);

      // Check shot transition to play Rusty chime
      const currentShot = Math.floor(localElapsed / 4);
      if (currentShot !== lastShotRef.current && currentShot < CINEMATIC_CUES.length) {
        lastShotRef.current = currentShot;
        soundEngine.playSpeakerChime('rusty');
      }

      if (localElapsed >= PROLOGUE_DURATION_SEC) {
        onComplete();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [paused, onComplete, onElapsedTick]);

  // Keyboard navigation: Space/K (play/pause), Enter/Escape (skip)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault();
        onTogglePause();
      } else if (e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePause, onSkip]);

  const activeCue =
    CINEMATIC_CUES.find((c) => elapsed >= c.startSec && elapsed < c.endSec) ??
    CINEMATIC_CUES[CINEMATIC_CUES.length - 1];

  const progressPercent = Math.min(100, (elapsed / PROLOGUE_DURATION_SEC) * 100);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between font-[family-name:var(--font-game)] select-none">
      {/* Top Cinematic Letterbox Bar */}
      <div className="pointer-events-auto h-16 w-full bg-[#040A15]/95 shadow-md flex items-center justify-between px-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E85D04] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E85D04]" />
          </span>
          <span className="text-xs font-black tracking-widest uppercase text-[#FFB703]">
            IN-ENGINE CINEMATIC · SOL 1
          </span>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Center Cinematic Captions Overlay */}
      <div className="flex-1 flex flex-col items-center justify-end pb-8 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCue.id}
            initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-auto max-w-xl text-center rounded-xl bg-[#071324]/85 border border-[#38BDF8]/40 px-6 py-3.5 shadow-[0_0_24px_rgba(56,189,248,0.22)] backdrop-blur-sm"
          >
            <div className="flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider text-[#38BDF8]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Shot {activeCue.id} of {CINEMATIC_CUES.length}</span>
            </div>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg sm:text-xl font-black text-[#F8F9FA]">
              {activeCue.caption}
            </h2>
            <p className="mt-0.5 text-xs text-[#F8F9FA]/80">
              {activeCue.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Cinematic Letterbox Bar & Player Controls */}
      <div className="pointer-events-auto h-20 w-full bg-[#040A15]/95 border-t border-white/10 flex flex-col justify-between px-6 py-2.5 shadow-2xl">
        {/* Progress Bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#22C55E] via-[#FFB703] to-[#E85D04] transition-all duration-100"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-xs font-bold text-[#F8F9FA]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onTogglePause}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFB703] text-[#0B1D36] hover:scale-105 transition-transform cursor-pointer"
              title={paused ? 'Resume [Space]' : 'Pause [Space]'}
            >
              {paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
            </button>

            <button
              type="button"
              onClick={onReplay}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-[#1B3A5F]/70 text-[#F8F9FA] hover:border-[#FFB703] transition-colors cursor-pointer"
              title="Restart Cinematic"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <span className="tabular-nums text-[#F8F9FA]/70 text-xs">
              {formatTimeSec(elapsed)} / {formatTimeSec(PROLOGUE_DURATION_SEC)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#F8F9FA]/50 hidden sm:inline">
              Real-time in-engine Three.js rendering
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
