import {
  BIBLE_BRIEFING_DATA,
  BIBLE_S02_CAPTIONS,
  JUNIOR_TUTORIAL_STEPS,
} from '../sim/storyBeats';

export type OutpostLandmarkId =
  | 'habitat'
  | 'greenhouse'
  | 'solar'
  | 'rover'
  | 'astronaut'
  | 'power-console'
  | 'windmill'
  | 'ice-drill'
  | 'landing-pad';

export type GamePhase = 'landing' | 'prologue' | 'briefing' | 'gameplay';

export type TutorialStepId = 1 | 2 | 3 | 4 | 5 | 'complete';

export interface OutpostLandmark {
  id: OutpostLandmarkId;
  name: string;
  role: string;
  description: string;
  funFact: string;
}

export const OUTPOST_LANDMARKS: Record<OutpostLandmarkId, OutpostLandmark> = {
  habitat: {
    id: 'habitat',
    name: 'Mars Habitat 01',
    role: 'Home & Science Lab',
    description:
      'Your main Mars home! It connects to a 3D-printed crew lab with an airlock, clean air scrubbers, and warm sleeping quarters.',
    funFact: 'Thick Mars dirt walls help block space radiation when temperatures drop below −60°C.',
  },
  greenhouse: {
    id: 'greenhouse',
    name: 'Bio-Dome Greenhouse',
    role: 'Food & Oxygen Garden',
    description:
      'A bright glass dome where leafy plants grow under warm lights to give your crew fresh food and extra oxygen.',
    funFact: 'Its water tank recycles almost every single drop for the plants.',
  },
  solar: {
    id: 'solar',
    name: 'Solar Farm & Batteries',
    role: 'Sun Power & Night Storage',
    description:
      'Six solar panels follow the Sun across the sky, charging big batteries so the base stays warm at night.',
    funFact: 'Mars gets less sunlight than Earth, and dust on panels lowers power!',
  },
  rover: {
    id: 'rover',
    name: 'ROVER-7',
    role: 'Six-Wheel Scout Buddy',
    description:
      'A tough six-wheel rover with rock-climbing suspension and stereo cameras to help you explore craters.',
    funFact: 'Its special wheels keep the camera steady even when climbing over Mars rocks.',
  },
  astronaut: {
    id: 'astronaut',
    name: 'Junior Commander',
    role: 'That Is You!',
    description:
      'Your Mars spacesuit has heavy boots, a sky-blue helmet visor, and a backpack full of oxygen and sensors.',
    funFact: 'Mars pulls you down less than Earth does, so you can jump higher here!',
  },
  'power-console': {
    id: 'power-console',
    name: 'Power Console',
    role: 'Energy Control Desk',
    description:
      'Sends electricity from your solar panels and wind turbines to the Habitat, Greenhouse, and Rover.',
    funFact: 'Sharing power wisely keeps every astronaut warm and safe.',
  },
  windmill: {
    id: 'windmill',
    name: 'Mars Wind Turbines',
    role: 'Backup Ridge Power',
    description:
      'Three wide-blade windmills on the ridge catch Martian breezes—especially helpful during dusty skies!',
    funFact: 'Mars air is much thinner than Earth air, so the blades must be extra wide.',
  },
  'ice-drill': {
    id: 'ice-drill',
    name: 'Ice Drill Rig',
    role: 'Underground Water Finder',
    description:
      'A tall drill rig in the crater basin built to reach frozen water buried under Martian dust.',
    funFact: 'Radar scans show possible ice buried under the ground on Mars!',
  },
  'landing-pad': {
    id: 'landing-pad',
    name: 'Ares Landing Pad',
    role: 'Rocket & Cargo Zone',
    description:
      'A flat stone pad with landing lights, fuel tanks, and supply boxes placed safely away from the Habitat.',
    funFact: 'Flat ground and steady gravity make rocket landings much safer here.',
  },
};

export const COMMANDER_CALLSIGNS = BIBLE_BRIEFING_DATA.callsignChoices.map(
  (name) => `Commander ${name.trim()}`,
);

export interface CinematicSceneBeat {
  id: number;
  title: string;
  startSec: number;
  endSec: number;
  caption: string;
  advisory?: string;
}

export const PROLOGUE_DURATION_SEC = 28;

/**
 * Derived directly from BIBLE_S02_CAPTIONS in src/sim/storyBeats.ts
 */
export const PROLOGUE_SCENES: CinematicSceneBeat[] = BIBLE_S02_CAPTIONS.map((shot) => ({
  id: shot.shot,
  title: shot.camera,
  startSec: shot.startSec,
  endSec: shot.endSec,
  caption: shot.caption,
}));

export interface TutorialStepInfo {
  step: Exclude<TutorialStepId, 'complete'>;
  code: string;
  title: string;
  instruction: string;
  mentorMessage: string;
  keyHint: string;
}

/**
 * Derived directly from JUNIOR_TUTORIAL_STEPS in src/sim/storyBeats.ts
 */
export const TUTORIAL_STEPS: Record<Exclude<TutorialStepId, 'complete'>, TutorialStepInfo> = {
  1: {
    step: 1,
    code: 'ACT 1 · S1.1',
    title: JUNIOR_TUTORIAL_STEPS.look.title,
    instruction: JUNIOR_TUTORIAL_STEPS.look.actionPrompt,
    mentorMessage: JUNIOR_TUTORIAL_STEPS.look.rustyLine,
    keyHint: 'LOOK 60°',
  },
  2: {
    step: 2,
    code: 'ACT 1 · S1.2',
    title: JUNIOR_TUTORIAL_STEPS.move.title,
    instruction: JUNIOR_TUTORIAL_STEPS.move.actionPrompt,
    mentorMessage: JUNIOR_TUTORIAL_STEPS.move.rustyLine,
    keyHint: 'W A S D (7 m)',
  },
  3: {
    step: 3,
    code: 'ACT 1 · S1.3',
    title: JUNIOR_TUTORIAL_STEPS['jump-crystals'].title,
    instruction: JUNIOR_TUTORIAL_STEPS['jump-crystals'].actionPrompt,
    mentorMessage: JUNIOR_TUTORIAL_STEPS['jump-crystals'].rustyLine,
    keyHint: 'SPACE',
  },
  4: {
    step: 4,
    code: 'ACT 1 · S1.5',
    title: JUNIOR_TUTORIAL_STEPS.chores.title,
    instruction: JUNIOR_TUTORIAL_STEPS.chores.actionPrompt,
    mentorMessage: JUNIOR_TUTORIAL_STEPS.chores.rustyLine,
    keyHint: 'PRESS E',
  },
  5: {
    step: 5,
    code: 'ACT 1 · S1.6',
    title: JUNIOR_TUTORIAL_STEPS['inspect-oxygen'].title,
    instruction: JUNIOR_TUTORIAL_STEPS['inspect-oxygen'].actionPrompt,
    mentorMessage: JUNIOR_TUTORIAL_STEPS['inspect-oxygen'].rustyLine,
    keyHint: 'TANK 2 + QUIZ',
  },
};

export interface PowerAllocation {
  habitat: number;
  greenhouse: number;
  rover: number;
}

export const TOTAL_POWER_UNITS = 10;
