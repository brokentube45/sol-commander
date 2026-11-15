# Use of AI Disclosure — Sol Commander

In accordance with the NASA Space Apps Challenge rules and AI policy:

## 1. AI Assistance During Development
- AI coding assistants (Google DeepMind Antigravity, Google AI Studio, Gemini) were utilized as assistive coding, refactoring, and code review tools for authoring TypeScript, React components, and automated physics test suites.
- Human engineers reviewed, verified, and debugged all mathematical physics equations, Rapier WASM bindings, layout geometries, and game mechanics.

## 2. In-Game Runtime AI & Asset Policy
- **Zero AI-Generated Voice or TTS**: No AI-generated or cloned voice models and no Web Speech API TTS are used in the runtime game. Character dialogues use subtitles accompanied by procedural Web Audio synthesized chimes and beeps with distinct acoustic pitch per speaker.
- **Zero Pre-rendered AI Video**: The intro cinematic is 100% computed in-engine in real time using Three.js spline camera dollies across the procedurally generated Martian outpost.
- **Zero AI-Generated Art**: All 3D meshes (outpost domes, rover rocker-bogie, suit rig, terrain heightfields) and PBR textures are algorithmically synthesized in code (`src/three/proceduralTextures.ts`, `src/three/outpostAssets.ts`).
- **Educational Simulation**: All physics parameters adhere to NASA NSSDC planetary constants and peer-reviewed locomotion literature (Carr & McGee 2009, Maurice et al. 2022).
