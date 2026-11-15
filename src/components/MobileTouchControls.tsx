import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Eye, Hand } from 'lucide-react';
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
  cameraMode: _cameraMode,
  onToggleCamera,
  disabled = false,
}: MobileTouchControlsProps) {
  // Dynamic floating joystick state
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickOrigin, setJoystickOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeTouchIdRef = useRef<number | null>(null);

  // Reset inputs on unmount or disable
  useEffect(() => {
    if (disabled && moveInputRef.current) {
      moveInputRef.current.forward = false;
      moveInputRef.current.back = false;
      moveInputRef.current.left = false;
      moveInputRef.current.right = false;
      moveInputRef.current.analogX = 0;
      moveInputRef.current.analogY = 0;
    }
  }, [disabled, moveInputRef]);

  // --- Left-Thumb Dynamic Floating Joystick Handlers ---
  const handleJoystickTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.stopPropagation();
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
      e.stopPropagation();
      if (!joystickActive || !joystickOrigin) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchIdRef.current) {
          const dx = touch.clientX - joystickOrigin.x;
          const dy = touch.clientY - joystickOrigin.y;
          const dist = Math.hypot(dx, dy);
          const maxRadius = 46; // max travel radius in pixels

          const clampedDist = Math.min(dist, maxRadius);
          const angle = Math.atan2(dy, dx);

          const knobX = Math.cos(angle) * clampedDist;
          const knobY = Math.sin(angle) * clampedDist;
          setKnobOffset({ x: knobX, y: knobY });

          // Normalized analog outputs (-1 to 1)
          const normX = clampedDist > 0 ? knobX / maxRadius : 0;
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
      e.stopPropagation();
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

  const handleJump = useCallback(() => {
    if (disabled || !moveInputRef.current) return;
    soundEngine.playClickConfirm();
    moveInputRef.current.jumpRequested = true;
  }, [disabled, moveInputRef]);

  if (disabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none touch-none overflow-hidden font-[family-name:var(--font-game)]">
      {/* 1. Left-Thumb Dynamic Floating Joystick Touch Zone (Entire bottom-left 55% x 45% screen area) */}
      <div
        className="pointer-events-auto absolute bottom-0 left-0 h-[60%] w-[45%]"
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
      >
        {/*
          Idle state: 100% INVISIBLE!
          Zero static indicators or buttons blocking the Martian ground, astronaut, or terrain.
          Only appears dynamically under the player's thumb when pressed.
        */}
        {joystickActive && joystickOrigin && (
          <div
            style={{
              left: `${joystickOrigin.x}px`,
              top: `${joystickOrigin.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="pointer-events-none absolute flex h-24 w-24 items-center justify-center rounded-full border border-white/35 bg-black/30 shadow-[0_0_20px_rgba(255,183,3,0.35)] backdrop-blur-xs"
          >
            {/* Center Thumb Knob */}
            <div
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              }}
              className="h-10 w-10 rounded-full border-2 border-white/90 bg-gradient-to-br from-[#FFB703] to-[#E85D04] shadow-[0_0_12px_rgba(255,183,3,0.8)] transition-transform duration-75"
            />
          </div>
        )}
      </div>

      {/* 2. Bottom-Right Compact Ghost Action Buttons (Camera, Interact, Hop) */}
      <div className="pointer-events-auto absolute bottom-4 right-4 flex items-end gap-2.5">
        {/* 1P / 3P View Toggle (Subtle 36px ghost glass button) */}
        <button
          type="button"
          onClick={onToggleCamera}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-[#38BDF8] shadow-md backdrop-blur-xs active:scale-90 active:bg-white/20 transition-transform"
          aria-label="Toggle Camera View"
        >
          <Eye className="h-4 w-4" />
        </button>

        {/* Action / Interact Button (Only rendered when near interactable object) */}
        {canInteract && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onInteract?.();
            }}
            className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 border-[#22C55E] bg-[#22C55E]/30 text-[#22C55E] shadow-[0_0_18px_rgba(34,197,94,0.55)] backdrop-blur-xs animate-pulse active:scale-90 transition-transform"
            aria-label={interactLabel ?? 'Interact with Station'}
          >
            <Hand className="h-5 w-5 text-white" />
            <span className="text-[8px] font-black uppercase text-white tracking-wider">Act</span>
          </button>
        )}

        {/* Mars Suited Hop Button (Translucent glass amber button - 48px) */}
        <button
          type="button"
          onClick={handleJump}
          className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 border-[#FFB703]/80 bg-black/45 text-[#FFB703] shadow-[0_0_16px_rgba(255,183,3,0.35)] backdrop-blur-xs active:scale-90 active:bg-[#FFB703]/30 transition-transform"
          aria-label="Jump in Mars Gravity"
        >
          <ArrowUp className="h-5 w-5 stroke-[2.5]" />
          <span className="text-[8px] font-black uppercase tracking-wider text-[#FFB703]">Hop</span>
        </button>
      </div>
    </div>
  );
}
