import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ChevronDown, ChevronUp, ArrowRight, FastForward } from 'lucide-react';
import { JuniorScienceCardDef } from '../sim/juniorData';
import { soundEngine } from '../utils/soundEngine';

interface ScienceCardModalProps {
  card: JuniorScienceCardDef;
  onContinue: () => void;
  onSkip?: () => void;
  continueLabel?: string;
  reducedMotion?: boolean;
  inline?: boolean;
}

export function ScienceCardModal({
  card,
  onContinue,
  onSkip,
  continueLabel = 'Continue',
  reducedMotion = false,
  inline = false,
}: ScienceCardModalProps) {
  const [exploreOpen, setExploreOpen] = useState(false);

  const body = (
    <motion.section
      role={inline ? undefined : 'dialog'}
      aria-modal={inline ? undefined : 'true'}
      aria-labelledby={`science-card-${card.id}`}
      initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full overflow-hidden rounded-2xl border border-[#38BDF8]/60 bg-[#071324]/96 text-[#F8F9FA] shadow-[0_0_34px_rgba(56,189,248,0.24)] font-[family-name:var(--font-game)]"
    >
      <div className="h-1 w-full bg-gradient-to-r from-[#38BDF8] via-[#22C55E] to-[#FFB703]" />

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#38BDF8]/15 px-2.5 py-1 text-xs font-extrabold text-[#38BDF8]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Science Card · {card.when}</span>
          </span>
        </div>

        <h3
          id={`science-card-${card.id}`}
          className="mt-3 font-[family-name:var(--font-display)] text-xl font-extrabold text-[#F8F9FA] sm:text-2xl"
        >
          {card.title}
        </h3>

        <p className="mt-2.5 text-base font-bold leading-relaxed text-[#F8F9FA]/95 sm:text-lg">
          {card.oneSentence}
        </p>

        {/* Optional Grown-up Science / Explore More */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setExploreOpen((prev) => !prev);
            }}
            className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-[#1B3A5F]/65 px-3 py-1.5 text-xs font-bold text-[#38BDF8] transition-colors hover:border-[#38BDF8]"
          >
            <span>Explore more</span>
            {exploreOpen ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {exploreOpen && (
            <div className="mt-2.5 rounded-xl border border-[#38BDF8]/30 bg-[#0D213B]/85 p-3.5 text-xs leading-relaxed text-[#F8F9FA]/90">
              <p>{card.grownUpInfo}</p>
              <p className="mt-1.5 text-[11px] font-bold text-[#FFB703]/85">
                Source: {card.sourceNote}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          {card.skipEnabled && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                (onSkip ?? onContinue)();
              }}
              className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-[#1B3A5F]/55 px-4 text-xs font-bold text-[#F8F9FA]/80 hover:border-[#FFB703] hover:text-[#F8F9FA]"
            >
              <span>Skip</span>
              <FastForward className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onContinue();
            }}
            className="ml-auto inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#22C55E] px-5 py-2 text-xs font-extrabold text-[#071324] shadow-lg transition-transform hover:scale-[1.02]"
          >
            <span>{continueLabel}</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.section>
  );

  if (inline) return body;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#040A15]/70 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-xl">{body}</div>
    </div>
  );
}
