# Sol Commander — Engineering Handoff & Release Document

> **Release Version**: `submission-candidate-2`  
> **Status**: Verified Production Candidate  
> **Target Audience**: NASA Space Apps Challenge 2026 Evaluation Jury  
> **Architecture**: React 19 + Three.js r187 + Rapier WASM 0.21 + TailwindCSS v4 + Vite v8  

---

## 1. Quick Verification Commands

```bash
# 1. Typecheck (0 errors)
npm run lint

# 2. Production build (<1s, clean dist/)
npm run build

# 3. Unit & Headless Physics Suite (29/29 tests pass)
npm test

# 4. Strict NASA Policy & Asset Check (passes 100%)
npm run prelaunch

# 5. Local preview
npm run preview
```

---

## 2. 2-Minute Manual Review Checklist for Judges

1. **Title Screen & 3D Canvas:**
   - Open `http://localhost:4173/` (or production host).
   - Click **Start Mission**.
2. **In-Engine 28s Three.js Cinematic (Sol 1 Arrival):**
   - Watch the smooth camera pan over Olympus Mons, the parachute capsule descent, and Ares Crater Outpost.
   - Note the procedural audio beeps (no pre-rendered MP4 video).
   - Press `Space` or click **Skip Intro** at any time.
3. **Character Customization & Message from Earth:**
   - Notice the incoming radio transmission: *"Welcome to Mars, Commander. Take care of each other. We believe in you."*
   - Choose a callsign and name your rover (enforces $\le 12$ characters).
   - Click **Enter Mars Base**.
4. **Kid-Friendly Movement & Physics:**
   - Walk with `W, A, S, D` (speed pinned to Mars Froude standard $0.863\text{ m/s}$).
   - Press `Space` to jump high ($2.10\text{ m/s}$ takeoff, $1.13\text{ s}$ hang time in $3.73\text{ m/s}^2$ Mars gravity).
   - Walk into Rover Rusty: sustained push $\ge 0.6\text{ s}$ triggers the "Make-Way" yield maneuver (reverses $1.8\text{ m}$ and turns $25^\circ$).
5. **Sunset Log & Sols 2–20 Postcards:**
   - Complete the basic tutorial chores.
   - Sol 1 ends at sunset; review the Commander's Log and press **Sleep**.
   - Watch the 4 Sol postcards (Sols 3, 8, 12, 17) auto-advance.
6. **Reviewer Skip Ahead (Judge Fast-Track):**
   - Press `Escape` at any time to open the Pause Menu.
   - Click **Jump to Mission 1 (Sol 21)** or **Jump to Mission 5 (Sol 88)** to inspect any crisis.
   - Experience the 5 custom minigames (Pipe Detective, Sunlight Slider, Ice Scanner, Plant Helper, Radiation Shelter Bell countdown).
7. **Debrief Screen & Badge:**
   - View the final celebration, reflection quiz, and the compliant achievement badge:
     *"Junior Mars Commander — In-game achievement, not an official NASA certificate"*.

---

## 3. Screenshots Archive
Live screenshots captured from headless Chromium running the production build are stored in `docs/screens/`:
- `01_title_screen.png`: Outpost 3D Title screen with camera selector.
- `02_cinematic_intro.png`: In-engine Three.js splined flyover.
- `03_briefing_message_from_earth.png`: Message from Earth Mission Control & Rover Companion.
- `04_briefing_crew_setup.png`: Crew setup, callsign, and 5-mission adventure roadmap.
- `05_gameplay_tutorial_hud.png`: Futuristic visor HUD with vitals bars and step-by-step tutorial banner.
- `06_reviewer_menu.png`: Pause & Reviewer Skip Ahead menu.
- `07_mission1_active.png`: Sol 21 Oxygen Tank 2 leak investigation.
- `08_mission5_solar_storm.png`: Sol 88 Solar Flare and Ops Bunker shelter procedure.

---

## 4. Key Physics Pinning & Architectural Invariants
- `MARS_GRAVITY = 3.73` m/s²
- Astronaut total suited mass = $160\text{ kg}$ ($80\text{ kg}$ astronaut + $80\text{ kg}$ life-support suit)
- Walk speed = $0.863\text{ m/s}$, Lope speed = $2.65\text{ m/s}$, Jump velocity = $2.10\text{ m/s}$ ($0.59\text{ m}$ apex)
- Rover follow distance = $8\text{ m}$ outside, $4\text{ m}$ inside; sustained push yield = $0.6\text{ s}$, cooldown = $4.0\text{ s}$.
- Web Audio Procedural Sound Engine: 8 distinct role-pitched synthesized chimes; zero `speechSynthesis` or TTS API calls.
