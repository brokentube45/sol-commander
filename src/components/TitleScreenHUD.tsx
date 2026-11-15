import { motion, AnimatePresence } from 'motion/react';
import {
  Rocket,
  BookOpen,
  Info,
  HelpCircle,
  Volume2,
  VolumeX,
  Compass,
  Sparkles,
  X,
} from 'lucide-react';
import { OUTPOST_LANDMARKS, OutpostLandmarkId } from '../data/missionData';

interface TitleScreenHUDProps {
  selectedLandmark: OutpostLandmarkId | null;
  onSelectLandmark: (id: OutpostLandmarkId | null) => void;
  onStartMission: () => void;
  onOpenHowToPlay: () => void;
  onOpenMissionInfo: () => void;
  onOpenAbout: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  reducedMotion: boolean;
}

const CAMERA_STATIONS: { id: 'overview' | OutpostLandmarkId; label: string }[] = [
  { id: 'overview', label: 'Outpost' },
  { id: 'habitat', label: 'Habitat' },
  { id: 'greenhouse', label: 'Greenhouse' },
  { id: 'rover', label: 'ROVER-7' },
  { id: 'solar', label: 'Solar Array' },
  { id: 'windmill', label: 'Windmills' },
  { id: 'astronaut', label: 'Commander' },
];

export function TitleScreenHUD({
  selectedLandmark,
  onSelectLandmark,
  onStartMission,
  onOpenHowToPlay,
  onOpenMissionInfo,
  onOpenAbout,
  soundEnabled,
  onToggleSound,
  reducedMotion,
}: TitleScreenHUDProps) {
  const activeInfo = selectedLandmark ? OUTPOST_LANDMARKS[selectedLandmark] : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Measured atmospheric left scrim for readable title typography without blocking the 3D outpost */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-0 -z-10 w-full bg-gradient-to-r from-[#0B1D36]/88 via-[#0B1D36]/42 to-transparent md:w-[58%]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[#0B1D36]/85 via-[#0B1D36]/35 to-transparent"
      />

      {/* TOP ROW: Title Lockup (Left) + Sound Toggle (Right) */}
      <div className="flex items-start justify-between gap-4">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto flex items-center gap-3.5"
        >
          <img
            src="/assets/sol-commander-icon.png"
            alt="Sol Commander emblem"
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[#FFB703]/75 shadow-lg shadow-[#E85D04]/35"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-wider text-[#F8F9FA] sm:text-2xl">
              SOL COMMANDER
            </span>
            <span className="font-[family-name:var(--font-indicator)] text-xs font-bold tracking-[0.2em] text-[#FFB703]">
              JUNIOR ASTRONAUT PROGRAM
            </span>
          </div>
        </motion.div>

        {/* Top-Right Sound Control */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? 'Mute game audio' : 'Enable game audio'}
            className={`inline-flex min-h-[48px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer ${
              soundEnabled
                ? 'border-[#FFB703] bg-[#0B1D36]/92 text-[#FFB703]'
                : 'border-white/15 bg-[#0B1D36]/85 text-[#F8F9FA]/90 hover:border-[#FFB703]/60 hover:bg-[#1B3A5F]'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
          </button>
        </div>
      </div>

      {/* MIDDLE ROW: Game Title Headline + Main Game Menu Stack (Left) & Station Inspector (Top-Right Sky) */}
      <div className="my-auto flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto max-w-md lg:mt-6"
          >
            <p className="font-[family-name:var(--font-indicator)] text-sm font-bold tracking-[0.22em] text-[#FFB703]">
              MISSION 01 <span aria-hidden="true" className="mx-1 text-[#E85D04]">·</span> MARS OUTPOST
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold leading-[1.12] tracking-tight text-[#F8F9FA] sm:text-4xl lg:text-[2.85rem] [text-wrap:balance]">
              Your first mission starts on Mars.
            </h1>
            <p className="mt-3 text-base font-semibold leading-relaxed text-[#F8F9FA]/90 sm:text-lg">
              Explore a new world. Make big decisions. Become a Mars Commander.
            </p>

            {/* Video Game Title Menu Stack */}
            <nav aria-label="Game main menu" className="mt-6 flex max-w-xs flex-col gap-2.5">
              <button
                type="button"
                onClick={onStartMission}
                className="group flex min-h-[56px] w-full items-center justify-between rounded-2xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-6 py-3.5 font-[family-name:var(--font-display)] text-base font-extrabold tracking-wider text-[#0B1D36] shadow-xl shadow-[#E85D04]/30 transition-transform duration-150 hover:translate-x-1 hover:scale-[1.01] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703] cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <Rocket className="h-5 w-5" aria-hidden="true" />
                  <span>START MISSION</span>
                </span>
                <span aria-hidden="true" className="text-lg transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenHowToPlay}
                className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-white/15 bg-[#0B1D36]/88 px-5 py-2.5 font-[family-name:var(--font-display)] text-sm font-bold tracking-wider text-[#F8F9FA] transition-all duration-150 hover:translate-x-1 hover:border-[#FFB703] hover:bg-[#1B3A5F] focus-visible:outline-2 focus-visible:outline-[#FFB703] cursor-pointer"
              >
                <BookOpen className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
                <span>HOW TO PLAY</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onOpenMissionInfo}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#0B1D36]/88 px-3 py-2.5 font-[family-name:var(--font-display)] text-xs font-bold tracking-wider text-[#F8F9FA]/95 transition-colors hover:border-[#FFB703] hover:bg-[#1B3A5F] focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer"
                >
                  <Info className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
                  <span>MISSION INFO</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenAbout}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#0B1D36]/88 px-3 py-2.5 font-[family-name:var(--font-display)] text-xs font-bold tracking-wider text-[#F8F9FA]/95 transition-colors hover:border-[#FFB703] hover:bg-[#1B3A5F] focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer"
                >
                  <HelpCircle className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
                  <span>ABOUT</span>
                </button>
              </div>
            </nav>
          </motion.div>

          {/* Active Station Close-Up Field Guide Card (Top-Right Sky Zone) */}
          <AnimatePresence>
            {activeInfo && (
              <motion.aside
                key={activeInfo.id}
                initial={reducedMotion ? false : { opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                aria-live="polite"
                className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[#FFB703]/45 bg-[#0B1D36]/94 p-4 sm:p-5 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-[family-name:var(--font-indicator)] text-xs font-bold tracking-[0.18em] text-[#FFB703]">
                      {activeInfo.role.toUpperCase()}
                    </p>
                    <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-lg font-bold text-[#F8F9FA]">
                      {activeInfo.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectLandmark(null)}
                    aria-label="Return to Outpost Overview"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#1B3A5F] text-[#F8F9FA] transition-colors hover:border-[#FFB703] hover:text-[#FFB703] focus-visible:outline-2 focus-visible:outline-[#FFB703] cursor-pointer"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#F8F9FA]/90">
                  {activeInfo.description}
                </p>
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#1B3A5F]/85 px-3 py-2 text-xs font-semibold text-[#FFB703]">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{activeInfo.funFact}</span>
                </p>
              </motion.aside>
            )}
          </AnimatePresence>
      </div>

      {/* BOTTOM ROW: Discreet Program Notice + Camera Station Selector */}
      <div className="flex flex-col-reverse items-start justify-between gap-3 lg:flex-row lg:items-end">
        <div className="pointer-events-auto flex flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-wide text-[#F8F9FA]/55">
            NASA SPACE APPS CHALLENGE 2026 · Independent educational project · NASA does not endorse this project.
          </p>
        </div>

        {/* Camera Inspection Selector */}
        <div
          role="group"
          aria-label="Inspect 3D outpost camera views"
          className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/15 bg-[#0B1D36]/90 p-1.5"
        >
          <span className="hidden items-center gap-1.5 px-2.5 font-[family-name:var(--font-indicator)] text-xs font-bold tracking-[0.15em] text-[#FFB703] sm:inline-flex">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>CAM</span>
          </span>
          {CAMERA_STATIONS.map((cam) => {
            const active = (selectedLandmark ?? 'overview') === cam.id;
            return (
              <button
                key={cam.id}
                type="button"
                onClick={() => onSelectLandmark(cam.id === 'overview' ? null : cam.id)}
                aria-pressed={active}
                className={`min-h-[44px] rounded-xl px-3 py-1.5 text-xs font-bold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#FFB703] text-[#0B1D36]'
                    : 'text-[#F8F9FA]/85 hover:bg-[#1B3A5F] hover:text-[#F8F9FA]'
                }`}
              >
                {cam.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
