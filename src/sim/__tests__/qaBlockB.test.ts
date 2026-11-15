import { describe, expect, it } from 'vitest';
import { SIM_CONSTANTS } from '../constants';
import { MISSIONS, OptionId } from '../missionsData';
import { MissionId } from '../roverData';
import {
  CampaignState,
  advanceRoutineSols,
  collectGravityCrystal,
  completeDebriefQuiz,
  completeMissionMiniActivity,
  completeMissionQuiz,
  completeTutorialQuiz,
  computeCampaignEvaluation,
  computeRoverMood,
  createInitialCampaignState,
  enterFreeRoam,
  getActiveMission,
  getResourceDaysSummary,
  markDataInspected,
  proceedToNextCriticalSol,
  resolveMissionOption,
  resolveWeatherEventShelter,
  setTutorialStep,
  triggerLocalizedWeatherEvent,
  triggerWeatherGustPulse,
  visitChoreSpot,
} from '../simEngine';
import {
  ARCHIVED_DONKI_FALLBACK,
  DATA_CREDITS_LEDGER,
} from '../nasaData';
import {
  BADGE_DISCLAIMER,
  JUNIOR_DEBRIEF_QUIZ,
  JUNIOR_MISSIONS,
  JUNIOR_SCIENCE_CARDS,
  JUNIOR_TUTORIAL_QUIZ,
  JUNIOR_TUTORIAL_STEPS,
  M3_LUCIA_ICE_CALL,
  M5_SHELTER_SEQUENCE,
  STORY_BEATS,
  STORY_POSTCARDS,
  formatWithRoverName,
} from '../storyBeats';
import { normalizeForSpeech, validateSpeechLint } from '../speechNormalizer';

function playFullCampaign(seed: number, choices: OptionId[]): {
  finalState: CampaignState;
  visitedSols: number[];
  earlyFailureBeforeM5: string | null;
} {
  let state = createInitialCampaignState(seed, 'Commander Nova', 'Rusty', ARCHIVED_DONKI_FALLBACK);

  // Act 1 full walkthrough
  state = setTutorialStep(state, 'look');
  state = setTutorialStep(state, 'move');
  state = setTutorialStep(state, 'jump-crystals');
  state = collectGravityCrystal(state, 'crystal-1');
  state = collectGravityCrystal(state, 'crystal-2');
  state = collectGravityCrystal(state, 'crystal-3');
  state = setTutorialStep(state, 'chores');
  state = visitChoreSpot(state, 'greenhouse');
  state = visitChoreSpot(state, 'solar');
  state = visitChoreSpot(state, 'habitat');
  state = setTutorialStep(state, 'tutorial-quiz');
  state = completeTutorialQuiz(state);
  state = setTutorialStep(state, 'complete');

  const visitedSols: number[] = [];
  let earlyFailureBeforeM5: string | null = null;

  for (let i = 0; i < MISSIONS.length; i++) {
    const m = getActiveMission(state);
    visitedSols.push(state.sol);
    state = markDataInspected(state);
    state = completeMissionMiniActivity(state, m.id);
    state = completeMissionQuiz(state, m.id);
    state = resolveMissionOption(state, choices[i]);

    if (i < MISSIONS.length - 1 && state.campaignFailedReason) {
      earlyFailureBeforeM5 = `${m.id} opt=${choices[i]}: ${state.campaignFailedReason}`;
    }

    state = advanceRoutineSols(state);
    if (i < MISSIONS.length - 1 && state.phase === 'routine-summary') {
      state = proceedToNextCriticalSol(state);
    }
  }

  state = completeDebriefQuiz(state);
  return { finalState: state, visitedSols, earlyFailureBeforeM5 };
}

function assertValidNumbersAndBounds(state: CampaignState) {
  expect(Number.isFinite(state.oxygenKg)).toBe(true);
  expect(Number.isFinite(state.waterKg)).toBe(true);
  expect(Number.isFinite(state.foodKg)).toBe(true);
  expect(Number.isFinite(state.batteryKwh)).toBe(true);
  expect(Number.isFinite(state.eventDoseMsv)).toBe(true);
  expect(Number.isFinite(state.careerDoseMsv)).toBe(true);
  expect(Number.isFinite(state.processPoints)).toBe(true);

  expect(state.oxygenKg).toBeGreaterThanOrEqual(0);
  expect(state.waterKg).toBeGreaterThanOrEqual(0);
  expect(state.foodKg).toBeGreaterThanOrEqual(0);
  expect(state.batteryKwh).toBeGreaterThanOrEqual(0);
  expect(state.batteryKwh).toBeLessThanOrEqual(SIM_CONSTANTS.BATTERY_CAPACITY_KWH);
  expect(state.spareParts).toBeGreaterThanOrEqual(0);
  expect(state.eventDoseMsv).toBeGreaterThanOrEqual(0);
  expect(state.careerDoseMsv).toBeGreaterThanOrEqual(0);

  for (const c of state.crew) {
    expect(Number.isFinite(c.health)).toBe(true);
    expect(Number.isFinite(c.stress)).toBe(true);
    expect(c.health).toBeGreaterThanOrEqual(0);
    expect(c.health).toBeLessThanOrEqual(100);
    expect(c.stress).toBeGreaterThanOrEqual(0);
    expect(c.stress).toBeLessThanOrEqual(100);
  }
}

describe('Block B1 — Bot Playthrough Across 65+ Seeds & Choice Branches [REAL-HEADLESS]', () => {
  it('completes all 5 missions (Sols 21, 34, 52, 67, 88) across 30 seeds on Bible primary Option A & Option B paths with zero NaNs', () => {
    const primaryAPath: OptionId[] = ['A', 'B', 'A', 'A', 'A']; // Bible Option A (recommended/engine best)
    const primaryBPath: OptionId[] = ['B', 'A', 'D', 'C', 'D']; // Bible Option B (trade-off choices)
    const mixedPath: OptionId[] = ['A', 'A', 'B', 'A', 'D'];

    const seeds = Array.from({ length: 30 }, (_, idx) => 20260700 + idx * 17);

    for (const seed of seeds) {
      const resA = playFullCampaign(seed, primaryAPath);
      expect(resA.visitedSols).toEqual([21, 34, 52, 67, 88]);
      expect(resA.finalState.phase).toBe('debrief');
      expect(resA.finalState.unlockedBadges).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
      expect(resA.earlyFailureBeforeM5).toBeNull();
      assertValidNumbersAndBounds(resA.finalState);

      const evalA = computeCampaignEvaluation(resA.finalState);
      expect(evalA.totalScore).toBeGreaterThanOrEqual(0);
      expect(evalA.totalScore).toBeLessThanOrEqual(100);
      expect(evalA.status).toBe('SUCCESSFUL');
    }

    for (let i = 0; i < 20; i++) {
      const seed = 9000 + i * 31;
      const resB = playFullCampaign(seed, primaryBPath);
      expect(resB.visitedSols).toEqual([21, 34, 52, 67, 88]);
      expect(resB.finalState.phase).toBe('debrief');
      expect(resB.finalState.unlockedBadges).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
      expect(resB.earlyFailureBeforeM5).toBeNull();
      assertValidNumbersAndBounds(resB.finalState);

      const resM = playFullCampaign(seed + 1, mixedPath);
      expect(resM.visitedSols).toEqual([21, 34, 52, 67, 88]);
      expect(resM.finalState.phase).toBe('debrief');
      assertValidNumbersAndBounds(resM.finalState);
    }
  });

  it('handles 15+ More-Choices & worst-case branches (M1 D, M2 C/D, M3 C, M4 D, M5 D) and transitions to debrief or free-roam cleanly', () => {
    const extraBranches: OptionId[][] = [
      ['D', 'D', 'D', 'D', 'D'],
      ['C', 'C', 'C', 'B', 'B'],
      ['B', 'C', 'A', 'D', 'C'],
      ['A', 'C', 'C', 'C', 'A'],
      ['D', 'A', 'B', 'B', 'D'],
    ];

    for (let b = 0; b < extraBranches.length; b++) {
      for (let s = 0; s < 4; s++) {
        const seed = 50000 + b * 100 + s;
        const res = playFullCampaign(seed, extraBranches[b]);
        assertValidNumbersAndBounds(res.finalState);
        expect(res.finalState.phase).toBe('debrief');
        // Free roam must always unlock cleanly from Debrief
        const fr = enterFreeRoam(res.finalState);
        expect(fr.phase).toBe('free-roam');
        const evalRes = computeCampaignEvaluation(res.finalState);
        expect(Number.isFinite(evalRes.totalScore)).toBe(true);
        expect(evalRes.totalScore).toBeGreaterThanOrEqual(0);
        expect(evalRes.totalScore).toBeLessThanOrEqual(100);
      }
    }
  });

  it('is strictly deterministic for identical seeds and choice sequences', () => {
    const choices: OptionId[] = ['A', 'C', 'C', 'A', 'B'];
    const run1 = playFullCampaign(20260709, choices);
    const run2 = playFullCampaign(20260709, choices);
    expect(run1.finalState).toEqual(run2.finalState);
  });
});

describe('Block B2 — Extreme State & Edge-Case Boundary Checks [REAL-HEADLESS]', () => {
  it('handles 0 resources (O2, Water, Food, Battery = 0) without crashes or NaNs', () => {
    const base = createInitialCampaignState(20260709, 'Commander Nova', 'Rusty');
    const zeroed: CampaignState = {
      ...base,
      tutorialStep: 'complete',
      oxygenKg: 0,
      waterKg: 0,
      foodKg: 0,
      batteryKwh: 0,
      spareParts: 0,
      emergencyWaterReserveKg: 0,
      emergencyFoodReserveKg: 0,
    };

    const days = getResourceDaysSummary(zeroed);
    expect(days.o2Days).toBe(0);
    expect(days.waterDays).toBe(0);
    expect(days.foodDays).toBe(0);
    expect(days.batteryHours).toBe(0);

    expect(computeRoverMood(zeroed)).toBe('critical');

    const evalZero = computeCampaignEvaluation(zeroed);
    expect(Number.isFinite(evalZero.totalScore)).toBe(true);
    expect(evalZero.totalScore).toBeGreaterThanOrEqual(0);
    expect(evalZero.totalScore).toBeLessThanOrEqual(44);

    // Stepping each mission from zeroed state must remain clamped >= 0 with zero NaNs
    for (let mIdx = 0; mIdx < MISSIONS.length; mIdx++) {
      for (const opt of MISSIONS[mIdx].options) {
        const afterOpt = resolveMissionOption({ ...zeroed, missionIndex: mIdx }, opt.id);
        assertValidNumbersAndBounds(afterOpt);
        const afterRoutine = advanceRoutineSols(afterOpt);
        assertValidNumbersAndBounds(afterRoutine);
      }
    }
  });

  it('handles max resources & weather gust/shelter resolution cleanly', () => {
    let state = createInitialCampaignState(20260709, 'Commander Nova', 'Rusty');
    state = {
      ...state,
      tutorialStep: 'complete',
      batteryKwh: SIM_CONSTANTS.BATTERY_CAPACITY_KWH,
    };

    state = triggerLocalizedWeatherEvent(state, 'dust-devil');
    expect(state.activeWeatherEvent).not.toBeNull();

    const gustRes = triggerWeatherGustPulse(state);
    expect(gustRes.gustWindMs).toBeGreaterThan(0);
    state = gustRes.nextState;

    const sheltered = resolveWeatherEventShelter(state, 'sheltered');
    expect(sheltered.activeWeatherEvent).toBeNull();
    expect(sheltered.weatherEventsSurvived).toBe(1);
    assertValidNumbersAndBounds(sheltered);

    const exposed = resolveWeatherEventShelter(state, 'exposed');
    expect(exposed.activeWeatherEvent).toBeNull();
    assertValidNumbersAndBounds(exposed);
  });
});

describe('Block B4 — Story Bible & Speech Policy Verification [UNIT]', () => {
  it('verifies Mission Sols are strictly [21, 34, 52, 67, 88] and Activity -> Quiz -> Decision ordering holds', () => {
    expect(MISSIONS.map((m) => m.missionSol)).toEqual([21, 34, 52, 67, 88]);
    expect(MISSIONS.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);

    for (const mId of ['m1', 'm2', 'm3', 'm4', 'm5'] as MissionId[]) {
      const jm = JUNIOR_MISSIONS[mId];
      expect(jm.phaseOrder.indexOf('activity')).toBeLessThan(jm.phaseOrder.indexOf('quiz'));
      expect(jm.phaseOrder.indexOf('quiz')).toBeLessThan(jm.phaseOrder.indexOf('decision'));
      expect(jm.decisions).toHaveLength(2);
    }
  });

  it('verifies zero banned words ("katabatic", "electrostatic", "Starship", "deadly", "100% safe", "NASA certificate") in player-facing copy', () => {
    const bannedPattern = /\b(katabatic|electrostatic|starship|deadly|100% safe)\b/i;

    for (const beat of Object.values(STORY_BEATS)) {
      for (const l of beat.lines) {
        expect(l.text).not.toMatch(bannedPattern);
        expect(l.speechText).not.toMatch(bannedPattern);
      }
    }
    for (const group of Object.values(STORY_POSTCARDS)) {
      for (const pc of group) {
        expect(pc.caption).not.toMatch(bannedPattern);
        expect(pc.speechText).not.toMatch(bannedPattern);
      }
    }
    for (const jm of Object.values(JUNIOR_MISSIONS)) {
      expect(jm.badge.disclaimer).toBe(BADGE_DISCLAIMER);
      const blob = JSON.stringify({
        ...jm,
        badge: { ...jm.badge, disclaimer: '' },
      });
      expect(blob).not.toMatch(bannedPattern);
      expect(blob.toLowerCase()).not.toContain('nasa certificate');
      expect(blob.toLowerCase()).not.toContain('nasa junior');
    }
    for (const card of Object.values(JUNIOR_SCIENCE_CARDS)) {
      expect(JSON.stringify(card)).not.toMatch(bannedPattern);
    }
    for (const step of Object.values(JUNIOR_TUTORIAL_STEPS)) {
      expect(JSON.stringify(step)).not.toMatch(bannedPattern);
    }
    expect(JSON.stringify(JUNIOR_TUTORIAL_QUIZ)).not.toMatch(bannedPattern);
    expect(JSON.stringify(JUNIOR_DEBRIEF_QUIZ)).not.toMatch(bannedPattern);
    expect(JSON.stringify(M3_LUCIA_ICE_CALL)).not.toMatch(bannedPattern);
    expect(JSON.stringify(M5_SHELTER_SEQUENCE)).not.toMatch(bannedPattern);

    // Only disclaimer mentions "not an official NASA certificate"
    expect(BADGE_DISCLAIMER).toContain('not an official NASA certificate');
  });

  it('verifies all Rusty lines contain zero rush words and normalizeForSpeech passes speech lint on all mission/tutorial lines', () => {
    const rushRegex = /\b(hurry|rush|quick quick|go go|fast fast)\b/i;

    for (const jm of Object.values(JUNIOR_MISSIONS)) {
      for (const line of jm.quietSignal) {
        if (line.speaker === 'rusty') {
          expect(line.text).not.toMatch(rushRegex);
        }
        const sp = normalizeForSpeech(formatWithRoverName(line.text, 'Rusty'));
        const lint = validateSpeechLint(sp);
        expect(lint.valid, `Lint fail on "${sp}": ${lint.match}`).toBe(true);
      }
      if (jm.rustyOffer) {
        expect(jm.rustyOffer.rustyLine).not.toMatch(rushRegex);
        expect(jm.rustyOffer.chosenBraveLine).not.toMatch(rushRegex);
        expect(jm.rustyOffer.stuckLine).not.toMatch(rushRegex);
        expect(jm.rustyOffer.waitedSafeLine).not.toMatch(rushRegex);
      }
      if (jm.hook.followUpRusty) {
        expect(jm.hook.followUpRusty).not.toMatch(rushRegex);
      }
    }

    for (const step of Object.values(JUNIOR_TUTORIAL_STEPS)) {
      expect(step.rustyLine).not.toMatch(rushRegex);
      const sp = normalizeForSpeech(formatWithRoverName(step.rustyLine, 'Rusty'));
      const lint = validateSpeechLint(sp);
      expect(lint.valid, `Tutorial step lint fail on "${sp}": ${lint.match}`).toBe(true);
    }

    // D1-D11 credits ledger populated
    expect(DATA_CREDITS_LEDGER.length).toBeGreaterThanOrEqual(10);
  });
});
