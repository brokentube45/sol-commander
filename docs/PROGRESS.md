# Sol Commander — Implementation Progress Log

**Started at**: 2026-11-15T16:36:00+06:00 (T0)  
**Baseline Git Tag**: `pre-fix-T0`  
**Target Completion**: T0 + 2h 50m (approx. 19:26:00+06:00)

---

## Phases & Deliverables Checklist

- [x] **Phase 0: Setup, Baseline, Codebase Map** (T0 to T0 + 0:10)
  - [x] Check git clean state & create tag `pre-fix-T0`
  - [x] Run baseline tests (25/25 passed) and build (`vite build` succeeded in 803ms)
  - [x] Create `docs/PROGRESS.md`
  - [x] Create `AGENTS.md`
  - [x] Update `docs/HANDOFF.md`

- [ ] **Phase 1: Game-Breaking Bugs** (Target: T0 + 1:00)
  - [ ] 1A: Smooth continuous walking (U4) — verified polled input, continuous speed 0.863 m/s, zero jitter
  - [ ] 1B: Rover & crew yielding (U5) — make-way yield, 4s cooldown, frictionless contact, non-trapping
  - [ ] 1C: Popup priority queue & reserved HUD zones (U1) — P0 critical > P1 modal > P2 tutorial > P3 Rusty chatter > P4 toasts, no overlap

- [ ] **Phase 2: Story, Voices and Text** (Target: T0 + 2:00)
  - [ ] 2A: Story beats data table (`src/sim/storyBeats.ts`) matching Section 9.1
  - [ ] 2B: Speaker ladder + procedural synthesized beeps/chimes (Hab AI, Rafi, Amara, Kenji, Lucía, Rusty)
  - [ ] 2C: Zero TTS in submission build (remove Web Speech API references for `npm run prelaunch` compliance)
  - [ ] 2D: Act 1 rewrite (Look, Move, Jump, Gravity card, Chores, Tank 2 faint tick-hiss, Air quiz, Sunset log, Sol 2-20 postcards)
  - [ ] 2E: Missions 1-5 rewrite (M1 Tank 2 leak, M2 Dust storm, M3 Water ice & perchlorates, M4 Greenhouse frost, M5 Global storm)
  - [ ] 2F: Speech normalizer (`src/sim/speechNormalizer.ts`) and unit lint tests
  - [ ] 2G: Wording cleanup ("fracture" -> "crack", no "deadly", no "Starship", Junior badge disclaimer)
  - [ ] 2H: Guidance ladder (pulse marker -> hint -> rolls -> dotted path)

- [ ] **Phase 3: Intro and Camera** (Target: T0 + 2:30)
  - [ ] 3A: In-engine 28s Three.js cinematic camera dolly/pan (U3) with captions and skip
  - [ ] 3B: Remove pre-rendered video intro from build and Start flow
  - [ ] 3C: First-person gloved suit arms view + non-clipping spring-arm third-person (V key)
  - [ ] 3D: Pointer lock on click, Escape pause menu

- [ ] **Phase 4: Futuristic Visor HUD Style** (Target: T0 + 2:30)
  - [ ] Chamfered angular clip-path panels, corner accents, body text >= 16px, readable HUD

- [ ] **Phase 5: Final Verification & Release Artifacts** (Target: T0 + 2:50)
  - [ ] Unit tests, typecheck (`tsc --noEmit`), `npm run build`, `npm run prelaunch`
  - [ ] Reviewer shortcuts in pause menu
  - [ ] Policy scan (English only, no NASA logos, no TTS)
  - [ ] `README.md`, `AI_USE.md`, `docs/SUBMISSION-TEXT.md`, `docs/DEMO-SCRIPT.md`
  - [ ] Git tag `submission-candidate` and final report starting with "HONEST STATUS"
