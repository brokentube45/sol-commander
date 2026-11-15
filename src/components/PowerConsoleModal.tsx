import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Zap, Home, Sprout, Compass, CheckCircle2, Minus, Plus } from 'lucide-react';
import { PowerAllocation, TOTAL_POWER_UNITS } from '../data/missionData';
import { soundEngine } from '../utils/soundEngine';

interface PowerConsoleModalProps {
  initialAllocation: PowerAllocation;
  onApply: (next: PowerAllocation) => void;
  onClose: () => void;
  reducedMotion: boolean;
}

export function PowerConsoleModal({
  initialAllocation,
  onApply,
  onClose,
  reducedMotion,
}: PowerConsoleModalProps) {
  const [alloc, setAlloc] = useState<PowerAllocation>(initialAllocation);

  const usedUnits = alloc.habitat + alloc.greenhouse + alloc.rover;
  const remainingUnits = TOTAL_POWER_UNITS - usedUnits;

  const adjust = (key: keyof PowerAllocation, delta: number) => {
    setAlloc((prev) => {
      const current = prev[key];
      const nextVal = current + delta;
      if (nextVal < 1 || nextVal > 6) return prev;
      const nextUsed = usedUnits - current + nextVal;
      if (nextUsed > TOTAL_POWER_UNITS) return prev;
      soundEngine.playClickSoft();
      return { ...prev, [key]: nextVal };
    });
  };

  const systems: {
    key: keyof PowerAllocation;
    label: string;
    subtitle: string;
    emoji: string;
    icon: typeof Home;
    accent: string;
  }[] = [
    {
      key: 'habitat',
      label: 'Mars Habitat Life Support',
      subtitle: 'Keeps crew air pressure & heaters steady',
      emoji: '🏠',
      icon: Home,
      accent: 'from-[#FFB703] to-[#E85D04]',
    },
    {
      key: 'greenhouse',
      label: 'Bio-Dome Greenhouse',
      subtitle: 'Powers grow lights for food & oxygen crops',
      emoji: '🌱',
      icon: Sprout,
      accent: 'from-[#22C55E] to-[#16A34A]',
    },
    {
      key: 'rover',
      label: 'ROVER-7 & Communications',
      subtitle: 'Charges rover batteries & Earth telemetry',
      emoji: '🚜',
      icon: Compass,
      accent: 'from-[#38BDF8] to-[#0284C7]',
    },
  ];

  const isBalanced = alloc.habitat >= 2 && alloc.greenhouse >= 2 && alloc.rover >= 2;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#061020]/75 p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="power-console-title"
        initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22 }}
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-[#FFB703]/45 bg-[#0B1D36]/96 text-[#F8F9FA] shadow-2xl"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#E85D04] via-[#FFB703] to-[#22C55E]" />

        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-[family-name:var(--font-indicator)] text-xs font-bold tracking-[0.2em] text-[#FFB703]">
                OUTPOST POWER CONSOLE · SOL 01
              </p>
              <h2
                id="power-console-title"
                className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[#F8F9FA]"
              >
                Solar Power Allocation
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Power Console"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-[#1B3A5F] text-[#F8F9FA] hover:border-[#FFB703] hover:text-[#FFB703] cursor-pointer"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Power Pool Bar */}
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/15 bg-[#1B3A5F]/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#FFB703]" aria-hidden="true" />
              <span className="font-[family-name:var(--font-display)] text-sm font-bold">
                Available Solar Units
              </span>
            </div>
            <span
              className={`font-[family-name:var(--font-display)] text-lg font-extrabold ${
                remainingUnits === 0 ? 'text-[#22C55E]' : 'text-[#FFB703]'
              }`}
            >
              {remainingUnits} / {TOTAL_POWER_UNITS} Free
            </span>
          </div>

          {/* 3 System Allocation Rows */}
          <div className="mt-5 space-y-3.5">
            {systems.map((sys) => {
              const val = alloc[sys.key];
              const Icon = sys.icon;
              return (
                <div
                  key={sys.key}
                  className="rounded-2xl border border-white/10 bg-[#1B3A5F]/55 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0B1D36] text-xl shadow-inner border border-white/10">
                        {sys.emoji}
                      </span>
                      <div>
                        <h3 className="font-[family-name:var(--font-display)] text-sm font-black text-[#F8F9FA]">
                          {sys.label}
                        </h3>
                        <p className="text-xs text-[#F8F9FA]/75">{sys.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjust(sys.key, -1)}
                        disabled={val <= 1}
                        aria-label={`Decrease ${sys.label} power`}
                        className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-[#0B1D36] text-[#F8F9FA] transition-colors hover:border-[#FFB703] disabled:opacity-40 cursor-pointer"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <span className="w-10 text-center font-[family-name:var(--font-display)] text-xl font-extrabold text-[#FFB703]">
                        {val}
                      </span>

                      <button
                        type="button"
                        onClick={() => adjust(sys.key, 1)}
                        disabled={val >= 6 || remainingUnits <= 0}
                        aria-label={`Increase ${sys.label} power`}
                        className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-[#0B1D36] text-[#F8F9FA] transition-colors hover:border-[#FFB703] disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* 6-slot visual power meter */}
                  <div className="mt-3 grid grid-cols-6 gap-1.5" aria-hidden="true">
                    {[1, 2, 3, 4, 5, 6].map((slot) => (
                      <div
                        key={slot}
                        className={`h-2 rounded-full transition-colors ${
                          slot <= val ? `bg-gradient-to-r ${sys.accent}` : 'bg-[#0B1D36]/80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 rounded-xl bg-[#1B3A5F]/65 px-4 py-2.5 text-xs leading-relaxed text-[#FFB703]">
            {isBalanced
              ? 'Commander Vega: "That looks well balanced! Apply your power settings to see the outpost respond."'
              : 'Commander Vega: "Try keeping at least 2 units on every station so crew, plants, and rover stay safe."'}
          </p>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClickBack();
                onClose();
              }}
              className="min-h-[48px] rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-[#F8F9FA] hover:bg-[#1B3A5F] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClickConfirm();
                onApply(alloc);
              }}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-6 py-2.5 font-[family-name:var(--font-display)] text-sm font-extrabold text-[#0B1D36] shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-[#FFB703] whitespace-nowrap cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Apply Power Allocation</span>
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
