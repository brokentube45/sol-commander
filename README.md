# SOL COMMANDER · MARS: LAST HABITAT

> **NASA International Space Apps Challenge Entry**  
> **Audience**: Kids aged 7–12 (Junior Astronauts) and Science Educators  
> **Core Motto**: *Look. Listen. Think. Then decide.*  
> **Platform**: Continuous 3D Web Application + Installable Progressive Web App (PWA) with native mobile touch controls.

---

## 1. Project Overview

**Sol Commander // MARS: LAST HABITAT** is an educational 3D Martian outpost survival and systems-engineering simulator built for the NASA Space Apps Challenge. Stepping onto the red planet as Junior Commander Nova, players explore a life-sized Martian research outpost alongside their AI rover companion (**Rusty**) and a specialized 4-member crew.

Across **88 Martian Sols**, players manage closed-loop life support systems, navigate real aerospace dilemmas (thermal contraction fractures, electrostatic dust mitigation, water recycler contamination, and solar radiation storms), and uncover authentic planetary science.

```
                  ┌──────────────────────────────────────────────┐
                  │    SOL COMMANDER: 88-SOL CAMPAIGN LOOP      │
                  └──────────────────────────────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
  [ACT 1: Sols 01-20]            [ACT 2: Sols 21-87]             [ACT 3: Sol 88+]
  • Outpost Orientation          • Sol 21: Thermal Fracture       • Sol 88: Solar Storm
  • Routine Base Chores          • Sol 34: Dust Deposition        • Water-Jacket Shelter
  • Mars Physics Intro           • Sol 52: Recycler Breakdown     • Debrief & Badge Award
  • Sunset Telemetry Log         • Sol 67: Hydroponic Wilt        • Free-Roam Exploration
```

---

## 2. Key Features

### 🚀 Continuous 3D Canvas & Real Martian Physics
- **Rapier WASM Engine**: Integrated `@dimforge/rapier3d-compat` running real-time rigid-body dynamics and heightfield terrain collision.
- **Accurate Surface Gravity**: Martian gravity pinned at $g = 3.73 \text{ m/s}^2$ ($38\%$ of Earth's $9.81 \text{ m/s}^2$).
- **Suited Astronaut Dynamics**: $160 \text{ kg}$ total suited mass ($80 \text{ kg}$ astronaut $+ 80 \text{ kg}$ EVA suit).
- **Carr & McGee 2009 Froude Gait Mechanics**:
  - Preferred Mars walking speed: $0.863 \text{ m/s}$ (Froude $Fr \approx 0.08$)
  - Suited Martian lope speed: $2.65 \text{ m/s}$
  - Suited vertical jump: Takeoff velocity $2.10 \text{ m/s}$, apex $0.59 \text{ m}$, hang time $1.13 \text{ s}$ (vs Earth $0.23 \text{ m}$ apex / $0.43 \text{ s}$ hang time).
- **Atmospheric & Acoustic Simulation**: $6.1 \text{ mb}$ surface pressure ($\approx 76\times$ thinner than Earth air density); Mars speed of sound modeled at $240 \text{ m/s}$ (low frequency) to $250 \text{ m/s}$ (high frequency) with distance-attenuated acoustic lag.

### ⚠️ 5 Critical-Sol Systems Dilemmas (88-Sol Timeline)
Every crisis represents a real challenge documented in NASA Mars mission planning:
1. **Sol 21 — *Whisper in Tank 2* (Oxygen Line Fracture)**: Thermal contraction pipe leak; balance emergency valve isolation against crew EVA workload.
2. **Sol 34 — *Dust on the Glass* (Solar Array Adhesion)**: Electrostatic dust settlement on photovoltaic arrays; choose between mechanical wiper sweeps, vibration pulsing, or battery conservation.
3. **Sol 52 — *Filter in the Dark* (Closed-Loop Water Recycler)**: Biological biofilm clogging in Sabatier/greywater treatment; decide between manual chemical backwash or emergency rationing.
4. **Sol 67 — *Wilt in the Greenhouse* (Hydroponic Photoperiod)**: Low Martian solar irradiance ($43\%$ of Earth); optimize LED spectrum balancing and nitrate nutrient cycling.
5. **Sol 88 — *Storm Over the Ice* (Space Radiation Warning)**: Coronal Mass Ejection (CME) proton storm alert; execute the Shelter Bell protocol and retreat to the regolith water-jacket core.

### 📊 Kid-Friendly Resource Management & Assist Engine
- **4 Outpost Vitals**: Oxygen ($\text{O}_2$), Water ($\text{H}_2\text{O}$), Power ($\text{kWh}$), and Food ($\text{kg}$).
- **Gentle Junior Assist**: Clamped parameters ensure junior players never face sudden unrecoverable game-over screens. Low resources trigger calm, actionable guidance ladders.

### 🤖 Dialogue Ladder & Procedural Web Audio
- **3-Tier Narrative Ladder**: Hab Computer (system alert) $\to$ Station Specialist / Owner $\to$ Rover Rusty (kid-friendly encouraging translation).
- **Zero AI-Generated Voice / No TTS**: 100% compliant with competition rules. Dialogues feature synchronized subtitles paired with algorithmic Web Audio API musical chimes, distinct harmonic pitch signatures per character, and procedural soundscapes (wind hum, rover motor purr, suit oxygen hiss).

### 📱 Installable PWA & Responsive Mobile Touch Controls
- **Dual-Thumb Mobile Ergonomics**: Full touch support in landscape mode with automatic orientation helper.
- **Dynamic Floating Joystick**: Completely invisible (0% opacity) when idle—spawns smoothly under the left thumb upon touch, freeing up the bottom-left view of the Martian surface.
- **Ghost Action Buttons**: Compact translucent glass controls (Mars Hop, Contextual Interact, and 1P/3P Camera View).
- **Collapsible Vitals Pill**: Condensed 28px top-bar pill expands into a detailed HUD sheet on tap, keeping the central viewport and astronaut character 100% unobstructed.

---

## 3. NASA & Scientific Data Integration

The simulation automatically integrates real-world planetary physics and scientific space weather data, backed by verified archival fallbacks for offline demonstrations:

| Source / Resource | Official Endpoint or Standard | In-Game Role & Implementation |
|---|---|---|
| **NASA DONKI** | `https://api.nasa.gov/DONKI/CME` | Coronal Mass Ejection (CME) event speeds and solar storm warnings; drives Sol 88 radiation alerts. |
| **NASA Mars Fact Sheet** | NASA Goddard Space Flight Center | Martian planetary constants: $g = 3.73 \text{ m/s}^2$, surface pressure $610 \text{ Pa}$, diurnal temperature swing ($-73^\circ\text{C}$ to $+20^\circ\text{C}$). |
| **Golombek Rock Models** | Golombek et al. (Mars Pathfinder / MER) | Cumulative rock frequency distribution ($k = 0.05$ to $0.20$) governing procedural regolith boulder placement. |
| **NASA OSDR & RadLab** | NASA Open Science Data Repository | Space biological dosimetry principles; models habitat regolith and water-wall cosmic ray shielding. |
| **NASA DRA 5.0 & Artemis** | NASA SP-2009-566 / Human Landing System | Surface architecture: modular rigid inflatables, hydroponic plant growth chambers, and closed-loop Sabatier reclamation. |

---

## 4. Controls & Shortcuts

### PC (Keyboard & Mouse)
| Key / Input | Action |
|---|---|
| **W, A, S, D** | Walk across Martian surface ($0.863 \text{ m/s}$) |
| **Shift + W** | Mars lope / sprint ($2.65 \text{ m/s}$) |
| **Space** | Suited Mars jump ($2.10 \text{ m/s}$ takeoff, $0.59 \text{ m}$ apex) |
| **Mouse Drag / Look** | Look / rotate camera (click canvas to lock pointer) |
| **E** | Interact with crew, modules, airlocks, and mission zones |
| **V** | Toggle First-Person (EVA suit visor) $\leftrightarrow$ Third-Person camera |
| **F** | Toggle Mars Science Lens (surface pressure, temperature, solar flux) |
| **M** | Open Outpost Wrist Map |
| **Tab / J** | Open Commander's Mission Journal |
| **H** | Toggle on-screen keyboard control hints |
| **Esc** | Pause menu & review settings (releases pointer lock) |

### Mobile & Tablet (Touch)
| Gesture / Button | Action |
|---|---|
| **Left-Thumb Dynamic Joystick** | Spawns under thumb anywhere on lower-left screen to steer 360° |
| **Right-Screen Swipe** | Smooth 3D camera pan & pitch |
| **Hop (Arrow Icon)** | Suited low-gravity jump |
| **Act (Hand Icon)** | Appears automatically when near stations, airlocks, or crew |
| **View (Eye Icon)** | Switch between 1st-person visor and 3rd-person camera |
| **Vitals Pill (Top-Left)** | Tap to expand/collapse full life-support resource telemetry |
| **Mission Chip (Top-Right)** | Tap to expand active mission details and objectives |

---

## 5. Project Structure

```
sol-commander/
├── public/
│   ├── brand/                      # Clean vector icons and UI graphics
│   ├── manifest.webmanifest        # PWA standalone manifest configuration
│   ├── sw.js                       # Service Worker for offline asset caching
│   └── sol-commandor-intro.mp4     # Cinematic mission prologue intro
├── src/
│   ├── components/
│   │   ├── MarsOutpost3D.tsx       # Three.js scene, Rapier physics loop & camera
│   │   ├── GameplayHUD.tsx         # Responsive HUD, telemetry bars & mobile pills
│   │   ├── MobileTouchControls.tsx # Dynamic joystick & ghost thumb action buttons
│   │   ├── RoverAssistant.tsx      # Rusty companion bubble & voice personality
│   │   ├── OrientationGuard.tsx    # Landscape orientation advisor for mobile
│   │   ├── ScienceCardModal.tsx    # NASA science debrief cards & explanations
│   │   ├── JuniorQuizCard.tsx      # Socratic comprehension cards
│   │   ├── BriefingOverlay.tsx     # Mission briefing modal & decision drawer
│   │   ├── DebriefScreen.tsx       # Campaign debrief, badge award & graduation
│   │   └── TitleScreenHUD.tsx      # Start menu, PWA install prompt & credits
│   ├── sim/
│   │   ├── rapierWorld.ts          # Rapier WASM physics world, terrain & character
│   │   ├── marsPhysics.ts          # Planetary constants, diurnal cycles & Froude equations
│   │   ├── simEngine.ts            # 88-Sol campaign state reducer & assist logic
│   │   ├── missionsData.ts         # 5 Critical-Sol dilemmas, options & science notes
│   │   ├── outpostLayout.ts        # Outpost coordinates, modules & airlocks
│   │   └── crewAndRoverSim.ts      # Rover following AI & Make-Way yield state machine
│   ├── utils/
│   │   ├── soundEngine.ts          # Procedural Web Audio API sound synthesizer
│   │   ├── narrativeVoice.ts       # Synthesized character voice tones & cues
│   │   └── useTouchDevice.ts       # Device detection hook for mobile touch controls
│   ├── App.tsx                     # Main application orchestrator & phase state
│   ├── main.tsx                    # React root entry point
│   └── index.css                   # TailwindCSS 4 & typography configuration
├── scripts/
│   └── prelaunch.ts                # Policy audit & constraint verification script
├── index.html                      # Entry HTML with viewport-fit=cover & meta tags
├── package.json                    # Project dependencies & scripts
├── tsconfig.json                   # Strict TypeScript compiler options
└── vite.config.ts                  # Vite 8 configuration & TailwindCSS integration
```

---

## 6. Quick Start

### 1. Installation & Local Development
```bash
# Clone the repository
git clone https://github.com/brokentube45/sol-commander.git
cd sol-commander

# Install dependencies
npm install

# Start local Vite development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) (or the port specified in terminal) in your browser.

### 2. Testing & Quality Verification
```bash
# Run the complete automated test suite (48 tests covering physics, soft-locks, and story rules)
npm test

# Run strict TypeScript typecheck
npm run lint

# Run prelaunch compliance audit
npm run prelaunch

# Build optimized production bundle
npm run build
```

---

## 7. Reviewer & Judge Shortcuts

To facilitate rapid evaluation during judging:
- **Skip Training**: In the pause menu (**Esc** or top-bar button), select **Skip Training** to advance directly to Mission 1.
- **Mission Jumps**: Jump straight to any scenario:
  - Jump to **Mission 1 (Sol 21)**: Thermal oxygen line fracture.
  - Jump to **Mission 5 (Sol 88)**: Space radiation storm shelter alert.
- **Diagnostic Mode**: Append `?debug=1` to the URL to inspect live Rapier step timings, camera coordinates, and memory metrics.

---

## 8. Compliance & Ethical Disclosures

- **English Only**: All UI elements, hints, cards, and dialogue lines are presented in English.
- **Zero AI Voice / No Web Speech API**: All speech uses synchronized subtitles and procedural Web Audio API harmonic sound synthesizers. The codebase contains zero references to `window.speechSynthesis`.
- **Zero AI Video**: The intro video is a real in-engine rendered cinematic recording.
- **Agency Identity Compliance**: Contains no NASA, JPL, or CSA logos, official flags, or government seal imagery. In-game badges clearly state: *"Junior Mars Commander — In-game achievement, not an official NASA certificate."*
- **Independent Project**: This project was developed as an educational entry for the NASA Space Apps Challenge and is not affiliated with or endorsed by NASA.
