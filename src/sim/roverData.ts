/**
 * Rover Companion & AI Process Instructor ("Rusty" by default)
 *
 * Rules from §9:
 * - Child names Rover at the start (default "Rusty", max 12 chars, simple profanity filter).
 * - Mood follows resources, NEVER colour-only (always paired with icon + text).
 * - Non-repeating trigger lines (3+ variants per trigger).
 * - Level 1 Hint: FREE Socratic question.
 * - Level 2 Hint: Costs 1 crew slot, gives directional thinking prompt.
 * - NEVER reveals best option or dice rolls!
 * - Damage ripple: if damaged in M2, limps & voice crackles in M3-M5, but hints NEVER disabled.
 */

export type RoverMood = 'ok' | 'lowPower' | 'critical';

export type RoverTrigger = 'solStart' | 'eventArrival' | 'resourceWarning' | 'missionEnd';

export type MissionId = 'm1' | 'm2' | 'm3' | 'm4' | 'm5';

const BLOCKED_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'ass',
  'damn',
  'crap',
  'hell',
  'dick',
  'cock',
  'pussy',
  'idiot',
  'stupid',
  'hate',
  'kill',
];

export function sanitizeRoverName(raw: string): { name: string; filtered: boolean } {
  const trimmed = raw.trim().replace(/\s+/g, ' ').slice(0, 12);
  if (!trimmed) return { name: 'Rusty', filtered: false };
  const lower = trimmed.toLowerCase();
  if (BLOCKED_WORDS.some((w) => lower.includes(w))) {
    return { name: 'Rusty', filtered: true };
  }
  return { name: trimmed, filtered: false };
}

export function crackleRoverText(text: string, damaged: boolean): string {
  if (!damaged) return text;
  // Subtle authentic radio crackle ripple without harming readability
  return text.replace(/\. /, '... *kzzzt* ').replace(/^/, '*static* ');
}

export const ROVER_TUTORIAL_STEPS = [
  {
    step: 'look',
    title: '1. Look',
    line: (roverName: string) =>
      `Hi, I'm ${roverName}! First, look at the bars at the top. How many days of air are left?`,
  },
  {
    step: 'compare',
    title: '2. Compare',
    line: () => 'Check the cost and risk on all 4 cards before picking.',
  },
  {
    step: 'choose',
    title: '3. Choose',
    line: () => 'Pick your best plan! On Mars, every choice has a trade-off.',
  },
  {
    step: 'review',
    title: '4. Review',
    line: () => "Let's see what happened and what science trick we learned.",
  },
];

export const ROVER_TRIGGER_LINES: Record<RoverTrigger, string[]> = {
  solStart: [
    'Sensors ready! Check air, water, food, and battery before heading out.',
    'Mars gets only 43% of Earth sunlight [REAL], so save energy!',
    'My wheels are ready! Our crew is counting on your smart plan.',
    'New Critical Sol! Look at the numbers first before you choose.',
  ],
  eventArrival: [
    'Alert light blinking! Let us check the glowing station.',
    'Beep! Numbers just changed. Open the Data Panel to look closer.',
    'Careful, Commander! See which crew member can help first.',
  ],
  resourceWarning: [
    'Heads up! One of our supply tanks is getting low.',
    'Warning light on! Check the days-left numbers at the top.',
    'Our safety margin is getting thin—watch our supplies!',
  ],
  missionEnd: [
    'Choice locked in! Check the Science Card to see why it happened.',
    'Log saved! Every choice affects future days on Mars.',
    'Step complete! Ready to see what the crew used over the next days?',
  ],
};

/**
 * Hint Bank (§9.4):
 * - L1 (Free): Socratic question using visible screen facts only.
 * - L2 (1 Crew Slot): Directional side-of-problem prompt, NEVER names best option.
 */
export const ROVER_HINTS: Record<
  MissionId,
  {
    l1: string[];
    l2: string[];
  }
> = {
  m1: {
    l1: [
      'Where is the oxygen going? Does a choice stop the leak or only slow it down?',
      'Tank 2 is losing 2–6 kg/sol [SIM]. How fast will we run out if it stays open?',
    ],
    l2: [
      'Think: what does closing a pipe valve do? Does it fix the cause or just wait?',
      'Hiding or resting saves a bit of air, but does it seal the broken pipe?',
    ],
  },
  m2: {
    l1: [
      'How much solar power are we making compared to the 140 kWh we need [SIM]?',
      'When sky dust (tau) climbs past 3.0, how low does solar power drop?',
    ],
    l2: [
      'While dust floats high in the air, does wiping panels help yet? Wait for clear skies!',
      'Which systems keep the crew alive today, and which extras can pause for a bit?',
    ],
  },
  m3: {
    l1: [
      'At 40% recycling [SIM], how many days of water are left in our tanks?',
      'Check how many Spare-Part Kits you have left—might we need one later too?',
    ],
    l2: [
      'Compare fixing the broken machine here vs driving 4 km for frozen dirt. Also, what happens if you spend the last backup water?',
      'Cutting showers saves water today, while ice hunting uses battery. Think short-term vs long-term!',
    ],
  },
  m4: {
    l1: [
      'How much food is left, and how cold is Mars outside right now?',
      'Check our battery power and Spare-Part Kits before choosing.',
    ],
    l2: [
      'Both heaters and fixing the thermostat keep plants warm. Which one avoids draining 35 kWh every day?',
      'Stored food is our main lifeline, while fresh plants are a healthy bonus. Check your kits!',
    ],
  },
  m5: {
    l1: [
      'What does the NASA DONKI weather box say—is a big solar storm coming?',
      'Compare the Radiation mSv numbers on all 4 cards against the 250 mSv limit.',
    ],
    l2: [
      'Mars has thin air and no magnetic shield. What heavy material blocks solar storm particles best?',
      'Check if the storm is strong or mild, and protect crew health before rushing outside!',
    ],
  },
};

export function pickNonRepeatingRoverLine(
  trigger: RoverTrigger,
  usedIds: Record<string, number>,
  damaged: boolean,
): { line: string; nextUsedIds: Record<string, number> } {
  const pool = ROVER_TRIGGER_LINES[trigger];
  const lastIdx = usedIds[trigger] ?? -1;
  const idx = (lastIdx + 1) % pool.length;
  return {
    line: crackleRoverText(pool[idx], damaged),
    nextUsedIds: { ...usedIds, [trigger]: idx },
  };
}
