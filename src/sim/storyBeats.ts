import { MissionId } from './roverData';
import { OptionId } from './missionsData';
import { normalizeForSpeech } from './speechNormalizer';

export type SpeakerId =
  | 'rusty'
  | 'hab'
  | 'amara'
  | 'kenji'
  | 'lucia'
  | 'rafi'
  | 'earth'
  | 'log';

export interface DialogueLine {
  speaker: SpeakerId;
  speakerName: string;
  role: string;
  channel: 'inPerson' | 'radio' | 'system' | 'log';
  text: string;
  speechText: string;
  durationSec?: number;
}

export interface StoryPostcard {
  solStart: number;
  solEnd: number;
  title: string;
  caption: string;
  speechText: string;
  speaker: SpeakerId;
}

export interface StoryBeat {
  id: string;
  act: 0 | 1 | 2 | 3;
  sol: number;
  title: string;
  subtitle: string;
  lines: DialogueLine[];
  objectiveText: string;
  hintQuestion: string;
}

export type TutorialStepId =
  | 'take-control'
  | 'look'
  | 'move'
  | 'inspect-rover'
  | 'jump-crystals'
  | 'gravity-card'
  | 'chores'
  | 'inspect-oxygen'
  | 'tutorial-quiz'
  | 'crew-map-intro'
  | 'complete';

export type ChorePlaceId = 'greenhouse' | 'solar' | 'habitat';

export type MissionPhaseStepId =
  | 'quiet-signal'
  | 'look'
  | 'activity'
  | 'quiz'
  | 'decision'
  | 'action'
  | 'result'
  | 'science-card-badge'
  | 'hook';

export const MISSION_9_PHASE_ORDER: readonly MissionPhaseStepId[] = [
  'quiet-signal',
  'look',
  'activity',
  'quiz',
  'decision',
  'action',
  'result',
  'science-card-badge',
  'hook',
] as const;

export const MASTER_SCENE_ORDER = [
  'S0.1-title',
  'S0.2-cinematic-28s',
  'S0.3-briefing',
  'S0.4-take-control',
  'S1.1-look-60deg',
  'S1.2-move-7m',
  'S1.3-jump-crystals',
  'S1.4-gravity-card',
  'S1.5-chores-3-places',
  'S1.6-tank2-quiz',
  'S1.7-sunset-log-sleep',
  'S1.8-postcards-2-20',
  'M1-sol-21',
  'postcards-22-33',
  'M2-sol-34',
  'postcards-35-51',
  'M3-sol-52',
  'postcards-53-66',
  'M4-sol-67',
  'postcards-68-87',
  'M5-sol-88',
  'debrief',
  'free-roam',
] as const;

export interface JuniorQuizDef {
  id: string;
  question: string;
  optionA: { label: string; icon: string };
  optionB: { label: string; icon: string };
  correctOption: 'A' | 'B';
  correctFeedback: string;
  wrongFeedback: string;
}

export interface JuniorScienceCardDef {
  id: string;
  when: string;
  title: string;
  oneSentence: string;
  grownUpInfo: string;
  sourceNote: string;
  skipEnabled: true;
}

export interface JuniorDecisionOption {
  engineOptionId: OptionId;
  badgeLabel: string;
  title: string;
  summary: string;
  tradeOff: string;
  icon: 'valve' | 'shield' | 'battery' | 'power' | 'wrench' | 'water' | 'heater' | 'food' | 'eva';
}

export interface MissionHookDef {
  speakerName: string;
  speakerRole: string;
  channel: 'radio' | 'inPerson';
  text: string;
  followUpRusty?: string;
}

export interface JuniorMissionConfig {
  missionId: MissionId;
  sol: number;
  storyKid: string;
  simpleSubtitle: string;
  learnGoal: string;
  phaseOrder: readonly MissionPhaseStepId[];
  quietSignal: DialogueLine[];
  lookLine: DialogueLine;
  quiz: JuniorQuizDef;
  miniActivity: {
    id: string;
    title: string;
    secondaryTitle?: string;
    instruction: string;
    rustyPrompt: string;
    targetSeconds: number;
  };
  decisions: [JuniorDecisionOption, JuniorDecisionOption];
  moreOptions: OptionId[];
  rustyOffer?: {
    rustyLine: string;
    specialistLine: string;
    specialistName: string;
    moreChoiceLabel: string;
    chosenBraveLine: string;
    stuckLine: string;
    waitedSafeLine: string;
  };
  actionSpec: {
    optionAPrompt: string;
    optionBPrompt: string;
  };
  resultLines: {
    optionA: DialogueLine;
    optionB: DialogueLine;
  };
  scienceCardId: string;
  hook: MissionHookDef;
  postcardsRange?: [number, number];
  badge: {
    id: MissionId;
    title: string;
    icon: 'oxygen' | 'sun' | 'ice' | 'leaf' | 'shield';
    journalFact: string;
    disclaimer: string;
  };
  guidanceHint60s: string;
  guidanceLead120s: string;
  guidancePath240s: string;
}

/**
 * Replaces `{roverName}` tokens dynamically with the player's chosen rover name (default "Rusty").
 */
export function formatWithRoverName(text: string, roverName = 'Rusty'): string {
  const cleanName = roverName.trim() || 'Rusty';
  return text.replace(/\{roverName\}/g, cleanName);
}

function line(
  speaker: SpeakerId,
  speakerName: string,
  role: string,
  channel: DialogueLine['channel'],
  text: string,
  durationSec = 4.5,
): DialogueLine {
  return {
    speaker,
    speakerName,
    role,
    channel,
    text,
    speechText: normalizeForSpeech(text),
    durationSec,
  };
}

/**
 * S0.2 — 28-Second Arrival Cinematic Captions (Bible S0.2)
 */
export interface BibleCinematicShot {
  shot: number;
  startSec: number;
  endSec: number;
  camera: string;
  caption: string;
}

export const BIBLE_S02_CAPTIONS: readonly BibleCinematicShot[] = [
  {
    shot: 1,
    startSec: 0,
    endSec: 4,
    camera: 'High sunrise sweep over the red crater and outpost',
    caption: 'MARS OUTPOST · SOL 1',
  },
  {
    shot: 2,
    startSec: 4,
    endSec: 8,
    camera: 'Glide past the white Habitat dome and warm windows',
    caption: 'HABITAT — your home on Mars',
  },
  {
    shot: 3,
    startSec: 8,
    endSec: 12,
    camera: 'Pass the glowing green Greenhouse dome',
    caption: 'GREENHOUSE — fresh food and air',
  },
  {
    shot: 4,
    startSec: 12,
    endSec: 16,
    camera: 'Pass the silver Oxygen Tanks (Tank 2 glints in the light)',
    caption: 'OXYGEN TANK 2 — keep it safe',
  },
  {
    shot: 5,
    startSec: 16,
    endSec: 20,
    camera: 'Sweep low past the 6-wheel rover; its head tilts and lights blink twice',
    caption: '{roverName} — your rover friend',
  },
  {
    shot: 6,
    startSec: 20,
    endSec: 24,
    camera: 'Pan across the blue solar panels to the small pale Sun',
    caption: 'SOLAR ARRAY — power for the base',
  },
  {
    shot: 7,
    startSec: 24,
    endSec: 28,
    camera: 'Settle behind the suited Commander at the airlock door',
    caption: 'You are Commander Nova',
  },
] as const;

export const BIBLE_BRIEFING_DATA = {
  title: 'Welcome, Commander!',
  earthWelcomeLine: 'Welcome to Mars! Take care of your crew and your home.',
  callsignChoices: ['Nova', 'Orion', 'Star', ' Vega'] as const,
  roverNameChoices: ['Rusty', 'Sunny', 'Bolt', 'Scout'] as const,
  crewCards: [
    {
      id: 'amara',
      name: 'Amara',
      role: 'Doctor',
      station: 'Health & Water',
      oneLiner: 'I keep everyone healthy.',
    },
    {
      id: 'kenji',
      name: 'Kenji',
      role: 'Engineer',
      station: 'Solar & Power',
      oneLiner: 'I fix panels, wires and valves.',
    },
    {
      id: 'lucia',
      name: 'Lucía',
      role: 'Geologist',
      station: 'Ice & Rocks',
      oneLiner: 'I look for ice under the ground.',
    },
    {
      id: 'rafi',
      name: 'Rafi',
      role: 'Botanist',
      station: 'Greenhouse & Air',
      oneLiner: 'I grow our food and watch the air.',
    },
  ] as const,
};

export const BADGE_DISCLAIMER =
  'Junior Mars Commander — In-game achievement — not an official NASA certificate.';

export const ACT1_CHORE_SPOTS: ReadonlyArray<{
  id: ChorePlaceId;
  label: string;
  speaker: string;
  line: string;
  secondSpeaker?: string;
  secondLine?: string;
}> = [
  {
    id: 'greenhouse',
    label: 'Greenhouse',
    speaker: 'Rafi',
    line: 'Welcome to my garden! These tomato seeds are my babies. They need light, water and warmth. I hope the nights stay kind.',
  },
  {
    id: 'solar',
    label: 'Solar Field',
    speaker: 'Kenji',
    line: 'These panels turn sunlight into power. Mars is dim, so every panel counts. Keep them clean and they keep us cozy.',
  },
  {
    id: 'habitat',
    label: 'Habitat Core',
    speaker: 'Amara',
    line: 'Welcome, Commander. Drink some water. Mars air is very dry.',
    secondSpeaker: 'Lucía',
    secondLine: 'Look at this rock! It has stripes. Water may have been here long ago.',
  },
];

export const ACT1_CRYSTAL_CALLOUTS: readonly [string, string, string] = [
  'One!',
  'Two!',
  'Three! Wow, look how high you went!',
] as const;

export const ACT1_CHORES_COMPLETE_LINE =
  "Great work! One last check. Let's see the oxygen tank.";

export const ACT1_TANK2_LINES = {
  intro: 'This is Tank two. It holds our air.',
  afterTickHiss: 'Hmm. Did you hear a tiny tick? Maybe it is nothing.',
  quizIntro: 'Quick question. Can we breathe the air on Mars?',
} as const;

export const ACT1_SUNSET_LOG = {
  rustyLine: 'This is our home. Everyone is safe inside.',
  logEntry: 'Sol 1: We arrived safely. Everything is working.',
  sleepButtonLabel: 'Sleep — Next Sol',
} as const;

export const JUNIOR_TUTORIAL_STEPS: Record<
  Exclude<TutorialStepId, 'complete'>,
  {
    stepNumber: number;
    totalSteps: number;
    title: string;
    actionPrompt: string;
    rustyLine: string;
  }
> = {
  'take-control': {
    stepNumber: 1,
    totalSteps: 7,
    title: 'Take Control at the Airlock',
    actionPrompt: 'Click the 3D scene (or click Take Control below) to lock your view at the airlock.',
    rustyLine: 'Beep! Hello, Commander. I am {roverName}. Move the mouse to look around.',
  },
  look: {
    stepNumber: 1,
    totalSteps: 7,
    title: 'Look Around Mars (Turn 60°)',
    actionPrompt: 'Move your mouse (or use Look buttons / Arrow keys) to turn 60 degrees.',
    rustyLine: 'Beep! Hello, Commander. I am {roverName}. Move the mouse to look around.',
  },
  move: {
    stepNumber: 2,
    totalSteps: 7,
    title: 'Walk to the Yellow Light (7 m)',
    actionPrompt: 'Use W A S D keys or touch D-Pad to walk 7 meters to the yellow light.',
    rustyLine: 'Walk to the yellow light. Mars is bouncy, so take it easy.',
  },
  'inspect-rover': {
    stepNumber: 2,
    totalSteps: 7,
    title: 'Walk to the Yellow Light (7 m)',
    actionPrompt: 'Walk to the yellow light 7 meters in front of the airlock.',
    rustyLine: 'Walk to the yellow light. Mars is bouncy, so take it easy.',
  },
  'jump-crystals': {
    stepNumber: 3,
    totalSteps: 7,
    title: 'Mars Jump Challenge',
    actionPrompt: 'Press Spacebar to jump and catch three glowing crystals!',
    rustyLine: 'Try a jump! Press Space. Catch three glowing crystals.',
  },
  'gravity-card': {
    stepNumber: 4,
    totalSteps: 7,
    title: 'Mars Gravity',
    actionPrompt: 'Read your Mars Gravity card to continue.',
    rustyLine: 'Mars pulls you down less than Earth does. You can jump higher here!',
  },
  chores: {
    stepNumber: 5,
    totalSteps: 7,
    title: 'First-Day Chores (3 Places)',
    actionPrompt: 'Visit the Greenhouse, Solar Field, and Habitat Core — walk up and press E!',
    rustyLine: "Let's say hello to the crew. Walk up and press E.",
  },
  'inspect-oxygen': {
    stepNumber: 6,
    totalSteps: 7,
    title: 'Oxygen Tank 2 Check',
    actionPrompt: 'Walk to Oxygen Tank 2 and press E to listen and check our air.',
    rustyLine: "Great work! One last check. Let's see the oxygen tank.",
  },
  'tutorial-quiz': {
    stepNumber: 6,
    totalSteps: 7,
    title: 'First Quiz · Tank 2',
    actionPrompt: 'Answer {roverName}’s quick question about Mars air!',
    rustyLine: 'Quick question. Can we breathe the air on Mars?',
  },
  'crew-map-intro': {
    stepNumber: 7,
    totalSteps: 7,
    title: "Sunset — Commander's Log and Sleep",
    actionPrompt: 'Read your Sol 1 Commander’s Log and press Sleep — Next Sol.',
    rustyLine: 'This is our home. Everyone is safe inside.',
  },
};

/** 3 glowing gravity crystals placed cleanly around the Rover Bay & Habitat yard */
export const GRAVITY_CRYSTAL_SPOTS: ReadonlyArray<{
  id: string;
  x: number;
  yOffset: number;
  z: number;
  label: string;
}> = [
  { id: 'crystal-1', x: -2.0, yOffset: 1.95, z: 10.6, label: 'Courtyard West Crystal' },
  { id: 'crystal-2', x: 0.8, yOffset: 2.05, z: 11.0, label: 'Courtyard Center Crystal' },
  { id: 'crystal-3', x: 3.6, yOffset: 1.95, z: 10.7, label: 'Courtyard East Crystal' },
];

export const JUNIOR_TUTORIAL_QUIZ: JuniorQuizDef = {
  id: 'tutorial-air',
  question: 'Can we breathe the air on Mars?',
  optionA: { label: 'Yes, like Earth', icon: 'wind' },
  optionB: { label: 'No, we need oxygen', icon: 'oxygen' },
  correctOption: 'B',
  correctFeedback: "That's right! Mars air is not safe to breathe. We bring our own air.",
  wrongFeedback: "Not quite. Let's look at the tank again.",
};

export const JUNIOR_DEBRIEF_QUIZ: JuniorQuizDef = {
  id: 'debrief-reflection',
  question: 'What helps astronauts stay safe on Mars?',
  optionA: { label: 'Only a fast rover', icon: 'rover' },
  optionB: { label: 'Safe air, water, power and shelter', icon: 'shield' },
  correctOption: 'B',
  correctFeedback: 'You got it! Safe air, water, power and shelter keep every astronaut safe.',
  wrongFeedback: 'Think about everything we protected across all 5 missions — try again!',
};

/**
 * Single Source of Truth Science Cards (Bible S1.4, M1.8, M2.8, M3.8, M4.7, M5.9)
 * Note: Kid text (`oneSentence`) contains ZERO numbers per Bible Rule 3 & S1.4;
 * numbers and [REAL]/[SIM] tags live strictly in `grownUpInfo`.
 */
export const JUNIOR_SCIENCE_CARDS: Record<string, JuniorScienceCardDef> = {
  'tut-gravity': {
    id: 'tut-gravity',
    when: 'Act 1 · Sol 1',
    title: 'Mars Gravity',
    oneSentence: 'Mars pulls you down less than Earth does. You can jump higher here!',
    grownUpInfo:
      'Mars surface gravity is 3.73 m/s², about 38% of Earth (9.81 m/s²) [REAL, NASA Mars Fact Sheet].',
    sourceNote: 'Planetary gravity science (NASA NSSDC Mars Fact Sheet [REAL])',
    skipEnabled: true,
  },
  'tut-air': {
    id: 'tut-air',
    when: 'Act 1 · Sol 1',
    title: 'Mars Air',
    oneSentence: 'Mars air is mostly carbon dioxide and very thin. Astronauts need a safe oxygen supply.',
    grownUpInfo:
      'Mars air is ~96% carbon dioxide and about 1% of Earth’s air density [REAL]. Inside habitats and spacesuits, life-support machines keep breathable oxygen pressurized.',
    sourceNote: 'Planetary atmosphere science (NASA NSSDC Mars Fact Sheet [REAL])',
    skipEnabled: true,
  },
  'tut-sol': {
    id: 'tut-sol',
    when: 'Act 1 · Sol 1',
    title: 'A Mars Day',
    oneSentence: 'A day on Mars is called a sol. It is just a little longer than a day on Earth.',
    grownUpInfo:
      'One Martian sol is about 24 hours and 39 minutes (88,775 s) [REAL]. Mission teams count Mars days as Sols so schedules stay aligned with Martian sunlight.',
    sourceNote: 'Mars solar day timing (NASA NSSDC Mars Fact Sheet [REAL])',
    skipEnabled: true,
  },
  m1: {
    id: 'm1',
    when: 'Mission 1 · Sol 21',
    title: 'Shut-off Valves',
    oneSentence: 'A shut-off valve can close one part of a pipe. This helps stop a leak.',
    grownUpInfo: 'The leak rate used is a simulation value [SIM].',
    sourceNote: 'Habitat life-support engineering (simulation value [SIM])',
    skipEnabled: true,
  },
  m2: {
    id: 'm2',
    when: 'Mission 2 · Sol 34',
    title: 'Dust & Sunlight',
    oneSentence:
      'Dust in the air blocks some sunlight. Solar panels make less power when less light reaches them.',
    grownUpInfo:
      "The Opportunity rover's solar output fell as atmospheric dust got thicker (historical ARCHIVED data).",
    sourceNote: 'Archived Mars rover solar storm records (ARCHIVED)',
    skipEnabled: true,
  },
  m3: {
    id: 'm3',
    when: 'Mission 3 · Sol 52',
    title: 'Recycling & Buried Ice',
    oneSentence:
      'Recycling lets us use water again. Ice under the ground must be melted and cleaned before drinking.',
    grownUpInfo:
      'Mars soil has salty chemicals called perchlorates [REAL], so ice water needs cleaning. Radar results show "possible ice" until the team confirms it.',
    sourceNote: 'Phoenix lander perchlorate data [REAL] & SWIM radar [SIM]',
    skipEnabled: true,
  },
  m4: {
    id: 'm4',
    when: 'Mission 4 · Sol 67',
    title: 'Keeping Plants Warm',
    oneSentence:
      'Plants need light, water and warmth. A greenhouse protects them from the cold.',
    grownUpInfo:
      'Crops add to stored food; they do not replace it [REAL]. The outside average of −63 °C is a [REAL] Mars average; the greenhouse target temperature and game-time plant growth are simulation settings [SIM].',
    sourceNote: 'CHAPEA food rules & Mars temperature data [REAL / SIM]',
    skipEnabled: true,
  },
  m5: {
    id: 'm5',
    when: 'Mission 5 · Sol 88',
    title: 'Space Weather & Shelter',
    oneSentence:
      'Radiation is energy that can be harmful. A well-shielded shelter helps protect astronauts.',
    grownUpInfo:
      'The warning comes from a modelled forecast (DONKI), not a measurement at our base. Mars has no strong magnetic shield like Earth, and thin air, so water-walled shelters help. Dose values are simulation values [SIM].',
    sourceNote: 'DONKI modelled space-weather forecast & hydrogen shielding [REAL / SIM]',
    skipEnabled: true,
  },
};

/**
 * Single Source of Truth for All 5 Missions (Bible Act 2 & Act 3)
 * Follows the exact 9-phase order:
 * 1. Quiet signal -> 2. Look -> 3. Activity -> 4. Quiz -> 5. Decision -> 6. Action -> 7. Result -> 8. Science Card and badge -> 9. Hook
 */
export const JUNIOR_MISSIONS: Record<MissionId, JuniorMissionConfig> = {
  m1: {
    missionId: 'm1',
    sol: 21,
    storyKid:
      'Notice. Oxygen Tank 2 pressure is a little low. Do you hear that whisper? Follow the sound and check the three pipes!',
    simpleSubtitle: 'Mission 1 · Whisper in Tank 2',
    learnGoal: 'Learn how temperature swings loosen a seal and how a shut-off valve stops a leak.',
    phaseOrder: MISSION_9_PHASE_ORDER,
    quietSignal: [
      line('hab', 'Hab Computer', 'Base System', 'system', 'Notice. Oxygen Tank 2 pressure is a little low.', 3.2),
      line(
        'rafi',
        'Rafi',
        'Botanist',
        'radio',
        'Commander, Rafi here. Tank 2 is dropping slowly. Can you meet me at the oxygen bay?',
        4.8,
      ),
      line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'I will come with you. Beep!', 2.8),
    ],
    lookLine: line('rafi', 'Rafi', 'Botanist', 'inPerson', 'Do you hear that whisper? Follow the sound.', 3.8),
    quiz: {
      id: 'quiz-m1',
      question: 'How can a valve help with a leak?',
      optionA: { label: 'It can close one part of the pipe', icon: 'valve' },
      optionB: { label: 'It makes the tank bigger', icon: 'oxygen' },
      correctOption: 'A',
      correctFeedback: 'Yes! A valve can close off the leaky part.',
      wrongFeedback: 'Try again. What does a valve do to a pipe?',
    },
    miniActivity: {
      id: 'pipe-detective',
      title: 'Pipe Detective',
      instruction:
        'Look at the 3 pipes on Oxygen Tank 2. Pipe 2 has a blinking amber light and a small white puff — press E (or click) on each pipe to find the loose valve!',
      rustyPrompt: 'Found it! Valve two is loose.',
      targetSeconds: 40,
    },
    decisions: [
      {
        engineOptionId: 'A',
        badgeLabel: 'Option A',
        title: 'Close Valve 2.',
        summary: 'Stops the leak. Uses a little power and one spare part.',
        tradeOff: 'Tank 2 stays shut for a while.',
        icon: 'valve',
      },
      {
        engineOptionId: 'B',
        badgeLabel: 'Option B',
        title: 'Move the crew to the backup room.',
        summary: 'Everyone is safe now.',
        tradeOff: 'But air keeps leaking.',
        icon: 'shield',
      },
    ],
    moreOptions: ['C', 'D'],
    actionSpec: {
      optionAPrompt:
        'Hold E (or hold the red wheel button) to turn the big red wheel on Valve 2 until the hiss stops and the amber light turns green.',
      optionBPrompt:
        'Guide the crew to the backup room while the amber light stays on.',
    },
    resultLines: {
      optionA: line('rafi', 'Rafi', 'Botanist', 'inPerson', 'The whisper stopped. Good job, Commander.', 3.8),
      optionB: line(
        'rafi',
        'Rafi',
        'Botanist',
        'inPerson',
        'We are safe. But the tank is still losing air. We will fix it soon.',
        4.4,
      ),
    },
    scienceCardId: 'm1',
    hook: {
      speakerName: 'Kenji',
      speakerRole: 'Engineer',
      channel: 'inPerson',
      text: 'I think I know why. Mars nights are very cold. Metal shrinks in the cold and grows in the day. The seal got loose.',
      followUpRusty: 'Beep. Commander, did the sky look different today?',
    },
    postcardsRange: [22, 33],
    badge: {
      id: 'm1',
      title: 'Oxygen Guardian',
      icon: 'oxygen',
      journalFact: 'A shut-off valve can close one part of a pipe. This helps stop a leak.',
      disclaimer: BADGE_DISCLAIMER,
    },
    guidanceHint60s: 'Did you check the gauge on Oxygen Tank 2?',
    guidanceLead120s: 'Follow me! I am rolling toward Oxygen Tank 2. Beep!',
    guidancePath240s: 'A soft dotted path is glowing on the ground and map to Oxygen Tank 2.',
  },
  m2: {
    missionId: 'm2',
    sol: 34,
    storyKid:
      'Notice. Solar power is lower than normal. The sky is full of dust and the Sun looks small and orange today.',
    simpleSubtitle: 'Mission 2 · Red Sky',
    learnGoal: 'Learn how dust in the air blocks sunlight and why power for life support comes first.',
    phaseOrder: MISSION_9_PHASE_ORDER,
    quietSignal: [
      line('hab', 'Hab Computer', 'Base System', 'system', 'Notice. Solar power is lower than normal.', 3.2),
      line(
        'kenji',
        'Kenji',
        'Engineer',
        'radio',
        'Commander, Kenji. The sky is full of dust. The panels make less power. Meet me at the solar field.',
        4.8,
      ),
      line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'The Sun looks small and orange today.', 3.4),
    ],
    lookLine: line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'The Sun looks small and orange today.', 3.4),
    quiz: {
      id: 'quiz-m2',
      question: 'What do solar panels use to make electricity?',
      optionA: { label: 'Sunlight', icon: 'sun' },
      optionB: { label: 'Moonlight', icon: 'moon' },
      correctOption: 'A',
      correctFeedback: 'Yes! Sunlight!',
      wrongFeedback: 'Try again. Look at the bright Sun above the panels.',
    },
    miniActivity: {
      id: 'sunlight-slider',
      title: 'Sunlight Slider',
      instruction: 'Move the slider from Clear Sky to Dusty Sky to see what dust does to the light and power meter.',
      rustyPrompt: 'Move the slider. See what dust does to the light.',
      targetSeconds: 35,
    },
    rustyOffer: {
      rustyLine: 'I can go out and clean the panels! Beep. But the wind is wild.',
      specialistName: 'Kenji',
      specialistLine: "Dust storms last many days. Let's wait for the sky to clear.",
      moreChoiceLabel: 'Send {roverName} to clean now',
      chosenBraveLine: 'I am brave! Beep.',
      stuckLine: 'Oh no, my wheels are stuck! Please wait for me.',
      waitedSafeLine: 'Thank you for keeping me safe. I will polish the panels after the storm.',
    },
    decisions: [
      {
        engineOptionId: 'B',
        badgeLabel: 'Option A',
        title: 'Keep important systems ON and turn off extra machines.',
        summary: 'The battery lasts longer.',
        tradeOff: 'Greenhouse and science work may slow down.',
        icon: 'power',
      },
      {
        engineOptionId: 'A',
        badgeLabel: 'Option B',
        title: 'Keep every machine running.',
        summary: 'All work continues.',
        tradeOff: 'The battery may run out.',
        icon: 'battery',
      },
    ],
    moreOptions: ['C', 'D'],
    actionSpec: {
      optionAPrompt:
        'Confirm the power plan so life support stays ON while extra machines pause during the dust storm.',
      optionBPrompt:
        'Keep all base machines running while monitoring the battery drop.',
    },
    resultLines: {
      optionA: line('kenji', 'Kenji', 'Engineer', 'inPerson', 'Smart plan. Power for life support comes first.', 3.8),
      optionB: line(
        'kenji',
        'Kenji',
        'Engineer',
        'inPerson',
        'Everything is on, but the battery is dropping fast.',
        3.8,
      ),
    },
    scienceCardId: 'm2',
    hook: {
      speakerName: 'Amara',
      speakerRole: 'Doctor',
      channel: 'radio',
      text: 'Commander, the water recycler is making a funny noise. Please check it when you can.',
    },
    postcardsRange: [35, 51],
    badge: {
      id: 'm2',
      title: 'Power Planner',
      icon: 'sun',
      journalFact:
        'Dust in the air blocks some sunlight. Solar panels make less power when less light reaches them.',
      disclaimer: BADGE_DISCLAIMER,
    },
    guidanceHint60s: 'Did you check the solar power meter with Kenji at the Solar Field?',
    guidanceLead120s: 'Follow me! I am rolling toward the Solar Field. Beep!',
    guidancePath240s: 'A soft dotted path is glowing on the ground and map to the Solar Field.',
  },
  m3: {
    missionId: 'm3',
    sol: 52,
    storyKid:
      'Notice. Water cleaning is slow. The old filter is clogged — and Lucía’s radar shows possible ice under the ground!',
    simpleSubtitle: "Mission 3 · Water You Can't Drink Yet",
    learnGoal: 'Learn how recycling cleans water and why underground ice must be melted and cleaned first.',
    phaseOrder: MISSION_9_PHASE_ORDER,
    quietSignal: [
      line('hab', 'Hab Computer', 'Base System', 'system', 'Notice. Water cleaning is slow.', 3.0),
      line(
        'amara',
        'Amara',
        'Doctor',
        'radio',
        'Commander, Amara. The water recycler is slow. We need clean water to stay healthy. Meet me at the water bay.',
        5.0,
      ),
      line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'Click! That looks right.', 2.8),
    ],
    lookLine: line(
      'amara',
      'Amara',
      'Doctor',
      'inPerson',
      'The old filter is clogged. Can you fit the new one?',
      3.8,
    ),
    quiz: {
      id: 'quiz-m3',
      question: 'Can we drink ice straight from the ground?',
      optionA: { label: 'Yes, right away', icon: 'ice' },
      optionB: { label: 'No, melt and clean it first', icon: 'water' },
      correctOption: 'B',
      correctFeedback: 'Correct! Ice must be melted and cleaned first.',
      wrongFeedback: 'Not yet! Water must be safe and clean.',
    },
    miniActivity: {
      id: 'ice-scanner',
      title: 'Filter Fit',
      secondaryTitle: 'Ice Scanner',
      instruction:
        'Step 1 (Filter Fit): Fit the clean filter into the right slot. Step 2 (Ice Scanner): Scan three spots outside — faster beeps mean more likely possible ice!',
      rustyPrompt: 'Faster beeps mean more ice. Listen closely.',
      targetSeconds: 45,
    },
    decisions: [
      {
        engineOptionId: 'A',
        badgeLabel: 'Option A',
        title: 'Repair the water recycler.',
        summary: 'Clean water starts coming back.',
        tradeOff: 'Needs one spare part and some power.',
        icon: 'wrench',
      },
      {
        engineOptionId: 'D',
        badgeLabel: 'Option B',
        title: 'Use the emergency water reserve.',
        summary: "Today's problem gets easier.",
        tradeOff: 'Later there is no emergency backup.',
        icon: 'water',
      },
    ],
    moreOptions: ['B', 'C'],
    actionSpec: {
      optionAPrompt: 'Lock the new filter collar and start the water recycler pump.',
      optionBPrompt: 'Open the emergency backup water valve for today’s supply.',
    },
    resultLines: {
      optionA: line('amara', 'Amara', 'Doctor', 'inPerson', 'The recycler is humming. Clean water is flowing.', 3.8),
      optionB: line(
        'amara',
        'Amara',
        'Doctor',
        'inPerson',
        'We have water today. But the backup tank is empty now.',
        4.0,
      ),
    },
    scienceCardId: 'm3',
    hook: {
      speakerName: 'Rafi',
      speakerRole: 'Botanist',
      channel: 'radio',
      text: 'Commander, tonight will be very cold. I am worried about my plants.',
    },
    postcardsRange: [53, 66],
    badge: {
      id: 'm3',
      title: 'Water Finder',
      icon: 'ice',
      journalFact:
        'Recycling lets us use water again. Ice under the ground must be melted and cleaned before drinking.',
      disclaimer: BADGE_DISCLAIMER,
    },
    guidanceHint60s: 'Did you check the water recycler filter with Amara at the Water Bay?',
    guidanceLead120s: 'Follow me! I am rolling toward the Water Bay. Beep!',
    guidancePath240s: 'A soft dotted path is glowing on the ground and map to the Water Bay.',
  },
  m4: {
    missionId: 'm4',
    sol: 67,
    storyKid:
      'Notice. Greenhouse heater is off. Frost is on the dome glass and Rafi’s tomato leaves droop in the cold!',
    simpleSubtitle: 'Mission 4 · Cold Greenhouse',
    learnGoal: 'Learn that plants need light, water and warmth, and a greenhouse protects them from the cold.',
    phaseOrder: MISSION_9_PHASE_ORDER,
    quietSignal: [
      line('hab', 'Hab Computer', 'Base System', 'system', 'Notice. Greenhouse heater is off.', 3.0),
      line(
        'rafi',
        'Rafi',
        'Botanist',
        'radio',
        'Commander, Rafi. My tomato plants look sleepy. The greenhouse is cold. Please come.',
        4.5,
      ),
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        'Plants need light, water and warmth. Which one is missing?',
        3.8,
      ),
    ],
    lookLine: line(
      'rusty',
      '{roverName}',
      'Rover Friend',
      'inPerson',
      'Plants need light, water and warmth. Which one is missing?',
      3.8,
    ),
    quiz: {
      id: 'quiz-m4',
      question: 'What helps a plant grow?',
      optionA: { label: 'Light and water', icon: 'leaf' },
      optionB: { label: 'Only rocks', icon: 'rock' },
      correctOption: 'A',
      correctFeedback: 'Yes! Plants need light and water.',
      wrongFeedback: 'Try again. Look at the healthy green plant.',
    },
    miniActivity: {
      id: 'plant-helper',
      title: 'Plant Helper',
      secondaryTitle: 'Thermostat Fix',
      instruction:
        'Step 1 (Plant Helper): Place sunlight, water and warmth icons next to the plant. Step 2 (Thermostat Fix): Warm the greenhouse dome!',
      rustyPrompt: 'Plants need light, water and warmth. Which one is missing?',
      targetSeconds: 45,
    },
    decisions: [
      {
        engineOptionId: 'A',
        badgeLabel: 'Option A',
        title: 'Fix the thermostat.',
        summary: 'Better chance to save the plants.',
        tradeOff: 'Needs power and a spare kit.',
        icon: 'heater',
      },
      {
        engineOptionId: 'C',
        badgeLabel: 'Option B',
        title: 'Use stored food for now.',
        summary: 'The crew eats today.',
        tradeOff: 'The greenhouse stays cold and the plants may be lost.',
        icon: 'food',
      },
    ],
    moreOptions: ['B', 'D'],
    actionSpec: {
      optionAPrompt: 'Connect the replacement thermostat kit so warm air flows to the tomato beds.',
      optionBPrompt: 'Open the stored food rations locker while the greenhouse stays cool.',
    },
    resultLines: {
      optionA: line('rafi', 'Rafi', 'Botanist', 'inPerson', 'Look! The leaves are standing up again.', 3.8),
      optionB: line('rafi', 'Rafi', 'Botanist', 'inPerson', 'We have food today. But I will miss my tomatoes.', 4.0),
    },
    scienceCardId: 'm4',
    hook: {
      speakerName: '{roverName}',
      speakerRole: 'Rover Friend',
      channel: 'inPerson',
      text: 'Plants are friends too.',
    },
    postcardsRange: [68, 87],
    badge: {
      id: 'm4',
      title: 'Plant Protector',
      icon: 'leaf',
      journalFact:
        'Plants need light, water and warmth. A greenhouse protects them from the cold.',
      disclaimer: BADGE_DISCLAIMER,
    },
    guidanceHint60s: 'Did you check the thermometer inside the Greenhouse with Rafi?',
    guidanceLead120s: 'Follow me! I am rolling toward the Greenhouse dome. Beep!',
    guidancePath240s: 'A soft dotted path is glowing on the ground and map to the Greenhouse.',
  },
  m5: {
    missionId: 'm5',
    sol: 88,
    storyKid:
      'Watch. The space weather team reports a solar storm. Strong space radiation can hurt people — let’s bring everyone into the water-walled shelter!',
    simpleSubtitle: 'Mission 5 · Storm Over the Ice',
    learnGoal: 'Learn how water walls inside a shielded shelter help block space radiation.',
    phaseOrder: MISSION_9_PHASE_ORDER,
    quietSignal: [
      line(
        'hab',
        'Hab Computer',
        'Base System',
        'system',
        'Watch. The space weather team reports a solar storm.',
        3.6,
      ),
      line(
        'amara',
        'Amara',
        'Doctor',
        'radio',
        'Commander, Amara. Strong space radiation can hurt people. We need the shelter. Please meet me there.',
        5.0,
      ),
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        'Water walls help block space radiation.',
        3.4,
      ),
    ],
    lookLine: line(
      'rusty',
      '{roverName}',
      'Rover Friend',
      'inPerson',
      'Water walls help block space radiation.',
      3.4,
    ),
    quiz: {
      id: 'quiz-m5',
      question: 'What can help protect astronauts?',
      optionA: { label: 'A safe, shielded shelter', icon: 'shield' },
      optionB: { label: 'Standing outside', icon: 'sun' },
      correctOption: 'A',
      correctFeedback: "That's right! A shielded shelter helps protect the crew.",
      wrongFeedback: 'Try again. Look at the shelter walls.',
    },
    miniActivity: {
      id: 'shield-builder',
      title: 'Shield Builder',
      instruction: 'Put the water layer on the shelter wall so the protection bar fills to 100%!',
      rustyPrompt: 'More water means more protection. Look at the bar.',
      targetSeconds: 45,
    },
    decisions: [
      {
        engineOptionId: 'A',
        badgeLabel: 'Option A',
        title: 'Bring everyone into the shielded shelter now.',
        summary: 'The crew is much better protected.',
        tradeOff: 'Ice drilling stops for now.',
        icon: 'shield',
      },
      {
        engineOptionId: 'D',
        badgeLabel: 'Option B',
        title: 'Keep working outside a little longer.',
        summary: 'More ice may be collected.',
        tradeOff: 'The crew gets more radiation.',
        icon: 'eva',
      },
    ],
    moreOptions: ['B', 'C'],
    actionSpec: {
      optionAPrompt:
        'Call Lucía and {roverName} back from the ice site, count all 4 crew inside (1 of 4 … 4 of 4), and hold E to seal the hatch.',
      optionBPrompt:
        'Bring the crew and {roverName} inside after working outside a little longer, then hold E to seal the hatch.',
    },
    resultLines: {
      optionA: line('amara', 'Amara', 'Doctor', 'inPerson', 'Deep breath, everyone. We are safe in here.', 3.8),
      optionB: line(
        'amara',
        'Amara',
        'Doctor',
        'inPerson',
        "Everyone is okay. But we took more radiation than we needed. Next time, let's be careful.",
        4.8,
      ),
    },
    scienceCardId: 'm5',
    hook: {
      speakerName: 'Hab Computer',
      speakerRole: 'Base System',
      channel: 'radio',
      text: 'All clear. Space radiation is back to normal.',
      followUpRusty: 'We did it, Commander!',
    },
    badge: {
      id: 'm5',
      title: 'Crew Guardian',
      icon: 'shield',
      journalFact:
        'Radiation is energy that can be harmful. A well-shielded shelter helps protect astronauts.',
      disclaimer: BADGE_DISCLAIMER,
    },
    guidanceHint60s: 'Did you check the water shield wall inside the Storm Shelter with Amara?',
    guidanceLead120s: 'Follow me! I am rolling toward the Storm Shelter. Beep!',
    guidancePath240s: 'A soft dotted path is glowing on the ground and map to the Storm Shelter.',
  },
};

export const M3_LUCIA_ICE_CALL = {
  luciaLine: line(
    'lucia',
    'Lucía',
    'Geologist',
    'radio',
    'Commander! Good news. The radar shows ice under the ground. {roverName} can scan it.',
    4.6,
  ),
  rustyLine: line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'Beep! I love scanning.', 2.6),
} as const;

export const M5_SHELTER_SEQUENCE = {
  shelterBellSeconds: 180,
  luciaReturnLine: line('lucia', 'Lucía', 'Geologist', 'radio', 'Commander, we are on our way home.', 3.5),
  rustyReturnLine: line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'Beep beep! I am almost there.', 3.0),
  waitAmaraLine: line('amara', 'Amara', 'Doctor', 'inPerson', 'Deep breath, everyone. We are safe in here.', 3.8),
  allClearHabLine: line('hab', 'Hab Computer', 'Base System', 'system', 'All clear. Space radiation is back to normal.', 3.8),
  allClearRustyLine: line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'We did it, Commander!', 2.8),
} as const;

export const GUIDANCE_LADDER_THRESHOLDS_SEC = {
  hintQuestion: 60,
  roverLead: 120,
  dottedPath: 240,
  hintQuestionSec: 60,
  roverRollSec: 120,
  dottedPathSec: 240,
} as const;

export const JUNIOR_CLOSING_LINE =
  'You explored Mars, solved problems and helped your crew. You are a Junior Explorer!';

export const STORY_POSTCARDS: Record<string, StoryPostcard[]> = {
  'sol-2-20': [
    {
      solStart: 2,
      solEnd: 7,
      title: 'Sols 2–7 · Morning Frost',
      caption: 'Rafi checks his tiny green sprouts in the greenhouse.',
      speechText: normalizeForSpeech('Sols 2 to 7. Rafi checks his tiny green sprouts in the greenhouse.'),
      speaker: 'rafi',
    },
    {
      solStart: 8,
      solEnd: 14,
      title: 'Sols 8–14 · Tire Tracks',
      caption: '{roverName} leaves long tire tracks in the red dust.',
      speechText: normalizeForSpeech('Sols 8 to 14. {roverName} leaves long tire tracks in the red dust.'),
      speaker: 'rusty',
    },
    {
      solStart: 15,
      solEnd: 20,
      title: 'Sols 15–20 · Blue Twilight',
      caption: 'The crew eat dinner together while the sky turns blue at sunset.',
      speechText: normalizeForSpeech(
        'Sols 15 to 20. The crew eat dinner together while the sky turns blue at sunset.',
      ),
      speaker: 'amara',
    },
  ],
  'sol-22-33': [
    {
      solStart: 22,
      solEnd: 27,
      title: 'Sols 22–27 · Valve Check',
      caption: 'Kenji tightens the new seal on Tank 2.',
      speechText: normalizeForSpeech('Sols 22 to 27. Kenji tightens the new seal on Tank 2.'),
      speaker: 'kenji',
    },
    {
      solStart: 28,
      solEnd: 33,
      title: 'Sols 28–33 · Haze on the Horizon',
      caption: 'On the far horizon, a soft orange haze begins to rise.',
      speechText: normalizeForSpeech('Sols 28 to 33. On the far horizon, a soft orange haze begins to rise.'),
      speaker: 'rusty',
    },
  ],
  'sol-35-51': [
    {
      solStart: 35,
      solEnd: 43,
      title: 'Sols 35–43 · Clearing Skies',
      caption: 'The wind slows down. {roverName} gently brushes red dust off the solar panels.',
      speechText: normalizeForSpeech(
        'Sols 35 to 43. The wind slows down. {roverName} gently brushes red dust off the solar panels.',
      ),
      speaker: 'rusty',
    },
    {
      solStart: 44,
      solEnd: 51,
      title: 'Sols 44–51 · Radar Maps',
      caption: 'Lucía studies her radar map and circles a bright spot.',
      speechText: normalizeForSpeech('Sols 44 to 51. Lucía studies her radar map and circles a bright spot.'),
      speaker: 'lucia',
    },
  ],
  'sol-53-66': [
    {
      solStart: 53,
      solEnd: 59,
      title: 'Sols 53–59 · Marker Flags',
      caption: 'Lucía and {roverName} place small flags at the ice spot.',
      speechText: normalizeForSpeech('Sols 53 to 59. Lucía and {roverName} place small flags at the ice spot.'),
      speaker: 'lucia',
    },
    {
      solStart: 60,
      solEnd: 66,
      title: 'Sols 60–66 · Deep Winter Approaches',
      caption: 'Frost sparkles on the greenhouse roof each morning.',
      speechText: normalizeForSpeech('Sols 60 to 66. Frost sparkles on the greenhouse roof each morning.'),
      speaker: 'rafi',
    },
  ],
  'sol-68-87': [
    {
      solStart: 68,
      solEnd: 77,
      title: 'Sols 68–77 · First Red Tomato',
      caption: 'The first small red tomato appears! The crew share it four ways.',
      speechText: normalizeForSpeech(
        'Sols 68 to 77. The first small red tomato appears! The crew share it four ways.',
      ),
      speaker: 'rafi',
    },
    {
      solStart: 78,
      solEnd: 87,
      title: 'Sols 78–87 · Watching the Sun',
      caption: 'Earth sends a message: "We are watching a lively spot on the Sun."',
      speechText: normalizeForSpeech(
        'Sols 78 to 87. Earth sends a message: We are watching a lively spot on the Sun.',
      ),
      speaker: 'earth',
    },
  ],
};

export const STORY_BEATS: Record<string, StoryBeat> = {
  'act0-briefing': {
    id: 'act0-briefing',
    act: 0,
    sol: 1,
    title: 'Welcome, Commander!',
    subtitle: 'Act 0 · Sol 1 Arrival Briefing',
    lines: [
      line('earth', 'Earth Team', 'Mission Control', 'radio', 'Welcome to Mars! Take care of your crew and your home.', 4.5),
      line('amara', 'Amara', 'Doctor', 'inPerson', 'I keep everyone healthy.', 3.2),
      line('kenji', 'Kenji', 'Engineer', 'inPerson', 'I fix panels, wires and valves.', 3.5),
      line('lucia', 'Lucía', 'Geologist', 'inPerson', 'I look for ice under the ground.', 3.5),
      line('rafi', 'Rafi', 'Botanist', 'inPerson', 'I grow our food and watch the air.', 3.5),
    ],
    objectiveText: 'Choose your callsign and meet your crew',
    hintQuestion: 'Ready to step outside onto Mars, Commander?',
  },
  'act1-look': {
    id: 'act1-look',
    act: 1,
    sol: 1,
    title: 'Look Around Mars',
    subtitle: 'Act 1 · Step 1 of 7',
    lines: [
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        'Beep! Hello, Commander. I am {roverName}. Move the mouse to look around.',
        4.5,
      ),
    ],
    objectiveText: 'Move the mouse to look around (turn 60 degrees)',
    hintQuestion: 'Can you see the white Habitat dome and the green Greenhouse?',
  },
  'act1-move': {
    id: 'act1-move',
    act: 1,
    sol: 1,
    title: 'First Steps on Mars',
    subtitle: 'Act 1 · Step 2 of 7',
    lines: [
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        'Walk to the yellow light. Mars is bouncy, so take it easy.',
        4.2,
      ),
    ],
    objectiveText: 'Press W A S D to walk to the yellow light (7 m)',
    hintQuestion: 'Notice how light your footsteps feel in Mars gravity?',
  },
  'act1-jump': {
    id: 'act1-jump',
    act: 1,
    sol: 1,
    title: 'Bouncy Mars Gravity',
    subtitle: 'Act 1 · Step 3 of 7',
    lines: [
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        'Try a jump! Press Space. Catch three glowing crystals.',
        4.2,
      ),
    ],
    objectiveText: 'Press Space to jump and catch 3 glowing crystals',
    hintQuestion: 'Why can you jump so much higher on Mars than on Earth?',
  },
  'act1-gravity-card': {
    id: 'act1-gravity-card',
    act: 1,
    sol: 1,
    title: 'Mars Gravity',
    subtitle: 'Act 1 · Step 4 of 7',
    lines: [
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        'Mars pulls you down less than Earth does. You can jump higher here!',
        4.5,
      ),
    ],
    objectiveText: 'Read the Mars Gravity Science Card',
    hintQuestion: 'Did you know Mars gravity is a bit more than one third of Earth pull?',
  },
  'act1-chores': {
    id: 'act1-chores',
    act: 1,
    sol: 1,
    title: 'First-Day Chores',
    subtitle: 'Act 1 · Step 5 of 7',
    lines: [
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        "Let's say hello to the crew. Walk up and press E.",
        4.0,
      ),
    ],
    objectiveText: 'Visit the Greenhouse, Solar Field, and Habitat Core (press E)',
    hintQuestion: 'Have you visited Rafi in the Greenhouse, Kenji at the Solar Field, and Amara and Lucía at the Habitat?',
  },
  'act1-chore-greenhouse': {
    id: 'act1-chore-greenhouse',
    act: 1,
    sol: 1,
    title: 'Greenhouse Visit',
    subtitle: 'First-Day Chore · Place 1',
    lines: [
      line(
        'rafi',
        'Rafi',
        'Botanist',
        'inPerson',
        'Welcome to my garden! These tomato seeds are my babies. They need light, water and warmth. I hope the nights stay kind.',
        5.5,
      ),
    ],
    objectiveText: 'Check the Greenhouse with Rafi',
    hintQuestion: 'What three things do Rafi’s tomato seeds need?',
  },
  'act1-chore-solar': {
    id: 'act1-chore-solar',
    act: 1,
    sol: 1,
    title: 'Solar Field Visit',
    subtitle: 'First-Day Chore · Place 2',
    lines: [
      line(
        'kenji',
        'Kenji',
        'Engineer',
        'inPerson',
        'These panels turn sunlight into power. Mars is dim, so every panel counts. Keep them clean and they keep us cozy.',
        5.5,
      ),
    ],
    objectiveText: 'Check the Solar Panels with Kenji',
    hintQuestion: 'What happens if dust covers the solar panels?',
  },
  'act1-chore-habitat': {
    id: 'act1-chore-habitat',
    act: 1,
    sol: 1,
    title: 'Habitat Core Visit',
    subtitle: 'First-Day Chore · Place 3',
    lines: [
      line(
        'amara',
        'Amara',
        'Doctor',
        'inPerson',
        'Welcome, Commander. Drink some water. Mars air is very dry.',
        4.2,
      ),
      line(
        'lucia',
        'Lucía',
        'Geologist',
        'inPerson',
        'Look at this rock! It has stripes. Water may have been here long ago.',
        4.5,
      ),
    ],
    objectiveText: 'Say hello to Amara and Lucía at the Habitat',
    hintQuestion: 'Where could water still be hiding on Mars today?',
  },
  'act1-tank2-check': {
    id: 'act1-tank2-check',
    act: 1,
    sol: 1,
    title: 'Oxygen Tank 2 Check',
    subtitle: 'Act 1 · Step 6 of 7',
    lines: [
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        "Great work! One last check. Let's see the oxygen tank.",
        3.8,
      ),
      line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'This is Tank two. It holds our air.', 3.5),
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        'Hmm. Did you hear a tiny tick? Maybe it is nothing.',
        4.0,
      ),
    ],
    objectiveText: 'Walk to Oxygen Tank 2 and press E to inspect',
    hintQuestion: 'Can we breathe the thin air outside on Mars?',
  },
  'act1-sunset-log': {
    id: 'act1-sunset-log',
    act: 1,
    sol: 1,
    title: "Sunset — Commander's Log",
    subtitle: 'Act 1 · Step 7 of 7',
    lines: [
      line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'This is our home. Everyone is safe inside.', 4.0),
      line('log', "Commander's Log", 'Personal Log', 'log', 'Sol 1: We arrived safely. Everything is working.', 4.0),
    ],
    objectiveText: 'Review your Sol 1 Commander’s Log and rest for the night',
    hintQuestion: 'Ready to rest and watch Sols 2 to 20 unfold?',
  },
  'm1-start': {
    id: 'm1-start',
    act: 2,
    sol: 21,
    title: 'Mission 1 — Whisper in Tank 2',
    subtitle: 'Sol 21 · Oxygen System',
    lines: JUNIOR_MISSIONS.m1.quietSignal,
    objectiveText: 'Meet Rafi at Oxygen Tank 2 (press E)',
    hintQuestion: 'Did you check the gauge on Oxygen Tank 2?',
  },
  'm1-look': {
    id: 'm1-look',
    act: 2,
    sol: 21,
    title: 'Pipe Detective',
    subtitle: 'Sol 21 · Find the Loose Valve',
    lines: [
      JUNIOR_MISSIONS.m1.lookLine,
      line('rusty', '{roverName}', 'Rover Friend', 'inPerson', JUNIOR_MISSIONS.m1.miniActivity.rustyPrompt, 3.2),
    ],
    objectiveText: 'Inspect the 3 pipes and find loose Valve 2',
    hintQuestion: 'How can a valve help with a leak?',
  },
  'm1-resolved-a': {
    id: 'm1-resolved-a',
    act: 2,
    sol: 21,
    title: 'Tank 2 Secured',
    subtitle: 'Sol 21 · Resolution',
    lines: [
      JUNIOR_MISSIONS.m1.resultLines.optionA,
      line('kenji', 'Kenji', 'Engineer', 'inPerson', JUNIOR_MISSIONS.m1.hook.text, 5.5),
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        JUNIOR_MISSIONS.m1.hook.followUpRusty ?? 'Beep. Commander, did the sky look different today?',
        3.8,
      ),
    ],
    objectiveText: 'Review your Oxygen Guardian Science Card',
    hintQuestion: 'Why did the metal seal shrink at night and grow in the day?',
  },
  'm1-resolved-b': {
    id: 'm1-resolved-b',
    act: 2,
    sol: 21,
    title: 'Crew in Backup Room',
    subtitle: 'Sol 21 · Resolution',
    lines: [
      JUNIOR_MISSIONS.m1.resultLines.optionB,
      line('kenji', 'Kenji', 'Engineer', 'inPerson', JUNIOR_MISSIONS.m1.hook.text, 5.5),
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        JUNIOR_MISSIONS.m1.hook.followUpRusty ?? 'Beep. Commander, did the sky look different today?',
        3.8,
      ),
    ],
    objectiveText: 'Review your Oxygen Guardian Science Card',
    hintQuestion: 'What does a shut-off valve do to a leaky pipe?',
  },
  'm2-start': {
    id: 'm2-start',
    act: 2,
    sol: 34,
    title: 'Mission 2 — Red Sky',
    subtitle: 'Sol 34 · Dust Storm & Solar Power',
    lines: JUNIOR_MISSIONS.m2.quietSignal,
    objectiveText: 'Meet Kenji at the Solar Field (press E)',
    hintQuestion: 'Did you check the solar power meter at the Solar Field?',
  },
  'm2-activity': {
    id: 'm2-activity',
    act: 2,
    sol: 34,
    title: 'Sunlight Slider',
    subtitle: 'Sol 34 · Dust vs Sunlight',
    lines: [
      line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'Move the slider. See what dust does to the light.', 3.8),
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        'I can go out and clean the panels! Beep. But the wind is wild.',
        4.2,
      ),
      line(
        'kenji',
        'Kenji',
        'Engineer',
        'inPerson',
        "Dust storms last many days. Let's wait for the sky to clear.",
        4.2,
      ),
    ],
    objectiveText: 'Test the Sunlight Slider and choose a power plan',
    hintQuestion: 'Should we keep life support power safe first during a dust storm?',
  },
  'm2-resolved-a': {
    id: 'm2-resolved-a',
    act: 2,
    sol: 34,
    title: 'Power Saved for Life Support',
    subtitle: 'Sol 34 · Resolution',
    lines: [
      JUNIOR_MISSIONS.m2.resultLines.optionA,
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        'Thank you for keeping me safe. I will polish the panels after the storm.',
        4.4,
      ),
      line('amara', 'Amara', 'Doctor', 'radio', JUNIOR_MISSIONS.m2.hook.text, 4.6),
    ],
    objectiveText: 'Review your Power Planner Science Card',
    hintQuestion: 'Why did the solar panels make less electricity during the dust storm?',
  },
  'm2-resolved-b': {
    id: 'm2-resolved-b',
    act: 2,
    sol: 34,
    title: 'High Power Draw',
    subtitle: 'Sol 34 · Resolution',
    lines: [
      JUNIOR_MISSIONS.m2.resultLines.optionB,
      line('amara', 'Amara', 'Doctor', 'radio', JUNIOR_MISSIONS.m2.hook.text, 4.6),
    ],
    objectiveText: 'Review your Power Planner Science Card',
    hintQuestion: 'What happens to the battery when all machines stay running in low light?',
  },
  'm3-start': {
    id: 'm3-start',
    act: 2,
    sol: 52,
    title: "Mission 3 — Water You Can't Drink Yet",
    subtitle: 'Sol 52 · Water Recycler & Buried Ice',
    lines: [
      JUNIOR_MISSIONS.m3.quietSignal[0],
      JUNIOR_MISSIONS.m3.quietSignal[1],
      JUNIOR_MISSIONS.m3.lookLine,
    ],
    objectiveText: 'Meet Amara at the Water Bay (press E)',
    hintQuestion: 'Did you check the clogged filter at the Water Bay?',
  },
  'm3-ice-call': {
    id: 'm3-ice-call',
    act: 2,
    sol: 52,
    title: 'Filter Fit & Ice Scanner',
    subtitle: 'Sol 52 · Underground Ice Discovery',
    lines: [
      line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'Click! That looks right.', 2.8),
      M3_LUCIA_ICE_CALL.luciaLine,
      M3_LUCIA_ICE_CALL.rustyLine,
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        'Faster beeps mean more ice. Listen closely.',
        3.6,
      ),
    ],
    objectiveText: 'Scan 3 spots for possible ice and choose your water plan',
    hintQuestion: 'Can we drink buried Mars ice right away, or must we melt and clean it first?',
  },
  'm3-resolved-a': {
    id: 'm3-resolved-a',
    act: 2,
    sol: 52,
    title: 'Clean Water Flowing',
    subtitle: 'Sol 52 · Resolution',
    lines: [
      JUNIOR_MISSIONS.m3.resultLines.optionA,
      line('rafi', 'Rafi', 'Botanist', 'radio', JUNIOR_MISSIONS.m3.hook.text, 4.2),
    ],
    objectiveText: 'Review your Water Finder Science Card',
    hintQuestion: 'Why does recycling water help astronauts so much on Mars?',
  },
  'm3-resolved-b': {
    id: 'm3-resolved-b',
    act: 2,
    sol: 52,
    title: 'Emergency Water Used',
    subtitle: 'Sol 52 · Resolution',
    lines: [
      JUNIOR_MISSIONS.m3.resultLines.optionB,
      line('rafi', 'Rafi', 'Botanist', 'radio', JUNIOR_MISSIONS.m3.hook.text, 4.2),
    ],
    objectiveText: 'Review your Water Finder Science Card',
    hintQuestion: 'Why is it risky to empty the backup water tank?',
  },
  'm4-start': {
    id: 'm4-start',
    act: 2,
    sol: 67,
    title: 'Mission 4 — Cold Greenhouse',
    subtitle: 'Sol 67 · Protecting the Plants',
    lines: JUNIOR_MISSIONS.m4.quietSignal,
    objectiveText: 'Meet Rafi at the Greenhouse (press E)',
    hintQuestion: 'Did you check the thermometer inside the Greenhouse?',
  },
  'm4-resolved-a': {
    id: 'm4-resolved-a',
    act: 2,
    sol: 67,
    title: 'Warm Greenhouse',
    subtitle: 'Sol 67 · Resolution',
    lines: [
      JUNIOR_MISSIONS.m4.resultLines.optionA,
      line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'Plants are friends too.', 3.0),
    ],
    objectiveText: 'Review your Plant Protector Science Card',
    hintQuestion: 'How does the greenhouse dome protect plants from the freezing Mars night?',
  },
  'm4-resolved-b': {
    id: 'm4-resolved-b',
    act: 2,
    sol: 67,
    title: 'Stored Rations Used',
    subtitle: 'Sol 67 · Resolution',
    lines: [
      JUNIOR_MISSIONS.m4.resultLines.optionB,
      line('rusty', '{roverName}', 'Rover Friend', 'inPerson', 'Plants are friends too.', 3.0),
    ],
    objectiveText: 'Review your Plant Protector Science Card',
    hintQuestion: 'What happens to plants if the greenhouse stays too cold?',
  },
  'm5-start': {
    id: 'm5-start',
    act: 3,
    sol: 88,
    title: 'Mission 5 — Storm Over the Ice',
    subtitle: 'Sol 88 · Solar Storm Shelter Watch',
    lines: JUNIOR_MISSIONS.m5.quietSignal,
    objectiveText: 'Meet Amara at the Storm Shelter (press E)',
    hintQuestion: 'Did you check the water shield wall inside the Storm Shelter?',
  },
  'm5-activity': {
    id: 'm5-activity',
    act: 3,
    sol: 88,
    title: 'Shield Builder',
    subtitle: 'Sol 88 · Water Wall Protection',
    lines: [
      line(
        'rusty',
        '{roverName}',
        'Rover Friend',
        'inPerson',
        'More water means more protection. Look at the bar.',
        3.8,
      ),
      M5_SHELTER_SEQUENCE.luciaReturnLine,
      M5_SHELTER_SEQUENCE.rustyReturnLine,
    ],
    objectiveText: 'Build the water shield wall and bring all 4 crew inside',
    hintQuestion: 'Are all 4 crew members and {roverName} safely inside the shelter?',
  },
  'm5-resolved': {
    id: 'm5-resolved',
    act: 3,
    sol: 88,
    title: 'Safe in the Shelter',
    subtitle: 'Sol 88 · All Clear',
    lines: [
      M5_SHELTER_SEQUENCE.waitAmaraLine,
      M5_SHELTER_SEQUENCE.allClearHabLine,
      M5_SHELTER_SEQUENCE.allClearRustyLine,
    ],
    objectiveText: 'Review your Crew Guardian Science Card and complete your 88-Sol Mission!',
    hintQuestion: 'How did the water walls keep everyone safe during the solar storm?',
  },
};

export function getMissionStartBeat(missionId: MissionId): StoryBeat {
  return STORY_BEATS[`${missionId}-start`] ?? STORY_BEATS['m1-start'];
}

export function getMissionResolvedBeat(missionId: MissionId, choice: 'a' | 'b' = 'a'): StoryBeat {
  if (missionId === 'm5') return STORY_BEATS['m5-resolved'];
  return STORY_BEATS[`${missionId}-resolved-${choice}`] ?? STORY_BEATS['m1-resolved-a'];
}
