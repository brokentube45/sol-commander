import * as THREE from 'three';

/**
 * Lightweight Node.js 2D canvas shim so the real `buildOutpostAssets` builder
 * can execute cleanly in headless verification tests without a browser DOM or WebGL.
 */
export function ensureHeadlessCanvasShim(): void {
  if (typeof globalThis.document !== 'undefined') return;

  const noop = () => {};
  const gradMock = { addColorStop: noop };

  const makeCtx2D = () =>
    new Proxy(
      {
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        lineCap: 'butt',
        font: '12px sans-serif',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        createImageData: (w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4),
        }),
        createLinearGradient: () => gradMock,
        createRadialGradient: () => gradMock,
        putImageData: noop,
      } as Record<string, unknown>,
      {
        get(target, prop) {
          if (prop in target) return target[prop as string];
          return noop;
        },
        set(target, prop, value) {
          target[prop as string] = value;
          return true;
        },
      },
    );

  const createCanvas = () => ({
    width: 256,
    height: 256,
    getContext: () => makeCtx2D(),
  });

  (globalThis as unknown as { document: unknown }).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return createCanvas();
      return { style: {}, setAttribute: noop };
    },
  };
}

export function createHeadlessMockRenderer(): THREE.WebGLRenderer {
  return {
    capabilities: {
      getMaxAnisotropy: () => 1,
      isWebGL2: false,
    },
  } as unknown as THREE.WebGLRenderer;
}
