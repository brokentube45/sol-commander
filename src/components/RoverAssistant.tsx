import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  OctagonAlert,
  VolumeX,
  Volume2,
  HelpCircle,
  Sparkles,
  Wrench,
  ChevronDown,
  ChevronUp,
  Mic,
  Volume1,
} from 'lucide-react';
import { RoverMood } from '../sim/roverData';
import { soundEngine } from '../utils/soundEngine';

interface RoverAssistantProps {
  roverName: string;
  mood: RoverMood;
  damaged: boolean;
  hushed: boolean;
  lastLine: string;
  activeHint: string | null;
  hintLevelUsed: number;
  crewSlotsRemaining: number;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  showHintButtons?: boolean;
  onAskHint: (level: 1 | 2) => void;
  onToggleHush: () => void;
}

/**
 * Adorable kid-friendly Vector Astronaut Avatar
 * Inspired by the 3D Mars astronaut with curved white helmet, orange accents,
 * and reflective Martian sunset visor.
 */
function AstronautAvatar({
  mood,
  isSpeaking,
}: {
  mood: RoverMood;
  isSpeaking: boolean;
}) {
  const visorGlow =
    mood === 'critical'
      ? '#EF4444'
      : mood === 'lowPower'
        ? '#FFB703'
        : '#38BDF8';

  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
        aria-hidden="true"
      >
        {/* Backpack & Shoulder Harness (White & Orange) */}
        <rect x="14" y="38" width="36" height="22" rx="7" fill="#E85D04" />
        <rect x="18" y="42" width="28" height="18" rx="5" fill="#F8F9FA" />
        {/* Chest utility plate */}
        <rect x="25" y="47" width="14" height="6" rx="2" fill="#0B1D36" />
        <circle cx="28" cy="50" r="1.5" fill="#38BDF8" className="animate-pulse" />
        <circle cx="36" cy="50" r="1.5" fill={visorGlow} />

        {/* Suit Neck Collar */}
        <ellipse cx="32" cy="38" rx="15" ry="4" fill="#0B1D36" />
        <ellipse cx="32" cy="37" rx="14" ry="3" fill="#334155" />

        {/* Big Rounded Helmet (White Outer Shell) */}
        <circle cx="32" cy="24" r="21" fill="#F8F9FA" />
        <circle cx="32" cy="24" r="21" stroke="#CBD5E1" strokeWidth="1.5" />

        {/* Orange Ear Muffs / Comms Pods */}
        <rect x="8" y="18" width="5" height="12" rx="2.5" fill="#E85D04" />
        <rect x="51" y="18" width="5" height="12" rx="2.5" fill="#E85D04" />
        <circle cx="10.5" cy="24" r="1.2" fill="#38BDF8" />
        <circle cx="53.5" cy="24" r="1.2" fill="#38BDF8" />

        {/* Visor Bezel (Dark Graphite) */}
        <ellipse cx="32" cy="23" rx="16.5" ry="14" fill="#0B1D36" />
        <ellipse
          cx="32"
          cy="23"
          rx="16.5"
          ry="14"
          stroke={visorGlow}
          strokeWidth="1.5"
          className="transition-colors duration-300"
        />

        {/* Reflective Visor Interior - Mars Sunset Gradient */}
        <ellipse cx="32" cy="23" rx="15" ry="12.5" fill="#071324" />
        {/* Mars Mountain Skyline Reflection */}
        <path
          d="M18 28 C22 25, 26 27, 30 24 C34 22, 38 25, 46 27 L46 32 C42 34, 22 34, 18 32 Z"
          fill="#E85D04"
          opacity="0.9"
        />
        {/* Sun glint on visor */}
        <circle cx="41" cy="18" r="2.2" fill="#FFB703" />
        <circle cx="41" cy="18" r="1.2" fill="#FFFFFF" />

        {/* Glass Sheen Curve */}
        <path
          d="M20 18 C24 14, 34 13, 40 15"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>

      {/* Speaking Ripple Ring */}
      {isSpeaking && (
        <span
          className="pointer-events-none absolute inset-0 -m-1 rounded-full border-2 border-[#38BDF8] animate-ping opacity-75"
          aria-hidden="true"
        />
      )}
    </div>
  );
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
  collapsed = false,
  onToggleCollapsed,
  showHintButtons = true,
  onAskHint,
  onToggleHush,
}: RoverAssistantProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // When speech starts/stops or new text arrives, synchronize voice
  // During training, TutorialOverlay orchestrates step instructions so RoverAssistant does not clash on mount
  useEffect(() => {
    if (!showHintButtons) return;
    const textToSpeak = activeHint ?? lastLine;
    if (!hushed && textToSpeak) {
      soundEngine.speakRover(textToSpeak, () => setIsSpeaking(false));
      setIsSpeaking(true);
    }
    return () => {
      soundEngine.stopSpeaking();
      setIsSpeaking(false);
    };
  }, [activeHint, lastLine, hushed, showHintButtons]);

  const handleSpeakAgain = () => {
    const textToSpeak = activeHint ?? lastLine;
    if (textToSpeak) {
      soundEngine.playClick();
      setIsSpeaking(true);
      soundEngine.speakRover(textToSpeak, () => setIsSpeaking(false));
    }
  };

  const moodConfig =
    mood === 'critical'
      ? {
          label: 'Alert',
          color: '#EF4444',
          border: 'border-[#EF4444]/65 shadow-[0_0_24px_rgba(239,68,68,0.3)]',
          badgeBg: 'bg-[#EF4444]/20 text-[#EF4444]',
          Icon: OctagonAlert,
        }
      : mood === 'lowPower'
        ? {
            label: 'Warning',
            color: '#FFB703',
            border: 'border-[#FFB703]/60 shadow-[0_0_24px_rgba(255,183,3,0.25)]',
            badgeBg: 'bg-[#FFB703]/20 text-[#FFB703]',
            Icon: AlertTriangle,
          }
        : {
            label: 'Ready',
            color: '#22C55E',
            border: 'border-[#FFB703]/40 shadow-[0_4px_24px_rgba(232,93,4,0.22)]',
            badgeBg: 'bg-[#22C55E]/20 text-[#22C55E]',
            Icon: CheckCircle2,
          };

  const MoodIcon = moodConfig.Icon;

  return (
    <aside
      aria-label={`${roverName} companion chat`}
      className={`pointer-events-auto w-full max-w-[316px] rounded-2xl border-2 ${moodConfig.border} bg-[#071324]/92 p-3 text-[#F8F9FA] backdrop-blur-md font-[family-name:var(--font-game)] transition-all duration-200`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <AstronautAvatar mood={mood} isSpeaking={isSpeaking} />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-extrabold text-[#F8F9FA] font-[family-name:var(--font-display)]">
                {roverName}
              </span>
              {damaged && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E85D04]/30 px-1.5 py-0.5 text-[10px] font-extrabold text-[#FFB703]">
                  <Wrench className="h-2.5 w-2.5" aria-hidden="true" />
                  Fix
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${moodConfig.badgeBg}`}>
                <MoodIcon className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                <span>{moodConfig.label}</span>
              </span>

              {isSpeaking && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#38BDF8] animate-pulse">
                  <Volume1 className="h-3 w-3" />
                  <span>Speaking</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls (Voice read-aloud, Hush, Expand/Collapse) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleSpeakAgain}
            title="Read message aloud (Voice)"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-[#0E2038] text-[#38BDF8] hover:border-[#38BDF8] hover:bg-[#38BDF8]/20 transition-colors cursor-pointer"
          >
            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playClickSoft();
              onToggleHush();
            }}
            aria-pressed={hushed}
            title={hushed ? 'Unmute Rover Voice' : 'Mute Rover Voice'}
            className={`inline-flex h-8 items-center gap-1 rounded-xl border px-2 text-xs font-bold transition-colors cursor-pointer ${
              hushed
                ? 'border-[#FFB703] bg-[#FFB703]/20 text-[#FFB703]'
                : 'border-white/15 bg-[#0E2038] text-[#F8F9FA]/85 hover:border-[#FFB703]'
            }`}
          >
            {hushed ? (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="text-[11px]">{hushed ? 'Quiet' : 'Voice'}</span>
          </button>

          {onToggleCollapsed && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClickSoft();
                onToggleCollapsed();
              }}
              aria-expanded={!collapsed}
              title={collapsed ? `Expand ${roverName}` : `Collapse ${roverName}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-[#0E2038] text-[#F8F9FA]/85 hover:border-[#FFB703] cursor-pointer"
            >
              {collapsed ? (
                <ChevronUp className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#FFB703]" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="mt-2.5">
          {/* Speech / Hint Bubble with pointer arrow to avatar */}
          <div className="relative rounded-xl border border-[#FFB703]/30 bg-[#0E2038]/95 p-3 text-xs leading-relaxed shadow-inner">
            {/* Triangle pointer */}
            <div className="absolute -top-1.5 left-5 h-3 w-3 rotate-45 border-l border-t border-[#FFB703]/30 bg-[#0E2038]" />

            {activeHint ? (
              <div>
                <p className="flex items-center gap-1 text-[11px] font-extrabold text-[#FFB703]">
                  <span>💡 ROVER MISSION TIP</span>
                </p>
                <p className="mt-1 text-[12px] font-medium text-[#F8F9FA]">
                  {activeHint}
                </p>
              </div>
            ) : hushed ? (
              <p className="text-[12px] text-[#F8F9FA]/75 italic">
                {roverName} is on silent mode. Tap <strong>Voice</strong> above or <strong>Hint [Q]</strong> below!
              </p>
            ) : (
              <p className="text-[12px] font-medium text-[#F8F9FA]">
                &ldquo;{lastLine}&rdquo;
              </p>
            )}
          </div>

          {/* Child-Friendly Hint Buttons */}
          {showHintButtons && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClickConfirm();
                  onAskHint(1);
                }}
                className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-white/20 bg-[#0E2038] px-2.5 text-xs font-extrabold text-[#F8F9FA] hover:border-[#22C55E] hover:bg-[#22C55E]/15 hover:text-[#22C55E] transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <HelpCircle className="h-3.5 w-3.5 text-[#22C55E]" aria-hidden="true" />
                <span>Tip [Q]</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClickConfirm();
                  onAskHint(2);
                }}
                disabled={hintLevelUsed < 2 && crewSlotsRemaining < 1}
                className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-[#FFB703]/60 bg-gradient-to-r from-[#FFB703]/20 to-[#E85D04]/20 px-2.5 text-xs font-extrabold text-[#FFB703] hover:border-[#FFB703] hover:bg-[#FFB703] hover:text-[#071324] transition-all disabled:opacity-40 cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
                <span>{hintLevelUsed >= 2 ? 'Full Clue' : 'Deep (1 Slot)'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
