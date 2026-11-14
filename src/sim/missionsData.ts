import { CrewMemberId, ProvenanceTag } from './constants';
import { DonkiSpaceWeather } from './nasaData';
import { MissionId } from './roverData';

export type MissionZoneId = 'tank2' | 'solar' | 'recycler' | 'greenhouse' | 'shelter';

export type OptionId = 'A' | 'B' | 'C' | 'D';

export interface MissionSensorItem {
  label: string;
  value: string;
  tag: ProvenanceTag;
}

export interface MissionOptionDef {
  id: OptionId;
  label: string;
  actionSummary: string;
  costSummary: string[];
  crewSlotsCost: number;
  affectedCrew: CrewMemberId[];
  riskPercent: number;
  riskSummary: string;
  /** Deterministic resource/crew effects before & after risk roll */
  scienceCard: string;
  whatYouKnewNote: string;
}

export interface MissionDefinition {
  id: MissionId;
  index: number; // 1..5
  missionSol: number;
  gapBeforeSols: number; // Routine sols elapsed before this Critical Sol
  zoneId: MissionZoneId;
  zoneLabel: string;
  title: string;
  subtitle: string;
  story: string;
  playerQuestion: string;
  scienceReason: string;
  sourceIds: string[];
  sensorReadings: MissionSensorItem[];
  mcDelayMinutes: number; // [REAL S15] 4-24 min one-way comms delay
  mcAdvice: string;
  options: MissionOptionDef[];
  getBestOption: (donki: DonkiSpaceWeather) => { bestId: OptionId; reason: string };
}

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'm1',
    index: 1,
    missionSol: 21,
    gapBeforeSols: 0,
    zoneId: 'tank2',
    zoneLabel: 'O₂ Tank 2',
    title: 'Whisper in Tank 2',
    subtitle: 'Mission 1 · Oxygen Leak',
    story:
      'Kenji spots frost on Oxygen Tank 2. Air pressure is dropping—we are losing 2 to 6 kg of oxygen each day.',
    playerQuestion: 'What do you protect first — the oxygen, the crew, or the schedule?',
    scienceReason:
      'Mars air is ~96% CO₂ and super thin [REAL], so we cannot breathe outside air. Oxygen must stay sealed inside or be made slowly from CO₂ (like NASA MOXIE at 12 g/h [REAL]).',
    sourceIds: ['S1b', 'S2', 'S5', 'S6', 'S8'],
    sensorReadings: [
      { label: 'Tank 2 Leak Rate', value: '2.0 – 6.0 kg/sol', tag: 'SIM' },
      { label: 'O₂ Inside Tank 2', value: '~18 kg O₂', tag: 'SIM' },
      { label: '4-Crew O₂ Need', value: '3.36 kg/sol (0.84 × 4)', tag: 'DERIVED' },
      { label: 'O₂ Maker (ISRU)', value: '+3.0 kg/sol @ 25 kWh', tag: 'SIM' },
      { label: 'Outside Mars Air', value: '~96% CO₂ · ~6.36 mb', tag: 'REAL' },
    ],
    mcDelayMinutes: 8,
    mcAdvice:
      'Houston Flight Surgeon: "Crew safety comes first. Closing the broken valve stops the leak at the source—you decide on the ground!"',
    options: [
      {
        id: 'A',
        label: 'Close the broken valve',
        actionSummary: 'Kenji shuts the Tank 2 valve to stop the leak.',
        costSummary: ['5 kWh Power', '2 Crew Slots', 'Locks 18 kg O₂ till later'],
        crewSlotsCost: 2,
        affectedCrew: ['kenji'],
        riskPercent: 20,
        riskSummary: '80% full fix · 20% small gasket slip',
        scienceCard:
          'Shut-off valves split pipes into sections so one leak cannot empty the whole base.',
        whatYouKnewNote: 'Tank 2 was losing 2–6 kg/sol [SIM] into unbreathable 96% CO₂ air [REAL].',
      },
      {
        id: 'B',
        label: 'Move crew to safe room',
        actionSummary: 'Move everyone into the backup airlock room.',
        costSummary: ['~6 kg O₂ lost', '1 Crew Slot', 'Science paused'],
        crewSlotsCost: 1,
        affectedCrew: ['amara', 'lucia'],
        riskPercent: 100,
        riskSummary: 'Crew stays safe, but Tank 2 keeps leaking (+10 Stress)',
        scienceCard:
          'Protecting people is smart, but hiding in another room does not fix the leaking pipe.',
        whatYouKnewNote: 'Moving keeps the crew safe, while Tank 2 stays open.',
      },
      {
        id: 'C',
        label: 'Pause extra work & rest',
        actionSummary: 'Crew rests quietly and turns off science gear.',
        costSummary: ['0 Crew Slots', 'Saves 12 kWh & ~0.3 kg O₂/sol'],
        crewSlotsCost: 0,
        affectedCrew: ['rafi'],
        riskPercent: 60,
        riskSummary: 'Slows O₂ use, but ~4 kg/sol still leaks out',
        scienceCard:
          'Resting astronauts use less oxygen, buying time—but rest cannot seal a broken pipe.',
        whatYouKnewNote: 'Resting slows O₂ use [SIM], while the leak keeps running.',
      },
      {
        id: 'D',
        label: 'Ignore the warning',
        actionSummary: 'Keep working normally and leave Tank 2 alone.',
        costSummary: ['0 upfront cost', 'High danger!'],
        crewSlotsCost: 0,
        affectedCrew: ['amara', 'kenji', 'lucia', 'rafi'],
        riskPercent: 65,
        riskSummary: '45% big leak (-15 kg O₂) · 20% crew sick (-15 Health)',
        scienceCard:
          'What matters for breathing is air pressure inside the room, not just gas sitting in tanks.',
        whatYouKnewNote: 'Sensors already showed a 2–6 kg/sol leak [SIM].',
      },
    ],
    getBestOption: () => ({
      bestId: 'A',
      reason: 'Closing the valve stops the leak at its source instead of letting oxygen escape.',
    }),
  },
  {
    id: 'm2',
    index: 2,
    missionSol: 34,
    gapBeforeSols: 13,
    zoneId: 'solar',
    zoneLabel: 'Solar Farm',
    title: 'Red Sky',
    subtitle: 'Mission 2 · Dust Storm',
    story:
      'Thick orange dust fills the sky! Sunlight is dropping fast—just like the storm that hit NASA’s Opportunity rover.',
    playerQuestion: 'Which systems stay powered when the Sun fades?',
    scienceReason:
      'Mars gets only 43.1% of Earth sunlight (586.2 W/m² [REAL]). In a big dust storm, solar power can drop to 28% [DERIVED], and settled dust lingers ~21 sols [REAL].',
    sourceIds: ['S1', 'S9', 'S10', 'S11', 'S20'],
    sensorReadings: [
      { label: 'Sky Dust (tau)', value: '1.0 → 2.1 → >3.0', tag: 'REAL' },
      { label: 'Solar Power Left', value: '100% → 74% → 28%', tag: 'DERIVED' },
      { label: 'Base Power Need', value: '140 kWh/sol', tag: 'SIM' },
      { label: 'Clear-Sky Power', value: '160 kWh/sol', tag: 'SIM' },
      { label: 'Dust Clearing Time', value: '~21 sols after storm', tag: 'REAL' },
    ],
    mcDelayMinutes: 12,
    mcAdvice:
      'Houston Power Team: "Floating sky dust blocks sunlight before it hits the panels. Save power for air and water first—brush dust off AFTER the storm!"',
    options: [
      {
        id: 'A',
        label: 'Use battery backup',
        actionSummary: 'Keep everything on and drain the batteries.',
        costSummary: ['−22 to −95 kWh/sol drain', '0 Crew Slots'],
        crewSlotsCost: 0,
        affectedCrew: ['rafi'],
        riskPercent: 55,
        riskSummary: 'Everything stays on now, but battery may run low',
        scienceCard:
          'Batteries save yesterday’s sunlight—but without new sun power, even big batteries run dry.',
        whatYouKnewNote: 'Solar power was dropping toward 28% (~45 vs 140 kWh needed) [DERIVED/SIM].',
      },
      {
        id: 'B',
        label: 'Turn off extra systems',
        actionSummary: 'Pause labs and dim plant lights; keep air & water on.',
        costSummary: ['1 Crew Slot', 'Saves ~45 kWh/sol', 'Plants grow −30%'],
        crewSlotsCost: 1,
        affectedCrew: ['rafi', 'lucia'],
        riskPercent: 10,
        riskSummary: 'Battery stays safe! Slightly less food later',
        scienceCard:
          'Smart engineers save power in storms: keep air and water running first, and pause extras.',
        whatYouKnewNote: 'Saving 45 kWh/sol [SIM] keeps life support safe through the storm.',
      },
      {
        id: 'C',
        label: 'Send Rover to brush panels',
        actionSummary: 'Send your Rover out into high winds to wipe the panels.',
        costSummary: ['20 kWh Power', '3 Crew Slots', 'Only +5% power'],
        crewSlotsCost: 3,
        affectedCrew: ['kenji'],
        riskPercent: 25,
        riskSummary: '25% chance Rover breaks a wheel strut in the storm!',
        scienceCard:
          'While dust floats high in the sky, brushing panels barely helps. Clean them AFTER the storm!',
        whatYouKnewNote: 'Dust takes ~21 sols to settle after Mars storms [REAL].',
      },
      {
        id: 'D',
        label: 'Keep everything running',
        actionSummary: 'Change nothing and hope the storm ends fast.',
        costSummary: ['0 upfront cost', 'Blackout danger!'],
        crewSlotsCost: 0,
        affectedCrew: ['amara', 'kenji', 'lucia', 'rafi'],
        riskPercent: 90,
        riskSummary: 'Batteries hit empty · Life support flickers (+20 Stress)',
        scienceCard:
          'Wasting power when the sky gets dark leaves zero backup when the storm is worst.',
        whatYouKnewNote: 'Heavy dust (tau > 3.0) cuts solar power down to 28% [DERIVED].',
      },
    ],
    getBestOption: () => ({
      bestId: 'B',
      reason:
        'Turning off extra systems saves life support during the storm, and brushing panels AFTER gives +25% power.',
    }),
  },
  {
    id: 'm3',
    index: 3,
    missionSol: 52,
    gapBeforeSols: 18,
    zoneId: 'recycler',
    zoneLabel: 'Water Bay',
    title: "Water You Can't Drink Yet",
    subtitle: 'Mission 3 · Water Machine Broken',
    story:
      'The Water Recycler dropped from 85% to 40%! Tanks have ~9 days of water left, and radar spotted buried ice 4 km away.',
    playerQuestion: 'Fix what you have, save what you have, or go find more?',
    scienceReason:
      'Each astronaut needs ~2.37 kg/day just to drink [REAL]. Mars has no liquid lakes—water ice hides 0–5 m underground (NASA SWIM [REAL]) and needs energy to melt.',
    sourceIds: ['S5', 'S12', 'S13'],
    sensorReadings: [
      { label: 'Water Recycler', value: 'Dropped 85% → 40%', tag: 'SIM' },
      { label: '4-Crew Water Use', value: '13.5 kg/sol total', tag: 'DERIVED' },
      { label: 'Backup Water Tank', value: '60 kg one-time reserve', tag: 'SIM' },
      { label: 'Buried Ice Spot', value: '4 km away · 0–5 m deep', tag: 'REAL' },
      { label: 'Spare-Part Kits', value: 'Needed for M3 or M4 fixes', tag: 'SIM' },
    ],
    mcDelayMinutes: 14,
    mcAdvice:
      'Houston Water Team: "Fixing the indoor recycler saves way more energy than driving 4 km for ice. Check your Spare-Part Kits first!"',
    options: [
      {
        id: 'A',
        label: 'Fix the water recycler',
        actionSummary: 'Kenji & Rafi swap in 1 Spare-Part Kit to repair the filter.',
        costSummary: ['15 kWh Power', '1 Spare-Part Kit', '3 Crew Slots'],
        crewSlotsCost: 3,
        affectedCrew: ['kenji', 'rafi'],
        riskPercent: 25,
        riskSummary: '75% fixed to 85% · 25% small −8 kg water spill',
        scienceCard:
          'Recycling water already inside your base takes much less energy than mining and melting ice.',
        whatYouKnewNote: 'Recycler dropped to 40% [SIM], and Spare-Part Kits are limited.',
      },
      {
        id: 'B',
        label: 'Cut shower & plant water',
        actionSummary: 'Skip showers and give plants less mist to save water.',
        costSummary: ['0 Crew Slots', 'Saves 4 kg/sol', '+8 Stress · Plants −15%'],
        crewSlotsCost: 0,
        affectedCrew: ['amara', 'rafi'],
        riskPercent: 30,
        riskSummary: 'Buys ~3 extra days, but raises stress & slows crops',
        scienceCard:
          'Cutting water affects the whole base—plants grow slower and astronauts feel more stressed.',
        whatYouKnewNote: 'Showers and cleaning use 4 kg/sol [SIM] of our water.',
      },
      {
        id: 'C',
        label: 'Send Rover to find ice',
        actionSummary: 'Drive Rover 4 km to drill and test the buried ice spot.',
        costSummary: ['30 kWh Power', '3 Crew Slots', 'No water today'],
        crewSlotsCost: 3,
        affectedCrew: ['lucia'],
        riskPercent: 40,
        riskSummary: '60% ice found (+40 kg water & helps Mission 5 drill!)',
        scienceCard:
          'NASA SWIM maps show mid-latitude Mars has buried ice where solar-powered bases can reach it.',
        whatYouKnewNote: 'SWIM maps show underground ice [REAL], not surface lakes.',
      },
      {
        id: 'D',
        label: 'Use 60 kg backup tank',
        actionSummary: 'Pour the one-time emergency tank into main water.',
        costSummary: ['Backup tank goes to 0 kg', '0 Crew Slots'],
        crewSlotsCost: 0,
        affectedCrew: ['amara', 'rafi'],
        riskPercent: 50,
        riskSummary: '+60 kg water right now, but ZERO emergency backup left',
        scienceCard:
          'Emergency tanks are your last safety net—once you empty it, there is no backup left.',
        whatYouKnewNote: 'The 60 kg backup tank [SIM] cannot be refilled from Earth.',
      },
    ],
    getBestOption: () => ({
      bestId: 'A',
      reason: 'Fixing the recycler solves the problem long-term and saves your emergency tank.',
    }),
  },
  {
    id: 'm4',
    index: 4,
    missionSol: 67,
    gapBeforeSols: 15,
    zoneId: 'greenhouse',
    zoneLabel: 'Greenhouse',
    title: 'Cold Greenhouse',
    subtitle: 'Mission 4 · Broken Heater Control',
    story:
      'Frost is creeping over the Greenhouse glass! The thermostat broke while Mars outside drops toward −63 °C.',
    playerQuestion: 'Fix the cause, feed the crew now, or save the plants at any cost?',
    scienceReason:
      'Mars averages −63 °C (down to −89 °C [REAL]). Just like NASA’s CHAPEA habitat [REAL], greenhouse veggies are a great bonus, while stored food is the main lifeline.',
    sourceIds: ['S1b', 'S5', 'S17'],
    sensorReadings: [
      { label: 'Outside Mars Temp', value: '−63 °C avg (−89 to −31 °C)', tag: 'REAL' },
      { label: '4-Crew Food Need', value: '2.48 kg/sol (0.62 × 4)', tag: 'DERIVED' },
      { label: 'Greenhouse Food', value: '+0.8 kg/sol + 15 kg harvest', tag: 'SIM' },
      { label: 'Stored Food Reserve', value: '20 kg sealed rations', tag: 'SIM' },
      { label: 'CHAPEA Rule', value: 'Plants add to stored food', tag: 'REAL' },
    ],
    mcDelayMinutes: 18,
    mcAdvice:
      'Houston Bio-Team: "Check if you still have a Spare-Part Kit. Electric heaters drain lots of battery, and stored rations keep crew fed if crops freeze."',
    options: [
      {
        id: 'A',
        label: 'Fix the thermostat',
        actionSummary: 'Rafi & Kenji use 1 Spare-Part Kit to repair dome heat.',
        costSummary: ['10 kWh Power', '1 Spare-Part Kit', '3 Crew Slots'],
        crewSlotsCost: 3,
        affectedCrew: ['rafi', 'kenji'],
        riskPercent: 25,
        riskSummary: 'Needs 1 Kit! 75% crops saved & harvests keep growing',
        scienceCard:
          'Fixing the broken thermostat saves every future harvest without draining batteries every day.',
        whatYouKnewNote: 'Needs 1 Spare-Part Kit [SIM] for a lasting repair.',
      },
      {
        id: 'B',
        label: 'Run backup electric heaters',
        actionSummary: 'Send 35 kWh/sol from batteries into heater coils.',
        costSummary: ['35 kWh/sol heavy drain', '0 Crew Slots'],
        crewSlotsCost: 0,
        affectedCrew: ['rafi'],
        riskPercent: 45,
        riskSummary: 'Warms plants briefly, but drains huge battery power',
        scienceCard:
          'Space heaters work short-term, but in −63 °C Mars cold they can empty your batteries fast.',
        whatYouKnewNote: 'Mars averages −63 °C [REAL]; 35 kWh/sol is very heavy [SIM].',
      },
      {
        id: 'C',
        label: 'Open backup food packs',
        actionSummary: 'Let frost hit the plants, save power, and open +12 kg rations.',
        costSummary: ['−12 kg Stored Food', '0 Crew Slots', 'Crops paused ~4 sols'],
        crewSlotsCost: 0,
        affectedCrew: ['amara', 'lucia'],
        riskPercent: 20,
        riskSummary: 'Safe +12 kg food right now; replant greens later',
        scienceCard:
          'Stored food packs are the true safety net on Mars—fresh plants are a healthy bonus.',
        whatYouKnewNote: 'Fresh crops add to stored food [REAL CHAPEA].',
      },
      {
        id: 'D',
        label: 'Shut down the greenhouse',
        actionSummary: 'Turn off the Bio-Dome and send 30 kWh/sol to the Habitat.',
        costSummary: ['Saves 30 kWh/sol', '1 Crew Slot', '+10 Crew Stress'],
        crewSlotsCost: 1,
        affectedCrew: ['amara', 'kenji', 'lucia', 'rafi'],
        riskPercent: 75,
        riskSummary: 'Saves power today, but loses fresh food & hurts morale',
        scienceCard:
          'Turning off a food source saves power today, but makes food tighter later with no resupply ship.',
        whatYouKnewNote: 'Crew eats 2.48 kg/sol every single day [DERIVED].',
      },
    ],
    getBestOption: () => ({
      bestId: 'A',
      reason:
        'Fixing the thermostat saves future harvests if you have a kit; otherwise opening stored food keeps everyone fed safely.',
    }),
  },
  {
    id: 'm5',
    index: 5,
    missionSol: 88,
    gapBeforeSols: 21,
    zoneId: 'shelter',
    zoneLabel: 'Storm Shelter',
    title: 'Storm Over the Ice',
    subtitle: 'Mission 5 · Solar Storm & Ice Drill',
    story:
      'Rover found buried ice 4.2 km away—right as NASA DONKI warns of a solar radiation storm! Our final mission begins.',
    playerQuestion: 'Is the ice worth the risk — and who pays if you are wrong?',
    scienceReason:
      'Mars has no magnetic shield, so solar storms spike radiation fast toward NASA’s 250 mSv event limit and 600 mSv career cap [REAL]. Water walls block solar particles!',
    sourceIds: ['S3', 'S12', 'S13', 'S14', 'S18', 'S19'],
    sensorReadings: [
      { label: 'Daily Mars Radiation', value: '0.67 mSv/day (Curiosity)', tag: 'REAL' },
      { label: 'NASA Career Limit', value: '600 mSv lifetime max', tag: 'REAL' },
      { label: 'Storm Event Limit', value: '250 mSv max per storm', tag: 'REAL' },
      { label: 'Shelter vs Room vs EVA', value: '~15 vs ~60 vs ~180 mSv', tag: 'SIM' },
      { label: 'Ice Drill Target', value: '4.2 km away (SWIM)', tag: 'REAL' },
    ],
    mcDelayMinutes: 22,
    mcAdvice:
      'Houston Safety Officer: "Check NASA DONKI first! If a big solar flare or CME is coming, put everyone behind water walls—never send astronauts outside!"',
    options: [
      {
        id: 'A',
        label: 'Shelter behind water walls',
        actionSummary: 'Crew stays inside the blue water-tank shelter; Rover drills later.',
        costSummary: ['15 kWh Power', '2 Crew Slots', '+5 Stress'],
        crewSlotsCost: 2,
        affectedCrew: ['amara', 'kenji', 'lucia', 'rafi'],
        riskPercent: 10,
        riskSummary: 'Lowest dose (~15 mSv [SIM]); safe remote ice drill',
        scienceCard:
          'Water is rich in hydrogen, so thick water walls stop solar storm particles much better than thin metal.',
        whatYouKnewNote: 'Water shelter keeps dose ~15 mSv vs 250 mSv limit [SIM/REAL].',
      },
      {
        id: 'B',
        label: 'Stay in bedrooms; Rover drills',
        actionSummary: 'Keep crew indoors while Rover drives out during the storm.',
        costSummary: ['5 kWh Power', '1 Crew Slot'],
        crewSlotsCost: 1,
        affectedCrew: ['lucia', 'kenji'],
        riskPercent: 25,
        riskSummary: 'Medium dose (~60 mSv [SIM]); 20% Rover storm glitch',
        scienceCard:
          'Normal habitat walls block some radiation, but strong solar storms still leak through without water shields.',
        whatYouKnewNote: 'Normal rooms let in ~60 mSv [SIM] during a big storm.',
      },
      {
        id: 'C',
        label: 'Stack water bags by bunks',
        actionSummary: 'Move water packs around sleeping bunks and delay Rover 2 days.',
        costSummary: ['5 kWh Power', '2 Crew Slots', 'Drill delayed'],
        crewSlotsCost: 2,
        affectedCrew: ['rafi', 'amara'],
        riskPercent: 15,
        riskSummary: 'Low dose (~30 mSv [SIM]); great if storm is mild',
        scienceCard:
          'Real astronauts can stack water bags and supplies around sleeping bunks for extra storm shielding!',
        whatYouKnewNote: 'Stacked water bags cut radiation dose to ~30 mSv [SIM].',
      },
      {
        id: 'D',
        label: 'Go outside in spacesuits to drill',
        actionSummary: 'Send Lucía & Kenji out in suits to drill the ice fast.',
        costSummary: ['0 Power cost', '2 Crew Slots', 'Extreme radiation!'],
        crewSlotsCost: 2,
        affectedCrew: ['lucia', 'kenji'],
        riskPercent: 85,
        riskSummary: '~180 mSv Dose [SIM]! 30% radiation sickness (−30 Health)',
        scienceCard:
          'Spacesuits hold air, NOT high-speed solar storm particles. Reckless walks can end an astronaut’s career.',
        whatYouKnewNote: 'Going outside adds ~180 mSv [SIM]—dangerously close to 250 mSv!',
      },
    ],
    getBestOption: (donki) =>
      donki.isSevereStorm
        ? {
            bestId: 'A',
            reason:
              'DONKI showed a strong solar storm—water-wall shelter keeps radiation lowest (~15 mSv).',
          }
        : {
            bestId: 'C',
            reason:
              'With a mild solar forecast, stacking water bags keeps crew safe (~30 mSv) while saving power.',
          },
  },
];

export function getMissionById(id: MissionId): MissionDefinition {
  return MISSIONS.find((m) => m.id === id) ?? MISSIONS[0];
}
