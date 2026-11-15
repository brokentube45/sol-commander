import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { useTouchDevice } from '../utils/useTouchDevice';

/**
 * Orientation Guard
 * Gently alerts mobile players when device is in Portrait orientation,
 * recommending Landscape for optimal dual-thumb game controls.
 * Always allows "Play Anyway" so the user is never blocked.
 */
export function OrientationGuard() {
  const isTouch = useTouchDevice();
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isTouch || typeof window === 'undefined') return;

    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 768;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [isTouch]);

  if (!isTouch || !isPortrait || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#071324]/96 p-6 text-center backdrop-blur-md font-[family-name:var(--font-game)]"
    >
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-[#FFB703]/60 bg-gradient-to-br from-[#FFB703]/20 to-[#E85D04]/20 text-[#FFB703] shadow-[0_0_32px_rgba(255,183,3,0.35)] animate-pulse">
        <Smartphone className="h-10 w-10 rotate-90" aria-hidden="true" />
      </div>

      <p className="font-[family-name:var(--font-indicator)] text-xs font-black uppercase tracking-[0.24em] text-[#FFB703]">
        COMMANDER VIEWPORT NOTICE
      </p>

      <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-black text-[#F8F9FA] sm:text-2xl">
        Rotate Device to Landscape
      </h2>

      <p className="mt-2 max-w-xs text-xs font-medium leading-relaxed text-[#F8F9FA]/80">
        Sol Commander is designed for dual-thumb exploration in wide screen mode. Rotate your phone sideways for the best flight suit controls.
      </p>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="mt-6 inline-flex min-h-[42px] cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 text-xs font-extrabold text-[#F8F9FA] hover:bg-[#FFB703] hover:text-[#071324] transition-colors"
      >
        Continue in Portrait
      </button>
    </div>
  );
}
