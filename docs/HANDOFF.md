# Sol Commander — Engineering Handoff & Release Document

> **Release Version**: `submission-candidate-2`  
> **Status**: Verified Production Candidate  
> **Target Audience**: NASA International Space Apps Challenge Evaluation Jury  
> **Architecture**: React 19 + Three.js r187 + Rapier WASM 0.21 + TailwindCSS v4 + Vite v8  

---

## 1. Quick Verification Commands

```bash
# 1. Typecheck (0 errors)
npm run lint

# 2. Production build (<1s, clean dist/)
npm run build

# 3. Unit & Headless Physics Suite (31/31 tests pass)
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
2. **Cinematic Intro (Sol 1 Arrival):**
   - Watch the arrival sequence over Olympus Mons, the lander descent, and Ares Crater Outpost (with fallback to the 28 s in-engine Three.js cinematic if the video fails to load).
   - Press `Space` or click **Skip Intro** at any time.
3. **Character Customization & Message from Earth:**
   - Notice the incoming radio transmission: *"Welcome to Mars! Take care of your crew and your home."*
   - Choose a callsign and name your rover (enforces $\le 12$ characters).
   - Click **Enter Mars Base**.
4. **Kid-Friendly Movement, First-Person Default & Path Guide:**
   - Gameplay starts in First-Person (`1p`) by default at the Habitat Airlock (press `V` to toggle Third-Person).
   - Walk with `W, A, S, D` (speed pinned to Mars Froude standard $0.863\text{ m/s}$).
   - Follow the glowing ground chevron arrows to each active objective (toggle with `G` or the HUD **Guide: On / Guide: Off** button).
   - Press `Space` to jump high ($2.10\text{ m/s}$ takeoff, $1.13\text{ s}$ hang time in $3.73\text{ m/s}^2$ Mars gravity).
   - Walk into Rover Rusty: sustained push $\ge 0.6\text{ s}$ triggers the "Make-Way" yield maneuver (reverses $1.8\text{ m}$ and turns $25^\circ$).
5. **Sunset Log & Sols 2–20 Postcards:**
   - Complete the basic tutorial chores (Greenhouse $\to$ Solar Field $\to$ Habitat Core) and the Tank 2 check (`S1.6`).
   - Sol 1 ends at sunset; review the Commander's Log and press **Sleep — Next Sol**.
   - Watch the Sol postcards auto-advance.
6. **Reviewer Skip Ahead (Judge Fast-Track):**
   - Press `Escape` at any time to open the Pause Menu.
   - Click **Jump to Mission 1 (Sol 21)** or **Jump to Mission 5 (Sol 88)** to inspect any crisis.
   - Experience the 5 custom minigames (Pipe Detective, Sunlight Slider, Filter Fit + Ice Scanner, Plant Helper + Thermostat Fix, Shield Builder + Shelter Bell countdown).
7. **Debrief Screen & Badge:**
   - View the final celebration, reflection quiz, and the compliant achievement badge:
     *"Junior Mars Commander — In-game achievement — not an official NASA certificate."*

---

## 3. Deliberate Human Change from Story Bible Section 6 (Kid-Friendly Path Guide)
Per explicit human design direction (Item B), the ground path guide is **available from the start of gameplay (`0 s`)** rather than waiting `240 s`:
- **Ground Chevron Arrows (`THREE.InstancedMesh`)**: Flowing chevron arrows along walkable outpost roads/plazas from the player to the single `activeObjective` (within $\sim 40\text{ m}$, fading out within $3\text{ m}$ of the target so only the objective ring remains).
- **Screen-Edge Turning Arrow & Distance Label**: Shows turning direction when off-screen and distance in meters (`"23 m"`, with no extra text).
- **Toggle**: Key `G` and HUD button **Guide: On / Guide: Off** (default `On`). Respects `prefers-reduced-motion` (static arrows, no flowing pulse).
- **Rusty's Guidance Ladder Retained**: Rusty still offers a gentle hint question at `60 s` and rolls toward the objective at `120 s`.

---

## 4. Key Physics Pinning & Architectural Invariants
- `MARS_GRAVITY = 3.73` m/s²
- Astronaut total suited mass = $160\text{ kg}$ ($80\text{ kg}$ astronaut + $80\text{ kg}$ life-support suit)
- Walk speed = $0.863\text{ m/s}$, Lope speed = $2.65\text{ m/s}$, Jump velocity = $2.10\text{ m/s}$ ($0.59\text{ m}$ apex)
- Rover follow distance = $8\text{ m}$ outside, $4\text{ m}$ inside; sustained push yield = $0.6\text{ s}$, cooldown = $4.0\text{ s}$.
- Web Audio Procedural Sound Engine: 8 distinct role-pitched synthesized chimes; zero `speechSynthesis` or TTS API calls.

