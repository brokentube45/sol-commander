/**
 * Centralized Popup Priority Queue (U1)
 *
 * Strict priority tiers:
 *   P0: Critical alert (storm / shelter survival alert) — never suppressed
 *   P1: Modal dialog (max 1 visible at a time)
 *   P2: Tutorial instruction banner (max 1 visible at a time; 600 ms calm gap between steps)
 *   P3: Rusty rover chatter line (1 active; paused while modal open; >= 2000 ms pacing)
 *   P4: Toasts / hints / landing telemetry (max 2 visible; 4000 ms auto-dismiss; >= 2000 ms pacing)
 */

export type PopupPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export type HudToastTone = 'info' | 'good' | 'warn' | 'critical';

export interface HudToastItem {
  id: string;
  kind: 'landing' | 'quick-action' | 'rover-yield' | 'hint';
  priority: 'P3' | 'P4';
  title: string;
  detail: string;
  tone: HudToastTone;
  createdAtMs: number;
  enqueuedAtMs: number;
  expiresAtMs: number;
}

export interface HudPopupQueueState {
  visibleToasts: HudToastItem[];
  pendingToasts: HudToastItem[];
  lastNonCriticalShownAtMs: number;
}

export const POPUP_MAX_VISIBLE_TOASTS = 2;
export const POPUP_TOAST_AUTO_DISMISS_MS = 4000;
export const POPUP_NON_CRITICAL_SPACING_MS = 2000;
export const POPUP_TUTORIAL_STEP_PAUSE_MS = 600;

export function createInitialPopupQueueState(): HudPopupQueueState {
  return {
    visibleToasts: [],
    pendingToasts: [],
    lastNonCriticalShownAtMs: -10000,
  };
}

export function enqueuePopupToast(
  state: HudPopupQueueState,
  toast: Omit<HudToastItem, 'createdAtMs' | 'enqueuedAtMs' | 'expiresAtMs'>,
  nowMs: number,
  modalActive: boolean,
): HudPopupQueueState {
  const withoutDup = {
    visibleToasts: state.visibleToasts.filter((t) => t.id !== toast.id),
    pendingToasts: state.pendingToasts.filter((t) => t.id !== toast.id),
  };

  const canShowImmediately =
    !modalActive &&
    withoutDup.visibleToasts.length < POPUP_MAX_VISIBLE_TOASTS &&
    nowMs - state.lastNonCriticalShownAtMs >= POPUP_NON_CRITICAL_SPACING_MS;

  if (canShowImmediately) {
    const shown: HudToastItem = {
      ...toast,
      createdAtMs: nowMs,
      enqueuedAtMs: nowMs,
      expiresAtMs: nowMs + POPUP_TOAST_AUTO_DISMISS_MS,
    };
    return {
      visibleToasts: [...withoutDup.visibleToasts, shown].slice(-POPUP_MAX_VISIBLE_TOASTS),
      pendingToasts: withoutDup.pendingToasts,
      lastNonCriticalShownAtMs: nowMs,
    };
  }

  const queued: HudToastItem = {
    ...toast,
    createdAtMs: nowMs,
    enqueuedAtMs: nowMs,
    expiresAtMs: nowMs + POPUP_TOAST_AUTO_DISMISS_MS,
  };
  return {
    visibleToasts: withoutDup.visibleToasts,
    pendingToasts: [...withoutDup.pendingToasts, queued].slice(-6),
    lastNonCriticalShownAtMs: state.lastNonCriticalShownAtMs,
  };
}

export function tickPopupQueue(
  state: HudPopupQueueState,
  nowMs: number,
  modalActive: boolean,
): HudPopupQueueState {
  const activeVisible = state.visibleToasts.filter((t) => nowMs < t.expiresAtMs);
  let pending = state.pendingToasts;
  let lastShown = state.lastNonCriticalShownAtMs;
  const nextVisible = [...activeVisible];

  if (
    !modalActive &&
    pending.length > 0 &&
    nextVisible.length < POPUP_MAX_VISIBLE_TOASTS &&
    nowMs - lastShown >= POPUP_NON_CRITICAL_SPACING_MS
  ) {
    // Promote highest priority first (P3 before P4), FIFO within tier
    let bestIdx = 0;
    for (let i = 1; i < pending.length; i++) {
      if (pending[i].priority === 'P3' && pending[bestIdx].priority !== 'P3') {
        bestIdx = i;
      }
    }
    const chosen = pending[bestIdx];
    pending = pending.filter((_, idx) => idx !== bestIdx);
    nextVisible.push({
      ...chosen,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + POPUP_TOAST_AUTO_DISMISS_MS,
    });
    lastShown = nowMs;
  }

  if (
    nextVisible.length === state.visibleToasts.length &&
    pending.length === state.pendingToasts.length &&
    lastShown === state.lastNonCriticalShownAtMs &&
    nextVisible.every((t, i) => t === state.visibleToasts[i])
  ) {
    return state;
  }

  return {
    visibleToasts: nextVisible,
    pendingToasts: pending,
    lastNonCriticalShownAtMs: lastShown,
  };
}

export function dismissPopupToast(state: HudPopupQueueState, id: string): HudPopupQueueState {
  return {
    ...state,
    visibleToasts: state.visibleToasts.filter((t) => t.id !== id),
    pendingToasts: state.pendingToasts.filter((t) => t.id !== id),
  };
}

/**
 * Pure bounding-box overlap utility + CSS Grid HUD zone layout specification
 * so automated tests can verify zero intersection across desktop viewports.
 */
export interface HudRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectsOverlap(a: HudRect, b: HudRect, marginPx = 0): boolean {
  return (
    a.x < b.x + b.width + marginPx &&
    a.x + a.width + marginPx > b.x &&
    a.y < b.y + b.height + marginPx &&
    a.y + a.height + marginPx > b.y
  );
}

export function computeDesktopHudZoneBoxes(
  viewportW: number,
  viewportH: number,
  options: { tutorialActive: boolean; controlsVisible: boolean; rustyCollapsed: boolean },
): Record<string, HudRect> {
  const pad = 16;
  const colGap = 12;
  const innerW = Math.max(640, viewportW - pad * 2);
  const leftW = Math.min(324, Math.floor(innerW * 0.28));
  const rightW = Math.min(296, Math.floor(innerW * 0.26));
  const centerW = Math.max(320, innerW - leftW - rightW - colGap * 2);
  const centerX = pad + leftW + colGap;
  const rightX = viewportW - pad - rightW;

  const vitalsH = 232;
  const compassH = 68;
  const tutorialH = options.tutorialActive ? 116 : 0;
  const rustyH = options.rustyCollapsed ? 46 : 138;
  const rustyW = 286;
  const controlsW = options.controlsVisible ? 430 : 190;
  const controlsH = options.controlsVisible ? 74 : 38;
  const interactW = 210;
  const interactH = 44;

  const boxes: Record<string, HudRect> = {
    'top-left-vitals': { x: pad, y: pad, width: leftW, height: vitalsH },
    'top-center-compass': { x: centerX, y: pad, width: centerW, height: compassH },
    'bottom-left-rusty': { x: pad, y: viewportH - pad - rustyH, width: rustyW, height: rustyH },
    'bottom-center-interact': {
      x: Math.round((viewportW - interactW) / 2),
      y: viewportH - pad - interactH,
      width: interactW,
      height: interactH,
    },
    'bottom-right-controls': {
      x: viewportW - pad - controlsW,
      y: viewportH - pad - controlsH,
      width: controlsW,
      height: controlsH,
    },
  };

  if (options.tutorialActive) {
    boxes['top-center-tutorial'] = {
      x: centerX + Math.round((centerW - Math.min(centerW, 410)) / 2),
      y: pad + compassH + 10,
      width: Math.min(centerW, 410),
      height: tutorialH,
    };
  } else {
    boxes['top-right-mission'] = {
      x: rightX,
      y: pad,
      width: rightW,
      height: 148,
    };
  }

  return boxes;
}
