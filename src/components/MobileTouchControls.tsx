import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Eye, Hand, Zap } from 'lucide-react';
import { GameplayInputState } from './MarsOutpost3D';
import { soundEngine } from '../utils/soundEngine';

interface MobileTouchControlsProps {
  moveInputRef: MutableRefObject<GameplayInputState>;
  onInteract?: () => void;
  canInteract?: boolean;
  interactLabel?: string;
  cameraMode: '1p' | '3p';
  onToggleCamera: () => void;
  disabled?: boolean;
}

export function MobileTouchControls({
  moveInputRef,
  onInteract,
  canInteract = false,
  interactLabel,
  cameraMode,
  onToggleCamera,
  disabled = false,
}: MobileTouchControlsProps) {
  // Joystick state
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickOrigin, setJoystickOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeTouchIdRef = useRef<number | null>(null);

  // Look touch state
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number } | null>(null);

  // Reset inputs on unmount or disable
  useEffect(() => {
    if (disabled && moveInputRef.current) {
      moveInputRef.current.forward = false;
      moveInputRef.current.back = false;
      moveInputRef.current.left = false;
      moveInputRef.current.right = false;
      moveInputRef.current.analogX = 0;
      moveInputRef.current.analogY = 0;
      moveInputRef.current.lookX = 0;
      moveInputRef.current.lookY = 0;
    }
  }, [disabled, moveInputRef]);

  // --- Left-Thumb Joystick Handlers ---
  const handleJoystickTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (disabled) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      activeTouchIdRef.current = touch.identifier;
      const origin = { x: touch.clientX, y: touch.clientY };
      setJoystickOrigin(origin);
      setKnobOffset({ x: 0, y: 0 });
      setJoystickActive(true);
    },
    [disabled],
  );

  const handleJoystickTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!joystickActive || !joystickOrigin) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchIdRef.current) {
          const dx = touch.clientX - joystickOrigin.x;
          const dy = touch.clientY - joystickOrigin.y;
          const dist = Math.hypot(dx, dy);
          const maxRadius = 48; // max travel radius in pixels

          const clampedDist = Math.min(dist, maxRadius);
          const angle = Math.atan2(dy, dx);

          const knobX = Math.cos(angle) * clampedDist;
          const knobY = Math.sin(angle) * clampedDist;
          setKnobOffset({ x: knobX, y: knobY });

          // Normalized analog outputs (-1 to 1)
          const normX = clampedDist > 0 ? (knobX / maxRadius) : 0;
          const normY = clampedDist > 0 ? -(knobY / maxRadius) : 0; // inverted for forward = positive Y

          if (moveInputRef.current) {
            moveInputRef.current.analogX = normX;
            moveInputRef.current.analogY = normY;
            moveInputRef.current.forward = normY > 0.25;
            moveInputRef.current.back = normY < -0.25;
            moveInputRef.current.right = normX > 0.25;
            moveInputRef.current.left = normX < -0.25;
            // Auto-engage Martian lope when pushed to edge (>75%)
            moveInputRef.current.sprint = clampedDist / maxRadius > 0.75;
          }
          break;
        }
      }
    },
    [joystickActive, joystickOrigin, moveInputRef],
  );

  const handleJoystickTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchIdRef.current) {
          activeTouchIdRef.current = null;
          setJoystickActive(false);
          setJoystickOrigin(null);
          setKnobOffset({ x: 0, y: 0 });

          if (moveInputRef.current) {
            moveInputRef.current.analogX = 0;
            moveInputRef.current.analogY = 0;
            moveInputRef.current.forward = false;
            moveInputRef.current.back = false;
            moveInputRef.current.left = false;
            moveInputRef.current.right = false;
            moveInputRef.current.sprint = false;
          }
          break;
        }
      }
    },
    [moveInputRef],
  );

  // --- Right-Screen Touch Camera Look Handlers ---
  const handleLookTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (disabled) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      lookTouchIdRef.current = touch.identifier;
      lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [disabled],
  );

  const handleLookTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!lastLookPosRef.current) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchIdRef.current) {
          const deltaX = touch.clientX - lastLookPosRef.current.x;
          const deltaY = touch.clientY - lastLookPosRef.current.y;
          lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

          if (moveInputRef.current) {
            // Sensitivity multiplier for natural smooth rotation
            moveInputRef.current.lookX = -deltaX * 1.85;
            moveInputRef.current.lookY = deltaY * 1.65;
          }
          break;
        }
      }
    },
    [moveInputRef],
  );

  const handleLookTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchIdRef.current) {
          lookTouchIdRef.current = null;
          lastLookPosRef.current = null;
          if (moveInputRef.current) {
            moveInputRef.current.lookX = 0;
            moveInputRef.current.lookY = 0;
          }
          break;
        }
      }
    },
    [moveInputRef],
  );

  const handleJump = useCallback(() => {
    if (disabled || !moveInputRef.current) return;
    soundEngine.playClickConfirm();
    moveInputRef.current.jumpRequested = true;
  }, [disabled, moveInputRef]);

  if (disabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none touch-none overflow-hidden font-[family-name:var(--font-game)]">
      {/* 1. Left Thumb Joystick Area (Lower-Left 45% of Screen) */}
      <div
        className="pointer-events-auto absolute bottom-0 left-0 h-[65%] w-[48%]"
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
      >
        {/* Resting Virtual Joystick Base indicator (always visible when not dragging) */}
        {!joystickActive && (
          <div className="absolute bottom-8 left-8 flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/20 bg-white/5 backdrop-blur-xs">
            <div className="h-10 w-10 rounded-full border border-[#FFB703]/40 bg-[#FFB703]/15 shadow-[0_0_12px_rgba(255,183,3,0.25)]" />
            <span className="absolute -top-5 text-[9px] font-black uppercase tracking-widest text-white/40">
              Move
            </span>
          </div>
        )}

        {/* Active Dynamic Floating Joystick Ring & Knob */}
        {joystickActive && joystickOrigin && (
          <div
            style={{
              left: `${joystickOrigin.x}px`,
              top: `${joystickOrigin.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="pointer-events-none absolute flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#FFB703]/60 bg-[#071324]/60 shadow-[0_0_24px_rgba(255,183,3,0.35)] backdrop-blur-md"
          >
            {/* Center Thumb Knob */}
            <div
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              }}
              className="h-12 w-12 rounded-full border-2 border-white bg-gradient-to-br from-[#FFB703] to-[#E85D04] shadow-lg transition-transform duration-75"
            />
          </div>
        )}
      </div>

      {/* 2. Right Screen Look Swipe Zone (Upper-Right 52% of Screen) */}
      <div
        className="pointer-events-auto absolute right-0 top-0 h-[70%] w-[52%]"
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
        onTouchCancel={handleLookTouchEnd}
      />

      {/* 3. Bottom-Right Action Cluster (Jump, Interact, View Toggle) */}
      <div className="pointer-events-auto absolute bottom-6 right-6 flex items-end gap-3">
        {/* 1P / 3P View Toggle */}
        <button
          type="button"
          onClick={onToggleCamera}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-[#071324]/80 text-[#F8F9FA] shadow-lg backdrop-blur-md active:scale-90 transition-transform"
          aria-label="Toggle Camera View"
        >
          <Eye className="h-5 w-5 text-[#38BDF8]" />
        </button>

        {/* Action / Interact Button (E equivalent) */}
        {canInteract && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onInteract?.();
            }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#22C55E] bg-gradient-to-br from-[#22C55E] to-[#15803D] text-[#071324] shadow-[0_0_20px_rgba(34,197,94,0.6)] animate-pulse active:scale-95 transition-transform"
            aria-label={interactLabel ?? 'Interact with Station'}
          >
            <Hand className="h-7 w-7 text-[#071324]" />
          </button>
        )}

        {/* Jump Button (Mars suited hop) */}
        <button
          type="button"
          onClick={handleJump}
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#FFB703]/80 bg-gradient-to-br from-[#FFB703] to-[#E85D04] text-[#0B1D36] shadow-[0_0_24px_rgba(255,183,3,0.5)] active:scale-90 transition-transform"
          aria-label="Jump in Mars Gravity"
        >
          <div className="flex flex-col items-center">
            <ArrowUp className="h-6 w-6 stroke-[3]" />
            <span className="text-[10px] font-black uppercase tracking-tight">Hop</span>
          </div>
        </button>
      </div>
    </div>
  );
}
