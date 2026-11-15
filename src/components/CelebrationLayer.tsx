import { useEffect, useRef } from 'react';
import { celebrationEngine } from '../utils/celebration';

interface CelebrationLayerProps {
  reducedMotion?: boolean;
}

/**
 * Fullscreen non-blocking 2D celebration particle overlay.
 * Layer order: above 3D scene (z-0), GameplayHUD (z-20), and modal scrims (z-30),
 * strictly below modal cards (z-40) so Science Card and Debrief text remain legible.
 */
export function CelebrationLayer({ reducedMotion = false }: CelebrationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return celebrationEngine.attachCanvas(canvas);
  }, []);

  useEffect(() => {
    celebrationEngine.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="celebration-canvas"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[35] h-full w-full"
    />
  );
}
