# HONEST STATUS

- **Failing automated checks**: **0** (`tsc --noEmit`, `npm run build`, `npx vitest run` [31/31 passing across 4 test files], and `npm run prelaunch` all exit with code `0`).
- **Unverified in live interactive browser (`[NOT VERIFIED]` as `[LIVE]`)**:
  - Visual browser screenshot capture and live manual mouse/keyboard playthrough inside a real Chromium window were **not executed in this headless container**.
  - Every UI/story/flow change below is verified at **`[UNIT]`** (via `src/sim/__tests__/storyBeats.test.ts`) and/or **`[REAL-HEADLESS]`** (via `src/sim/__tests__/p0Gameplay.test.ts`, `src/sim/__tests__/outpostVerification.test.ts`, `src/sim/__tests__/marsPhysics.test.ts`, and `scripts/prelaunch.ts`), and is marked **`Code + Unit/Headless Verified (Not Live-Browser Verified)`** in the table below.

---

## Single Story System Consolidation

| File | Before | After | Status |
|---|---|---|---|
| `src/sim/storyBeats.ts` | Contained partial dialogue beats alongside separate mission/tutorial data in `juniorData.ts` and `missionData.ts`. | Single source of truth exporting `MASTER_SCENE_ORDER`, `MISSION_9_PHASE_ORDER`, `BIBLE_S02_CAPTIONS`, `BIBLE_BRIEFING_DATA`, `JUNIOR_TUTORIAL_STEPS`, `ACT1_CHORE_SPOTS`, `ACT1_CRYSTAL_CALLOUTS`, `ACT1_TANK2_LINES`, `ACT1_SUNSET_LOG`, `JUNIOR_TUTORIAL_QUIZ`, `JUNIOR_DEBRIEF_QUIZ`, `JUNIOR_SCIENCE_CARDS`, `JUNIOR_MISSIONS`, `M3_LUCIA_ICE_CALL`, `M5_SHELTER_SEQUENCE`, `GUIDANCE_LADDER_THRESHOLDS_SEC`, `STORY_POSTCARDS`, `STORY_BEATS`, and `formatWithRoverName`. | `[UNIT]` Verified |
| `src/sim/juniorData.ts` | Duplicated tutorial steps, quizzes, science cards, and mission definitions. | Replaced with a pure `export * from './storyBeats';` re-export (zero duplicate text). | `[UNIT]` Verified |
| `src/data/missionData.ts` | Stored separate `COMMANDER_CALLSIGNS`, `PROLOGUE_SCENES`, and `TUTORIAL_STEPS` strings. | Derived directly from `BIBLE_BRIEFING_DATA`, `BIBLE_S02_CAPTIONS`, and `JUNIOR_TUTORIAL_STEPS` in `src/sim/storyBeats.ts`. | `[UNIT]` Verified |
| `src/utils/narrativeVoice.ts` | Maintained its own speech queue without `{roverName}` substitution or max-1 waiting rule. | Reads from `src/sim/storyBeats.ts`, substitutes `{roverName}` dynamically via `setRoverName()`, and enforces a strict one-voice-at-a-time queue (max 1 waiting). | `[UNIT]` Verified |

---

## Per-Item Before / After Alignment Table

| Item | Bible Requirement | Before | After | Evidence & Status |
|---|---|---|---|---|
| **INTRO (Option A)** | Keep `/assets/aistudio/sol-commandor-intro_721a1330.mp4`, add Skip, fall back to in-engine 28 s cinematic with Bible S0.2 captions if video fails to load, and log in `docs/ASSET-LOG.md` & `AI_USE.md` without claiming authorship. | Video played without automatic fallback to the 7 Bible S0.2 shots (`0–28 s`) on load failure. | `PrologueHUD.tsx` plays `/assets/aistudio/sol-commandor-intro_721a1330.mp4` with Skip button; `onError` switches automatically to the 28 s in-engine cinematic displaying `BIBLE_S02_CAPTIONS` (shots 1–7, `{roverName}` substituted) before closing the top/bottom shutters (`YOUR MISSION BEGINS NOW`). Logged in `docs/ASSET-LOG.md` and `AI_USE.md` without authorship claims. | `[UNIT]` (`storyBeats.test.ts` + `npm run prelaunch`) · Code-verified (`[NOT VERIFIED]` live browser) |
| **1. Act 1 Look / Move / Jump / Gravity Card** | Look = turn 60 degrees; Move = walk to the yellow light (7 m); Rusty lines word-for-word from Bible S1.1–S1.4 using `{roverName}`; Gravity card shows kid text only (numbers only in Grown-up note). | Look threshold was ~49° (`0.85 rad`), Move threshold was `3.0 m`, and Rusty lines / crystal callouts were paraphrased. | `MarsOutpost3D.tsx` sets Look threshold to `Math.PI / 3` (`60°`) and Move threshold to `7.0 m` with a 3D yellow light beacon at `7 m`. `storyBeats.ts` + `TutorialOverlay.tsx` use exact S1.1–S1.4 lines with `{roverName}`, crystal callouts (`"One!"`, `"Two!"`, `"Three! Wow, look how high you went!"`), and Gravity card kid text `"Mars pulls you down less than Earth does. You can jump higher here!"` (zero digits; `3.73 m/s²` only in `Grown-up note · Explore more`). | `[UNIT]` (`storyBeats.test.ts`) · Code-verified (`[NOT VERIFIED]` live browser) |
| **2. 9-Phase Mission Order & Speaker Ladder** | Quiet signal (`Hab Computer` notice → owning crew member by radio → `{roverName}` in person, one voice at a time), then `Look → Activity → Quiz → Decision → Action → Result → Science Card and badge → Hook`. | Quiz could be opened before Activity, and Quiet Signal lines were not presented in the strict 3-step ladder. | `MISSION_9_PHASE_ORDER` in `storyBeats.ts` and `CommandModeModal.tsx` enforce `Quiet Signal` (`Hab Computer` → Crew owner [RADIO] → `{roverName}`) + `1. Look` → `2. Activity` → `3. Quiz` (locked until Activity completes) → `4. Decision` (locked until Quiz completes) → `5. Action` → `Result` + `Science Card & Badge` + `Hook`. | `[UNIT]` (`storyBeats.test.ts`) · Code-verified (`[NOT VERIFIED]` live browser) |
| **3. Mission 1 (Sol 21)** | `Pipe Detective` (3 pipes, Pipe 2 blinks amber with a white puff, faint 3D hiss), quiz `"How can a valve help with a leak?"`, badge `"Oxygen Guardian"`, hook Kenji then `{roverName}` `"Beep. Commander, did the sky look different today?"`. | Activity was named `Valve Hunt`; old quiz asked `"Why did the seal on Tank 2 get loose?"`; badge was `"Air Saver"`. | `MissionMiniActivities.tsx` implements `Pipe Detective` with 3 pipes (Pipe 2 blinks amber with a white puff and 3D tick-hiss audio); quiz is `"How can a valve help with a leak?"`; Action is Hold `E` red wheel on Valve 2; badge is `"Oxygen Guardian"`; Hook shows Kenji’s thermal-contraction line followed by `{roverName}` `"Beep. Commander, did the sky look different today?"`. | `[UNIT]` (`storyBeats.test.ts`) · Code-verified (`[NOT VERIFIED]` live browser) |
| **4. Mission 2 (Sol 34)** | `Sunlight Slider` (not Power Switchboard), quiz `"What do solar panels use to make electricity?"`, `{roverName}` offer + Kenji `"Dust storms last many days. Let's wait for the sky to clear."`, More choices: `"Send {roverName} to clean now"` with Bible outcomes, hook Amara about recycler noise. | Activity was `Power Switchboard`; badge was `"Power Keeper"`. | `MissionMiniActivities.tsx` implements `Sunlight Slider` (Clear Sky to Dusty Sky); quiz is `"What do solar panels use to make electricity?"`; `CommandModeModal.tsx` shows `{roverName}` offer + Kenji’s line and More choices `"Send {roverName} to clean now"` with exact Bible lines (`"I am brave! Beep."` / `"Oh no, my wheels are stuck! Please wait for me."` / `"Thank you for keeping me safe. I will polish the panels after the storm."`); badge is `"Power Planner"`; Hook is Amara on radio about the water recycler noise. | `[UNIT]` (`storyBeats.test.ts`) · Code-verified (`[NOT VERIFIED]` live browser) |
| **5. Mission 3 (Sol 52)** | `Filter Fit`, then Lucía’s ice call, then `Ice Scanner` (3 spots, `"possible ice"`, never `"confirmed"`), quiz `"Can we drink ice straight from the ground?"`, hook Rafi about the cold night. | Only had `Ice Radar`; badge was `"Ice Finder"`. | `MissionMiniActivities.tsx` runs two-part `Filter Fit` (`"Click! That looks right."`) → Lucía’s radio call (`"Commander! Good news. The radar shows ice under the ground. {roverName} can scan it."`) → `Ice Scanner` across 3 spots reporting `"possible ice"` (zero `"confirmed"`); quiz is `"Can we drink ice straight from the ground?"`; badge is `"Water Finder"`; Hook is Rafi warning that tonight will be very cold. | `[UNIT]` (`storyBeats.test.ts`) · Code-verified (`[NOT VERIFIED]` live browser) |
| **6. Mission 4 (Sol 67)** | `Plant Helper` then `Thermostat Fix`, quiz `"What helps a plant grow?"`, `{roverName}` `"Plants are friends too."`. | Only had `Warm the Greenhouse`; badge was `"Plant Helper"`. | `MissionMiniActivities.tsx` runs `Plant Helper` (placing sunlight, water, and warmth icons by the plant) followed by `Thermostat Fix`; quiz is `"What helps a plant grow?"`; badge is `"Plant Protector"`; Hook is `{roverName}`: `"Plants are friends too."`. | `[UNIT]` (`storyBeats.test.ts`) · Code-verified (`[NOT VERIFIED]` live browser) |
| **7. Mission 5 (Sol 88)** | `Shield Builder`, Shelter Bell ~180 s (calm pulse, no strobe, pauses during every card), quiz with timer paused, decision A/B with If-B line, crew counter `1 of 4 … 4 of 4`, Lucía and `{roverName}` return, hold `E` to seal hatch, dose bar with no numbers, all clear. | M5 lacked the full Shelter sequence (`1 of 4 … 4 of 4`, Hold `E` hatch seal, no-number dose bar) inside the mission flow. | `MissionMiniActivities.tsx` implements `Shield Builder`; `App.tsx` & `CommandModeModal.tsx` pause the 180 s Shelter Bell during Quiz/Decision/Science Cards, run the live crew arrival counter (`1 of 4` → `4 of 4`) with Lucía & `{roverName}` return lines, require Hold `E` to seal the hatch, show a visual dose bar with zero numbers, display exact If-B line (`"Everyone is okay. But we took more radiation than we needed. Next time, let's be careful."`), and finish with Hab Computer `"All clear. Space radiation is back to normal."` + `{roverName}` `"We did it, Commander!"`. | `[UNIT]` (`storyBeats.test.ts`) · Code-verified (`[NOT VERIFIED]` live browser) |
| **8. Guidance Ladder & Resource Freeze** | 60 s `{roverName}` hint, 120 s `{roverName}` rolls toward objective, 240 s dotted path. Resources stay frozen while a card is open or the player explores. | An automatic 9.5 s weather timer triggered during exploration and drained `-8 kWh` battery if not sheltered; no 60 s / 120 s / 240 s ladder existed. | Removed the automatic 9.5 s resource-draining timer in `App.tsx`; resources only change on player decisions. Added the 60 s / 120 s / 240 s Guidance Ladder (`guidanceStage` 1 → 2 → 3) driving `{roverName}` hint question at 60 s, `{roverName}` rolling toward the active objective in `MarsOutpost3D.tsx` at 120 s, and a glowing dotted path on both the 3D ground (`MarsOutpost3D.tsx`) and `WristMapModal.tsx` at 240 s. | `[UNIT]` (`storyBeats.test.ts`) · Code-verified (`[NOT VERIFIED]` live browser) |
| **9. Voice Policy & Disclosures** | Beeps plus subtitles by default, disclosed in `AI_USE.md`, About screen, and `docs/SUBMISSION-TEXT.md`. | Voice disclosure did not explicitly state the Bible S7 / Rule 9 wording across all three places. | Updated `AI_USE.md`, `src/components/Modals.tsx` (About screen), and `docs/SUBMISSION-TEXT.md` to disclose procedural Web Audio beeps/chimes + subtitles by default (one line at a time, with Voice/Beeps On/Off toggle and zero AI voice/TTS). | `[REAL-HEADLESS]` (`npm run prelaunch`) |
| **10. Physics, Rover 8 m / 4 m Rule, HUD Zones & Existing Tests** | Do not touch Mars constants, the rover 8 m / 4 m rule, HUD zones, or existing tests. | 28 existing tests across `marsPhysics.test.ts`, `p0Gameplay.test.ts`, `outpostVerification.test.ts`, and `storyBeats.test.ts`. | Untouched Mars constants (`3.73 m/s²`, `0.863 m/s` walk, `2.65 m/s` lope, `8 m` outside / `4 m` inside rover follow). All 31 tests (28 existing + 3 new Bible alignment tests) pass. | `[REAL-HEADLESS]` (`npx vitest run`) |

---

## Verification Command Outputs

### 1. `npx tsc --noEmit`
```text
(exited with code 0 — zero TypeScript errors)
```

### 2. `npm run build`
```text
> react-example@0.0.0 build
> vite build
vite v8.3.8 building client environment for production...
transforming...
✓ 2118 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     1.50 kB │ gzip:     0.67 kB
dist/assets/index-C3Lnyk-c.css     91.35 kB │ gzip:    13.61 kB
dist/assets/index-BQmaU09U.js   6,303.08 kB │ gzip: 2,200.34 kB
✓ built in 2.21s
```

### 3. `npx vitest run`
```text
 RUN  v5.1.0 /app/applet

 ✓ src/sim/__tests__/p0Gameplay.test.ts (11 tests) 4913ms
 ✓ src/sim/__tests__/storyBeats.test.ts (6 tests) 61ms
 ✓ src/sim/__tests__/marsPhysics.test.ts (11 tests) 28946ms
 ✓ src/sim/__tests__/outpostVerification.test.ts (3 tests) 30587ms

 Test Files  4 passed (4)
      Tests  31 passed (31)
   Duration  31.42s
```

### 4. `npm run prelaunch`
```text
> react-example@0.0.0 prelaunch
> tsx scripts/prelaunch.ts
PRELAUNCH CHECK PASSED: ?debug=1 gating, asset log, and policy gates verified.
```
