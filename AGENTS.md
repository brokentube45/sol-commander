# Sol Commander — AI Agent Instructions & Architectural Map

## Project Summary
Sol Commander is an educational 3D Mars exploration and decision game designed for children (ages 7–12) built for the NASA Space Apps Challenge.
Stack: React 19, Three.js (r187), @dimforge/rapier3d-compat (WASM), Vite 8, TailwindCSS 4, Vitest.

## Key Design Principles
1. **Continuous 3D Canvas**: Every view operates within or overlays a single Three.js Canvas (`MarsOutpost3D.tsx`). No separate HTML page routing.
2. **Physics Pinning**:
   - `MARS_GRAVITY = 3.73` m/s²
   - Suited astronaut mass = 160 kg (80 kg human + 80 kg suit)
   - Walk speed = 0.863 m/s, Lope speed = 2.65 m/s, Jump velocity = 2.10 m/s (apex 0.59 m, hang time 1.13 s)
   - Rover follow distance: 8 m outside, 4 m inside; "Make Way" yield triggered after >=0.6s sustained push within 3m (reverse 1.5–2.0m, point turn 20–30° <= 0.8m/s, 4s cooldown).
3. **Audio & Voice Policy for Submission**:
   - Zero AI-generated voice or Web Speech API TTS (`speechSynthesis` must not be referenced in build).
   - Dialogues use subtitles + synthesized procedural web audio chimes/beeps with distinct pitches per character.
4. **Dialogue Ladder**:
   - Hab Computer (system alert) -> Station Owner / Crew Specialist -> Rover Rusty (kid-friendly translation/encouragement).

## Directory Structure
- `src/App.tsx`: Top-level orchestrator, state manager, mission flow, and HUD overlays.
- `src/components/`:
  - `MarsOutpost3D.tsx`: Three.js scene, Rapier physics loop, camera controllers, player controller, rover/crew rendering.
  - `GameplayHUD.tsx`: Suit visor HUD, compass, vitals bars, objective prompt, interaction hints.
  - `BriefingOverlay.tsx`, `ScienceCardModal.tsx`, `JuniorQuizCard.tsx`, `TutorialOverlay.tsx`, `DebriefScreen.tsx`: Modals & cards.
  - `hudPopupQueue.ts`: Non-overlapping popup priority queue.
- `src/sim/`:
  - `rapierWorld.ts`: Rapier WASM physics integration, character kinematic/dynamic controller, terrain heightfield, raycasting.
  - `crewAndRoverSim.ts`: Rover follower AI with Make-Way yield state machine, crew NPC avoidance.
  - `outpostLayout.ts`: Canonical outpost coordinates, module bounds, skybridges, airlocks, and alarm spots.
  - `marsPhysics.ts`: Canonical Mars gravity, atmospheric, and Froude mechanics equations.
  - `storyBeats.ts`: Data-driven narrative triggers, speaker ladder, text, and speech lines.
  - `speechNormalizer.ts`: Text normalizer ensuring voice compatibility without forbidden characters.
- `src/utils/`:
  - `soundEngine.ts`: Web Audio API procedural sound synthesizer (chimes, clicks, alerts, rover purr).

## Essential Commands
- `npm test`: Run full Vitest suite.
- `npm run lint`: Typecheck via `tsc --noEmit`.
- `npm run build`: Production bundle verification.
- `npm run prelaunch`: Strict policy and ?debug=1 check.
