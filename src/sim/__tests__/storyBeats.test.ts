import { describe, expect, it } from 'vitest';
import {
  normalizeForSpeech,
  validateSpeechLint,
} from '../speechNormalizer';
import {
  ACT1_CHORE_SPOTS,
  ACT1_CRYSTAL_CALLOUTS,
  ACT1_SUNSET_LOG,
  ACT1_TANK2_LINES,
  BIBLE_BRIEFING_DATA,
  BIBLE_S02_CAPTIONS,
  GUIDANCE_LADDER_THRESHOLDS_SEC,
  JUNIOR_DEBRIEF_QUIZ,
  JUNIOR_MISSIONS,
  JUNIOR_SCIENCE_CARDS,
  JUNIOR_TUTORIAL_QUIZ,
  JUNIOR_TUTORIAL_STEPS,
  M3_LUCIA_ICE_CALL,
  M5_SHELTER_SEQUENCE,
  MASTER_SCENE_ORDER,
  MISSION_9_PHASE_ORDER,
  STORY_BEATS,
  STORY_POSTCARDS,
  formatWithRoverName,
} from '../storyBeats';
import { MissionId } from '../roverData';
import { CREW_PROFILES } from '../constants';
import { GAMEPLAY_LAYOUT } from '../outpostLayout';
import {
  collectGravityCrystal,
  createInitialCampaignState,
  setTutorialStep,
  visitChoreSpot,
} from '../simEngine';
import {
  computePathGuideState,
  computeScreenEdgeGuide,
  getActiveObjective,
  isTank2SceneActive,
} from '../activeObjective';

describe('Story Beats, Speech Normalizer & Lint Compliance [UNIT]', () => {
  it('correctly normalizes numbers, units, tags, and technical terms to spoken English', () => {
    const raw = 'Sol 21: Tank 2 pressure at 25 kPa. [REAL] 3.73 m/s² gravity, isolation valve leaking.';
    const speech = normalizeForSpeech(raw);

    expect(speech).not.toContain('[REAL]');
    expect(speech).not.toContain('21');
    expect(speech).not.toContain('2');
    expect(speech).not.toContain('25');
    expect(speech).not.toContain('kPa');
    expect(speech).not.toContain('m/s²');
    expect(speech).not.toContain('isolation valve');
    expect(speech).toContain('Sol twenty-one');
    expect(speech).toContain('Tank two');
    expect(speech).toContain('shut-off valve');

    const lint = validateSpeechLint(speech);
    expect(lint.valid, `Lint error on: ${speech}`).toBe(true);
  });

  it('verifies every dialogue line in STORY_BEATS passes the strict speech lint test (no digits or symbols)', () => {
    const beats = Object.values(STORY_BEATS);
    expect(beats.length).toBeGreaterThanOrEqual(15);
    for (const beat of beats) {
      for (const line of beat.lines) {
        const cleanedSpeech = formatWithRoverName(line.speechText, 'Rusty');
        const lint = validateSpeechLint(cleanedSpeech);
        expect(
          lint.valid,
          `Beat ${beat.id} has forbidden token '${lint.match}' in speech: "${cleanedSpeech}"`,
        ).toBe(true);

        // Verify no banned rush words in Rusty lines
        if (line.speaker === 'rusty') {
          const lower = line.text.toLowerCase();
          expect(lower).not.toMatch(/\b(hurry|rush|quick quick|go go|fast fast)\b/);
        }
      }
    }
  });

  it('verifies every Sol Postcard in STORY_POSTCARDS passes speech lint test', () => {
    const allPostcards = Object.values(STORY_POSTCARDS).flat();
    expect(allPostcards.length).toBeGreaterThanOrEqual(10);
    for (const pc of allPostcards) {
      const cleanedSpeech = formatWithRoverName(pc.speechText, 'Rusty');
      const lint = validateSpeechLint(cleanedSpeech);
      expect(
        lint.valid,
        `Postcard Sol ${pc.solStart}-${pc.solEnd} has forbidden token '${lint.match}' in speech: "${cleanedSpeech}"`,
      ).toBe(true);
    }
  });

  it('enforces the exact Story Bible MASTER_SCENE_ORDER from Title to Free Roam', () => {
    expect(MASTER_SCENE_ORDER).toEqual([
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
    ]);
  });

  it('enforces the 9-phase mission order and ensures Quiz comes strictly after Activity in every mission', () => {
    expect(MISSION_9_PHASE_ORDER).toEqual([
      'quiet-signal',
      'look',
      'activity',
      'quiz',
      'decision',
      'action',
      'result',
      'science-card-badge',
      'hook',
    ]);

    const actIdx = MISSION_9_PHASE_ORDER.indexOf('activity');
    const quizIdx = MISSION_9_PHASE_ORDER.indexOf('quiz');
    expect(actIdx).toBeGreaterThan(-1);
    expect(quizIdx).toBeGreaterThan(actIdx);

    const missionIds: MissionId[] = ['m1', 'm2', 'm3', 'm4', 'm5'];
    const expectedOwners: Record<MissionId, string> = {
      m1: 'rafi',
      m2: 'kenji',
      m3: 'amara',
      m4: 'rafi',
      m5: 'amara',
    };

    for (const mId of missionIds) {
      const m = JUNIOR_MISSIONS[mId];
      expect(m).toBeDefined();
      expect(m.phaseOrder).toEqual(MISSION_9_PHASE_ORDER);
      expect(m.phaseOrder.indexOf('activity')).toBeLessThan(m.phaseOrder.indexOf('quiz'));
      expect(m.quietSignal.map((s) => s.speaker)).toEqual([
        'hab',
        expectedOwners[mId],
        'rusty',
      ]);
    }
  });

  it('verifies every Bible quiz question, activity name, badge, and word-for-word Bible constraint', () => {
    // S0.2 Captions & S0.3 Briefing
    expect(BIBLE_S02_CAPTIONS[0].caption).toBe('MARS OUTPOST · SOL 1');
    expect(BIBLE_S02_CAPTIONS[4].caption).toBe('{roverName} — your rover friend');
    expect(BIBLE_BRIEFING_DATA.title).toBe('Welcome, Commander!');
    expect(BIBLE_BRIEFING_DATA.earthWelcomeLine).toBe(
      'Welcome to Mars! Take care of your crew and your home.',
    );

    // S1.1–S1.4 Act 1 Look (60 degrees), Move (7 m), Jump callouts, Gravity Card (kid text only)
    const lookStep = JUNIOR_TUTORIAL_STEPS.look;
    const moveStep = JUNIOR_TUTORIAL_STEPS.move;
    const takeControlStep = JUNIOR_TUTORIAL_STEPS['take-control'];
    const jumpStep = JUNIOR_TUTORIAL_STEPS['jump-crystals'];

    expect(takeControlStep.rustyLine).toBe(
      'Beep! Hello, Commander. I am {roverName}. Move the mouse to look around.',
    );
    expect(lookStep.actionPrompt).toContain('60 degrees');
    expect(lookStep.rustyLine).toBe(
      'Beep! Hello, Commander. I am {roverName}. Move the mouse to look around.',
    );
    expect(moveStep.title).toContain('7 m');
    expect(moveStep.rustyLine).toBe(
      'Walk to the yellow light. Mars is bouncy, so take it easy.',
    );
    expect(jumpStep.rustyLine).toBe(
      'Try a jump! Press Space. Catch three glowing crystals.',
    );
    expect(ACT1_CRYSTAL_CALLOUTS).toEqual([
      'One!',
      'Two!',
      'Three! Wow, look how high you went!',
    ]);

    // Gravity card shows kid text only (zero numbers in oneSentence; numbers only in Grown-up note)
    const gravCard = JUNIOR_SCIENCE_CARDS['tut-gravity'];
    expect(gravCard.oneSentence).toBe(
      'Mars pulls you down less than Earth does. You can jump higher here!',
    );
    expect(/\d/.test(gravCard.oneSentence)).toBe(false);
    expect(gravCard.grownUpInfo).toContain('3.73 m/s²');

    // S1.5–S1.7 Chores, Tank 2 Quiz, Sunset Log
    expect(ACT1_CHORE_SPOTS.map((c) => c.id)).toEqual(['greenhouse', 'solar', 'habitat']);
    expect(ACT1_TANK2_LINES.intro).toBe('This is Tank two. It holds our air.');
    expect(ACT1_TANK2_LINES.afterTickHiss).toBe(
      'Hmm. Did you hear a tiny tick? Maybe it is nothing.',
    );
    expect(JUNIOR_TUTORIAL_QUIZ.question).toBe('Can we breathe the air on Mars?');
    expect(ACT1_SUNSET_LOG.logEntry).toBe('Sol 1: We arrived safely. Everything is working.');
    expect(ACT1_SUNSET_LOG.sleepButtonLabel).toBe('Sleep — Next Sol');

    // Every Mission Activity Name & Quiz Question
    expect(JUNIOR_MISSIONS.m1.miniActivity.title).toBe('Pipe Detective');
    expect(JUNIOR_MISSIONS.m1.quiz.question).toBe('How can a valve help with a leak?');
    expect(JUNIOR_MISSIONS.m1.badge.title).toBe('Oxygen Guardian');
    expect(JUNIOR_MISSIONS.m1.hook.followUpRusty).toBe(
      'Beep. Commander, did the sky look different today?',
    );

    expect(JUNIOR_MISSIONS.m2.miniActivity.title).toBe('Sunlight Slider');
    expect(JUNIOR_MISSIONS.m2.quiz.question).toBe(
      'What do solar panels use to make electricity?',
    );
    expect(JUNIOR_MISSIONS.m2.badge.title).toBe('Power Planner');
    expect(JUNIOR_MISSIONS.m2.rustyOffer?.moreChoiceLabel).toBe(
      'Send {roverName} to clean now',
    );
    expect(JUNIOR_MISSIONS.m2.rustyOffer?.specialistLine).toBe(
      "Dust storms last many days. Let's wait for the sky to clear.",
    );

    expect(JUNIOR_MISSIONS.m3.miniActivity.title).toBe('Filter Fit');
    expect(JUNIOR_MISSIONS.m3.miniActivity.secondaryTitle).toBe('Ice Scanner');
    expect(JUNIOR_MISSIONS.m3.miniActivity.instruction).toContain('possible ice');
    expect(JSON.stringify(M3_LUCIA_ICE_CALL).toLowerCase()).not.toContain('confirmed');
    expect(JUNIOR_MISSIONS.m3.quiz.question).toBe(
      'Can we drink ice straight from the ground?',
    );
    expect(JUNIOR_MISSIONS.m3.badge.title).toBe('Water Finder');

    expect(JUNIOR_MISSIONS.m4.miniActivity.title).toBe('Plant Helper');
    expect(JUNIOR_MISSIONS.m4.miniActivity.secondaryTitle).toBe('Thermostat Fix');
    expect(JUNIOR_MISSIONS.m4.quiz.question).toBe('What helps a plant grow?');
    expect(JUNIOR_MISSIONS.m4.badge.title).toBe('Plant Protector');
    expect(JUNIOR_MISSIONS.m4.hook.text).toBe('Plants are friends too.');

    expect(JUNIOR_MISSIONS.m5.miniActivity.title).toBe('Shield Builder');
    expect(JUNIOR_MISSIONS.m5.quiz.question).toBe('What can help protect astronauts?');
    expect(JUNIOR_MISSIONS.m5.badge.title).toBe('Crew Guardian');
    expect(M5_SHELTER_SEQUENCE.shelterBellSeconds).toBe(180);
    expect(JUNIOR_MISSIONS.m5.actionSpec.optionAPrompt).toContain('1 of 4 … 4 of 4');
    expect(JUNIOR_MISSIONS.m5.resultLines.optionB.text).toBe(
      "Everyone is okay. But we took more radiation than we needed. Next time, let's be careful.",
    );

    // Debrief Final Quiz
    expect(JUNIOR_DEBRIEF_QUIZ.question).toBe(
      'What helps astronauts stay safe on Mars?',
    );

    // Guidance Ladder thresholds & {roverName} formatter
    expect(GUIDANCE_LADDER_THRESHOLDS_SEC.hintQuestion).toBe(60);
    expect(GUIDANCE_LADDER_THRESHOLDS_SEC.roverLead).toBe(120);
    expect(GUIDANCE_LADDER_THRESHOLDS_SEC.dottedPath).toBe(240);
    expect(formatWithRoverName('Send {roverName} to clean now', 'Sparky')).toBe(
      'Send Sparky to clean now',
    );

    // Crew names strictly Amara, Kenji, Lucía, Rafi (no last names or Dr. prefix)
    expect(CREW_PROFILES.map((p) => p.name)).toEqual(['Amara', 'Kenji', 'Lucía', 'Rafi']);
    expect(BIBLE_BRIEFING_DATA.crewCards.map((c) => c.name)).toEqual([
      'Amara',
      'Kenji',
      'Lucía',
      'Rafi',
    ]);
  });

  it('A.5: during S1.5 Chores no Tank 2 marker/ring/shot exists; active objective follows Greenhouse -> Solar Field -> Habitat Core and switches to Tank 2 only after 3 of 3; previous beacon disappears after each step', () => {
    let state = createInitialCampaignState(20260709, 'Commander Nova', 'Rusty');

    // Step S1.1 Look: no 3D marker/ring, Tank 2 inactive
    state = setTutorialStep(state, 'look');
    const lookObj = getActiveObjective(state, GAMEPLAY_LAYOUT);
    expect(lookObj.id).toBe('act1-look');
    expect(lookObj.ownerScene).toBe('S1.1-look-60deg');
    expect(lookObj.showMarkerAndRing).toBe(false);
    expect(lookObj.isTank2).toBe(false);
    expect(isTank2SceneActive(state)).toBe(false);

    // Step S1.2 Move: yellow light beacon 7 m ahead of airlock
    state = setTutorialStep(state, 'move');
    const moveObj = getActiveObjective(state, GAMEPLAY_LAYOUT);
    expect(moveObj.id).toBe('act1-yellow-light');
    expect(moveObj.ownerScene).toBe('S1.2-move-7m');
    expect(moveObj.showMarkerAndRing).toBe(true);
    expect(moveObj.isTank2).toBe(false);

    // Step S1.3 Jump Crystals: S1.2 yellow light beacon is gone, objective is crystals
    state = setTutorialStep(state, 'jump-crystals');
    const jumpObj = getActiveObjective(state, GAMEPLAY_LAYOUT);
    expect(jumpObj.id).not.toBe('act1-yellow-light');
    expect(jumpObj.id).toBe('act1-crystals');
    expect(jumpObj.ownerScene).toBe('S1.3-jump-crystals');
    expect(jumpObj.showMarkerAndRing).toBe(false);
    expect(jumpObj.isTank2).toBe(false);

    // Collect all 3 crystals -> transitions to S1.4 Gravity Card (no Tank 2 marker/ring/shot)
    state = collectGravityCrystal(state, 'crystal-1');
    state = collectGravityCrystal(state, 'crystal-2');
    state = collectGravityCrystal(state, 'crystal-3');
    expect(state.tutorialStep).toBe('gravity-card');
    const gravObj = getActiveObjective(state, GAMEPLAY_LAYOUT);
    expect(gravObj.id).toBe('act1-gravity-card');
    expect(gravObj.ownerScene).toBe('S1.4-gravity-card');
    expect(gravObj.showMarkerAndRing).toBe(false);
    expect(gravObj.isTank2).toBe(false);
    expect(isTank2SceneActive(state)).toBe(false);

    // Step S1.5 Chores (0/3 visited): active objective is Greenhouse, NOT Tank 2
    state = setTutorialStep(state, 'chores');
    const chore1Obj = getActiveObjective(state, GAMEPLAY_LAYOUT);
    expect(isTank2SceneActive(state)).toBe(false);
    expect(chore1Obj.isTank2).toBe(false);
    expect(chore1Obj.ownerScene).toBe('S1.5-chores-3-places');
    expect(chore1Obj.id).toBe('chore-greenhouse');
    expect(chore1Obj.x).toBe(GAMEPLAY_LAYOUT.zoneCoords.greenhouse.x);
    expect(chore1Obj.z).toBe(GAMEPLAY_LAYOUT.zoneCoords.greenhouse.z);
    expect(chore1Obj.showMarkerAndRing).toBe(true);

    // Visit Chore 1 (Greenhouse) -> 1/3 visited: switches to Solar Field, still NOT Tank 2
    state = visitChoreSpot(state, 'greenhouse');
    expect(state.tutorialStep).toBe('chores');
    const chore2Obj = getActiveObjective(state, GAMEPLAY_LAYOUT);
    expect(isTank2SceneActive(state)).toBe(false);
    expect(chore2Obj.isTank2).toBe(false);
    expect(chore2Obj.id).toBe('chore-solar');
    expect(chore2Obj.x).toBe(GAMEPLAY_LAYOUT.zoneCoords.solar.x);
    expect(chore2Obj.z).toBe(GAMEPLAY_LAYOUT.zoneCoords.solar.z);

    // Visit Chore 2 (Solar Field) -> 2/3 visited: switches to Habitat Core, still NOT Tank 2
    state = visitChoreSpot(state, 'solar');
    expect(state.tutorialStep).toBe('chores');
    const chore3Obj = getActiveObjective(state, GAMEPLAY_LAYOUT);
    expect(isTank2SceneActive(state)).toBe(false);
    expect(chore3Obj.isTank2).toBe(false);
    expect(chore3Obj.id).toBe('chore-habitat');
    expect(chore3Obj.x).toBe(GAMEPLAY_LAYOUT.destinationWaypoints.airlock.x);
    expect(chore3Obj.z).toBe(GAMEPLAY_LAYOUT.destinationWaypoints.airlock.z);

    // Visit Chore 3 (Habitat Core) -> 3 of 3 visited: now switches to S1.6 Tank 2!
    state = visitChoreSpot(state, 'habitat');
    expect(state.tutorialStep).toBe('inspect-oxygen');
    expect(isTank2SceneActive(state)).toBe(true);
    const tank2Obj = getActiveObjective(state, GAMEPLAY_LAYOUT);
    expect(tank2Obj.id).toBe('act1-tank2');
    expect(tank2Obj.ownerScene).toBe('S1.6-tank2-quiz');
    expect(tank2Obj.isTank2).toBe(true);
    expect(tank2Obj.showMarkerAndRing).toBe(true);
    expect(tank2Obj.x).toBe(GAMEPLAY_LAYOUT.zoneCoords.tank2.x);
    expect(tank2Obj.z).toBe(GAMEPLAY_LAYOUT.zoneCoords.tank2.z);
  });

  it('B.7: Kid-Friendly Path Guide route is non-empty and ends at active objective, updates when objective changes, is hidden when Guide is Off, and is hidden within 3 m', () => {
    let state = createInitialCampaignState(20260709, 'Commander Nova', 'Rusty');
    state = setTutorialStep(state, 'chores');

    const playerX = GAMEPLAY_LAYOUT.modules.astroSpawn.x;
    const playerZ = GAMEPLAY_LAYOUT.modules.astroSpawn.z;

    // 1. Route to Chore 1 (Greenhouse) is non-empty and ends at active objective
    const obj1 = getActiveObjective(state, GAMEPLAY_LAYOUT, playerX, playerZ);
    const route1 = computePathGuideState({
      playerX,
      playerZ,
      objective: obj1,
      guideEnabled: true,
      layout: GAMEPLAY_LAYOUT,
      elapsedSec: 1.0,
      reducedMotion: false,
    });
    expect(route1.visible).toBe(true);
    expect(route1.chevrons.length).toBeGreaterThan(0);
    expect(route1.waypoints.length).toBeGreaterThanOrEqual(2);
    const endWp1 = route1.waypoints[route1.waypoints.length - 1];
    expect(endWp1.x).toBeCloseTo(obj1.x, 4);
    expect(endWp1.z).toBeCloseTo(obj1.z, 4);

    // 2. Updates when the active objective changes (visit Greenhouse -> switches to Solar Field)
    state = visitChoreSpot(state, 'greenhouse');
    const obj2 = getActiveObjective(state, GAMEPLAY_LAYOUT, playerX, playerZ);
    expect(obj2.id).toBe('chore-solar');
    const route2 = computePathGuideState({
      playerX,
      playerZ,
      objective: obj2,
      guideEnabled: true,
      layout: GAMEPLAY_LAYOUT,
      elapsedSec: 1.0,
      reducedMotion: false,
    });
    expect(route2.visible).toBe(true);
    const endWp2 = route2.waypoints[route2.waypoints.length - 1];
    expect(endWp2.x).toBeCloseTo(obj2.x, 4);
    expect(endWp2.z).toBeCloseTo(obj2.z, 4);
    expect(endWp2.x).not.toBeCloseTo(endWp1.x, 1);

    // 3. Hidden when Guide is Off (G key / HUD toggle)
    const routeOff = computePathGuideState({
      playerX,
      playerZ,
      objective: obj2,
      guideEnabled: false,
      layout: GAMEPLAY_LAYOUT,
      elapsedSec: 1.0,
      reducedMotion: false,
    });
    expect(routeOff.visible).toBe(false);
    expect(routeOff.chevrons).toHaveLength(0);

    // 4. Hidden within 3 m of the active objective (only the ring remains)
    const routeNear = computePathGuideState({
      playerX: obj2.x + 1.5,
      playerZ: obj2.z - 1.2,
      objective: obj2,
      guideEnabled: true,
      layout: GAMEPLAY_LAYOUT,
      elapsedSec: 1.0,
      reducedMotion: false,
    });
    expect(routeNear.totalDistanceM).toBeLessThanOrEqual(3.0);
    expect(routeNear.visible).toBe(false);
    expect(routeNear.chevrons).toHaveLength(0);

    // 5. Screen-edge guide formats distance as "<N> m" only and indicates turning direction when offscreen
    const edgeGuide = computeScreenEdgeGuide(playerX, playerZ, 0, obj2);
    expect(edgeGuide.visible).toBe(true);
    expect(edgeGuide.distanceLabel).toMatch(/^\d+ m$/);
  });
});


