# SOL COMMANDER — Agent Handoff Document

> **Generated**: 2026-11-15 · **For**: Any AI coding agent continuing this project
> **Source-verified**: All implementation statuses are drawn directly from inspecting source files — nothing is assumed.

---

## 1. Project Overview

**Sol Commander** is an educational 3D Mars-exploration and space-weather decision game for children aged **7–12**, built as an independent NASA Space Apps Challenge 2026 project.

### Vision
Every screen feels like part of the same Mars outpost game world — a single continuous full-viewport Three.js WebGL Mars Outpost scene with **zero** website headers or scrolling web-pages.

### Technology Stack (from `package.json`)
| Package | Version | Role |
|---|---|---|
| `react` | ^19.0.1 | UI framework |
| `react-dom` | ^19.0.1 | DOM renderer |
| `three` | ^0.187.0 | 3D rendering |
| `@dimforge/rapier3d-compat` | ^0.21.0 | WASM physics engine |
| `@google/genai` | ^2.4.0 | Gemini AI for rover dialogue |
| `tailwindcss` | ^4.3.3 | Styling |
| `motion` | ^12.23.24 | Framer Motion animations |
| `lucide-react` | ^0.546.0 | Icons |
| `vite` | ^8.3.0 | Build tool |
| `vitest` | ^5.1.0 | Test runner |
| `typescript` | ^7.0.2 | Type safety |
| `express` | ^4.21.2 | Dev/preview server |

### Commands
```bash
npm run dev        # Start dev server at port 3000
npm run build      # Production build
npm run test       # vitest run (alias for all tests)
npm run lint       # tsc --noEmit (type-check only)
npm run prelaunch  # tsx scripts/prelaunch.ts (pre-flight checks)
npx vitest run     # Run full test suite
```

### Design Tokens (from `PROJECT.md`)
| Token | Hex | Usage |
|---|---|---|
| Deep Space | `#0B1D36` | Primary dark HUD frames |
| Night Blue | `#1B3A5F` | Secondary surfaces |
| Mars Red | `#E85D04` | Martian accent, action gradients |
| Sol Gold | `#FFB703` | Primary CTA, highlights |
| Ice White | `#F8F9FA` | Body text |
| Success Green | `#22C55E` | Crew readiness, completed objectives |
| Alert Red | `#DC2626` | Caution / low-power alerts |

Typography: `Orbitron` (display), `Nunito` (body), `Rajdhani` (mission indicators)

---

## 2. Architecture & Important Files

### Game Flow (from `PROJECT.md`)
```
Landing Screen (Title HUD + Station CAM Inspector)
  └─ [START MISSION]
       ▼
Cinematic Prologue (~34 s, 5 deterministic scenes on the same 3D scene)
       ▼ (or [Skip Cinematic])
Mission Briefing ("OPERATION: FIRST LIGHT", Mentor: Commander Vega, Callsign selector)
  └─ [Start Exploration]
       ▼
Third-Person Gameplay + Interactive Tutorial (one instruction at a time)
  ├─ Tutorial 01: Move across Mars (WASD / Arrow / Touch)
  ├─ Tutorial 02: Look around (mouse drag)
  ├─ Tutorial 03: Inspect a station (press E or click/tap)
  ├─ Tutorial 04: Follow beacon to Power Console and press E
  └─ Tutorial 05: Balance 10 Solar Power Units across Habitat, Greenhouse & Rover
       ▼
Sol 01 Active Command (5 Critical Sols + routine sols)
       ▼
Debrief Screen
```

### Key Source Files
```
s:\Sol Commander\
├── src\
│   ├── App.tsx                        # Root app, game-flow state machine (~52 KB)
│   ├── main.tsx                       # Vite entry point
│   ├── components\
│   │   ├── MarsOutpost3D.tsx          # Single WebGLRenderer driving all 4 camera modes (~135 KB)
│   │   ├── GameplayHUD.tsx            # Main gameplay HUD overlay (~68 KB)
│   │   ├── BriefingOverlay.tsx        # Mission briefing screen (~25 KB)
│   │   ├── PrologueHUD.tsx            # Cinematic prologue (~20 KB)
│   │   ├── TitleScreenHUD.tsx         # Landing/title screen (~16 KB)
│   │   ├── CommandModeModal.tsx       # Mission decision modal (~45 KB)
│   │   ├── DebriefScreen.tsx          # End-of-game debrief (~20 KB)
│   │   ├── Modals.tsx                 # Shared modals (~23 KB)
│   │   ├── PauseMenuModal.tsx         # Pause menu (~11 KB)
│   │   ├── PowerConsoleModal.tsx      # Power balancing tutorial (~9 KB)
│   │   ├── QuickActionMenuModal.tsx   # Quick actions (~18 KB)
│   │   ├── WristMapModal.tsx          # In-game wrist map (~21 KB)
│   │   ├── RoverAssistant.tsx         # Rover chat panel (~7 KB)
│   │   ├── TutorialOverlay.tsx        # Tutorial step overlays (~13 KB)
│   │   ├── JuniorQuizCard.tsx         # Junior mode quiz UI (~7 KB)
│   │   ├── MissionMiniActivities.tsx  # Junior mini-activities (~32 KB)
│   │   ├── ScienceCardModal.tsx       # Science fact card (~5 KB)
│   │   ├── DebugPanel.tsx             # Debug overlay (~16 KB)
│   │   ├── LogCreditsModals.tsx       # Commander's log & credits (~31 KB)
│   │   └── hudPopupQueue.ts           # Toast/popup queue system (~7 KB)
│   ├── sim\
│   │   ├── constants.ts               # ALL game constants (REAL/DERIVED/SIM tagged) (~15 KB)
│   │   ├── simEngine.ts               # Campaign state machine + score evaluator (~55 KB)
│   │   ├── rapierWorld.ts             # Rapier WASM physics world (~64 KB)
│   │   ├── crewAndRoverSim.ts         # Crew NPC AI + Rover controller (~48 KB)
│   │   ├── outpostLayout.ts           # SHOWCASE_LAYOUT & GAMEPLAY_LAYOUT configs (~50 KB)
│   │   ├── missionsData.ts            # All 5 mission definitions (~22 KB)
│   │   ├── marsPhysics.ts             # Mars physics utilities & formulas (~9 KB)
│   │   ├── terrainField.ts            # Heightfield terrain generation (~22 KB)
│   │   ├── juniorData.ts              # Junior Explorer mode data & tutorial steps (~18 KB)
│   │   ├── nasaData.ts                # NASA DONKI space-weather data types & fallback (~16 KB)
│   │   ├── roverData.ts               # Rover dialogue, moods, hint lines (~6 KB)
│   │   ├── rng.ts                     # Seeded RNG (~1 KB)
│   │   └── __tests__\
│   │       ├── p0Gameplay.test.ts     # U1, U4, U5 gameplay tests (25 total)
│   │       ├── marsPhysics.test.ts    # B4, B9 physics tests (11 total)
│   │       └── outpostVerification.test.ts  # C1-C7 outpost QA (3 total)
│   ├── three\
│   │   ├── outpostAssets.ts           # Multi-part PBR 3D models (~135 KB)
│   │   ├── marsEnvironment.ts         # Sky, terrain, rocks, weather effects (~39 KB)
│   │   ├── proceduralTextures.ts      # Procedural PBR textures (~34 KB)
│   │   └── martianStormShader.ts      # Custom storm shader (~5 KB)
│   ├── utils\
│   │   └── soundEngine.ts             # Procedural Web Audio synthesizer (~39 KB)
│   ├── data\
│   │   └── missionData.ts             # Landmark IDs & mission data types (~7 KB)
│   └── debug\
│       ├── outpostAudit.ts            # Outpost self-test runner (C1-C8 checks) (~44 KB)
│       ├── diagnostics.ts             # Runtime diagnostics (~25 KB)
│       └── headlessCanvasShim.ts      # Headless THREE.js canvas shim for tests
├── scripts\
│   ├── prelaunch.ts                   # Pre-flight checks before dev server
│   └── runStepCVerification.ts        # Step-C (outpost) verification runner
├── docs\
│   └── ASSET-LOG.md                   # Asset inventory log
├── PROJECT.md                         # Design brief and game flow
├── GEMINI.md                          # Gravitas rules (MUST follow)
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── tsconfig.json
```

---

## 3. Simulation & Physics Architecture

### Two Layout Modes
| Mode | File Constant | Usage | Terrain |
|---|---|---|---|
| `showcase` | `SHOWCASE_LAYOUT` | Title screen, landing page, camera presets | 170 m, 112 segments |
| `gameplay` | `GAMEPLAY_LAYOUT` | Active gameplay, tutorials, missions | 180 m, 128 segments, 45 m flattened pad |

> **IMPORTANT**: Never modify `SHOWCASE_LAYOUT` coordinates — they lock the exact title screen framing and 7 camera presets.

### Physics Constants (from `src/sim/constants.ts`, all source-verified)
```typescript
PHYSICS_CONSTANTS = {
  FIXED_DT_S: 1 / 120,              // 120 Hz physics tick
  MARS_WALK_SPEED_MS: ~0.863,       // Froude-derived
  MARS_LOPE_SPEED_MS: 2.65,         // Sprint/lope speed
  PLAYER_ACCEL_TIME_S: 0.15,        // Horizontal accel time
  PLAYER_DECEL_TIME_S: 0.11,        // Horizontal decel time
  CAPSULE_RADIUS_M: 0.35,           // Player capsule radius
  CAPSULE_HALF_HEIGHT_M: 0.55,      // Player capsule half-height
  ROVER_MAKE_WAY_COOLDOWN_S: 4.0,   // Key rover cooldown constant
  ROVER_MAKE_WAY_PUSH_TIME_S: 0.6,  // Push time before MAKING_WAY triggers
  ROVER_MAKE_WAY_SPEED_MS: 0.72,    // Rover yield move speed
  ROVER_PARK_START_FOLLOW_M: 8.0,   // Start following player distance
  ROVER_PARK_STOP_FOLLOW_M: 4.0,    // Stop following distance
  CREW_YIELD_TRIGGER_DIST_M: 1.2,   // Crew yield trigger radius
  CREW_YIELD_SIDESTEP_M: 0.9,       // Crew sidestep amount
}
```

### Campaign Resources (from `src/sim/constants.ts` SIM_CONSTANTS)
```typescript
// Starting resources (Sol 21)
START_OXYGEN_KG: 60,   START_WATER_KG: 220,
START_FOOD_KG: 90,     START_BATTERY_KWH: 240,
START_SPARE_PARTS: 3,  CREW_SLOTS_PER_SOL: 4,
// Daily consumption
O2_CREW_USE_PER_SOL: 3.36,   FOOD_CREW_USE_PER_SOL: 2.48,
WATER_GROSS_USE_PER_SOL: 13.5 (recycled at 85%)
// Critical thresholds
oxygen: { warn: 30, crit: 12 }
water:  { warn: 100, crit: 40 }
food:   { warn: 40, crit: 15 }
battery: { warn: 80, crit: 30 }
```

### Score Weights (from `SCORE_WEIGHTS` in `constants.ts`)
```typescript
crewSafety: 35        // /35 — crew alive, low stress
resourceEfficiency: 20 // /20 — no waste
missionObjectives: 15  // /15 — objectives completed
decisionQuality: 20    // /20 — inspected data, asked MC, chose best
exploration: 10        // /10 — bonus
// Total: 100 points → SUCCESSFUL / NEEDS IMPROVEMENT / FAILED
```

### Campaign Evaluation (`CampaignEvaluation` interface in `simEngine.ts`)
- **SUCCESSFUL**: score >= threshold, all crew alive
- **NEEDS IMPROVEMENT**: survived but suboptimal choices
- **FAILED**: crew death or critical resource failure

---

## 4. The 5 Critical Missions (from `src/sim/missionsData.ts`)

| # | ID | Sol | Zone | Title | Core Dilemma |
|---|---|---|---|---|---|
| 1 | `m1` | 21 | `tank2` | Whisper in Tank 2 | O₂ leak: close valve / shelter crew / rest / ignore |
| 2 | `m2` | (gap) | `solar` | Sol of Silence | Dust storm power crisis |
| 3 | `m3` | (gap) | `recycler` | The Recycler's Last Breath | Water recycler degradation |
| 4 | `m4` | (gap) | `greenhouse` | The Quiet Frost | Greenhouse frost/food risk |
| 5 | `m5` | (gap) | `shelter` | The Sun Decides | Solar particle event / radiation |

Each mission has:
- 4 options (A/B/C/D) with crew slot costs, risk %, ripple effects
- `getBestOption(donki)` — uses live NASA DONKI space weather data
- Science card, what-you-knew note, after-action review
- **Junior Mode** simplified 2-option version with quiz, mini-activity, badge

### Ripple Flags (cross-mission consequences, in `CampaignState.ripples`)
```typescript
m1LeakUnsealed, m2GreenhouseShed, m2RoverSentInStorm,
m2PanelsCleanedAfterStorm, m3EmergencyWaterUsed, m3IceFound,
m4EmergencyFoodUsed, m5EvaDuringStorm
```

---

## 5. The 4 Crew Members (from `src/sim/constants.ts`)
| ID | Name | Role | Specialty | HUD Color |
|---|---|---|---|---|
| `amara` | Dr. Amara Nwosu | Medical Officer | Health, radiation, stress | `#22C55E` |
| `kenji` | Kenji Sato | Flight Engineer | Repairs, valves, Rover | `#FFB703` |
| `lucia` | Lucía Ferreira | Science Officer | Geology, ice drilling | `#38BDF8` |
| `rafi` | Rafi Chowdhury | Life-Support & ISRU | O₂ gen, water, greenhouse | `#E85D04` |

Each crew member has NPC AI (`crewAndRoverSim.ts`) with states: `Working`, `Resting`, `CheckingConsole`, `Alarm`, `Recovering`.

---

## 6. Junior Explorer Mode (Ages 7–12)

Defined in `src/sim/juniorData.ts`. When `CampaignState.juniorMode = true`:

### Tutorial Steps (in order)
1. `move` — Walk on Mars (WASD)
2. `inspect-rover` — Inspect Rover Bay (press E)
3. `jump-crystals` — Mars Jump Challenge (Spacebar, collect 3 crystals)
4. `gravity-card` — Mars Gravity Discovery (science card)
5. `inspect-oxygen` / `tutorial-quiz` — Check Oxygen Tank + Rusty's quiz
6. `crew-map-intro` — Crew/wrist map intro
7. `complete`

### Junior Features
- **Rusty** the rover AI companion (simplified dialogue)
- **Badges**: one per mission (`oxygen`, `sun`, `ice`, `leaf`, `shield` icons)
- **Quizzes**: A/B format per mission
- **Mini-activities**: timed interactive tasks
- **Science cards**: kid-friendly + "grown-up" toggle
- **Crystal collecting**: during jump tutorial
- `grownUpScienceOpen`: toggle for parental detail view

---

## 7. Sound Engine (from `src/utils/soundEngine.ts`)

**100% procedural Web Audio synthesis** — zero pre-recorded audio files, zero TTS.

### What is implemented (source-verified):
- Master / ambience / effects bus hierarchy
- 3-band ambient synth with Mars thin-CO₂ filter (-20 dB high-freq)
- Zone-based audio transitions: `outdoors`, `habitat`, `greenhouse`, `solar`, `tank-recycler`, `wind-field`
- EVA suit breathing cycle (PLSS fan, breath rhythm)
- Rover 3D panned motor hum + ping sonar
- Weather event rumble synth
- Habitat low-pass muffler (inside vs outside)

### What is NOT yet implemented (from enhancement plan):
- Real Mars Perseverance recording samples
- Voice-over / TTS for rover or crew dialogue
- Pre-set ambient sound profiles (wind, dust storm, etc.)

---

## 8. Outpost Layout World

### GAMEPLAY_LAYOUT Key Coordinates (source-verified from `outpostLayout.ts`)
| Module | X | Z | Notes |
|---|---|---|---|
| Habitat | 0 | 0 | Center of outpost |
| Airlock door | 0 | 8.3 | (computed via `getAirlockWorldPose`) |
| Greenhouse | 20.5 | 1.5 | Large dome, r=4.35 m |
| Skybridge | 2.43→16.22 | 0.15→1.5 | Elevated overpass at Y+3.15 m |
| Power Console | 2.8 | 7.6 | Near airlock courtyard |
| Tank Farm (O₂) | -16.5 | -5.5 | With ISRU unit |
| Rover Pad | -13.0 | 14.5 | 8×8 m, +0.12 m raised |
| Landing Pad | 24.0 | 19.5 | r=5.08 m, +0.22 m raised |
| Recycler | -8.5 | -16.5 | Water recycling |
| Radiation Shelter | 8.5 | 20.0 | Storm shelter |
| Solar Array | 15–23 | -16.5 to -22 | 6-panel field |
| Wind Turbines | -20.8,-26.8 | -13.8,-6.0 | 2 windmills + vertical |
| Ice Drill | -24.8 | 4.5 | SWIM core |
| Comms Mast | 4.0 | -15.6 | Tall mast |
| Rover Spawn | -12.6 | 14.2 | yaw=0.82 rad |
| Astro Spawn | 0.0 | 8.6 | yaw=0.92 rad |

### Road Network
- Main 4.0 m **Ring Road** encircles Habitat/CHAPEA/Airlock
- Spoke roads (3.8–4.2 m wide) to Rover Pad, Greenhouse, Landing Pad, Solar
- Service footpaths (1.8–2.0 m) to secondary stations
- **Rocks must not appear on paved surfaces** (`isOnPavedSurface()` check)
- Zero rocks within 2.2 m of road centerline

---

## 9. Test Suite Status

**Run**: `npx vitest run` from `s:\Sol Commander`

### Current Results (last run: 2026-11-15)
```
Tests:  5 failed | 20 passed (25 total)
Files:  2 failed | 1 passed (3 files)
Duration: ~12.5 s
```

### File: `src/sim/__tests__/marsPhysics.test.ts` — ✅ ALL PASSING (11/11)
All physics constant tests, jump trajectory, Rapier WASM walk test, CCD drop test.

### File: `src/sim/__tests__/p0Gameplay.test.ts` — ❌ 3 FAILING (8/11 pass)

| Test | Status | Failure Detail |
|---|---|---|
| U4: W-hold 30fps walk | ✅ PASS | — |
| U4: W-hold 60fps walk | ✅ PASS | — |
| U4: W-hold 144fps walk | ✅ PASS | — |
| U4: Stop cleanly + lope | ✅ PASS | — |
| **U4: Walk+turn, slopes/pads accel < 3 m/s²** | ❌ FAIL | `maxAccelMs2 = 5.07` (expected < 3.0) — spikes occur when player crosses the Rover Pad (+0.12 m step) or Landing Pad (+0.22 m step) while camera yaw is rotating |
| **U5: Rover MAKING_WAY + 4 s cooldown** | ❌ FAIL | `makeWayCooldownS = 0` after trigger (expected ≈ 4.0) — cooldown is set at maneuver **end** (line 996 in `crewAndRoverSim.ts`), not at trigger entry |
| **U5: Crew yield + doorway clearance + alarm slots** | ❌ FAIL | `Math.hypot(alarm.x - airDoor.x, alarm.z - airDoor.z) = 1.655` (expected >= 1.8) — alarm slots for GAMEPLAY_LAYOUT are too close to airlock door |

### File: `src/sim/__tests__/outpostVerification.test.ts` — ❌ 2 FAILING (1/3 pass)

| Test | Status | Failure Detail |
|---|---|---|
| SHOWCASE_LAYOUT C1-C7 | ❌ FAIL | C1 fails (module/collider geometry mismatch) |
| GAMEPLAY_LAYOUT C1-C7 | ❌ FAIL | C1 fails (module/collider geometry mismatch) |
| Travel-time budgets | ✅ PASS | — |

**C1-C7 Checks** (from `outpostAudit.ts`):
- C1: Module 3D bounds vs physics collider AABB match
- C2: Seam gaps between connected modules (< 0.08 m)
- C3: Doorway clearances (>= 1.25 m)
- C4: Crew pathfinding (Dijkstra nav graph reaches all stations)
- C5: Crew physics (no ground penetration during walk)
- C6: Rover collision clearance
- C7: Rock/pad parity

---

## 10. Exact Next Tasks — Priority Order

> Follow **Gravitas rules** (`GEMINI.md` and `skills/gravitas/SKILL.md`): read target files before mutating, stay in scope, provide fresh test evidence for every task.

---

### TASK 1 — Fix Rover `makeWayCooldownS` not set at trigger entry
**Priority**: P0 · **File**: `src/sim/crewAndRoverSim.ts`
**Failure**: `expect(manualRover.makeWayCooldownS).toBeCloseTo(4.0, 1)` → received `0`

**Root Cause** (source-verified, line 884–962):
When `pushTriggered || keyTriggered` fires and `state` transitions to `MAKING_WAY`, the code sets `makeWayJustStarted = true` but does **not** set `makeWayCooldownS`. It only sets `makeWayCooldownS = ROVER_MAKE_WAY_COOLDOWN_S` (line 996) when the maneuver **ends** (`remDist <= 0.08` or timer expires).

**Fix**: In the MAKING_WAY trigger block (around line 953–962), add:
```typescript
next.makeWayCooldownS = PHYSICS_CONSTANTS.ROVER_MAKE_WAY_COOLDOWN_S; // Set cooldown immediately on trigger
```

**Acceptance Criterion**:
- `expect(manualRover.makeWayCooldownS).toBeCloseTo(4.0, 1)` passes
- U5 rover test passes fully

---

### TASK 2 — Fix alarm slot distance from airlock door (GAMEPLAY_LAYOUT)
**Priority**: P0 · **File**: `src/sim/outpostLayout.ts`
**Failure**: `Math.hypot(alarm.x - airDoor.x, alarm.z - airDoor.z) = 1.655` (must be >= 1.8)

**Airlock door position** (computed by `getAirlockWorldPose` for GAMEPLAY_LAYOUT):
- Habitat at (0, 0), `airlockOffset.dx=0, dz=6.0, stepForward=2.3`
- Airlock door target ≈ (0, 8.3)

**Current GAMEPLAY_LAYOUT alarm slots** (need to verify exact positions via GAMEPLAY_LAYOUT in `outpostLayout.ts` around line 700+):

The failing crew member's alarm slot is too close. All 4 must satisfy:
```
Math.hypot(alarm.x - 0, alarm.z - 8.3) >= 1.8   // from airlock door
Math.hypot(alarm.x - ghDoor.centerX, alarm.z - ghDoor.centerZ) >= 1.8  // from GH door
```

**Fix**: Read actual GAMEPLAY_LAYOUT `alarmSlots` values (they appear after line 700 in `outpostLayout.ts`) and adjust X/Z coordinates outward from the airlock door by moving them >= 1.8 m away.

**Acceptance Criterion**:
- All 4 crew alarm slots satisfy both door-distance checks
- U5 crew/doorway test passes

---

### TASK 3 — Fix U4 acceleration spike on pad step-downs during camera turn
**Priority**: P0 · **File**: `src/sim/rapierWorld.ts`
**Failure**: `maxAccelMs2 = 5.07` (must be < 3.0) — occurs after frame 50 when player crosses pad edges

**Root Cause** (from test log and code): The player spawns at Rover Pad `(-12.8, 14.5)` which has a +0.12 m step. When stepping down off the pad while simultaneously rotating camera yaw (`yaw += 0.008` per frame), the physics step produces a velocity spike. The snap-to-ground mechanism may cause a sudden vertical velocity release that registers as a horizontal accel spike.

**Investigation required**: Search `rapierWorld.ts` for the `stepFrame` method to find where `desiredVx/vz` are computed from `camYaw` and `moveFwd`. Look for how the lerp/acceleration is applied across frame boundaries during slope/step transitions.

**Likely fix**: Clamp the per-frame speed delta to `PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS * MAX_ACCEL_RATIO` or smooth the transition over the step edge. The fix must not break U4 straight-line tests (maxAccelSpike = 0.025–0.032 during flat-ground tests).

**Acceptance Criterion**:
- `maxAccelMs2 < 3.0` for all 300 frames of the turn+walk test
- All existing U4 passing tests remain green

---

### TASK 4 — Fix outpost C1 geometry verification (SHOWCASE + GAMEPLAY)
**Priority**: P1 · **Files**: `src/debug/outpostAudit.ts`, `src/sim/outpostLayout.ts`, `src/three/outpostAssets.ts`
**Failure**: `expect(report.checks.C1.status).toBe('PASS')` → received `'FAIL'`

**What C1 checks**: Each outpost module's Three.js AABB (from `outpostAssets.ts`) must match the Rapier physics collider AABB (from `rapierWorld.ts`) within tolerance. `maxBoundsDiffM` is computed per module.

**Investigation required**:
1. Run `scripts/runStepCVerification.ts` to get the full C1 failure report with specific module IDs and mismatch amounts.
2. Check `getColliderIdsForModule()` in `outpostAudit.ts` for each failing module to ensure collider IDs match.
3. If a module's visual model was updated in `outpostAssets.ts` without updating its physics collider in `rapierWorld.ts` (or vice versa), adjust the lagging side.

**Acceptance Criterion**:
- C1–C7 all pass for both `SHOWCASE_LAYOUT` and `GAMEPLAY_LAYOUT`
- Both outpostVerification tests pass

---

### TASK 5 — Full green test suite
**Priority**: P0 (gate for Phase 2) · **Command**: `npx vitest run`

**Target**:
```
Tests:  0 failed | 25 passed (25 total)
Files:  0 failed | 3 passed (3 files)
```

After Tasks 1–4 are individually fixed and verified, run the full suite. All 25 tests must pass before any Phase 2 (UI/Visual) work begins.

---

## 11. Enhancement Plan (Phases 2–7)

Defined in `SOL-COMMANDER-Enhancement-Plan.md` in the artifacts directory.

### Phase 1 — Bug Fixes (CURRENT — in progress)
See Tasks 1–5 above.

### Phase 2 — In-Game UI / HUD Redesign
Goal: Make in-game UI engaging and child-friendly (ages 7–12).

**Problems identified** (from user):
- In-game HUD boxes (resource bars, controls, etc.) look generic/boring
- Not visually matched to the Mars/space theme
- Controls layout feels "habijabi" (scattered/random)

**Requirements**:
- Child-friendly, colorful, game-like UI panels (not flat corporate dashboards)
- Each HUD element should feel like a piece of space equipment
- Touch targets >= 48 px (accessibility)
- Animated indicators for critical states (pulsing, glowing)
- Reference image: astronaut character asset (uploaded by user — white/orange suit, Mars landscape visor reflection)

**Files to modify**: `src/components/GameplayHUD.tsx` (68 KB), `src/App.tsx`

### Phase 3 — Sound System Improvements
**Current state**: Fully procedural Web Audio synth exists (verified in `soundEngine.ts`)

**Enhancements needed**:
- Add real Mars Perseverance recording samples (NASA open-access audio)
- Layer real recordings over procedural synth
- Talking voice for rover (Rusty) — preset text-to-speech or pre-recorded lines
- More distinct zone transition audio (entering greenhouse, habitat, etc.)
- Sound cues for game events (resource warnings, mission triggers)

**Files to modify**: `src/utils/soundEngine.ts`, possibly add `src/utils/audioAssets.ts`

### Phase 4 — Character & Movement Polish
**Problems identified**:
- Character movement smoothness during slope/pad transitions (partially fixed in Task 3)
- Character animation (walk cycle, lope cycle)
- Rover interaction feel

**Files**: `src/three/outpostAssets.ts` (astronaut model), `src/sim/rapierWorld.ts`

### Phase 5 — Real Physics Verification
**Requirement**: Mars physics must feel authentic but fun.

Already implemented (source-verified):
- Froude-based walk speed (0.863 m/s)
- Suited lope (2.65 m/s)
- Rapier 120 Hz WASM physics
- Mars gravity 3.73 m/s²
- Suited jump apex ~0.59 m (verified by marsPhysics test)

Areas to check:
- Rock collision feel
- Slope traversal
- Jump-and-land feel

### Phase 6 — Mission System Enhancements
- More dramatic mission presentation animations
- Better rover hint system
- Richer after-action reviews

### Phase 7 — Junior Mode Polish
- Crystal collection visual effects
- Badge unlock animations
- Science card illustrations

---

## 12. Design Constraints & Non-Negotiable Rules

1. **Never modify `SHOWCASE_LAYOUT` coordinates** — title screen depends on exact positions.
2. **All physics constants must carry provenance tags** (`REAL`, `DERIVED`, `SIM`) matching NASA sources.
3. **Zero pre-recorded audio files** (until Phase 3 intentionally adds NASA samples) — keep the procedural engine intact.
4. **All 25 tests must pass before Phase 2** — no new features until Phase 1 is green.
5. **Target age 7–12** — all UI text, font sizes, and interaction patterns must be appropriate.
6. **48 px minimum touch targets** (accessibility requirement from `PROJECT.md`).
7. **WCAG AA contrast** required for all text.
8. **No new npm dependencies** without strong justification — the stack is already large.
9. **Gravitas rules apply** (from `GEMINI.md` + `skills/gravitas/SKILL.md`):
   - Read target files before editing
   - Stay within declared write scope
   - Provide fresh test evidence (command output) for every completion claim
   - Never exact-retry a failure without changing diagnosis

---

## 13. Known Open Issues (not yet filed as tasks)

| Issue | Location | Notes |
|---|---|---|
| C1 exact mismatch modules unknown | `outpostAudit.ts` / `outpostAssets.ts` | Need `runStepCVerification.ts` output to identify which modules fail |
| GAMEPLAY_LAYOUT alarm slot exact positions | `outpostLayout.ts` ~line 730+ | Need to read full GAMEPLAY_LAYOUT `alarmSlots` block to compute precise fixes |
| Pad step-down accel spike root cause | `rapierWorld.ts` `stepFrame()` | Exact lerp/snap logic not yet fully traced |
| Junior mode crystal rendering | `MarsOutpost3D.tsx` | Crystal collectibles referenced in `juniorData.ts` but not confirmed in 3D |

---

## 14. How to Continue

### Immediate first action
```bash
cd "s:\Sol Commander"
npx vitest run 2>&1
```
Confirm the 5 failing tests match those documented above.

### Then tackle in order:
1. Fix `makeWayCooldownS` (Task 1) — single-line fix in `crewAndRoverSim.ts`
2. Fix alarm slot distances (Task 2) — read exact GAMEPLAY_LAYOUT alarmSlots, adjust coords
3. Fix U4 accel spike on step-down (Task 3) — trace `stepFrame()` in `rapierWorld.ts`
4. Fix C1 geometry (Task 4) — run verification script, compare module AABBs
5. Run full suite, verify 25/25 green

### Gravitas Evidence Format (required for every task completion)
```markdown
## What Changed
[files modified, what exactly changed]

## Evidence
[full `npx vitest run` output showing all 25 tests pass]

## Why
[why the change resolves the specific failure]
```

---

*End of HANDOFF.md — generated from live source inspection at 2026-11-15T12:57 UTC+6*
