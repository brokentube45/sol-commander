/**
 * Deterministic Mulberry32 seeded PRNG so every campaign run can be
 * replayed with the exact same seed on Debrief.
 */
export interface SeededRng {
  next: () => number;
  chance: (probability: number) => boolean;
  range: (min: number, max: number) => number;
}

export function createSeededRng(seed: number): SeededRng {
  let a = (seed >>> 0) || 20260709;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    chance: (probability: number) => next() < probability,
    range: (min: number, max: number) => min + next() * (max - min),
  };
}

export function generateNewSeed(): number {
  return Math.floor(100000 + Math.random() * 899999);
}
