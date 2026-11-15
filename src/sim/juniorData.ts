import { MissionId } from './roverData';
import { OptionId } from './missionsData';

export type TutorialStepId =
  | 'move'
  | 'inspect-rover'
  | 'jump-crystals'
  | 'gravity-card'
  | 'inspect-oxygen'
  | 'tutorial-quiz'
  | 'crew-map-intro'
  | 'complete';

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

export interface JuniorMissionConfig {
  missionId: MissionId;
  storyKid: string;
  simpleSubtitle: string;
  learnGoal: string;
  quiz: JuniorQuizDef;
  miniActivity: {
    id: string;
    title: string;
    instruction: string;
    targetSeconds: number;
  };
  decisions: [JuniorDecisionOption, JuniorDecisionOption];
  moreOptions: OptionId[];
  scienceCardId: string;
  badge: {
    id: MissionId;
    title: string;
    icon: 'oxygen' | 'sun' | 'ice' | 'leaf' | 'shield';
    journalFact: string;
    disclaimer: string;
  };
}

export const BADGE_DISCLAIMER =
  'Junior Mars Commander — In-game achievement, not an official NASA certificate.';

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
  move: {
    stepNumber: 1,
    totalSteps: 6,
    title: 'Walk on Mars',
    actionPrompt: 'Use W A S D keys or touch D-Pad to move forward.',
    rustyLine:
      'Welcome to Mars, Commander! Walk around to take your first steps on the red planet!',
  },
  'inspect-rover': {
    stepNumber: 2,
    totalSteps: 6,
    title: 'Inspect the Rover Bay',
    actionPrompt: 'Walk near a glowing station or Rover and press E to explore.',
    rustyLine: 'Press E to explore.',
  },
  'jump-crystals': {
    stepNumber: 3,
    totalSteps: 6,
    title: 'Mars Jump Challenge',
    actionPrompt: 'Press Spacebar to jump and collect 3 glowing Gravity Crystals!',
    rustyLine: 'Whoa! You jumped so high! Collect 3 glowing crystals!',
  },
  'gravity-card': {
    stepNumber: 4,
    totalSteps: 6,
    title: 'Mars Gravity Discovery',
    actionPrompt: 'Read your Mars Gravity Science Card to continue.',
    rustyLine: 'Mars pulls you down less than Earth.',
  },
  'inspect-oxygen': {
    stepNumber: 5,
    totalSteps: 6,
    title: 'Check the Oxygen Tank',
    actionPrompt: 'Walk to Oxygen Tank 2 and press E to check our air supply.',
    rustyLine: 'Can we breathe Mars air?',
  },
  'tutorial-quiz': {
    stepNumber: 5,
    totalSteps: 6,
    title: 'Quick Air Check',
    actionPrompt: 'Answer Rusty’s quick question about Mars air!',
    rustyLine: 'Can we breathe Mars air?',
  },
  'crew-map-intro': {
    stepNumber: 6,
    totalSteps: 6,
    title: 'Your Mars Home & Crew',
    actionPrompt: 'Review your Habitat Map & Crew safety card to start Mission 1.',
    rustyLine: 'This home keeps our crew safe.',
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
  correctFeedback: 'That’s right! Mars air is not safe to breathe.',
  wrongFeedback: 'Not quite! Let’s check the oxygen tank.',
};

export const JUNIOR_DEBRIEF_QUIZ: JuniorQuizDef = {
  id: 'debrief-reflection',
  question: 'What helps astronauts stay safe on Mars?',
  optionA: { label: 'Only a fast rover', icon: 'rover' },
  optionB: { label: 'Safe air, water, power and shelter', icon: 'shield' },
  correctOption: 'B',
  correctFeedback: 'You got it! Safe air, water, power, and shelter keep every astronaut safe.',
  wrongFeedback: 'Think about everything we protected across all 5 missions — try again!',
};

export const JUNIOR_SCIENCE_CARDS: Record<string, JuniorScienceCardDef> = {
  'tut-gravity': {
    id: 'tut-gravity',
    when: 'Tutorial',
    title: 'Mars Gravity',
    oneSentence: 'Mars has weaker gravity than Earth. You can jump higher here!',
    grownUpInfo:
      'Mars surface gravity is about 3.73 m/s² compared to Earth’s 9.81 m/s² (about 38% as strong). Even in a heavy spacesuit, astronauts bounce higher with each step.',
    sourceNote: 'Planetary gravity science (NASA Mars Fact Sheet)',
    skipEnabled: true,
  },
  'tut-air': {
    id: 'tut-air',
    when: 'Tutorial',
    title: 'Mars Air',
    oneSentence: 'Mars air is mostly carbon dioxide. Astronauts need a safe oxygen supply.',
    grownUpInfo:
      'Mars air is ~96% carbon dioxide and very thin. Inside habitats and spacesuits, life-support machines keep breathable oxygen pressurized.',
    sourceNote: 'Planetary atmosphere science (NASA Mars Fact Sheet)',
    skipEnabled: true,
  },
  'tut-sol': {
    id: 'tut-sol',
    when: 'Tutorial',
    title: 'A Mars Day',
    oneSentence: 'A day on Mars is called a sol. One sol is about 24 hours and 39 minutes.',
    grownUpInfo:
      'Because Mars spins just a little slower than Earth, mission teams count Mars days as Sols so schedules stay aligned with Martian sunlight.',
    sourceNote: 'Mars solar day timing (NASA Mars Fact Sheet)',
    skipEnabled: true,
  },
  m1: {
    id: 'm1',
    when: 'Mission 1 · Sol 21',
    title: 'Isolation Valves',
    oneSentence: 'A valve can close one part of a pipe system. This helps stop a leak.',
    grownUpInfo:
      'Engineers divide spacecraft and Mars tanks into separate sections with shut-off valves so one small leak never drains the whole habitat.',
    sourceNote: 'Habitat life-support engineering [SIM]',
    skipEnabled: true,
  },
  m2: {
    id: 'm2',
    when: 'Mission 2 · Sol 34',
    title: 'Dust & Sunlight',
    oneSentence:
      'Dust in the air blocks some sunlight. Solar panels make less power when less light reaches them.',
    grownUpInfo:
      'During big Mars dust storms, airborne dust blocks sunlight before it even touches the panels—so brushing panels works best AFTER the storm clears.',
    sourceNote: 'Inspired by Mars rover solar storm records (ARCHIVED)',
    skipEnabled: true,
  },
  m3: {
    id: 'm3',
    when: 'Mission 3 · Sol 52',
    title: 'Recycling & Buried Ice',
    oneSentence:
      'Recycling helps us use water again. Buried ice must be collected, melted and cleaned before drinking.',
    grownUpInfo:
      'Mars has no open liquid lakes on the surface, but radar maps suggest frozen water ice may lie underground in mid-latitude regions.',
    sourceNote: 'NASA SWIM buried ice mapping & ISS-style recycling [SIM]',
    skipEnabled: true,
  },
  m4: {
    id: 'm4',
    when: 'Mission 4 · Sol 67',
    title: 'Keeping Plants Warm',
    oneSentence:
      'Plants need light, water and warmth. A greenhouse helps protect them from the cold.',
    grownUpInfo:
      'Mars averages about −63 °C outside! Greenhouses shield plants from freezing air and help them make fresh food and oxygen alongside stored rations.',
    sourceNote: 'NASA CHAPEA & Mars temperature data',
    skipEnabled: true,
  },
  m5: {
    id: 'm5',
    when: 'Mission 5 · Sol 88',
    title: 'Space Weather & Shelter',
    oneSentence:
      'Radiation is energy that can be harmful. A well-shielded shelter helps protect astronauts.',
    grownUpInfo:
      'The Sun sometimes sends fast energetic particles into space. Because Mars lacks a strong magnetic shield, thick water walls inside a shelter help block them.',
    sourceNote: 'Space weather & hydrogen shielding science',
    skipEnabled: true,
  },
};

export const JUNIOR_MISSIONS: Record<MissionId, JuniorMissionConfig> = {
  m1: {
    missionId: 'm1',
    storyKid:
      'Notice. Oxygen Tank 2 pressure is dropping slowly. Let us follow the whisper sound and inspect the pipes.',
    simpleSubtitle: 'Mission 1 · Whisper in Tank 2',
    learnGoal: 'Learn what oxygen is, why Mars air is unsafe, and how a valve stops a leak.',
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
      instruction: 'Check all 3 pipes to spot the blinking warning light, then hold to close the valve!',
      targetSeconds: 40,
    },
    decisions: [
      {
        engineOptionId: 'A',
        badgeLabel: 'Choice 1',
        title: 'Close the damaged valve',
        summary: 'Stop the leak at the pipe so oxygen stays safe.',
        tradeOff: 'Tank 2 stays locked for a while & uses a little power.',
        icon: 'valve',
      },
      {
        engineOptionId: 'B',
        badgeLabel: 'Choice 2',
        title: 'Move crew to the backup room',
        summary: 'Keep everyone safe inside the backup airlock room.',
        tradeOff: 'Crew is safe now, but the tank leak continues.',
        icon: 'shield',
      },
    ],
    moreOptions: ['C', 'D'],
    scienceCardId: 'm1',
    badge: {
      id: 'm1',
      title: 'Oxygen Guardian',
      icon: 'oxygen',
      journalFact: 'Mars air cannot be breathed directly; isolation valves stop pipe leaks fast.',
      disclaimer: BADGE_DISCLAIMER,
    },
  },
  m2: {
    missionId: 'm2',
    storyKid:
      'The Mars sky is filling with orange dust! Solar panels get less sunlight, so our battery is dropping fast.',
    simpleSubtitle: 'Mission 2 · Dust & Solar Power',
    learnGoal: 'Learn how sky dust dims sunlight and how batteries store energy.',
    quiz: {
      id: 'quiz-m2',
      question: 'What do solar panels use to make electricity?',
      optionA: { label: 'Sunlight', icon: 'sun' },
      optionB: { label: 'Moonlight', icon: 'moon' },
      correctOption: 'A',
      correctFeedback: 'Correct! Solar panels use sunlight.',
      wrongFeedback: 'Try again! Look at the bright Sun above the panels.',
    },
    miniActivity: {
      id: 'sunlight-slider',
      title: 'Sunlight & Dust Slider',
      instruction: 'Slide from Clear Sky to Dusty Sky and watch what happens to solar power!',
      targetSeconds: 35,
    },
    decisions: [
      {
        engineOptionId: 'B',
        badgeLabel: 'Choice 1',
        title: 'Keep important systems ON & pause extras',
        summary: 'Save battery power for air and water while the sky is dusty.',
        tradeOff: 'Battery stays safe, though greenhouse growth slows down.',
        icon: 'power',
      },
      {
        engineOptionId: 'A',
        badgeLabel: 'Choice 2',
        title: 'Keep every machine running on battery',
        summary: 'Keep lights and science gear running normally right now.',
        tradeOff: 'All work continues today, but the battery drains very fast.',
        icon: 'battery',
      },
    ],
    moreOptions: ['C', 'D'],
    scienceCardId: 'm2',
    badge: {
      id: 'm2',
      title: 'Solar Engineer',
      icon: 'sun',
      journalFact:
        'Airborne dust blocks sunlight on Mars — save power for life support and clean panels after the storm!',
      disclaimer: BADGE_DISCLAIMER,
    },
  },
  m3: {
    missionId: 'm3',
    storyKid:
      'Our Water Recycler needs help cleaning water! Plus, Lucía’s rover scan spotted possible ice hidden under the soil.',
    simpleSubtitle: 'Mission 3 · Clean Water & Buried Ice',
    learnGoal: 'Learn how water is recycled and why buried ice must be melted and cleaned.',
    quiz: {
      id: 'quiz-m3',
      question: 'Can we drink ice straight from the ground?',
      optionA: { label: 'Yes, right away', icon: 'ice' },
      optionB: { label: 'No, melt and clean it first', icon: 'water' },
      correctOption: 'B',
      correctFeedback: 'Correct! Ice must be melted and cleaned first.',
      wrongFeedback: 'Not yet! Water needs to be safe and clean.',
    },
    miniActivity: {
      id: 'ice-scanner',
      title: 'Filter Fit & Ice Scanner',
      instruction: 'Fit the clean filter into the Recycler, then scan 3 ground spots with Rusty!',
      targetSeconds: 45,
    },
    decisions: [
      {
        engineOptionId: 'A',
        badgeLabel: 'Choice 1',
        title: 'Repair the water recycler',
        summary: 'Fix the filter so clean water keeps coming back every sol.',
        tradeOff: 'Uses 1 Spare-Part Kit and a little battery power.',
        icon: 'wrench',
      },
      {
        engineOptionId: 'D',
        badgeLabel: 'Choice 2',
        title: 'Use the emergency water reserve',
        summary: 'Pour the backup tank into our main water supply right away.',
        tradeOff: 'Solves today’s shortage, but leaves zero emergency backup.',
        icon: 'water',
      },
    ],
    moreOptions: ['B', 'C'],
    scienceCardId: 'm3',
    badge: {
      id: 'm3',
      title: 'Ice Explorer',
      icon: 'ice',
      journalFact:
        'Recycling cleans water again and again, and buried Mars ice must always be melted and purified first.',
      disclaimer: BADGE_DISCLAIMER,
    },
  },
  m4: {
    missionId: 'm4',
    storyKid:
      'Brrr! The greenhouse heater control broke. Frost is forming on the glass and the plants are getting cold!',
    simpleSubtitle: 'Mission 4 · Save the Cold Greenhouse',
    learnGoal: 'Learn that plants need light, water, and warmth to grow.',
    quiz: {
      id: 'quiz-m4',
      question: 'What helps a plant grow?',
      optionA: { label: 'Light and water', icon: 'leaf' },
      optionB: { label: 'Only rocks', icon: 'rock' },
      correctOption: 'A',
      correctFeedback: 'Yes! Plants need light and water to grow.',
      wrongFeedback: 'Try again! Look at the healthy green plant.',
    },
    miniActivity: {
      id: 'plant-helper',
      title: 'Plant Helper & Thermostat Fix',
      instruction: 'Give the drooping plant Sunlight, Water, and Warmth, then slot the new thermostat!',
      targetSeconds: 45,
    },
    decisions: [
      {
        engineOptionId: 'A',
        badgeLabel: 'Choice 1',
        title: 'Fix the thermostat',
        summary: 'Warm the Bio-Dome steadily so future harvests survive.',
        tradeOff: 'Uses a Spare-Part Kit and a bit of power.',
        icon: 'heater',
      },
      {
        engineOptionId: 'C',
        badgeLabel: 'Choice 2',
        title: 'Use stored food for now',
        summary: 'Open packed space food rations so the crew eats right away.',
        tradeOff: 'Crew is fed today, while frosted crops wait to regrow.',
        icon: 'food',
      },
    ],
    moreOptions: ['B', 'D'],
    scienceCardId: 'm4',
    badge: {
      id: 'm4',
      title: 'Greenhouse Guardian',
      icon: 'leaf',
      journalFact:
        'Greenhouses protect plants from −63 °C Mars cold, giving them light, water, and warmth.',
      disclaimer: BADGE_DISCLAIMER,
    },
  },
  m5: {
    missionId: 'm5',
    storyKid:
      'Our rover found an ice spot — just as a space-weather warning arrives from the Sun! Let’s keep the crew safe inside.',
    simpleSubtitle: 'Mission 5 · Space Weather Shelter',
    learnGoal: 'Learn how a shielded shelter protects astronauts during a solar storm.',
    quiz: {
      id: 'quiz-m5',
      question: 'What can help protect astronauts?',
      optionA: { label: 'A safe shielded shelter', icon: 'shield' },
      optionB: { label: 'Standing outside', icon: 'sun' },
      correctOption: 'A',
      correctFeedback: 'That’s right! A shielded shelter can help protect the crew.',
      wrongFeedback: 'Try again! Look at the shelter walls.',
    },
    miniActivity: {
      id: 'shield-builder',
      title: 'Shield Builder & Hatch Seal',
      instruction: 'Test the shield materials, place the Water Tank wall, and seal the shelter hatch!',
      targetSeconds: 45,
    },
    decisions: [
      {
        engineOptionId: 'A',
        badgeLabel: 'Choice 1',
        title: 'Move the crew into the shielded shelter',
        summary: 'Keep everyone safe behind water-tank walls while the rover waits.',
        tradeOff: 'Crew stays well protected; ice drilling waits until safe.',
        icon: 'shield',
      },
      {
        engineOptionId: 'D',
        badgeLabel: 'Choice 2',
        title: 'Continue outside work',
        summary: 'Send astronauts outside right away to finish drilling faster.',
        tradeOff: 'Finishes the drill fast, but puts crew at higher risk.',
        icon: 'eva',
      },
    ],
    moreOptions: ['B', 'C'],
    scienceCardId: 'm5',
    badge: {
      id: 'm5',
      title: 'Space Safety',
      icon: 'shield',
      journalFact:
        'During space-weather warnings, astronauts stay inside shielded shelters with water walls.',
      disclaimer: BADGE_DISCLAIMER,
    },
  },
};

export const JUNIOR_CLOSING_LINE =
  'You explored Mars, solved problems and helped your crew. You are a Junior Explorer!';
