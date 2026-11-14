# SOL COMMANDER

An educational 3D Mars exploration and space-weather decision game designed for young explorers aged **7–12** (NASA Space Apps Challenge 2026 independent educational project).

---

## 1. Vision & Audience

- **Target Age**: 7–12 years old
- **Creative Direction**: **Stylized 3D Adventure + Approachable Sci-Fi**
- **Experience Goal**: Every screen feels like part of the same Mars outpost game world—using a single continuous full-viewport Three.js WebGL Mars Outpost scene with zero website headers or scrolling web pages.

---

## 2. Brand Design System

| Token | Hex | Usage |
| :--- | :--- | :--- |
| **Deep Space** | `#0B1D36` | Primary dark HUD frames, modal panels |
| **Night Blue** | `#1B3A5F` | Secondary surfaces, station tiles |
| **Mars Red** | `#E85D04` | Martian accent, action gradients, thermal trim |
| **Sol Gold** | `#FFB703` | Primary CTA, highlights, active beacons, indicators |
| **Ice White** | `#F8F9FA` | High-contrast readable body & display text |
| **Success Green** | `#22C55E` | Crew readiness, Bio-Dome, completed objectives |
| **Alert Red** | `#DC2626` | Caution / low-power alerts |

- **Typography**: `Orbitron` (display/headings), `Nunito` (readable body), `Rajdhani` (mission indicators)
- **Accessibility**: `48px` minimum touch targets, WCAG AA contrast, `prefers-reduced-motion` support, optional captions & voice-over, keyboard + mouse + touch navigation.

---

## 3. Game Flow Architecture

```text
Landing Screen (Title HUD + Station CAM Inspector)
  └─ [START MISSION]
       ▼
Cinematic Prologue (~34s, 5 deterministic scenes on the same 3D scene)
  ├─ Scene 1 (0–6s): A New World — "A new world. A new beginning."
  ├─ Scene 2 (6–13s): The Outpost — "Here, every bit of power matters."
  ├─ Scene 3 (13–21s): Your Mission — "Your crew is counting on you, Commander."
  ├─ Scene 4 (21–29s): The Challenge — "The Sun can change everything. Every decision matters." (+ Space Weather Advisory)
  └─ Scene 5 (29–34s): Take Command — "YOUR MISSION BEGINS NOW." (Seamless handoff behind Astronaut)
       ▼ (or [Skip Cinematic])
Mission Briefing ("OPERATION: FIRST LIGHT", Mentor: Commander Vega, Callsign selector)
  └─ [Start Exploration]
       ▼
Third-Person Gameplay + Interactive Tutorial (One instruction at a time)
  ├─ Tutorial 01: Move across Mars (WASD / Arrow Keys / Touch Pad)
  ├─ Tutorial 02: Look around (Mouse drag or look controls)
  ├─ Tutorial 03: Inspect a station near you (Press E or Click/Tap)
  ├─ Tutorial 04: Follow beacon to Outpost Power Console & press E
  └─ Tutorial 05: Balance 10 Solar Power Units across Habitat, Greenhouse & Rover
       ▼
Sol 01 Active Command
```

---

## 4. Key 3D Environment & Modules

- `src/three/proceduralTextures.ts`: Procedural multi-map PBR textures (regolith, basalt, modular hull panels, solar wafer cells, Kapton thermal foil, quilted suit fabric, contact shadows, rover nameplate).
- `src/three/marsEnvironment.ts`: Procedural sunset sky dome + custom `PMREMGenerator` environment lighting, solar-wind upper-sky aurora shader, heightfield Martian terrain (`groundHeightAt(x, z)`), 360° terraced canyon ridges, instanced rock formations, catenary power cables, beacons, weather mast, and drifting dust particles.
- `src/three/outpostAssets.ts`: Multi-part PBR models for Mars Habitat 01, Bio-Dome Greenhouse, Solar Power Arrays, ROVER-7, Junior Commander Astronaut (articulated arms/legs/visor), and the Outpost Power Console + pulsing beacon.
- `src/components/MarsOutpost3D.tsx`: Single WebGLRenderer driving all 4 camera modes (`landing`, `prologue`, `briefing`, `gameplay`), third-person movement & obstacle collision, drag-to-look, proximity detection, and power-driven lighting updates.
- `src/components/PrologueHUD.tsx`, `BriefingOverlay.tsx`, `GameplayHUD.tsx`, `PowerConsoleModal.tsx`, `TitleScreenHUD.tsx`, `Modals.tsx`: Game HUD overlays.
