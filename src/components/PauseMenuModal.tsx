import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Sliders,
  Volume2,
  VolumeX,
  Home,
  Zap,
  MousePointerClick,
  FastForward,
  X,
  MousePointer,
} from 'lucide-react';
import { CursorUnlockKey } from './MarsOutpost3D';
import { soundEngine } from '../utils/soundEngine';

interface PauseMenuModalProps {
  open: boolean;
  quickMode: boolean;
  onToggleQuickMode: () => void;
  mouseSensitivity: number;
  onChangeSensitivity: (val: number) => void;
  cursorUnlockKey: CursorUnlockKey;
  onChangeCursorUnlockKey: (key: CursorUnlockKey) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  tutorialActive?: boolean;
  onSkipTutorial?: () => void;
  onJumpToMission?: (index: number) => void;
  onOpenCredits?: () => void;
  onResume: () => void;
  onQuitToTitle: () => void;
  reducedMotion: boolean;
}

const CURSOR_KEY_OPTIONS: ReadonlyArray<{ id: CursorUnlockKey; label: string }> = [
  { id: 'Alt', label: 'Alt Key' },
  { id: 'KeyK', label: 'K Key' },
  { id: 'Backquote', label: '` Key' },
];

export function PauseMenuModal({
  open,
  quickMode,
  onToggleQuickMode,
  mouseSensitivity,
  onChangeSensitivity,
  cursorUnlockKey,
  onChangeCursorUnlockKey,
  soundEnabled,
  onToggleSound,
  tutorialActive = false,
  onSkipTutorial,
  onJumpToMission,
  onOpenCredits,
  onResume,
  onQuitToTitle,
  reducedMotion,
}: PauseMenuModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Mission Pause Menu"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#060D1A]/82 p-4 font-[family-name:var(--font-game)]"
        >
          <motion.div
            initial={reducedMotion ? false : { scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ duration: 0.16 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[#E85D04]/65 bg-[#081528]/95 p-5 shadow-[0_0_40px_rgba(232,93,4,0.28)]"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFB703]">
                  Suit Paused
                </p>
                <h2 className="mt-0.5 text-xl font-extrabold text-[#F8F9FA]">
                  Mission Pause &amp; Settings
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onResume();
                }}
                aria-label="Close pause menu"
                title="Close pause menu"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#0E2038] text-[#F8F9FA] hover:border-[#FFB703] hover:text-[#FFB703] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Primary Resume Button */}
              <button
                type="button"
                onClick={onResume}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-4 text-sm font-extrabold text-[#071324] shadow-[0_0_20px_rgba(255,183,3,0.3)] hover:brightness-110 transition-all cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>Resume &amp; Lock Cursor</span>
              </button>

              {/* Simple Kid-Friendly Controls */}
              <div className="rounded-xl border border-white/10 bg-[#0C1D35]/90 p-3.5 space-y-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#38BDF8]">
                  <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Simple Controls</span>
                </div>

                {/* Look Speed */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="inline-flex items-center gap-1.5 text-[#F8F9FA]">
                      <MousePointerClick className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
                      Look Speed
                    </span>
                    <span className="tabular-nums text-[#FFB703]">
                      {mouseSensitivity.toFixed(1)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.1}
                    value={mouseSensitivity}
                    aria-label="Look Speed"
                    onChange={(e) => onChangeSensitivity(Number(e.target.value))}
                    className="mt-1.5 w-full accent-[#FFB703] cursor-pointer"
                  />
                </div>

                {/* Free Mouse Cursor Key */}
                <div className="rounded-lg border border-white/10 bg-[#071324]/80 p-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#F8F9FA]">
                    <MousePointer className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                    <span>Show Mouse Cursor Key</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#F8F9FA]/75">
                    Press this key in-game to use buttons with your mouse. Left-click the 3D world to lock cursor again.
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {CURSOR_KEY_OPTIONS.map((opt) => {
                      const active = cursorUnlockKey === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            soundEngine.playClick();
                            onChangeCursorUnlockKey(opt.id);
                          }}
                          className={`min-h-[34px] rounded-lg border px-2 text-xs font-extrabold transition-colors cursor-pointer ${
                            active
                              ? 'border-[#38BDF8] bg-[#38BDF8] text-[#071324]'
                              : 'border-white/15 bg-[#0E2038] text-[#F8F9FA]/85 hover:border-[#38BDF8]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Mode Setting (Simulation Speed Only — Gravity Unchanged) */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={quickMode}
                  onClick={onToggleQuickMode}
                  className="flex w-full items-start justify-between gap-3 rounded-lg border border-white/10 bg-[#071324]/80 p-2.5 text-left hover:border-[#FFB703]/50 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#F8F9FA]">
                      <Zap className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
                      <span>Quick Walk Mode (×1.4 speed)</span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#F8F9FA]/70">
                      Walk faster around the base. Real Mars gravity (3.73 m/s²) stays the same.
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[11px] font-extrabold ${
                      quickMode
                        ? 'bg-[#22C55E] text-[#071324]'
                        : 'bg-[#162B47] text-[#F8F9FA]/75'
                    }`}
                  >
                    {quickMode ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Simple Sound Toggle */}
                <button
                  type="button"
                  onClick={onToggleSound}
                  className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#071324]/85 px-3 text-xs font-bold text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-[#22C55E]" aria-hidden="true" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-[#F8F9FA]/65" aria-hidden="true" />
                  )}
                  <span>Sound: {soundEnabled ? 'On' : 'Off'}</span>
                </button>
              </div>

              {/* Reviewer / Fast-Track Jump to Mission (Judges Shortcut) */}
              {onJumpToMission && (
                <div className="rounded-xl border border-[#38BDF8]/40 bg-[#071324]/85 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-[#38BDF8]">
                    <span>Skip Ahead (For Reviewers)</span>
                    <span className="text-white/50 text-[10px]">Judge Fast-Track</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onJumpToMission(4);
                        onResume();
                      }}
                      className="flex min-h-[38px] items-center justify-center rounded-lg border border-[#E85D04]/60 bg-[#E85D04]/20 px-2 text-[11px] font-black text-[#FFB703] hover:bg-[#E85D04] hover:text-[#071324] transition-colors cursor-pointer text-center"
                    >
                      ⚡ Jump to Mission 5 (Sol 88)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        onJumpToMission(0);
                        onResume();
                      }}
                      className="flex min-h-[38px] items-center justify-center rounded-lg border border-[#38BDF8]/50 bg-[#0E2038] px-2 text-[11px] font-bold text-[#38BDF8] hover:bg-[#38BDF8] hover:text-[#071324] transition-colors cursor-pointer text-center"
                    >
                      Jump to Mission 1 (Sol 21)
                    </button>
                  </div>
                </div>
              )}

              {tutorialActive && onSkipTutorial && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onSkipTutorial();
                    onResume();
                  }}
                  className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-[#22C55E]/50 bg-[#0B221D]/85 px-4 text-xs font-bold text-[#22C55E] hover:border-[#22C55E] hover:bg-[#10322A] transition-colors cursor-pointer"
                >
                  <FastForward className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Skip Training (Jump to Mission 1)</span>
                </button>
              )}

              {onOpenCredits && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onOpenCredits();
                  }}
                  className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-[#38BDF8]/40 bg-[#0B1D36]/85 px-4 text-xs font-bold text-[#38BDF8] hover:border-[#38BDF8] hover:bg-[#1B3A5F] transition-colors cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>NASA Data &amp; Scientific Credits</span>
                </button>
              )}

              <button
                type="button"
                onClick={onQuitToTitle}
                className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-[#E85D04]/45 bg-[#0D1E36] px-4 text-xs font-bold text-[#F8F9FA] hover:border-[#EF4444] hover:text-[#EF4444] transition-colors cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Quit to Title Menu</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
