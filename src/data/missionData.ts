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
      'Five solar panels follow the Sun across the sky, charging big batteries so the base stays warm at night.',
    funFact: 'Mars gets only 43% as much sunlight as Earth, and dust on panels lowers power!',
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
    funFact: 'Mars gravity is ~3.73 m/s² (38% of Earth), so you can jump over 2.5× higher here!',
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
    funFact: 'Mars air is ~61× thinner than Earth air, so the blades must be extra wide.',
  },
  'ice-drill': {
    id: 'ice-drill',
    name: 'Ice Drill Rig',
    role: 'Underground Water Finder',
    description:
      'A tall drill rig in the crater basin built to reach frozen water buried under Martian dust.',
    funFact: 'NASA radar shows buried water-ice sits just meters below the surface on Mars!',
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

export const COMMANDER_CALLSIGNS = [
  'Commander Nova',
  'Commander Orion',
  'Commander Atlas',
  'Commander Helios',
];

export interface CinematicSceneBeat {
  id: number;
  title: string;
  startSec: number;
  endSec: number;
  caption: string;
  advisory?: string;
}

export const PROLOGUE_DURATION_SEC = 28;

export const PROLOGUE_SCENES: CinematicSceneBeat[] = [
  {
    id: 1,
    title: 'A New World',
    startSec: 0,
    endSec: 6,
    caption: 'A new world. A new beginning.',
  },
  {
    id: 2,
    title: 'The Outpost',
    startSec: 6,
    endSec: 13,
    caption: 'Here, every bit of power matters.',
  },
  {
    id: 3,
    title: 'Your Mission',
    startSec: 13,
    endSec: 21,
    caption: 'Your crew is counting on you, Commander.',
  },
  {
    id: 4,
    title: 'The Challenge',
    startSec: 21,
    endSec: 29,
    caption: 'The Sun can change everything. Every decision matters.',
    advisory: 'SPACE WEATHER ADVISORY · ELEVATED SOLAR WIND DETECTED',
  },
  {
    id: 5,
    title: 'Take Command',
    startSec: 29,
    endSec: 34,
    caption: 'YOUR MISSION BEGINS NOW.',
  },
];

export interface TutorialStepInfo {
  step: Exclude<TutorialStepId, 'complete'>;
  code: string;
  title: string;
  instruction: string;
  mentorMessage: string;
  keyHint: string;
}

export const TUTORIAL_STEPS: Record<Exclude<TutorialStepId, 'complete'>, TutorialStepInfo> = {
  1: {
    step: 1,
    code: 'TUTORIAL 01',
    title: 'Move Across Mars',
    instruction: 'Use WASD or Arrow Keys to walk around the outpost.',
    mentorMessage:
      'Commander Vega: "Take a few steps in your new Mars boots! Walk forward toward the outpost."',
    keyHint: 'W A S D',
  },
  2: {
    step: 2,
    code: 'TUTORIAL 02',
    title: 'Look Around',
    instruction: 'Drag with your Mouse (or click the scene and look) to scan the horizon.',
    mentorMessage:
      'Commander Vega: "Good! Now look around Mars Outpost 01 so you know your surroundings."',
    keyHint: 'DRAG MOUSE',
  },
  3: {
    step: 3,
    code: 'TUTORIAL 03',
    title: 'Inspect a Station',
    instruction: 'Walk near ROVER-7, the Habitat, or Greenhouse and press E to inspect.',
    mentorMessage:
      'Commander Vega: "Every station has an important job. Walk up to any structure and press E!"',
    keyHint: 'E',
  },
  4: {
    step: 4,
    code: 'TUTORIAL 04',
    title: 'Locate the Power Console',
    instruction: 'Follow the glowing gold marker to the Power Console and press E.',
    mentorMessage:
      'Commander Vega: "Now find the Outpost Power Console near the habitat walkway and activate it!"',
    keyHint: 'FIND & PRESS E',
  },
  5: {
    step: 5,
    code: 'TUTORIAL 05',
    title: 'Allocate Outpost Power',
    instruction: 'Balance your 10 Power Units across Habitat, Greenhouse, and Rover, then Apply.',
    mentorMessage:
      'Commander Vega: "Solar energy is limited. Give each system what it needs to keep Sol 01 running smoothly!"',
    keyHint: 'APPLY POWER',
  },
};

export interface PowerAllocation {
  habitat: number;
  greenhouse: number;
  rover: number;
}

export const TOTAL_POWER_UNITS = 10;
