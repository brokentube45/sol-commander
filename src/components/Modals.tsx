import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Rocket,
  CheckCircle2,
  MousePointerClick,
  Keyboard,
  Sun,
  ShieldCheck,
  Compass,
  Sparkles,
  Award,
} from 'lucide-react';
import { COMMANDER_CALLSIGNS } from '../data/missionData';

export type ActiveModalType =
  | null
  | 'briefing'
  | 'how-to-play'
  | 'mission-info'
  | 'about';

interface ModalsProps {
  activeModal: ActiveModalType;
  missionInfoFocus?: 'explore' | 'survive' | 'discover' | null;
  onClose: () => void;
  onPlayClick: () => void;
  onPlayLaunch: () => void;
  reducedMotion: boolean;
}

export function Modals({
  activeModal,
  missionInfoFocus,
  onClose,
  onPlayClick,
  onPlayLaunch,
  reducedMotion,
}: ModalsProps) {
  const [callsign, setCallsign] = useState(COMMANDER_CALLSIGNS[0]);
  const [launchConfirmed, setLaunchConfirmed] = useState(false);

  useEffect(() => {
    if (activeModal === 'briefing') {
      setLaunchConfirmed(false);
    }
  }, [activeModal]);

  useEffect(() => {
    if (!activeModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onPlayClick();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal, onClose, onPlayClick]);

  const handleConfirmLaunch = () => {
    onPlayLaunch();
    setLaunchConfirmed(true);
  };

  return (
    <AnimatePresence>
      {activeModal && (
        <motion.div
          key="modal-backdrop"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => {
            onPlayClick();
            onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#061020]/85 p-4 sm:p-6 overflow-y-auto"
        >
          <motion.div
            key={activeModal}
            initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="relative my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-[#FFB703]/35 bg-[#0B1D36] text-[#F8F9FA] shadow-2xl"
          >
            {/* Top accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#E85D04] via-[#FFB703] to-[#22C55E]" />

            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-[family-name:var(--font-indicator)] text-xs font-bold tracking-[0.2em] text-[#FFB703]">
                    {activeModal === 'briefing' && 'MISSION 01 · COMMANDER BRIEFING'}
                    {activeModal === 'how-to-play' && 'JUNIOR ASTRONAUT CONTROLS'}
                    {activeModal === 'mission-info' && 'OUTPOST FIELD GUIDE'}
                    {activeModal === 'about' && 'EDUCATIONAL PROJECT'}
                  </p>
                  <h2
                    id="modal-title"
                    className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#F8F9FA] sm:text-3xl"
                  >
                    {activeModal === 'briefing' &&
                      (launchConfirmed ? 'Cleared for Mars!' : 'Welcome, Commander')}
                    {activeModal === 'how-to-play' && 'How to Play'}
                    {activeModal === 'mission-info' && 'Mission 01: Mars Outpost'}
                    {activeModal === 'about' && 'About SOL COMMANDER'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onPlayClick();
                    onClose();
                  }}
                  aria-label="Close dialog"
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-[#1B3A5F] text-[#F8F9FA] transition-colors hover:border-[#FFB703] hover:text-[#FFB703] focus-visible:outline-2 focus-visible:outline-[#FFB703] cursor-pointer"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* 1. MISSION BRIEFING MODAL (START MISSION) */}
              {activeModal === 'briefing' && !launchConfirmed && (
                <div className="mt-6 space-y-6">
                  <p className="text-base leading-relaxed text-[#F8F9FA]/90">
                    Your ship has touched down near Mars Outpost 01. Choose your Commander Callsign
                    and review your Sol 01 objectives before stepping onto the red planet.
                  </p>

                  <div>
                    <label
                      htmlFor="commander-callsign"
                      className="block font-[family-name:var(--font-indicator)] text-sm font-bold tracking-[0.14em] text-[#FFB703]"
                    >
                      CHOOSE YOUR CALLSIGN
                    </label>
                    <input
                      id="commander-callsign"
                      type="text"
                      maxLength={28}
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value)}
                      className="mt-2 min-h-[48px] w-full rounded-xl border border-white/20 bg-[#1B3A5F]/65 px-4 py-2.5 text-base font-bold text-[#F8F9FA] placeholder:text-[#F8F9FA]/40 focus:border-[#FFB703] focus:outline-none"
                      placeholder="Enter Commander name"
                    />
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {COMMANDER_CALLSIGNS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            onPlayClick();
                            setCallsign(preset);
                          }}
                          className={`min-h-[40px] rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-[#FFB703] cursor-pointer ${
                            callsign === preset
                              ? 'border-[#FFB703] bg-[#FFB703] text-[#0B1D36]'
                              : 'border-white/15 bg-[#1B3A5F]/50 text-[#F8F9FA]/85 hover:border-[#FFB703]/60'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-[#1B3A5F]/55 p-4">
                      <Compass className="h-5 w-5 text-[#FFB703]" aria-hidden="true" />
                      <h3 className="mt-2 font-[family-name:var(--font-display)] text-sm font-bold">
                        01. Explore
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#F8F9FA]/80">
                        Meet ROVER-7 and inspect your Mars Habitat.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#1B3A5F]/55 p-4">
                      <ShieldCheck className="h-5 w-5 text-[#22C55E]" aria-hidden="true" />
                      <h3 className="mt-2 font-[family-name:var(--font-display)] text-sm font-bold">
                        02. Balance
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#F8F9FA]/80">
                        Keep solar power and greenhouse oxygen steady.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#1B3A5F]/55 p-4">
                      <Sun className="h-5 w-5 text-[#E85D04]" aria-hidden="true" />
                      <h3 className="mt-2 font-[family-name:var(--font-display)] text-sm font-bold">
                        03. Discover
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#F8F9FA]/80">
                        Learn how sunlight and solar wind shape Mars.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onPlayClick();
                        onClose();
                      }}
                      className="min-h-[48px] rounded-xl border border-white/20 px-5 py-2.5 text-sm font-bold text-[#F8F9FA] transition-colors hover:bg-[#1B3A5F] focus-visible:outline-2 focus-visible:outline-[#FFB703] cursor-pointer"
                    >
                      Back to Landing
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmLaunch}
                      className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-6 py-2.5 font-[family-name:var(--font-display)] text-sm font-extrabold text-[#0B1D36] shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-[#FFB703] cursor-pointer"
                    >
                      <Rocket className="h-4 w-4" aria-hidden="true" />
                      <span>CONFIRM LAUNCH READINESS</span>
                    </button>
                  </div>
                </div>
              )}

              {/* BRIEFING LAUNCH CONFIRMED STATE */}
              {activeModal === 'briefing' && launchConfirmed && (
                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl border border-[#22C55E]/40 bg-[#1B3A5F]/65 p-5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 shrink-0 text-[#22C55E]" aria-hidden="true" />
                      <div>
                        <p className="font-[family-name:var(--font-indicator)] text-xs font-bold tracking-[0.18em] text-[#22C55E]">
                          PRE-FLIGHT CHECK COMPLETE
                        </p>
                        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#F8F9FA]">
                          {callsign.trim() || 'Commander Nova'} — Crew Status: Ready
                        </h3>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-[#F8F9FA]/90">
                      Your spacesuit seals are locked, ROVER-7 is powered up, and Mars Outpost 01 is
                      awaiting your arrival. Outpost exploration gameplay launches in the next
                      mission phase!
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#1B3A5F]/40 px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-[#FFB703]">
                      <Award className="h-5 w-5" aria-hidden="true" />
                      Junior Astronaut Badge Unlocked: Sol 01 Ready
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onPlayClick();
                        onClose();
                      }}
                      className="min-h-[48px] rounded-xl bg-[#FFB703] px-5 py-2 font-[family-name:var(--font-display)] text-sm font-extrabold text-[#0B1D36] transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-[#FFB703] cursor-pointer"
                    >
                      RETURN TO OUTPOST
                    </button>
                  </div>
                </div>
              )}

              {/* 2. HOW TO PLAY MODAL */}
              {activeModal === 'how-to-play' && (
                <div className="mt-6 space-y-5">
                  <p className="text-base leading-relaxed text-[#F8F9FA]/90">
                    Easy controls designed for new Mars explorers:
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-[#1B3A5F]/55 p-4">
                      <div className="flex items-center gap-2.5 text-[#FFB703]">
                        <Keyboard className="h-5 w-5" aria-hidden="true" />
                        <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#F8F9FA]">
                          Move Around
                        </h3>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 font-[family-name:var(--font-display)] text-xs font-bold">
                        {['W', 'A', 'S', 'D'].map((key) => (
                          <span
                            key={key}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/25 bg-[#0B1D36] text-[#FFB703]"
                          >
                            {key}
                          </span>
                        ))}
                        <span className="ml-2 font-[family-name:var(--font-body)] text-xs text-[#F8F9FA]/80">
                          or Arrow Keys
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#F8F9FA]/80">
                        Walk between the Mars Habitat, Greenhouse, and Solar Array.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#1B3A5F]/55 p-4">
                      <div className="flex items-center gap-2.5 text-[#FFB703]">
                        <MousePointerClick className="h-5 w-5" aria-hidden="true" />
                        <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-[#F8F9FA]">
                          Inspect & Interact
                        </h3>
                      </div>
                      <p className="mt-3 text-sm font-bold text-[#F8F9FA]">
                        Click or Tap any Station (or press E)
                      </p>
                      <p className="mt-1.5 text-sm text-[#F8F9FA]/80">
                        Try clicking ROVER-7, the Habitat, or the Astronaut right on the main
                        screen!
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#FFB703]/30 bg-[#1B3A5F]/45 p-4">
                    <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-sm font-bold text-[#FFB703]">
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      COMMANDER TIPS
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm text-[#F8F9FA]/90">
                      <li>• Press <strong>Space</strong> to jump in real Mars gravity (3.73 m/s²) and <strong>V</strong> to switch 1st/3rd person!</li>
                      <li>• Follow the <strong>Look → Compare → Choose → Review</strong> loop on all 5 Critical Sols.</li>
                      <li>• Press <strong>Q</strong> anytime for a free Socratic question from your Rover, or <strong>Tab</strong> for your Commander&apos;s Log.</li>
                    </ul>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onPlayClick();
                        onClose();
                      }}
                      className="min-h-[48px] rounded-xl bg-[#FFB703] px-6 py-2.5 font-[family-name:var(--font-display)] text-sm font-extrabold text-[#0B1D36] transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-[#FFB703] cursor-pointer"
                    >
                      GOT IT, COMMANDER!
                    </button>
                  </div>
                </div>
              )}

              {/* 3. MISSION INFO MODAL */}
              {activeModal === 'mission-info' && (
                <div className="mt-6 space-y-4">
                  <p className="text-base leading-relaxed text-[#F8F9FA]/90">
                    In <strong className="text-[#FFB703]">SOL COMMANDER</strong>, you take charge of
                    a brand-new research station on Mars. Every Martian day (called a{' '}
                    <strong className="text-[#F8F9FA]">Sol</strong>) brings new choices and real
                    space science discoveries.
                  </p>

                  <div className="space-y-3">
                    <div
                      className={`rounded-2xl border p-4 transition-colors ${
                        missionInfoFocus === 'explore'
                          ? 'border-[#FFB703] bg-[#1B3A5F]'
                          : 'border-white/10 bg-[#1B3A5F]/50'
                      }`}
                    >
                      <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-[#FFB703]">
                        EXPLORE THE RED PLANET
                      </h3>
                      <p className="mt-1 text-sm text-[#F8F9FA]/85">
                        Walk the Martian soil alongside ROVER-7, inspect crater rocks, and check on
                        every building in your outpost.
                      </p>
                    </div>

                    <div
                      className={`rounded-2xl border p-4 transition-colors ${
                        missionInfoFocus === 'survive'
                          ? 'border-[#22C55E] bg-[#1B3A5F]'
                          : 'border-white/10 bg-[#1B3A5F]/50'
                      }`}
                    >
                      <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-[#22C55E]">
                        SURVIVE WITH SMART DECISIONS
                      </h3>
                      <p className="mt-1 text-sm text-[#F8F9FA]/85">
                        Mars has thin air and freezing nights. Commanders decide how to spend
                        limited battery power, water, and greenhouse energy.
                      </p>
                    </div>

                    <div
                      className={`rounded-2xl border p-4 transition-colors ${
                        missionInfoFocus === 'discover'
                          ? 'border-[#E85D04] bg-[#1B3A5F]'
                          : 'border-white/10 bg-[#1B3A5F]/50'
                      }`}
                    >
                      <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-[#E85D04]">
                        DISCOVER HOW THE SUN AFFECTS MARS
                      </h3>
                      <p className="mt-1 text-sm text-[#F8F9FA]/85">
                        Learn how solar flares, Martian dust, and sunlight angle shape daily life for
                        astronauts millions of kilometers from Earth.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onPlayClick();
                        onClose();
                      }}
                      className="min-h-[48px] rounded-xl bg-[#FFB703] px-6 py-2.5 font-[family-name:var(--font-display)] text-sm font-extrabold text-[#0B1D36] transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-[#FFB703] cursor-pointer"
                    >
                      CLOSE FIELD GUIDE
                    </button>
                  </div>
                </div>
              )}

              {/* 4. ABOUT MODAL */}
              {activeModal === 'about' && (
                <div className="mt-6 space-y-4">
                  <p className="text-base leading-relaxed text-[#F8F9FA]/90">
                    <strong className="text-[#FFB703]">SOL COMMANDER</strong> is an educational
                    Mars exploration adventure built for curious explorers aged 7–12. It blends
                    playful discovery with real space science about living on Mars and understanding
                    our Sun.
                  </p>

                  <div className="rounded-2xl border border-white/10 bg-[#1B3A5F]/55 p-4 text-sm leading-relaxed text-[#F8F9FA]/85 space-y-2">
                    <p className="font-bold text-[#F8F9FA]">NASA International Space Apps Challenge</p>
                    <p>
                      Built around real NASA datasets (NSSDC Mars Fact Sheet, Curiosity RAD,
                      Opportunity dust-storm power curves, Perseverance MOXIE &amp; MEDA, SWIM ice
                      maps, BVAD life-support baselines, and live/archived NASA DONKI space weather).
                    </p>
                    <p>
                      <strong className="text-[#F8F9FA]">Audio &amp; Voice Policy:</strong> Character
                      dialogues use subtitles accompanied by procedural Web Audio synthesized chimes
                      and beeps by default (one voice at a time, with a Voice / Rover Beeps On/Off
                      toggle). Zero AI-generated voice or TTS is used in the runtime game.
                    </p>
                    <p className="text-xs text-[#FFB703]">
                      Every number in-game is transparently tagged REAL, DERIVED, or SIMULATION
                      VALUE. This is an independent educational project; NASA does not endorse it.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onPlayClick();
                        onClose();
                      }}
                      className="min-h-[48px] rounded-xl bg-[#FFB703] px-6 py-2.5 font-[family-name:var(--font-display)] text-sm font-extrabold text-[#0B1D36] transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-[#FFB703] cursor-pointer"
                    >
                      CLOSE
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
