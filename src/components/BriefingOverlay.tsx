import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Shield,
  Shuffle,
  Bot,
  Users,
  Sparkles,
  ArrowRight,
  Rocket,
  FastForward,
  Compass,
  Radio,
} from 'lucide-react';
import { COMMANDER_CALLSIGNS } from '../data/missionData';
import { CREW_PROFILES } from '../sim/constants';
import { sanitizeRoverName } from '../sim/roverData';
import { soundEngine } from '../utils/soundEngine';

interface BriefingOverlayProps {
  callsign: string;
  onChangeCallsign: (name: string) => void;
  roverName: string;
  onChangeRoverName: (name: string) => void;
  seed: number;
  onShuffleSeed: () => void;
  onStartExploration: () => void;
  onReplayPrologue: () => void;
  reducedMotion: boolean;
}

type BriefingStage = 'meet-rusty' | 'crew-setup' | 'launching';

const ROVER_PRESETS = ['Rusty', 'Sparky', 'Nova-7', 'Pebble'];

const CREW_KID_LINES: Record<string, string> = {
  amara: 'Keeps everyone healthy & calm',
  kenji: 'Fixes valves, pipes & rover wheels',
  lucia: 'Hunts for buried ice & Mars rocks',
  rafi: 'Runs air, water & warm plant lights',
};

const MISSION_ROADMAP = [
  { sol: 'Sol 21', name: 'Tank 2 Air' },
  { sol: 'Sol 34', name: 'Red Sky' },
  { sol: 'Sol 52', name: 'Buried Ice' },
  { sol: 'Sol 67', name: 'Greenhouse' },
  { sol: 'Sol 88', name: 'Safe Shelter' },
];

export function BriefingOverlay({
  callsign,
  onChangeCallsign,
  roverName,
  onChangeRoverName,
  seed,
  onShuffleSeed,
  onStartExploration,
  onReplayPrologue,
  reducedMotion,
}: BriefingOverlayProps) {
  const [stage, setStage] = useState<BriefingStage>('meet-rusty');
  const [filteredNotice, setFilteredNotice] = useState(false);

  // Synthesized Rusty welcome beep when Commander Arrival beat opens
  useEffect(() => {
    if (stage !== 'meet-rusty') return;
    soundEngine.playRoverBeep('happy');
    const autoTimer = window.setTimeout(
      () => {
        setStage((curr) => (curr === 'meet-rusty' ? 'crew-setup' : curr));
      },
      reducedMotion ? 2200 : 4800,
    );
    return () => window.clearTimeout(autoTimer);
  }, [stage, reducedMotion]);

  // Brief airlock launch sweep before dropping into 3D Outpost Tutorial
  useEffect(() => {
    if (stage !== 'launching') return;
    soundEngine.playMissionStart();
    const tid = window.setTimeout(
      () => {
        onStartExploration();
      },
      reducedMotion ? 250 : 1100,
    );
    return () => window.clearTimeout(tid);
  }, [stage, onStartExploration, reducedMotion]);

  const handleRoverInput = (val: string) => {
    const trimmed = val.slice(0, 12);
    const check = sanitizeRoverName(trimmed);
    setFilteredNotice(check.filtered);
    onChangeRoverName(check.filtered ? 'Rusty' : trimmed);
  };

  const displayRover = roverName.trim() || 'Rusty';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-[#040A15]/75 p-4 backdrop-blur-[3px] sm:p-6">
      {/* Subtle cinematic letterbox framing during Beat 1 & Beat 3 */}
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ height: stage === 'crew-setup' ? 0 : '6vh' }}
        transition={{ duration: reducedMotion ? 0.1 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed inset-x-0 top-0 z-40 bg-black/95"
      />
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ height: stage === 'crew-setup' ? 0 : '6vh' }}
        transition={{ duration: reducedMotion ? 0.1 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-black/95"
      />

      <AnimatePresence mode="wait">
        {/* ================================================================
            BEAT 1: BIG-BUDGET ANIMATED ARRIVAL — MEET COMMANDER NOVA & RUSTY
           ================================================================ */}
        {stage === 'meet-rusty' && (
          <motion.section
            key="meet-rusty"
            role="dialog"
            aria-modal="true"
            aria-labelledby="arrival-title"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 1.02, y: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative my-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-[#FFB703]/45 bg-[#071324]/95 p-6 text-[#F8F9FA] shadow-[0_0_60px_rgba(232,93,4,0.32)] sm:p-9 font-[family-name:var(--font-game)]"
          >
            {/* Atmospheric orange/gold glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#E85D04]/25 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[#FFB703]/15 blur-3xl"
            />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
              {/* Left: Commander Nova Arrival Headline */}
              <div className="flex-1">
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#FFB703]/45 bg-[#1B3A5F]/75 px-3 py-1 font-[family-name:var(--font-indicator)] text-xs font-bold tracking-[0.2em] text-[#FFB703]"
                >
                  <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>ARES CRATER · SOL 01 ARRIVAL</span>
                </motion.div>

                <motion.h1
                  id="arrival-title"
                  initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.16 }}
                  className="mt-4 font-[family-name:var(--font-display)] text-2xl font-extrabold leading-tight tracking-wide text-[#F8F9FA] sm:text-4xl"
                >
                  Welcome to Mars,{' '}
                  <span className="bg-gradient-to-r from-[#FFB703] to-[#E85D04] bg-clip-text text-transparent">
                    {callsign || 'Commander Nova'}
                  </span>
                  !
                </motion.h1>

                <motion.p
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.28 }}
                  className="mt-3 text-sm leading-relaxed text-[#F8F9FA]/90 sm:text-base"
                >
                  Your ship touched down safely. Explore the base, discover real Mars science, and
                  keep your crew safe across 88 sols!
                </motion.p>

                {/* Message from Earth (Bible Section 4.1 / 5.0) */}
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.36 }}
                  className="mt-3.5 rounded-xl border border-[#38BDF8]/40 bg-[#0C4A6E]/35 p-3 text-xs leading-relaxed text-[#E0F2FE]"
                >
                  <div className="flex items-center gap-1.5 font-bold text-[#38BDF8] text-[11px] uppercase tracking-wider">
                    <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Message from Earth · Mission Control</span>
                  </div>
                  <p className="mt-1 text-xs sm:text-sm italic font-medium text-[#F0F9FF]">
                    &ldquo;Welcome to Mars, Commander. Take care of each other. We believe in you.&rdquo;
                  </p>
                </motion.div>
              </div>

              {/* Right: Animated Rusty Rover Companion Card */}
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, x: 24, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-full shrink-0 rounded-2xl border border-[#22C55E]/50 bg-[#0D213B]/92 p-4 shadow-xl md:w-72"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] text-[#071324] shadow-lg"
                    >
                      <Bot className="h-6 w-6" aria-hidden="true" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-extrabold text-[#F8F9FA]">{displayRover}</p>
                      <p className="text-[11px] font-bold text-[#22C55E]">AI Rover Companion</p>
                    </div>
                  </div>
                  {/* Synthesized Beep Waveform */}
                  <div className="flex items-end gap-0.5" aria-hidden="true">
                    {[10, 16, 12, 18, 9].map((h, idx) => (
                      <motion.span
                        key={idx}
                        animate={
                          reducedMotion
                            ? undefined
                            : { height: [`${Math.round(h * 0.45)}px`, `${h}px`, `${Math.round(h * 0.45)}px`] }
                        }
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          delay: idx * 0.11,
                          ease: 'easeInOut',
                        }}
                        style={{ height: `${h}px` }}
                        className="w-1 rounded-full bg-[#22C55E]"
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-white/10 bg-[#071324]/85 p-3 text-xs leading-relaxed text-[#F8F9FA]/95">
                  &ldquo;Beep-boop! I&apos;m {displayRover}, your rover buddy! Let&apos;s meet your
                  crew and step outside onto Mars!&rdquo;
                </div>
              </motion.div>
            </div>

            <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={onReplayPrologue}
                className="min-h-[42px] cursor-pointer rounded-xl border border-white/20 bg-[#1B3A5F]/55 px-4 py-2 text-xs font-bold text-[#F8F9FA]/90 transition-colors hover:border-[#FFB703]"
              >
                Replay Video
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setStage('crew-setup');
                }}
                className="inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-6 py-2.5 font-[family-name:var(--font-display)] text-xs font-extrabold tracking-wider text-[#0B1D36] shadow-xl transition-transform hover:scale-[1.02]"
              >
                <span>MEET YOUR CREW</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </motion.section>
        )}

        {/* ================================================================
            BEAT 2: CREW SPOTLIGHT & JUNIOR EXPLORER SETUP
           ================================================================ */}
        {stage === 'crew-setup' && (
          <motion.section
            key="crew-setup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="briefing-title"
            initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-[#E85D04]/55 bg-[#071324]/95 text-[#F8F9FA] shadow-[0_0_42px_rgba(232,93,4,0.28)] font-[family-name:var(--font-game)]"
          >
            <div className="h-1 w-full bg-gradient-to-r from-[#E85D04] via-[#FFB703] to-[#22C55E]" />

            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-indicator)] text-xs font-bold tracking-[0.16em] text-[#FFB703]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>JUNIOR EXPLORER BRIEFING · NO RESUPPLY SHIP</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#1B3A5F] px-2.5 py-1 text-xs font-bold text-[#F8F9FA] tabular-nums">
                    Seed #{seed}
                  </span>
                  <button
                    type="button"
                    onClick={onShuffleSeed}
                    aria-label="New mission seed"
                    className="inline-flex min-h-[34px] cursor-pointer items-center gap-1 rounded-lg border border-white/15 bg-[#1B3A5F] px-2.5 text-xs font-bold text-[#FFB703] hover:border-[#FFB703]"
                  >
                    <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>New Seed</span>
                  </button>
                </div>
              </div>

              <h1
                id="briefing-title"
                className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[#F8F9FA] sm:text-3xl"
              >
                88 Sols on Mars
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-[#F8F9FA]/90">
                Explore the base, collect Mars science facts, and help your crew solve{' '}
                <strong className="text-[#FFB703]">5 big missions</strong> — protecting air, water,
                power, food, and safety!
              </p>

              {/* 5-Mission Adventure Ribbon */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {MISSION_ROADMAP.map((m, idx) => (
                  <span
                    key={m.sol}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0D213B]/80 px-2.5 py-1 text-[11px] font-bold text-[#F8F9FA]/90"
                  >
                    <span className="text-[#FFB703]">{idx + 1}.</span>
                    <span>{m.name}</span>
                  </span>
                ))}
              </div>

              {/* Commander Callsign + Name Your Rover */}
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="briefing-callsign"
                    className="block text-xs font-bold text-[#FFB703]"
                  >
                    Your Commander Name
                  </label>
                  <input
                    id="briefing-callsign"
                    type="text"
                    maxLength={24}
                    value={callsign}
                    onChange={(e) => onChangeCallsign(e.target.value)}
                    className="mt-1.5 min-h-[42px] w-full rounded-xl border border-white/20 bg-[#1B3A5F]/75 px-3.5 py-2 text-sm font-bold text-[#F8F9FA] focus:border-[#FFB703] focus:outline-none"
                    placeholder="Commander Nova"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {COMMANDER_CALLSIGNS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => onChangeCallsign(preset)}
                        className={`min-h-[32px] cursor-pointer rounded-lg border px-2.5 text-xs font-bold transition-colors ${
                          callsign === preset
                            ? 'border-[#FFB703] bg-[#FFB703] text-[#0B1D36]'
                            : 'border-white/15 bg-[#1B3A5F]/60 text-[#F8F9FA]/85 hover:border-[#FFB703]/60'
                        }`}
                      >
                        {preset.replace('Commander ', '')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="briefing-rover-name"
                    className="flex items-center gap-1.5 text-xs font-bold text-[#22C55E]"
                  >
                    <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                    Name Your Rover Buddy (Max 12)
                  </label>
                  <input
                    id="briefing-rover-name"
                    type="text"
                    maxLength={12}
                    value={roverName}
                    onChange={(e) => handleRoverInput(e.target.value)}
                    className="mt-1.5 min-h-[42px] w-full rounded-xl border border-[#22C55E]/40 bg-[#1B3A5F]/75 px-3.5 py-2 text-sm font-bold text-[#F8F9FA] focus:border-[#22C55E] focus:outline-none"
                    placeholder="Rusty"
                  />
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {ROVER_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setFilteredNotice(false);
                          onChangeRoverName(preset);
                          soundEngine.playRoverBeep('ok');
                        }}
                        className={`min-h-[32px] cursor-pointer rounded-lg border px-2.5 text-xs font-bold transition-colors ${
                          roverName === preset
                            ? 'border-[#22C55E] bg-[#22C55E] text-[#0B1D36]'
                            : 'border-white/15 bg-[#1B3A5F]/60 text-[#F8F9FA]/85 hover:border-[#22C55E]/60'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                    {filteredNotice && (
                      <span className="text-[11px] font-bold text-[#FFB703]">
                        Friendly name kept!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4-Person Outpost Crew Roster with animated stagger */}
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#FFB703]">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  Your Outpost Team
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CREW_PROFILES.map((member, idx) => (
                    <motion.div
                      key={member.id}
                      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: 0.05 * idx }}
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
                        <p className="truncate text-[11px] font-bold text-[#FFB703]">
                          {member.role} ·{' '}
                          <span className="font-semibold text-[#F8F9FA]/75">
                            {CREW_KID_LINES[member.id] ?? member.specialty}
                          </span>
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onReplayPrologue}
                    className="min-h-[42px] cursor-pointer rounded-xl border border-white/20 bg-[#1B3A5F]/55 px-4 py-2 text-xs font-bold text-[#F8F9FA]/90 transition-colors hover:border-[#FFB703]"
                  >
                    Replay Intro
                  </button>
                  <span className="hidden items-center gap-1 text-xs text-[#F8F9FA]/70 sm:inline-flex">
                    <Shield className="h-3.5 w-3.5 text-[#22C55E]" aria-hidden="true" />
                    Play · Discover · Learn · Decide
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setStage('launching')}
                  className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-6 py-2.5 font-[family-name:var(--font-display)] text-sm font-extrabold tracking-wide text-[#0B1D36] shadow-xl transition-transform hover:scale-[1.02]"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  <span>ENTER MARS BASE</span>
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* ================================================================
            BEAT 3: HIGH-IMPACT AIRLOCK LAUNCH WIPE INTO 3D MARS OUTPOST
           ================================================================ */}
        {stage === 'launching' && (
          <motion.section
            key="launching"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="my-auto flex w-full max-w-lg flex-col items-center rounded-3xl border border-[#22C55E]/50 bg-[#071324]/95 p-7 text-center shadow-[0_0_50px_rgba(34,197,94,0.28)]"
          >
            <motion.div
              animate={reducedMotion ? undefined : { y: [0, -6, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFB703] to-[#E85D04] text-[#0B1D36] shadow-xl"
            >
              <Rocket className="h-7 w-7" aria-hidden="true" />
            </motion.div>
            <p className="mt-4 font-[family-name:var(--font-indicator)] text-xs font-bold tracking-[0.26em] text-[#22C55E]">
              AIRLOCK SYSTEMS ONLINE
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold tracking-wide text-[#F8F9FA] sm:text-2xl">
              Stepping Onto Mars...
            </h2>
            <p className="mt-1.5 text-xs font-semibold text-[#F8F9FA]/75">
              {displayRover} is waiting outside to teach you the controls!
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#1B3A5F]">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: reducedMotion ? 0.2 : 0.95, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-[#22C55E] via-[#FFB703] to-[#E85D04]"
              />
            </div>
            <button
              type="button"
              onClick={onStartExploration}
              className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-[#F8F9FA]/60 hover:text-[#FFB703] cursor-pointer"
            >
              <span>Skip</span>
              <FastForward className="h-3 w-3" aria-hidden="true" />
            </button>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
