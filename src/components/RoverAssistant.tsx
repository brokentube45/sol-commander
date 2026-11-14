import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  OctagonAlert,
  VolumeX,
  Volume2,
  HelpCircle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { RoverMood } from '../sim/roverData';

interface RoverAssistantProps {
  roverName: string;
  mood: RoverMood;
  damaged: boolean;
  hushed: boolean;
  lastLine: string;
  activeHint: string | null;
  hintLevelUsed: number;
  crewSlotsRemaining: number;
  onAskHint: (level: 1 | 2) => void;
  onToggleHush: () => void;
}

export function RoverAssistant({
  roverName,
  mood,
  damaged,
  hushed,
  lastLine,
  activeHint,
  hintLevelUsed,
  crewSlotsRemaining,
  onAskHint,
  onToggleHush,
}: RoverAssistantProps) {
  const moodConfig =
    mood === 'critical'
      ? {
          label: 'Alert',
          color: '#EF4444',
          border: 'border-[#EF4444]/65 shadow-[0_0_20px_rgba(239,68,68,0.25)]',
          Icon: OctagonAlert,
        }
      : mood === 'lowPower'
        ? {
            label: 'Warning',
            color: '#FFB703',
            border: 'border-[#FFB703]/60 shadow-[0_0_20px_rgba(255,183,3,0.22)]',
            Icon: AlertTriangle,
          }
        : {
            label: 'Online',
            color: '#22C55E',
            border: 'border-[#E85D04]/50 shadow-[0_0_20px_rgba(232,93,4,0.2)]',
            Icon: CheckCircle2,
          };

  const MoodIcon = moodConfig.Icon;

  return (
    <aside
      aria-label={`${roverName} companion chat`}
      className={`pointer-events-auto w-full max-w-[292px] rounded-xl border ${moodConfig.border} bg-[#071324]/88 p-2.5 text-[#F8F9FA] font-[family-name:var(--font-game)]`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#071324]"
            style={{ backgroundColor: moodConfig.color }}
          >
            <Bot className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-extrabold text-[#F8F9FA]">{roverName}</span>
              {damaged && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#FFB703]">
                  <Wrench className="h-2.5 w-2.5" aria-hidden="true" />
                  Damaged
                </span>
              )}
            </div>
            <p
              className="flex items-center gap-1 text-[10px] font-bold"
              style={{ color: moodConfig.color }}
            >
              <MoodIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{moodConfig.label}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleHush}
          aria-pressed={hushed}
          title={hushed ? 'Unmute Rover' : 'Mute Rover chatter'}
          className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition-colors cursor-pointer ${
            hushed
              ? 'border-[#FFB703] bg-[#FFB703]/20 text-[#FFB703]'
              : 'border-white/15 bg-[#0E2038] text-[#F8F9FA]/85 hover:border-[#FFB703]'
          }`}
        >
          {hushed ? (
            <VolumeX className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Volume2 className="h-3 w-3" aria-hidden="true" />
          )}
          <span>{hushed ? 'Quiet' : 'Mute'}</span>
        </button>
      </div>

      {/* Speech / Hint Bubble */}
      <div className="mt-2 rounded-lg border border-white/10 bg-[#0D213B]/80 px-2.5 py-1.5 text-xs leading-snug">
        {activeHint ? (
          <>
            <p className="text-[10px] font-bold text-[#FFB703]">Rover Hint</p>
            <p className="mt-0.5 text-[#F8F9FA]">{activeHint}</p>
          </>
        ) : hushed ? (
          <p className="text-[#F8F9FA]/70">{roverName} is quiet. Hints ready.</p>
        ) : (
          <p className="text-[#F8F9FA]/92">&ldquo;{lastLine}&rdquo;</p>
        )}
      </div>

      {/* Hint Controls */}
      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onAskHint(1)}
          className="inline-flex min-h-[30px] flex-1 items-center justify-center gap-1 rounded-lg border border-white/15 bg-[#0E2038] px-2 text-[11px] font-bold text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer whitespace-nowrap"
        >
          <HelpCircle className="h-3 w-3 text-[#22C55E]" aria-hidden="true" />
          <span>Hint [Q]</span>
        </button>

        <button
          type="button"
          onClick={() => onAskHint(2)}
          disabled={hintLevelUsed < 2 && crewSlotsRemaining < 1}
          className="inline-flex min-h-[30px] flex-1 items-center justify-center gap-1 rounded-lg border border-[#E85D04]/50 bg-[#0E2038] px-2 text-[11px] font-bold text-[#FFB703] hover:bg-[#FFB703] hover:text-[#071324] disabled:opacity-45 cursor-pointer whitespace-nowrap"
        >
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          <span>{hintLevelUsed >= 2 ? 'Deep Hint' : 'Deep (1 Slot)'}</span>
        </button>
      </div>
    </aside>
  );
}
