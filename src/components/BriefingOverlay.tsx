import { useState } from 'react';
import { motion } from 'motion/react';
import { Play, Shield, Shuffle, Bot, AlertTriangle, Users } from 'lucide-react';
import { COMMANDER_CALLSIGNS } from '../data/missionData';
import { CREW_PROFILES } from '../sim/constants';
import { sanitizeRoverName } from '../sim/roverData';

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

const ROVER_PRESETS = ['Rusty', 'Sparky', 'Nova-7', 'Pebble'];

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
  const [filteredNotice, setFilteredNotice] = useState(false);

  const handleRoverInput = (val: string) => {
    const trimmed = val.slice(0, 12);
    const check = sanitizeRoverName(trimmed);
    setFilteredNotice(check.filtered);
    onChangeRoverName(check.filtered ? 'Rusty' : trimmed);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#061020]/65 p-4 sm:p-6 overflow-y-auto">
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="briefing-title"
        initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-[#E85D04]/55 bg-[#071324]/94 text-[#F8F9FA] shadow-[0_0_36px_rgba(232,93,4,0.24)] font-[family-name:var(--font-game)]"
      >
        <div className="h-1 w-full bg-gradient-to-r from-[#E85D04] via-[#FFB703] to-[#22C55E]" />

        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#FFB703]">
              Mission Briefing · No Resupply Ship
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#1B3A5F] px-2.5 py-1 text-xs font-bold text-[#F8F9FA] tabular-nums">
                Seed #{seed}
              </span>
              <button
                type="button"
                onClick={onShuffleSeed}
                aria-label="New mission seed"
                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-white/15 bg-[#1B3A5F] px-2.5 text-xs font-bold text-[#FFB703] hover:border-[#FFB703] cursor-pointer"
              >
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>New Seed</span>
              </button>
            </div>
          </div>

          <h1
            id="briefing-title"
            className="mt-2 text-2xl font-extrabold tracking-tight text-[#F8F9FA] sm:text-3xl"
          >
            88 Days at Mars Habitat
          </h1>

          <div className="mt-3 rounded-xl border border-[#E85D04]/45 bg-[#1B3A5F]/65 p-3.5">
            <p className="flex items-center gap-2 text-xs font-bold text-[#FFB703]">
              <AlertTriangle className="h-4 w-4 text-[#E85D04]" aria-hidden="true" />
              Your Goal: Keep 4 Astronauts Alive for 88 Sols
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#F8F9FA]/92">
              No supply rocket can reach Mars for 26 months! Solve <strong className="text-[#FFB703]">5 big emergencies</strong> by protecting air, water, food, power, and safety.
            </p>
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
                    className={`min-h-[32px] rounded-lg border px-2.5 text-xs font-bold transition-colors cursor-pointer ${
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
                    }}
                    className={`min-h-[32px] rounded-lg border px-2.5 text-xs font-bold transition-colors cursor-pointer ${
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

          {/* 4-Person Outpost Crew Roster */}
          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#FFB703]">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Your 4-Person Crew
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CREW_PROFILES.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1B3A5F]/55 px-3 py-2"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold text-[#0B1D36]"
                    style={{ backgroundColor: member.avatarColor }}
                  >
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold text-[#F8F9FA]">{member.name}</p>
                    <p className="truncate text-[11px] font-bold text-[#FFB703]">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onReplayPrologue}
                className="min-h-[42px] rounded-xl border border-white/20 bg-[#1B3A5F]/55 px-4 py-2 text-xs font-bold text-[#F8F9FA]/90 transition-colors hover:border-[#FFB703] cursor-pointer"
              >
                Replay Intro
              </button>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-[#F8F9FA]/70">
                <Shield className="h-3.5 w-3.5 text-[#22C55E]" aria-hidden="true" />
                Look · Compare · Choose · Learn
              </span>
            </div>

            <button
              type="button"
              onClick={onStartExploration}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-6 py-2.5 text-sm font-extrabold text-[#0B1D36] shadow-xl transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              <span>Start Mission (Sol 21)</span>
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
