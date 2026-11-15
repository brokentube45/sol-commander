# Use of AI Disclosure — Sol Commander

In accordance with the NASA Space Apps Challenge rules and AI policy:

## 1. AI Assistance During Development
- AI coding assistants (Google DeepMind Antigravity, Google AI Studio, Gemini) were utilized as assistive coding, refactoring, and code review tools for authoring TypeScript, React components, and automated physics test suites.
- Human engineers reviewed, verified, and debugged all mathematical physics equations, Rapier WASM bindings, layout geometries, and game mechanics.

## 2. In-Game Runtime AI, Audio, and Asset Policy
- **Voice & Audio System (Beeps + Subtitles by Default)**: Zero AI-generated or cloned voice models and zero Web Speech API TTS are used in the runtime game. Character dialogues use subtitles accompanied by procedural Web Audio synthesized chimes and beeps (with a one-voice-at-a-time queue and an in-game Voice / Rover Beeps On/Off toggle).
- **Intro Cutscene Video & In-Engine Fallback**: The arrival sequence plays `/assets/aistudio/sol-commandor-intro_721a1330.mp4` (user-attached project asset in `public/assets/aistudio/sol-commandor-intro_721a1330.mp4`, logged without claiming authorship) with a Skip button, and automatically falls back to the 28-second real-time in-engine Three.js camera trajectory with `SOL_COMMANDER_STORY_BIBLE.md` S0.2 captions if the video fails to load.
- **Procedural 3D Models & Textures**: All 3D meshes (outpost domes, rover rocker-bogie, suit rig, terrain heightfields) and PBR textures are algorithmically synthesized in code (`src/three/proceduralTextures.ts`, `src/three/outpostAssets.ts`).
- **Educational Simulation**: All physics parameters adhere to NASA NSSDC planetary constants and peer-reviewed locomotion literature (Carr & McGee 2009, Maurice et al. 2022).
