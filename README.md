# SOL COMMANDER · MARS: LAST HABITAT

> **NASA International Space Apps Challenge Entry**  
> **Audience**: Kids aged 7–12 and educators  
> **Theme**: *Look. Listen. Think. Then decide.*

---

## 1. Project Overview

**Sol Commander** is an educational 3D Mars exploration and decision game where players step onto the surface of Mars as Junior Commander Nova. Together with your companion rover (default **Rusty**) and a specialized 4-member crew, you must manage life-support resources across **88 Martian Sols** in the face of realistic space weather, dust storms, thermal expansion leaks, and solar radiation events.

### Key Pillars
- **Real Physics & Science**: Mars surface gravity ($3.73\text{ m/s}^2$), Froude locomotion scaling ($0.863\text{ m/s}$ walk, $2.65\text{ m/s}$ lope, $2.10\text{ m/s}$ jump apex $0.59\text{ m}$), thin CO₂ atmospheric drag ($\approx 76\times$ weaker than Earth), and Mars speed of sound ($240\text{ m/s}$).
- **Story-Driven Progression**: Act 1 introduces the base gently through crew chores, ambient sound foreshadowing, sunset log, and Sol postcards time-lapse before triggering five real-cause emergencies (Sols 21, 34, 52, 67, 88).
- **Kid-Friendly Narrative & Speaker Ladder**: Subtitles paired with procedural Web Audio chimes for each character (Hab Computer $\to$ System Specialist $\to$ Rover Rusty). Zero rush words.
- **Strict Compliance**:
  - English-only player-facing UI and speech text.
  - Zero AI-generated voice or Web Speech API TTS.
  - Zero pre-rendered AI video (100% in-engine Three.js cinematic).
  - No NASA/JPL logos, flags, or official agency certificates.
  - Badge disclaimer: *"Junior Mars Commander — In-game achievement, not an official NASA certificate."*

---

## 2. Controls & Reviewer Shortcuts

### Movement & Interaction
| Key | Action |
|---|---|
| **W, A, S, D** / Touch D-Pad | Walk / Lope across Mars surface |
| **Space** | Low-gravity suited Mars jump ($0.59\text{ m}$ apex, $1.13\text{ s}$ hang time) |
| **Mouse Look** / Touch Drag | Turn view (single click to lock cursor) |
| **E** | Inspect station / Interact with crew / Action |
| **V** | Toggle First-Person (EVA suit arms) $\leftrightarrow$ Third-Person camera |
| **Tab** | Open Commander's Log & Sol Postcards |
| **Esc** | Pause menu (releases mouse lock) |
| **C** | Quick Action menu |
| **F** | Mars Science Lens (inspect environmental sensors) |

### Reviewer / Judge Shortcuts
In the Pause Menu (**Esc**), reviewers can skip ahead at any time:
- **Skip Training**: Jumps straight from tutorial to Mission 1.
- **Jump to Mission 1 (Sol 21)**: "Whisper in Tank 2" (thermal contraction pipe leak & shut-off valves).
- **Jump to Mission 5 (Sol 88)**: "Storm Over the Ice" (space radiation warning & water-jacket storm shelter).

---

## 3. Technology Stack

- **UI & Framework**: React 19, TypeScript 5.8
- **3D Graphics**: Three.js (r187), custom shaders for Martian butterscotch sky & Henyey-Greenstein solar halo
- **Physics**: `@dimforge/rapier3d-compat` (WASM physics engine), rigid-body character controller, terrain heightfield
- **Audio Engine**: Web Audio API procedural sound synthesizer (ambient wind, suit breathing, rover motor, and speaker chimes)
- **Styling**: TailwindCSS 4, Framer Motion
- **Tooling**: Vite 8, Vitest

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js 20+ or Bun

### Installation & Execution
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run full Vitest test suite (29 tests)
npm test

# Run TypeScript type check
npm run lint

# Run prelaunch policy and constraint verification
npm run prelaunch

# Build production bundle
npm run build
```

---

## 5. Provenance & External Assets
All geometry, textures, shaders, and sound effects are algorithmically synthesized in code. External NASA planetary constants are logged in `docs/ASSET-LOG.md`. AI disclosure is documented in `AI_USE.md`.
