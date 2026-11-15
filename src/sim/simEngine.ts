import {
  CREW_PROFILES,
  CrewMemberId,
  SCORE_WEIGHTS,
  SIM_CONSTANTS,
  computeDaysLeft,
  dustFactorFromTau,
  getResourceStatus,
} from './constants';
import { MISSIONS, MissionDefinition, OptionId } from './missionsData';
import { ARCHIVED_DONKI_FALLBACK, DonkiSpaceWeather } from './nasaData';
import { createSeededRng } from './rng';
import {
  MissionId,
  ROVER_HINTS,
  RoverMood,
  crackleRoverText,
  pickNonRepeatingRoverLine,
  sanitizeRoverName,
} from './roverData';
import { ChorePlaceId, JUNIOR_MISSIONS, TutorialStepId } from './juniorData';

export interface CrewMemberState {
  id: CrewMemberId;
  name: string;
  role: string;
  health: number; // 0-100 [SIM]
  stress: number; // 0-100 [SIM]
  alive: boolean;
}

export type WeatherEventKind = 'dust-devil' | 'katabatic-gust' | 'electrostatic-squall';

export interface LocalizedWeatherEvent {
  id: string;
  kind: WeatherEventKind;
  title: string;
  windSpeedMs: number; // [SIM] baseline gust m/s
  lastGustWindMs: number; // [SIM] latest periodic wind gust peak m/s
  pressureDropPa: number; // [SIM] localized vortex drop Pa
  rumbleIntensity: number; // [SIM] 0.55 - 1.0 low-frequency acoustic rumble factor
  gustIntervalSeconds: number; // [SIM] seconds between periodic wind gusts
  gustCount: number;
  durationSeconds: number; // [SIM] Seek Shelter countdown window
  worldPos: { x: number; z: number };
  scienceNote: string;
  shelterInstruction: string;
  triggeredAtSol: number;
}

export interface LogEntry {
  id: string;
  sol: number;
  missionId: MissionId | 'routine' | 'weather';
  kind?: 'decision' | 'weather' | 'shelter';
  severity?: 'info' | 'warning' | 'critical';
  title: string;
  choiceLabel: string;
  outcomeSummary: string;
  rippleNote?: string;
}

export interface AfterActionReview {
  whatYouKnew: string;
  whatYouChose: string;
  whatItCost: string;
  scienceWhy: string;
  betterAction: string;
  verdict: 'safe' | 'risky' | 'ineffective';
  goodProcessNote: string;
}

export interface MissionOutcomeRecord {
  missionId: MissionId;
  optionId: OptionId;
  passedObjective: boolean;
  wasBestProcess: boolean;
  immediateText: string;
  scienceCard: string;
  afterAction: AfterActionReview;
  rippleTriggered: string | null;
}

export interface RoutineLapseSummary {
  fromSol: number;
  toSol: number;
  solsElapsed: number;
  o2Delta: number;
  waterDelta: number;
  foodDelta: number;
  batteryDelta: number;
  radiationDelta: number;
  notes: string[];
}

export interface CampaignState {
  seed: number;
  callsign: string;
  roverName: string;
  sol: number;
  missionIndex: number; // 0..4 (for m1..m5)
  phase: 'active-mission' | 'mission-review' | 'routine-summary' | 'debrief' | 'free-roam';
  campaignFailedReason: string | null;

  // Resources [SIM] anchored to [REAL] baselines
  oxygenKg: number;
  waterKg: number;
  foodKg: number;
  batteryKwh: number;
  spareParts: number;
  emergencyWaterReserveKg: number;
  emergencyFoodReserveKg: number;
  emergencyO2CartridgeKg: number;
  crewSlotsRemaining: number;

  // Environmental & System states
  dustTau: number;
  dustFactor: number;
  panelsCleanedBonus: boolean;
  panelsDusty: boolean;
  tank2Isolated: boolean;
  tank2LeakActive: boolean;
  recyclerEfficiency: number;
  greenhouseFrost: boolean;
  greenhouseDisabled: boolean;
  greenhouseGrowthMult: number;
  roverDamaged: boolean;
  iceSiteFound: boolean;
  iceDrilledSuccess: boolean;
  iceObjectivePct: number;

  // Radiation [REAL/SIM]
  eventDoseMsv: number;
  careerDoseMsv: number;

  // Crew
  crew: CrewMemberState[];

  // Process / Decision Quality tracking
  inspectedDataThisMission: boolean;
  inspectedDataCount: number;
  mcAskedThisMission: boolean;
  mcReplyArrived: boolean;
  objectivesCompleted: Record<MissionId, boolean>;
  processPoints: number; // max 100 normalized later
  lastOutcome: MissionOutcomeRecord | null;
  lastRoutineSummary: RoutineLapseSummary | null;

  // Rover Instructor state
  roverHushed: boolean;
  roverLastLine: string;
  roverUsedLines: Record<string, number>;
  roverHintLevelUsed: Record<MissionId, number>; // 0, 1, or 2
  roverActiveHint: string | null;
  lastWarningFlags: {
    oxygen: boolean;
    water: boolean;
    food: boolean;
    battery: boolean;
  };

  // Ripple flags & Commander's Log
  ripples: {
    m1LeakUnsealed: boolean;
    m2GreenhouseShed: boolean;
    m2RoverSentInStorm: boolean;
    m2PanelsCleanedAfterStorm: boolean;
    m3EmergencyWaterUsed: boolean;
    m3IceFound: boolean;
    m4EmergencyFoodUsed: boolean;
    m5EvaDuringStorm: boolean;
  };
  log: LogEntry[];

  // Localized Mars weather events & Seek Shelter state
  activeWeatherEvent: LocalizedWeatherEvent | null;
  weatherEventsCount: number;
  weatherEventsSurvived: number;

  // Space weather snapshot used in M5
  donki: DonkiSpaceWeather;

  // Junior Explorer Mode (Ages 7-9) Tutorial, Quizzes, Mini-Activities, Badges & Journal
  juniorMode: boolean;
  grownUpScienceOpen: boolean;
  tutorialStep: TutorialStepId;
  choresVisited: Record<ChorePlaceId, boolean>;
  crystalsCollected: number;
  collectedCrystalIds: string[];
  tutorialQuizDone: boolean;
  missionQuizDone: Record<MissionId, boolean>;
  missionMiniActivityDone: Record<MissionId, boolean>;
  unlockedBadges: MissionId[];
  unlockedScienceCards: string[];
  debriefQuizDone: boolean;
}

export interface CampaignEvaluation {
  totalScore: number;
  status: 'SUCCESSFUL' | 'NEEDS IMPROVEMENT' | 'FAILED';
  statusReason: string;
  decisionQualityScore: number;
  outcomeLabel: string;
  breakdown: {
    crewSafety: number; // /35
    resourceEfficiency: number; // /20
    missionObjectives: number; // /15
    decisionQuality: number; // /20
    exploration: number; // /10
  };
  objectivesCount: number;
  allCrewAlive: boolean;
}

export function createInitialCampaignState(
  seed: number,
  callsign: string,
  rawRoverName: string,
  donki: DonkiSpaceWeather = ARCHIVED_DONKI_FALLBACK,
): CampaignState {
  const { name: roverName } = sanitizeRoverName(rawRoverName);
  const firstLine = pickNonRepeatingRoverLine('solStart', {}, false);

  return {
    seed,
    callsign: callsign.trim() || 'Commander Nova',
    roverName,
    sol: 1,
    missionIndex: 0,
    phase: 'active-mission',
    campaignFailedReason: null,

    oxygenKg: SIM_CONSTANTS.START_OXYGEN_KG,
    waterKg: SIM_CONSTANTS.START_WATER_KG,
    foodKg: SIM_CONSTANTS.START_FOOD_KG,
    batteryKwh: SIM_CONSTANTS.START_BATTERY_KWH,
    spareParts: SIM_CONSTANTS.START_SPARE_PARTS,
    emergencyWaterReserveKg: SIM_CONSTANTS.START_EMERGENCY_WATER_KG,
    emergencyFoodReserveKg: SIM_CONSTANTS.START_EMERGENCY_FOOD_KG,
    emergencyO2CartridgeKg: SIM_CONSTANTS.START_EMERGENCY_O2_KG,
    crewSlotsRemaining: SIM_CONSTANTS.CREW_SLOTS_PER_SOL,

    dustTau: 1.0,
    dustFactor: 1.0,
    panelsCleanedBonus: false,
    panelsDusty: false,
    tank2Isolated: false,
    tank2LeakActive: false,
    recyclerEfficiency: SIM_CONSTANTS.WATER_RECYCLER_NOMINAL,
    greenhouseFrost: false,
    greenhouseDisabled: false,
    greenhouseGrowthMult: 1.0,
    roverDamaged: false,
    iceSiteFound: false,
    iceDrilledSuccess: false,
    iceObjectivePct: 0,

    eventDoseMsv: 0,
    careerDoseMsv: SIM_CONSTANTS.START_CAREER_DOSE_MSV,

    crew: CREW_PROFILES.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      health: SIM_CONSTANTS.START_CREW_HEALTH,
      stress: SIM_CONSTANTS.START_CREW_STRESS,
      alive: true,
    })),

    inspectedDataThisMission: false,
    inspectedDataCount: 0,
    mcAskedThisMission: false,
    mcReplyArrived: false,
    objectivesCompleted: { m1: false, m2: false, m3: false, m4: false, m5: false },
    processPoints: 0,
    lastOutcome: null,
    lastRoutineSummary: null,

    roverHushed: false,
    roverLastLine:
      'Welcome to Mars, Commander! Walk around to take your first steps on the red planet!',
    roverUsedLines: firstLine.nextUsedIds,
    roverHintLevelUsed: { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0 },
    roverActiveHint: null,
    lastWarningFlags: { oxygen: false, water: false, food: false, battery: false },

    ripples: {
      m1LeakUnsealed: false,
      m2GreenhouseShed: false,
      m2RoverSentInStorm: false,
      m2PanelsCleanedAfterStorm: false,
      m3EmergencyWaterUsed: false,
      m3IceFound: false,
      m4EmergencyFoodUsed: false,
      m5EvaDuringStorm: false,
    },
    log: [],
    activeWeatherEvent: null,
    weatherEventsCount: 0,
    weatherEventsSurvived: 0,
    donki,

    juniorMode: true,
    grownUpScienceOpen: false,
    tutorialStep: 'take-control',
    choresVisited: {
      greenhouse: false,
      solar: false,
      habitat: false,
    },
    crystalsCollected: 0,
    collectedCrystalIds: [],
    tutorialQuizDone: false,
    missionQuizDone: { m1: false, m2: false, m3: false, m4: false, m5: false },
    missionMiniActivityDone: { m1: false, m2: false, m3: false, m4: false, m5: false },
    unlockedBadges: [],
    unlockedScienceCards: [],
    debriefQuizDone: false,
  };
}

export function getActiveMission(state: CampaignState): MissionDefinition {
  return MISSIONS[Math.min(state.missionIndex, MISSIONS.length - 1)];
}

export function computeRoverMood(state: CampaignState): RoverMood {
  const o2Stat = getResourceStatus('oxygen', state.oxygenKg);
  const wStat = getResourceStatus('water', state.waterKg);
  const fStat = getResourceStatus('food', state.foodKg);
  const bStat = getResourceStatus('battery', state.batteryKwh);

  if (
    o2Stat === 'CRITICAL' ||
    wStat === 'CRITICAL' ||
    fStat === 'CRITICAL' ||
    bStat === 'CRITICAL' ||
    state.eventDoseMsv > SIM_CONSTANTS.EVENT_RADIATION_WARN_MSV
  ) {
    return 'critical';
  }
  if (bStat === 'WARNING' || o2Stat === 'WARNING' || wStat === 'WARNING' || fStat === 'WARNING') {
    return 'lowPower';
  }
  return 'ok';
}

export function markDataInspected(state: CampaignState): CampaignState {
  if (state.inspectedDataThisMission) return state;
  return {
    ...state,
    inspectedDataThisMission: true,
    inspectedDataCount: state.inspectedDataCount + 1,
  };
}

export function markMissionControlAsked(state: CampaignState, arrived: boolean): CampaignState {
  return {
    ...state,
    mcAskedThisMission: true,
    mcReplyArrived: arrived || state.mcReplyArrived,
  };
}

export function useRoverHint(state: CampaignState, level: 1 | 2): CampaignState {
  const mission = getActiveMission(state);
  const already = state.roverHintLevelUsed[mission.id] ?? 0;

  if (level === 2 && already < 2 && state.crewSlotsRemaining < 1) {
    return {
      ...state,
      roverActiveHint: crackleRoverText(
        'No crew slots left this Sol for a deep scan — try my free Level 1 question or review the Data Panel!',
        state.roverDamaged,
      ),
    };
  }

  const hintBank = ROVER_HINTS[mission.id];
  const pool = level === 1 ? hintBank.l1 : hintBank.l2;
  const idx = state.seed % pool.length;
  const rawHint = pool[idx];
  const hintText = crackleRoverText(rawHint, state.roverDamaged);

  const deductSlot = level === 2 && already < 2 ? 1 : 0;

  return {
    ...state,
    crewSlotsRemaining: Math.max(0, state.crewSlotsRemaining - deductSlot),
    roverHintLevelUsed: {
      ...state.roverHintLevelUsed,
      [mission.id]: Math.max(already, level),
    },
    roverActiveHint: hintText,
    roverLastLine: hintText,
  };
}

export function toggleRoverHush(state: CampaignState): CampaignState {
  return {
    ...state,
    roverHushed: !state.roverHushed,
  };
}

function adjustCrew(
  crew: CrewMemberState[],
  targetIds: CrewMemberId[],
  healthDelta: number,
  stressDelta: number,
): CrewMemberState[] {
  return crew.map((member) => {
    if (!targetIds.includes(member.id)) return member;
    const health = Math.max(0, Math.min(100, Math.round(member.health + healthDelta)));
    const stress = Math.max(0, Math.min(100, Math.round(member.stress + stressDelta)));
    return {
      ...member,
      health,
      stress,
      alive: health > 0,
    };
  });
}

function checkWarningCrossings(
  prev: CampaignState,
  next: CampaignState,
): { crossed: boolean; flags: CampaignState['lastWarningFlags'] } {
  const oWarn = next.oxygenKg < SIM_CONSTANTS.THRESHOLDS.oxygen.warn;
  const wWarn = next.waterKg < SIM_CONSTANTS.THRESHOLDS.water.warn;
  const fWarn = next.foodKg < SIM_CONSTANTS.THRESHOLDS.food.warn;
  const bWarn = next.batteryKwh < SIM_CONSTANTS.THRESHOLDS.battery.warn;

  const crossed =
    (oWarn && !prev.lastWarningFlags.oxygen) ||
    (wWarn && !prev.lastWarningFlags.water) ||
    (fWarn && !prev.lastWarningFlags.food) ||
    (bWarn && !prev.lastWarningFlags.battery);

  return {
    crossed,
    flags: {
      oxygen: oWarn,
      water: wWarn,
      food: fWarn,
      battery: bWarn,
    },
  };
}

export function resolveMissionOption(state: CampaignState, optionId: OptionId): CampaignState {
  const mission = getActiveMission(state);
  const option = mission.options.find((o) => o.id === optionId) ?? mission.options[0];
  const rng = createSeededRng(state.seed + mission.index * 7919 + optionId.charCodeAt(0));

  let oxygenKg = state.oxygenKg;
  let waterKg = state.waterKg;
  let foodKg = state.foodKg;
  let batteryKwh = state.batteryKwh;
  let spareParts = state.spareParts;
  let emergencyWaterReserveKg = state.emergencyWaterReserveKg;
  let emergencyFoodReserveKg = state.emergencyFoodReserveKg;
  let crew = [...state.crew];
  const ripples = { ...state.ripples };

  let tank2Isolated = state.tank2Isolated;
  let tank2LeakActive = state.tank2LeakActive;
  let recyclerEfficiency = state.recyclerEfficiency;
  let greenhouseFrost = state.greenhouseFrost;
  let greenhouseDisabled = state.greenhouseDisabled;
  let greenhouseGrowthMult = state.greenhouseGrowthMult;
  let roverDamaged = state.roverDamaged;
  let iceSiteFound = state.iceSiteFound;
  let iceDrilledSuccess = state.iceDrilledSuccess;
  let iceObjectivePct = state.iceObjectivePct;
  let eventDoseMsv = state.eventDoseMsv;
  let careerDoseMsv = state.careerDoseMsv;
  let dustTau = state.dustTau;
  let dustFactor = state.dustFactor;
  let panelsDusty = state.panelsDusty;

  let immediateText = '';
  let rippleTriggered: string | null = null;
  let verdict: 'safe' | 'risky' | 'ineffective' = 'safe';
  let passedObjective = false;

  const slotsSpent = Math.min(state.crewSlotsRemaining, option.crewSlotsCost);

  // Evaluate per mission with deterministic seeded rolls
  if (mission.id === 'm1') {
    if (optionId === 'A') {
      batteryKwh -= 5;
      tank2Isolated = true;
      const partial = rng.chance(0.2);
      crew = adjustCrew(crew, ['kenji'], 0, 5);
      if (!partial) {
        tank2LeakActive = false;
        oxygenKg -= 1.2;
        immediateText =
          'Kenji seals Tank 2 cleanly. Pressure stabilizes immediately; ~18 kg stays locked inside Tank 2 until an engineering window.';
        verdict = 'safe';
      } else {
        oxygenKg -= 4.5;
        tank2LeakActive = false;
        immediateText =
          'Kenji isolates Tank 2, though a stubborn gasket hisses briefly before sealing (4.5 kg lost). Kenji’s stress ticks up +5.';
        verdict = 'safe';
      }
      passedObjective = oxygenKg >= 40;
    } else if (optionId === 'B') {
      oxygenKg -= 6.5;
      crew = adjustCrew(crew, ['amara', 'kenji', 'lucia', 'rafi'], 0, 10);
      ripples.m1LeakUnsealed = true;
      immediateText =
        'Amara moves everyone safely into the backup compartment while ~6.5 kg O₂ escapes. Stress rises +10, and Tank 2 still needs sealing.';
      rippleTriggered = 'Tank 2 stayed unsealed — oxygen starts Sol 34 lower.';
      verdict = 'risky';
      passedObjective = false;
    } else if (optionId === 'C') {
      batteryKwh = Math.min(SIM_CONSTANTS.BATTERY_CAPACITY_KWH, batteryKwh + 12);
      oxygenKg -= 4.0;
      ripples.m1LeakUnsealed = true;
      immediateText =
        'Rafi pauses science instruments and slows activity, saving 12 kWh and 0.3 kg O₂ — but ~4 kg/sol still leaks from Tank 2.';
      rippleTriggered = 'Leak continued across routine sols — lower O₂ reserve later.';
      verdict = 'ineffective';
      passedObjective = false;
    } else {
      const leakWorsens = rng.chance(0.45);
      const lowAir = rng.chance(0.2);
      ripples.m1LeakUnsealed = true;
      oxygenKg -= leakWorsens ? 15 : 8;
      if (lowAir) {
        crew = adjustCrew(crew, ['amara', 'kenji', 'lucia', 'rafi'], -15, 14);
        immediateText =
          'Ignoring the valve lets Tank 2 lose air and low cabin pressure gives the crew headaches and dizziness (−15 Health)!';
      } else {
        crew = adjustCrew(crew, ['amara', 'kenji', 'lucia', 'rafi'], -4, 10);
        immediateText =
          'Leaving Tank 2 open bleeds precious oxygen into the Martian dust (−8 to −15 kg O₂).';
      }
      rippleTriggered = 'Unchecked O₂ leak carries into Sol 34.';
      verdict = 'ineffective';
      passedObjective = false;
    }
  } else if (mission.id === 'm2') {
    dustTau = 3.1;
    dustFactor = dustFactorFromTau(dustTau); // 0.28
    panelsDusty = true;

    if (optionId === 'A') {
      batteryKwh -= 115; // severe deficit over storm peak
      crew = adjustCrew(crew, ['rafi'], 0, 6);
      immediateText =
        'All habitat systems stay bright through the darkening sky, draining 115 kWh from the battery bank by storm peak.';
      verdict = 'risky';
      passedObjective = batteryKwh >= 40;
    } else if (optionId === 'B') {
      batteryKwh -= 35; // load shed saves 45 kWh/sol
      ripples.m2GreenhouseShed = true;
      greenhouseGrowthMult = 0.7;
      immediateText =
        'Rafi and Lucía shed non-essential science and dim greenhouse lights, saving 45 kWh/sol. Life support and O₂ scrubbing hold strong!';
      rippleTriggered = 'Greenhouse growth reduced −30% until next harvest.';
      verdict = 'safe';
      passedObjective = batteryKwh >= 40;
    } else if (optionId === 'C') {
      batteryKwh -= 65;
      ripples.m2RoverSentInStorm = true;
      const gotDamaged = rng.chance(0.25);
      if (gotDamaged) {
        roverDamaged = true;
        crew = adjustCrew(crew, ['kenji'], 0, 12);
        immediateText =
          `${state.roverName}: "I am brave! Beep." ... "Oh no, my wheels are stuck! Please wait for me." Brushing panels in swirling dust yields only +5% power.`;
        rippleTriggered = `${state.roverName} got stuck in the storm drift (slower in M3–M5).`;
      } else {
        immediateText =
          `${state.roverName}: "I am brave! Beep." ${state.roverName} battles gusting red dust to wipe the arrays (+5% power during storm), draining 20 kWh while airborne dust quickly re-coats them.`;
      }
      verdict = 'ineffective';
      passedObjective = batteryKwh >= 40;
    } else {
      batteryKwh = Math.max(0, batteryKwh - 175);
      crew = adjustCrew(crew, ['amara', 'kenji', 'lucia', 'rafi'], -12, 20);
      immediateText =
        'Keeping every lab and heater running during tau > 3.0 empties the batteries into emergency blackout! Life support flickers (+20 Stress, −12 Health).';
      rippleTriggered = 'Blackout stress and battery recovery drain future Sols.';
      verdict = 'ineffective';
      passedObjective = false;
    }
  } else if (mission.id === 'm3') {
    if (optionId === 'A') {
      batteryKwh -= 15;
      if (spareParts > 0) {
        spareParts -= 1;
        const glitch = rng.chance(0.25);
        if (!glitch) {
          recyclerEfficiency = SIM_CONSTANTS.WATER_RECYCLER_NOMINAL;
          immediateText =
            'Kenji and Rafi swap in a Spare-Part Kit. Water recovery surges back to 85%—saving ~10 kg/sol!';
        } else {
          recyclerEfficiency = SIM_CONSTANTS.WATER_RECYCLER_NOMINAL;
          waterKg -= 8;
          immediateText =
            'The filter housing sticks briefly (−8 kg purge loss), but Kenji & Rafi bring recovery back to 85%.';
        }
        verdict = 'safe';
        passedObjective = waterKg >= 90;
      } else {
        waterKg -= 10;
        immediateText =
          'Zero Spare-Part Kits remain! Kenji improvises a temporary screen flush, leaving recovery struggling at 40%.';
        verdict = 'ineffective';
        passedObjective = false;
      }
    } else if (optionId === 'B') {
      waterKg += 8; // net conservation over 2 sols
      greenhouseGrowthMult *= 0.85;
      crew = adjustCrew(crew, ['amara', 'kenji', 'lucia', 'rafi'], 0, 8);
      immediateText =
        'Amara institutes strict hygiene water limits, stretching tanks while raising crew stress (+8) and slowing greenhouse misting (−15%).';
      verdict = 'risky';
      passedObjective = waterKg >= 90;
    } else if (optionId === 'C') {
      batteryKwh -= 30;
      const found = rng.chance(roverDamaged ? 0.45 : 0.6);
      if (found) {
        iceSiteFound = true;
        ripples.m3IceFound = true;
        waterKg += 40; // initial test melt yield
        batteryKwh -= 15;
        immediateText =
          `Lucía and ${state.roverName} locate possible ice 4 km away using SWIM radar! Initial test melt nets +40 kg and boosts Mission 5 drilling odds to 70%.`;
        rippleTriggered = 'SWIM buried possible ice seam mapped (+70% drilling success in M5).';
        verdict = 'safe';
        passedObjective = true;
      } else {
        immediateText =
          `${state.roverName} trenches the target ridge, but hits hard bedrock above the possible ice layer. No water gained today (30 kWh spent).`;
        verdict = 'risky';
        passedObjective = false;
      }
    } else {
      if (emergencyWaterReserveKg >= 60) {
        waterKg += 60;
        emergencyWaterReserveKg = 0;
        ripples.m3EmergencyWaterUsed = true;
        immediateText =
          'You empty the 60 kg emergency bladder into the main tanks. Crisis eased today—but zero emergency water safety net remains.';
        rippleTriggered = 'Emergency Water Reserve = 0 kg for the rest of the mission.';
        verdict = 'risky';
        passedObjective = waterKg >= 90;
      } else {
        immediateText = 'Emergency water bladder is already empty!';
        verdict = 'ineffective';
        passedObjective = false;
      }
    }
  } else if (mission.id === 'm4') {
    if (optionId === 'A') {
      batteryKwh -= 10;
      if (spareParts > 0) {
        spareParts -= 1;
        const ok = !rng.chance(0.25);
        greenhouseFrost = false;
        greenhouseDisabled = false;
        if (ok) {
          foodKg += 6;
          immediateText =
            'Rafi and Kenji install the Spare-Part thermostat kit. Warm yellow grow lights glow back across the Bio-Dome, saving the crop!';
        } else {
          foodKg += 2;
          immediateText =
            'Thermostat wiring takes extra calibration (−4 kg frost trim), yet the dome warms back up and future harvests survive.';
        }
        verdict = 'safe';
        passedObjective = foodKg >= 35;
      } else {
        greenhouseFrost = true;
        crew = adjustCrew(crew, ['rafi'], 0, 8);
        immediateText =
          'No Spare-Part Kits left! Frost damages the outer leaf racks while Rafi scrambles to insulate the pipes.';
        verdict = 'ineffective';
        passedObjective = false;
      }
    } else if (optionId === 'B') {
      batteryKwh = Math.max(0, batteryKwh - 70);
      greenhouseFrost = false;
      immediateText =
        'Electric heaters hold −63 °C Mars cold at bay for 2 sols—at a massive 70 kWh battery cost.';
      verdict = 'risky';
      passedObjective = foodKg >= 35 && batteryKwh >= 30;
    } else if (optionId === 'C') {
      const used = Math.min(12, emergencyFoodReserveKg);
      emergencyFoodReserveKg -= used;
      foodKg += used;
      greenhouseFrost = true;
      ripples.m4EmergencyFoodUsed = true;
      immediateText =
        `You open ${used} kg of emergency food rations so crew nutrition stays strong while the frosted crops are replanted.`;
      rippleTriggered = 'Emergency Food Reserve reduced for Sol 88.';
      verdict = 'risky';
      passedObjective = foodKg >= 35;
    } else {
      batteryKwh = Math.min(SIM_CONSTANTS.BATTERY_CAPACITY_KWH, batteryKwh + 30);
      greenhouseDisabled = true;
      greenhouseFrost = true;
      crew = adjustCrew(crew, ['amara', 'kenji', 'lucia', 'rafi'], 0, 10);
      immediateText =
        'Sealing the Bio-Dome saves 30 kWh, but losing fresh greens drops morale (+10 Stress) and removes crop harvests.';
      verdict = 'ineffective';
      passedObjective = false;
    }
  } else {
    // M5 — Radiation Alert & Final Ice Drilling (Sol 88)
    const drillChance = iceSiteFound ? (roverDamaged ? 0.55 : 0.7) : roverDamaged ? 0.3 : 0.4;
    const drillOk = rng.chance(drillChance);

    if (optionId === 'A') {
      batteryKwh -= 15;
      eventDoseMsv += 15;
      careerDoseMsv += 15;
      crew = adjustCrew(crew, ['amara', 'kenji', 'lucia', 'rafi'], 0, 5);
      iceDrilledSuccess = drillOk;
      iceObjectivePct = drillOk ? 100 : 55;
      immediateText = `All four astronauts shelter behind thick blue water-wall tanks. ${state.roverName} drills remotely after the storm peak: ${
        drillOk ? 'frozen ice core recovered!' : 'partial frozen sample recovered!'
      }`;
      verdict = 'safe';
      passedObjective = eventDoseMsv < 250 && iceObjectivePct >= 50;
    } else if (optionId === 'B') {
      batteryKwh -= 5;
      eventDoseMsv += 60;
      careerDoseMsv += 60;
      const glitch = rng.chance(0.2);
      iceDrilledSuccess = !glitch && drillOk;
      iceObjectivePct = iceDrilledSuccess ? 100 : 50;
      immediateText = `Crew stays inside normal Habitat quarters while ${state.roverName} drives out remotely. ${
        glitch ? 'Storm static stalls the drill halfway (50% core).' : 'Sample core stowed!'
      }`;
      verdict = state.donki.isSevereStorm ? 'risky' : 'safe';
      passedObjective = eventDoseMsv < 250 && iceObjectivePct >= 50;
    } else if (optionId === 'C') {
      batteryKwh -= 5;
      eventDoseMsv += 30;
      careerDoseMsv += 30;
      iceDrilledSuccess = drillOk;
      iceObjectivePct = drillOk ? 90 : 50;
      immediateText = `Rafi and Amara stack potable water bladders around sleeping quarters, then ${state.roverName} completes the delayed ice run!`;
      verdict = 'safe';
      passedObjective = eventDoseMsv < 250 && iceObjectivePct >= 50;
    } else {
      eventDoseMsv += 180;
      careerDoseMsv += 180;
      ripples.m5EvaDuringStorm = true;
      // Bible M5.5: "Everyone is okay. But we took more radiation than we needed. Next time, let's be careful." (No injury, no fear.)
      crew = adjustCrew(crew, ['lucia', 'kenji'], 0, 8);
      iceDrilledSuccess = true;
      iceObjectivePct = 100;
      immediateText =
        "Everyone is okay. But we took more radiation than we needed. Next time, let's be careful.";
      rippleTriggered = 'Higher radiation exposure recorded on debrief.';
      verdict = 'risky';
      passedObjective = true;
    }
  }

  // Clamp resources >= 0
  oxygenKg = Math.max(0, Number(oxygenKg.toFixed(1)));
  waterKg = Math.max(0, Number(waterKg.toFixed(1)));
  foodKg = Math.max(0, Number(foodKg.toFixed(1)));
  batteryKwh = Math.max(0, Math.min(SIM_CONSTANTS.BATTERY_CAPACITY_KWH, Math.round(batteryKwh)));

  // Process points (Decision Quality: looked at data, protected crew / fixed cause)
  const bestInfo = mission.getBestOption(state.donki);
  const isBest = optionId === bestInfo.bestId;
  const lookPts = state.inspectedDataThisMission ? 8 : 2;
  const choicePts = isBest ? 12 : verdict === 'risky' ? 7 : 1;
  const processGain = lookPts + choicePts; // 20 max per mission -> 100 over 5 missions

  const o2Diff = Number((oxygenKg - state.oxygenKg).toFixed(1));
  const wDiff = Number((waterKg - state.waterKg).toFixed(1));
  const fDiff = Number((foodKg - state.foodKg).toFixed(1));
  const bDiff = Math.round(batteryKwh - state.batteryKwh);

  const costParts: string[] = [];
  if (o2Diff !== 0) costParts.push(`${o2Diff > 0 ? '+' : ''}${o2Diff} kg O₂`);
  if (wDiff !== 0) costParts.push(`${wDiff > 0 ? '+' : ''}${wDiff} kg H₂O`);
  if (fDiff !== 0) costParts.push(`${fDiff > 0 ? '+' : ''}${fDiff} kg Food`);
  if (bDiff !== 0) costParts.push(`${bDiff > 0 ? '+' : ''}${bDiff} kWh`);
  if (slotsSpent > 0) costParts.push(`${slotsSpent} Crew Slots`);
  if (costParts.length === 0) costParts.push('0 immediate consumables (carried risk forward)');

  const goodProcessNote =
    isBest && !passedObjective
      ? 'Strong decision process — even when Martian luck fought back, fixing the cause was the right call.'
      : !isBest && passedObjective
        ? 'You made it through this Sol, though a safer or longer-lasting engineering option existed.'
        : isBest
          ? 'Great commander process: you checked the numbers, protected your crew, and addressed the root cause.'
          : 'Notice how every shortcut creates a steeper price on future Sols.';

  const afterAction: AfterActionReview = {
    whatYouKnew: option.whatYouKnewNote,
    whatYouChose: `${option.id}: ${option.label}`,
    whatItCost: costParts.join(' · '),
    scienceWhy: `That choice was ${verdict} because ${option.scienceCard}`,
    betterAction: bestInfo.reason,
    verdict,
    goodProcessNote,
  };

  const nextLogEntry: LogEntry = {
    id: `${mission.id}-${state.sol}`,
    sol: state.sol,
    missionId: mission.id,
    title: `${mission.title} (Sol ${mission.missionSol})`,
    choiceLabel: `${option.id}: ${option.label}`,
    outcomeSummary: immediateText,
    rippleNote: rippleTriggered ?? undefined,
  };

  let nextState: CampaignState = {
    ...state,
    oxygenKg,
    waterKg,
    foodKg,
    batteryKwh,
    spareParts,
    emergencyWaterReserveKg,
    emergencyFoodReserveKg,
    crewSlotsRemaining: Math.max(0, state.crewSlotsRemaining - slotsSpent),
    crew,
    ripples,
    tank2Isolated,
    tank2LeakActive,
    recyclerEfficiency,
    greenhouseFrost,
    greenhouseDisabled,
    greenhouseGrowthMult,
    roverDamaged,
    iceSiteFound,
    iceDrilledSuccess,
    iceObjectivePct,
    eventDoseMsv,
    careerDoseMsv,
    dustTau,
    dustFactor,
    panelsDusty,
    objectivesCompleted: {
      ...state.objectivesCompleted,
      [mission.id]: passedObjective,
    },
    unlockedBadges: state.unlockedBadges.includes(mission.id)
      ? state.unlockedBadges
      : [...state.unlockedBadges, mission.id],
    unlockedScienceCards: state.unlockedScienceCards.includes(JUNIOR_MISSIONS[mission.id].scienceCardId)
      ? state.unlockedScienceCards
      : [...state.unlockedScienceCards, JUNIOR_MISSIONS[mission.id].scienceCardId],
    processPoints: state.processPoints + processGain,
    lastOutcome: {
      missionId: mission.id,
      optionId,
      passedObjective,
      wasBestProcess: isBest,
      immediateText,
      scienceCard: option.scienceCard,
      afterAction,
      rippleTriggered,
    },
    log: [nextLogEntry, ...state.log],
    phase: 'mission-review',
  };

  // Check warning crossings & Rover trigger line
  const { crossed, flags } = checkWarningCrossings(state, nextState);
  const trigger = crossed ? 'resourceWarning' : 'missionEnd';
  const linePick = pickNonRepeatingRoverLine(trigger, state.roverUsedLines, roverDamaged);

  nextState = {
    ...nextState,
    lastWarningFlags: flags,
    roverLastLine: linePick.line,
    roverUsedLines: linePick.nextUsedIds,
    roverActiveHint: null,
  };

  // Immediate failure checks
  const deadCrew = nextState.crew.filter((c) => !c.alive).length;
  const criticalLowCrew = nextState.crew.filter((c) => c.health < 30).length;
  if (deadCrew > 0 || criticalLowCrew >= 2) {
    nextState.campaignFailedReason = 'Crew safety fell below life-support minimum.';
  } else if (nextState.oxygenKg <= 0) {
    nextState.campaignFailedReason = 'Oxygen tanks reached 0 kg.';
  } else if (nextState.waterKg <= 0) {
    nextState.campaignFailedReason = 'Water tanks reached 0 kg.';
  } else if (nextState.foodKg <= 0) {
    nextState.campaignFailedReason = 'Food stores reached 0 kg.';
  } else if (nextState.eventDoseMsv >= SIM_CONSTANTS.EVENT_RADIATION_LIMIT_MSV) {
    nextState.campaignFailedReason = 'Solar event radiation exceeded 250 mSv event limit.';
  }

  return nextState;
}

/**
 * Post-storm follow-up discovery (§4.3 & §5 M2):
 * After dust settles, cleaning panels boosts solar output by +25% for the rest of the campaign!
 */
export function applyPostStormPanelCleaning(state: CampaignState): CampaignState {
  if (state.panelsCleanedBonus || state.missionIndex !== 1) return state;
  const batteryGain = 35;
  return {
    ...state,
    panelsCleanedBonus: true,
    panelsDusty: false,
    dustTau: 1.0,
    dustFactor: 1.0,
    batteryKwh: Math.min(SIM_CONSTANTS.BATTERY_CAPACITY_KWH, state.batteryKwh + batteryGain),
    ripples: {
      ...state.ripples,
      m2PanelsCleanedAfterStorm: true,
    },
    log: [
      {
        id: `clean-panels-${state.sol}`,
        sol: state.sol,
        missionId: 'm2',
        title: 'Post-Storm Panel Cleaning',
        choiceLabel: 'Sweep settled Martian dust off solar arrays',
        outcomeSummary: `With airborne haze clearing, brushing settled dust boosts array output +25% (+${batteryGain} kWh recovered).`,
        rippleNote: 'Solar arrays deliver +25% efficiency for Sols 35–88.',
      },
      ...state.log,
    ],
    roverLastLine: crackleRoverText(
      'Smart timing! Sweeping panels AFTER the storm clears boosts solar power +25% for the rest of our stay.',
      state.roverDamaged,
    ),
  };
}

export function computeTurbineDailyKwh(state: CampaignState): number {
  if (state.dustTau > 2.2) return SIM_CONSTANTS.WIND_TURBINE_STORM_KWH;
  if (state.dustTau > 1.3) return Math.round((SIM_CONSTANTS.WIND_TURBINE_NOMINAL_KWH + SIM_CONSTANTS.WIND_TURBINE_STORM_KWH) * 0.5);
  return SIM_CONSTANTS.WIND_TURBINE_NOMINAL_KWH;
}

/**
 * Advances Routine Operations sols between Critical Sols (13, 18, 15, 21 sols)
 * so students experience continuous daily crew consumption + ripple consequences.
 */
export function advanceRoutineSols(state: CampaignState): CampaignState {
  // If already failed or finished Mission 5, go straight to Debrief
  if (state.campaignFailedReason || state.missionIndex >= MISSIONS.length - 1) {
    return {
      ...state,
      phase: 'debrief',
    };
  }

  const nextMission = MISSIONS[state.missionIndex + 1];
  const solsElapsed = nextMission.gapBeforeSols;
  const notes: string[] = [];

  // Daily net flows per sol
  const o2DailyNet =
    SIM_CONSTANTS.ISRU_O2_PRODUCTION_PER_SOL -
    SIM_CONSTANTS.O2_CREW_USE_PER_SOL -
    (state.tank2LeakActive ? 0.6 : 0); // -0.36 normal, -0.96 if leak active

  const waterDailyNet = -(
    SIM_CONSTANTS.WATER_GROSS_USE_PER_SOL *
    (1 - state.recyclerEfficiency)
  ); // -2.025 nominal, steeper if degraded

  const greenhouseDaily = state.greenhouseDisabled
    ? 0
    : SIM_CONSTANTS.GREENHOUSE_FOOD_PER_SOL * state.greenhouseGrowthMult;
  const foodDailyNet = greenhouseDaily - SIM_CONSTANTS.FOOD_CREW_USE_PER_SOL;

  // Storm clearing during transition out of M2
  let dustTau = state.dustTau;
  let dustFactor = state.dustFactor;
  let panelsDusty = state.panelsDusty;
  if (state.missionIndex === 1) {
    dustTau = 1.1;
    dustFactor = state.panelsCleanedBonus ? 1.15 : 0.88; // [REAL S10] ~21-sol dust lag unless cleaned
    if (!state.panelsCleanedBonus) {
      notes.push('Settled dust from the storm still dims solar panels slightly (−12% [SIM]).');
    } else {
      notes.push('Freshly cleaned solar panels deliver +25% bonus output!');
    }
    panelsDusty = !state.panelsCleanedBonus;
  }

  const windGenKwh = computeTurbineDailyKwh(state);
  const clearGen = SIM_CONSTANTS.POWER_CLEAR_GEN_KWH * dustFactor + windGenKwh;
  const powerDailyNet = clearGen - SIM_CONSTANTS.POWER_DEMAND_TOTAL_KWH;
  notes.push(
    `Ridge Wind Turbines generated +${windGenKwh} kWh/sol in Mars's thin 0.02 kg/m³ CO₂ wind [SIM].`,
  );

  let o2Delta = Number((o2DailyNet * solsElapsed).toFixed(1));
  let waterDelta = Number((waterDailyNet * solsElapsed).toFixed(1));
  let foodDelta = Number((foodDailyNet * solsElapsed).toFixed(1));
  // Compressed harvest bonus every ~20 sols if greenhouse active
  if (!state.greenhouseDisabled && solsElapsed >= 15) {
    const harvest = Math.round(SIM_CONSTANTS.GREENHOUSE_HARVEST_KG * state.greenhouseGrowthMult);
    foodDelta = Number((foodDelta + harvest).toFixed(1));
    notes.push(`Bio-Dome harvested +${harvest} kg of fresh crops during routine operations.`);
  }

  const batteryDelta = Math.round(powerDailyNet * Math.min(solsElapsed, 3));
  const radiationDaily =
    SIM_CONSTANTS.SURFACE_GCR_MSV_PER_DAY * SIM_CONSTANTS.HABITAT_SHIELDING_FACTOR;
  const radiationDelta = Number((radiationDaily * solsElapsed).toFixed(1));

  const nextO2 = Math.max(0, Number((state.oxygenKg + o2Delta).toFixed(1)));
  const nextWater = Math.max(0, Number((state.waterKg + waterDelta).toFixed(1)));
  const nextFood = Math.max(0, Number((state.foodKg + foodDelta).toFixed(1)));
  const nextBattery = Math.max(
    15,
    Math.min(SIM_CONSTANTS.BATTERY_CAPACITY_KWH, state.batteryKwh + batteryDelta),
  );
  const nextCareerDose = Number((state.careerDoseMsv + radiationDelta).toFixed(1));

  if (state.ripples.m1LeakUnsealed) {
    notes.push('Unsealed Tank 2 leak bled extra oxygen across routine Sols.');
  }
  notes.push(
    `Background GCR added +${radiationDelta} mSv to Career Dose over ${solsElapsed} sols [REAL 0.67 mSv/day × 0.5 shelter].`,
  );

  const summary: RoutineLapseSummary = {
    fromSol: state.sol,
    toSol: nextMission.missionSol,
    solsElapsed,
    o2Delta,
    waterDelta,
    foodDelta,
    batteryDelta: nextBattery - state.batteryKwh,
    radiationDelta,
    notes,
  };

  return {
    ...state,
    sol: nextMission.missionSol,
    oxygenKg: nextO2,
    waterKg: nextWater,
    foodKg: nextFood,
    batteryKwh: nextBattery,
    careerDoseMsv: nextCareerDose,
    dustTau,
    dustFactor,
    panelsDusty,
    greenhouseFrost: nextMission.id === 'm4', // M4 opens with greenhouse frost!
    phase: 'routine-summary',
    lastRoutineSummary: summary,
    activeWeatherEvent: null,
  };
}

export function proceedToNextCriticalSol(state: CampaignState): CampaignState {
  if (state.missionIndex >= MISSIONS.length - 1) {
    return { ...state, phase: 'debrief', activeWeatherEvent: null };
  }
  const nextIndex = state.missionIndex + 1;
  const nextMission = MISSIONS[nextIndex];
  const linePick = pickNonRepeatingRoverLine(
    'eventArrival',
    state.roverUsedLines,
    state.roverDamaged,
  );

  // Trigger M2 initial darkening when M2 starts
  const dustTau = nextMission.id === 'm2' ? 2.1 : state.dustTau;
  const dustFactor = nextMission.id === 'm2' ? dustFactorFromTau(2.1) : state.dustFactor;

  return {
    ...state,
    missionIndex: nextIndex,
    sol: nextMission.missionSol,
    phase: 'active-mission',
    crewSlotsRemaining: SIM_CONSTANTS.CREW_SLOTS_PER_SOL,
    inspectedDataThisMission: false,
    mcAskedThisMission: false,
    mcReplyArrived: false,
    lastOutcome: null,
    lastRoutineSummary: null,
    activeWeatherEvent: null,
    dustTau,
    dustFactor,
    greenhouseFrost: nextMission.id === 'm4',
    roverActiveHint: null,
    roverLastLine: linePick.line,
    roverUsedLines: linePick.nextUsedIds,
  };
}

/**
 * Reviewer shortcut (SOL_COMMANDER_STORY_BIBLE Section 8):
 * Directly jumps to Mission 1 (Sol 21) or Mission 5 (Sol 88) for judges and reviewers.
 */
export function jumpToMission(state: CampaignState, targetIndex: number): CampaignState {
  const safeIdx = Math.max(0, Math.min(MISSIONS.length - 1, targetIndex));
  const targetMission = MISSIONS[safeIdx];
  const dustTau = targetMission.id === 'm2' ? 2.1 : targetMission.id === 'm5' ? 2.8 : 0.8;
  return {
    ...state,
    missionIndex: safeIdx,
    sol: targetMission.missionSol,
    phase: 'active-mission',
    tutorialStep: 'complete',
    crewSlotsRemaining: SIM_CONSTANTS.CREW_SLOTS_PER_SOL,
    inspectedDataThisMission: false,
    mcAskedThisMission: false,
    mcReplyArrived: false,
    lastOutcome: null,
    lastRoutineSummary: null,
    activeWeatherEvent: null,
    dustTau,
    dustFactor: dustFactorFromTau(dustTau),
    tank2LeakActive: safeIdx === 0 && !state.tank2Isolated ? true : state.tank2LeakActive,
    greenhouseFrost: targetMission.id === 'm4',
    roverActiveHint: null,
  };
}

const WEATHER_EVENT_TEMPLATES: Record<
  WeatherEventKind,
  {
    title: string;
    windRange: [number, number];
    dropRange: [number, number];
    durationSeconds: number;
    scienceNote: string;
  }
> = {
  'dust-devil': {
    title: 'Mars Dust Devil',
    windRange: [24, 34],
    dropRange: [4, 9],
    durationSeconds: 25,
    scienceNote:
      '[REAL] Dust devils spin across sunny Mars craters—thin air pushes less than Earth, but sharp dust can jam spacesuit seals!',
  },
  'katabatic-gust': {
    title: 'Crater Wind Gust',
    windRange: [22, 31],
    dropRange: [3, 6],
    durationSeconds: 25,
    scienceNote:
      '[REAL] Cold air rushing down Mars crater slopes creates sudden gusts that kick up rusty red dust.',
  },
  'electrostatic-squall': {
    title: 'Martian Dust Storm',
    windRange: [26, 36],
    dropRange: [5, 11],
    durationSeconds: 25,
    scienceNote:
      '[REAL] Swishing Mars dust grains build static electricity that causes radio crackle and sticks to visors.',
  },
};

export function triggerLocalizedWeatherEvent(
  state: CampaignState,
  kindOverride?: WeatherEventKind,
): CampaignState {
  if (state.phase !== 'active-mission' || state.activeWeatherEvent) {
    return state;
  }

  const rng = createSeededRng(state.seed + state.sol * 101 + state.weatherEventsCount * 37);
  const pickInt = (min: number, max: number) => Math.floor(rng.range(min, max + 1));
  const kinds: WeatherEventKind[] = ['dust-devil', 'katabatic-gust', 'electrostatic-squall'];
  const kind = kindOverride ?? kinds[pickInt(0, kinds.length - 1)];
  const template = WEATHER_EVENT_TEMPLATES[kind];

  const windSpeedMs = pickInt(template.windRange[0], template.windRange[1]);
  const pressureDropPa = pickInt(template.dropRange[0], template.dropRange[1]);

  // Spawn vortex in the outpost yard away from inside the habitat itself
  const spawnAngles = [-2.2, -1.35, 0.85, 2.35];
  const angle = spawnAngles[pickInt(0, spawnAngles.length - 1)];
  const dist = pickInt(6, 12);
  const worldPos = {
    x: Number((3.5 + Math.cos(angle) * dist).toFixed(2)),
    z: Number((0.8 + Math.sin(angle) * dist).toFixed(2)),
  };

  const eventId = `wx-sol${state.sol}-${state.weatherEventsCount + 1}`;
  const rumbleIntensity = Number(
    Math.min(1, 0.58 + (windSpeedMs - 20) / 28 + pressureDropPa / 28).toFixed(2),
  );
  const gustIntervalSeconds =
    kind === 'electrostatic-squall' ? 3.2 : kind === 'dust-devil' ? 3.6 : 4.2;

  const weatherEvent: LocalizedWeatherEvent = {
    id: eventId,
    kind,
    title: template.title,
    windSpeedMs,
    lastGustWindMs: windSpeedMs,
    pressureDropPa,
    rumbleIntensity,
    gustIntervalSeconds,
    gustCount: 0,
    durationSeconds: template.durationSeconds,
    worldPos,
    scienceNote: template.scienceNote,
    shelterInstruction:
      'Hold [Shift] to lope back to the Mars Habitat 01 Airlock (green beacon) before time runs out!',
    triggeredAtSol: state.sol,
  };

  const logEntry: LogEntry = {
    id: eventId,
    sol: state.sol,
    missionId: 'weather',
    kind: 'weather',
    severity: 'critical',
    title: `Weather Alert · ${template.title}`,
    choiceLabel: `${windSpeedMs} m/s Gust · ${template.durationSeconds}s`,
    outcomeSummary: `${weatherEvent.shelterInstruction} ${template.scienceNote}`,
  };

  const roverLine = crackleRoverText(
    `Watch out, ${state.callsign}! ${windSpeedMs} m/s ${template.title.toLowerCase()} incoming—follow the green light back to Habitat 01!`,
    state.roverDamaged,
  );

  return {
    ...state,
    activeWeatherEvent: weatherEvent,
    weatherEventsCount: state.weatherEventsCount + 1,
    roverLastLine: roverLine,
    log: [logEntry, ...state.log],
  };
}

export function triggerWeatherGustPulse(state: CampaignState): {
  nextState: CampaignState;
  gustStrength: number;
  gustWindMs: number;
} {
  const active = state.activeWeatherEvent;
  if (!active || state.phase !== 'active-mission') {
    return { nextState: state, gustStrength: 0, gustWindMs: 0 };
  }

  const rng = createSeededRng(
    state.seed + state.sol * 131 + state.weatherEventsCount * 19 + active.gustCount * 53,
  );
  const surge = Math.floor(rng.range(3, 11));
  const gustWindMs = Math.min(44, active.windSpeedMs + surge);
  const gustStrength = Number(
    Math.min(1, Math.max(0.55, 0.55 + surge / 14)).toFixed(2),
  );

  return {
    nextState: {
      ...state,
      activeWeatherEvent: {
        ...active,
        gustCount: active.gustCount + 1,
        lastGustWindMs: gustWindMs,
      },
    },
    gustStrength,
    gustWindMs,
  };
}

export function resolveWeatherEventShelter(
  state: CampaignState,
  outcome: 'sheltered' | 'exposed',
): CampaignState {
  const active = state.activeWeatherEvent;
  if (!active) return state;

  if (outcome === 'sheltered') {
    const nextCrew = state.crew.map((m) => ({
      ...m,
      stress: Math.max(0, m.stress - 2),
    }));
    const nextProcessPoints = Math.min(100, state.processPoints + 4);
    const shelterEntry: LogEntry = {
      id: `${active.id}-safe`,
      sol: state.sol,
      missionId: 'weather',
      kind: 'shelter',
      severity: 'info',
      title: `Safe Inside · ${active.title}`,
      choiceLabel: 'Sheltered in Habitat',
      outcomeSummary:
        'You made it inside the Habitat airlock in time! (+4 score, −2% stress). Fun fact: dust devils on Mars sometimes clean dust off solar panels!',
    };

    const roverLine = crackleRoverText(
      `Nice run, ${state.callsign}! Airlock sealed safely—ready when the wind passes!`,
      state.roverDamaged,
    );

    return {
      ...state,
      activeWeatherEvent: null,
      weatherEventsSurvived: state.weatherEventsSurvived + 1,
      processPoints: nextProcessPoints,
      crew: nextCrew,
      roverLastLine: roverLine,
      log: [shelterEntry, ...state.log],
    };
  }

  // Exposed outside when countdown ran out: abrasive dust grit & suit scrubber drain [SIM]
  const nextCrew = state.crew.map((m) => {
    const nextHealth = Math.max(0, m.health - 6);
    return {
      ...m,
      health: nextHealth,
      stress: Math.min(100, m.stress + 10),
      alive: nextHealth > 0,
    };
  });
  const nextBattery = Math.max(10, Number((state.batteryKwh - 4).toFixed(1)));
  const deadCount = nextCrew.filter((m) => !m.alive).length;
  const campaignFailedReason =
    deadCount > 0
      ? 'Severe Martian dust exposure overwhelmed a weakened crew member outside shelter.'
      : state.campaignFailedReason;

  const exposedEntry: LogEntry = {
    id: `${active.id}-exposed`,
    sol: state.sol,
    missionId: 'weather',
    kind: 'shelter',
    severity: 'warning',
    title: `Caught Outside · ${active.title}`,
    choiceLabel: '−6% Health · −4 kWh Suit Clean',
    outcomeSummary:
      'Sharp Mars dust hit your suit outside shelter (−6% health, −4 kWh battery [SIM]). Watch the green Habitat beacon next time!',
    rippleNote: 'Going inside Habitat 01 keeps your suit seals clean.',
  };

  const roverLine = crackleRoverText(
    `Whoa, that ${active.windSpeedMs} m/s gust covered us in dust! Head to Habitat 01 sooner next time, ${state.callsign}.`,
    state.roverDamaged,
  );

  return {
    ...state,
    activeWeatherEvent: null,
    phase: campaignFailedReason ? 'debrief' : state.phase,
    campaignFailedReason,
    batteryKwh: nextBattery,
    crew: nextCrew,
    roverLastLine: roverLine,
    log: [exposedEntry, ...state.log],
  };
}

export function computeCampaignEvaluation(state: CampaignState): CampaignEvaluation {
  const allCrewAlive = state.crew.every((c) => c.alive);
  const avgHealth =
    state.crew.reduce((sum, c) => sum + c.health, 0) / Math.max(1, state.crew.length);
  const criticalLowHealth = state.crew.filter((c) => c.health < 30).length;

  // 1. Crew Safety (35)
  let crewSafety = 0;
  if (allCrewAlive) {
    const dosePenalty = state.eventDoseMsv > 100 ? (state.eventDoseMsv - 100) / 15 : 0;
    crewSafety = Math.max(
      0,
      Math.min(SCORE_WEIGHTS.crewSafety, Math.round((avgHealth / 100) * 35 - dosePenalty)),
    );
  }

  // 2. Resource Efficiency (20)
  let resPts = 0;
  if (state.oxygenKg >= SIM_CONSTANTS.THRESHOLDS.oxygen.warn) resPts += 5;
  else if (state.oxygenKg >= SIM_CONSTANTS.THRESHOLDS.oxygen.crit) resPts += 2.5;
  if (state.waterKg >= SIM_CONSTANTS.THRESHOLDS.water.warn) resPts += 5;
  else if (state.waterKg >= SIM_CONSTANTS.THRESHOLDS.water.crit) resPts += 2.5;
  if (state.foodKg >= SIM_CONSTANTS.THRESHOLDS.food.warn) resPts += 4;
  else if (state.foodKg >= SIM_CONSTANTS.THRESHOLDS.food.crit) resPts += 2;
  if (state.batteryKwh >= SIM_CONSTANTS.THRESHOLDS.battery.warn) resPts += 4;
  else if (state.batteryKwh >= SIM_CONSTANTS.THRESHOLDS.battery.crit) resPts += 2;
  if (state.emergencyWaterReserveKg > 0) resPts += 1;
  if (state.emergencyFoodReserveKg > 0) resPts += 1;
  const resourceEfficiency = Math.min(SCORE_WEIGHTS.resourceEfficiency, Math.round(resPts));

  // 3. Mission Objectives (15) — 3 pts each for 5 missions
  const objectivesCount = Object.values(state.objectivesCompleted).filter(Boolean).length;
  const missionObjectives = Math.min(SCORE_WEIGHTS.missionObjectives, objectivesCount * 3);

  // 4. Decision Quality (20)
  const decisionQuality = Math.min(
    SCORE_WEIGHTS.decisionQuality,
    Math.round((state.processPoints / 100) * SCORE_WEIGHTS.decisionQuality),
  );

  // 5. Exploration (10)
  let exploration = 0;
  if (state.iceSiteFound) exploration += 4;
  if (state.iceDrilledSuccess) exploration += 6;
  else if (state.iceObjectivePct >= 50) exploration += 3;
  exploration = Math.min(SCORE_WEIGHTS.exploration, exploration);

  const rawTotalScore =
    crewSafety + resourceEfficiency + missionObjectives + decisionQuality + exploration;

  const essentialZero = state.oxygenKg <= 0 || state.waterKg <= 0 || state.foodKg <= 0;
  const fatalFailure =
    Boolean(state.campaignFailedReason) ||
    !allCrewAlive ||
    criticalLowHealth >= 2 ||
    essentialZero ||
    state.eventDoseMsv >= SIM_CONSTANTS.EVENT_RADIATION_LIMIT_MSV;

  const totalScore = fatalFailure ? Math.min(rawTotalScore, 44) : rawTotalScore;

  let status: CampaignEvaluation['status'] = 'NEEDS IMPROVEMENT';
  let statusReason = 'The outpost survived, though some systems or reserves ran dangerously thin.';

  if (fatalFailure || totalScore < 45) {
    status = 'FAILED';
    statusReason =
      state.campaignFailedReason ??
      'Critical life-support or crew safety limits were breached. Try a different strategy on this same seed!';
  } else if (totalScore >= 75 && objectivesCount >= 4 && allCrewAlive) {
    status = 'SUCCESSFUL';
    statusReason =
      'Outstanding command! Your 4-person crew completed 88 Sols on Mars safely with strong reserves.';
  }

  const decisionQualityScore = Math.min(100, state.processPoints);
  const outcomeLabel =
    status === 'SUCCESSFUL'
      ? 'Strong Survival Outcome'
      : status === 'NEEDS IMPROVEMENT'
        ? 'Survivable With Strain'
        : 'Critical Failure';

  return {
    totalScore,
    status,
    statusReason,
    decisionQualityScore,
    outcomeLabel,
    breakdown: {
      crewSafety,
      resourceEfficiency,
      missionObjectives,
      decisionQuality,
      exploration,
    },
    objectivesCount,
    allCrewAlive,
  };
}

export function getResourceDaysSummary(state: CampaignState) {
  return {
    o2Days: computeDaysLeft('oxygen', state.oxygenKg),
    waterDays: computeDaysLeft(
      'water',
      state.waterKg,
      SIM_CONSTANTS.WATER_GROSS_USE_PER_SOL * (1 - state.recyclerEfficiency),
    ),
    foodDays: computeDaysLeft('food', state.foodKg),
    batteryHours: Math.round((state.batteryKwh / SIM_CONSTANTS.POWER_DEMAND_TOTAL_KWH) * 24),
  };
}

export function setTutorialStep(state: CampaignState, nextStep: TutorialStepId): CampaignState {
  if (state.tutorialStep === nextStep) return state;
  if (nextStep === 'complete') {
    return {
      ...state,
      tutorialStep: 'complete',
      sol: state.missionIndex === 0 ? Math.max(state.sol, SIM_CONSTANTS.START_SOL) : state.sol,
      tank2LeakActive:
        state.missionIndex === 0 && !state.tank2Isolated ? true : state.tank2LeakActive,
    };
  }
  return {
    ...state,
    tutorialStep: nextStep,
  };
}

export function visitChoreSpot(state: CampaignState, spot: ChorePlaceId): CampaignState {
  const nextChores: Record<ChorePlaceId, boolean> = {
    ...state.choresVisited,
    [spot]: true,
  };
  const allDone = nextChores.greenhouse && nextChores.solar && nextChores.habitat;
  const nextStep: TutorialStepId =
    allDone && state.tutorialStep === 'chores' ? 'inspect-oxygen' : state.tutorialStep;
  return {
    ...state,
    choresVisited: nextChores,
    tutorialStep: nextStep,
  };
}

export function enterFreeRoam(state: CampaignState): CampaignState {
  return {
    ...state,
    phase: 'free-roam',
    dustTau: 0.8,
    dustFactor: 1.0,
    activeWeatherEvent: null,
    roverLastLine: 'We did it! Walk anywhere you like, Commander.',
  };
}

export function reopenDebrief(state: CampaignState): CampaignState {
  return {
    ...state,
    phase: 'debrief',
  };
}

export function collectGravityCrystal(state: CampaignState, crystalId: string): CampaignState {
  if (state.collectedCrystalIds.includes(crystalId)) return state;
  const collectedCrystalIds = [...state.collectedCrystalIds, crystalId];
  const crystalsCollected = collectedCrystalIds.length;
  const nextStep: TutorialStepId =
    crystalsCollected >= 3 && state.tutorialStep === 'jump-crystals'
      ? 'gravity-card'
      : state.tutorialStep;
  return {
    ...state,
    collectedCrystalIds,
    crystalsCollected,
    tutorialStep: nextStep,
  };
}

export function unlockScienceCard(state: CampaignState, cardId: string): CampaignState {
  if (state.unlockedScienceCards.includes(cardId)) return state;
  return {
    ...state,
    unlockedScienceCards: [...state.unlockedScienceCards, cardId],
  };
}

export function completeTutorialQuiz(state: CampaignState): CampaignState {
  const nextCards = new Set(state.unlockedScienceCards);
  nextCards.add('tut-air');
  nextCards.add('tut-sol');
  return {
    ...state,
    tutorialQuizDone: true,
    tutorialStep: 'crew-map-intro',
    unlockedScienceCards: Array.from(nextCards),
  };
}

export function completeMissionQuiz(state: CampaignState, missionId: MissionId): CampaignState {
  if (state.missionQuizDone[missionId]) return state;
  return {
    ...state,
    missionQuizDone: {
      ...state.missionQuizDone,
      [missionId]: true,
    },
  };
}

export function completeMissionMiniActivity(
  state: CampaignState,
  missionId: MissionId,
): CampaignState {
  if (state.missionMiniActivityDone[missionId]) return state;
  return {
    ...state,
    missionMiniActivityDone: {
      ...state.missionMiniActivityDone,
      [missionId]: true,
    },
  };
}

export function completeDebriefQuiz(state: CampaignState): CampaignState {
  if (state.debriefQuizDone) return state;
  return {
    ...state,
    debriefQuizDone: true,
  };
}

export function toggleGrownUpScience(state: CampaignState): CampaignState {
  return {
    ...state,
    grownUpScienceOpen: !state.grownUpScienceOpen,
  };
}
