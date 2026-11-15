import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  CheckCircle2,
  Droplets,
  Leaf,
  Moon,
  Mountain,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Sun,
  Wind,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { JuniorQuizDef } from '../sim/juniorData';
import { soundEngine } from '../utils/soundEngine';

interface JuniorQuizCardProps {
  quiz: JuniorQuizDef;
  roverName: string;
  onPassed: () => void;
  continueLabel?: string;
  reducedMotion?: boolean;
  /** Render inline inside another panel instead of a standalone modal backdrop */
  inline?: boolean;
}

function QuizOptionIcon({ icon }: { icon: string }) {
  const cls = 'h-6 w-6 shrink-0';
  switch (icon) {
    case 'oxygen':
      return <Sparkles className={cls} aria-hidden="true" />;
    case 'wind':
      return <Wind className={cls} aria-hidden="true" />;
    case 'water':
      return <Droplets className={cls} aria-hidden="true" />;
    case 'sun':
      return <Sun className={cls} aria-hidden="true" />;
    case 'moon':
      return <Moon className={cls} aria-hidden="true" />;
    case 'ice':
      return <Snowflake className={cls} aria-hidden="true" />;
    case 'leaf':
      return <Leaf className={cls} aria-hidden="true" />;
    case 'rock':
      return <Mountain className={cls} aria-hidden="true" />;
    case 'rover':
      return <Bot className={cls} aria-hidden="true" />;
    case 'shield':
      return <ShieldCheck className={cls} aria-hidden="true" />;
    default:
      return <HelpCircle className={cls} aria-hidden="true" />;
  }
}

export function JuniorQuizCard({
  quiz,
  roverName,
  onPassed,
  continueLabel = 'Continue',
  reducedMotion = false,
  inline = false,
}: JuniorQuizCardProps) {
  const [selected, setSelected] = useState<'A' | 'B' | null>(null);
  const [solved, setSolved] = useState(false);

  const handlePick = (choice: 'A' | 'B') => {
    if (solved) return;
    setSelected(choice);
    if (choice === quiz.correctOption) {
      setSolved(true);
      soundEngine.playQuizCorrect();
    } else {
      soundEngine.playQuizHint();
    }
  };

  const wrongTry = selected !== null && !solved;

  const cardBody = (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full overflow-hidden rounded-2xl border ${
        solved
          ? 'border-[#22C55E]/70 shadow-[0_0_32px_rgba(34,197,94,0.28)]'
          : 'border-[#FFB703]/55 shadow-[0_0_32px_rgba(255,183,3,0.2)]'
      } bg-[#071324]/96 text-[#F8F9FA] font-[family-name:var(--font-game)]`}
    >
      <div
        className={`h-1 w-full bg-gradient-to-r ${
          solved ? 'from-[#22C55E] to-[#38BDF8]' : 'from-[#FFB703] via-[#E85D04] to-[#22C55E]'
        }`}
      />

      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-bold text-[#FFB703]">
          <Bot className="h-4 w-4 text-[#22C55E]" aria-hidden="true" />
          <span>{roverName} Quick Science Check</span>
        </div>

        <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-extrabold leading-snug text-[#F8F9FA] sm:text-xl">
          {quiz.question}
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['A', 'B'] as const).map((optKey) => {
            const opt = optKey === 'A' ? quiz.optionA : quiz.optionB;
            const isPicked = selected === optKey;
            const isCorrectPick = solved && optKey === quiz.correctOption;
            const isWrongPick = !solved && isPicked && optKey !== quiz.correctOption;

            return (
              <button
                key={optKey}
                type="button"
                onClick={() => handlePick(optKey)}
                disabled={solved && !isCorrectPick}
                className={`flex min-h-[68px] cursor-pointer items-center gap-3.5 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                  isCorrectPick
                    ? 'border-[#22C55E] bg-[#22C55E]/20 text-[#F8F9FA] shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                    : isWrongPick
                      ? 'border-[#FFB703] bg-[#FFB703]/15 text-[#F8F9FA]'
                      : 'border-white/15 bg-[#1B3A5F]/65 text-[#F8F9FA] hover:border-[#FFB703] hover:bg-[#1B3A5F]'
                } disabled:cursor-default disabled:opacity-55`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    isCorrectPick
                      ? 'bg-[#22C55E] text-[#071324]'
                      : isWrongPick
                        ? 'bg-[#FFB703] text-[#071324]'
                        : 'bg-[#0B1D36] text-[#FFB703]'
                  }`}
                >
                  <QuizOptionIcon icon={opt.icon} />
                </span>
                <span className="text-sm font-extrabold leading-tight sm:text-base">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {wrongTry && (
            <motion.div
              key="wrong-hint"
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#FFB703]/55 bg-[#FFB703]/12 px-4 py-3 text-sm font-bold text-[#FFB703]"
            >
              <Bot className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{quiz.wrongFeedback}</span>
            </motion.div>
          )}

          {solved && (
            <motion.div
              key="correct-feedback"
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#22C55E]/60 bg-[#22C55E]/15 px-4 py-3"
            >
              <div className="flex items-center gap-2.5 text-sm font-extrabold text-[#22C55E]">
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{quiz.correctFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onPassed();
                }}
                className="inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2 text-xs font-extrabold text-[#071324] shadow-md transition-transform hover:scale-[1.02]"
              >
                <span>{continueLabel}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  if (inline) {
    return cardBody;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#040A15]/72 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-xl">{cardBody}</div>
    </div>
  );
}
