# Asset & Provenance Log — MARS: LAST HABITAT (SOL COMMANDER)

All runtime visuals, textures, 3D geometries, and audio in this project are either **100% procedurally generated in code** or **real NASA public-domain mission specifications/APIs**. No external `.glb`, `.mp3`, `.wav`, or TTS/AI-generated voice/video assets are used, and zero NASA/JPL logos, insignias, flags, or mission patches appear on any surface.

## 1. Scientific & Mission Data Sources (Text & Numerical Constants Only)
- **Planetary Facts (Mars vs Earth)**: NASA NSSDC Mars Fact Sheet (`g = 3.73 m/s²`, solar irradiance `586.2 W/m² = 43.1%`, surface pressure `~6.36 mb`, air density `~0.016 kg/m³`, sol length `88,775 s`, CO₂ `96%`).
- **Mars Acoustics**: Maurice et al., *Nature* 605 (2022) / NASA Perseverance SuperCam microphone (`c_low ≈ 240 m/s`, `c_high ≈ 250 m/s`, high-frequency CO₂ attenuation).
- **Perseverance Rover Reference Geometry**: NASA Mars 2020 Perseverance specifications (`mass = 1,025 kg`, `6 × 0.525 m` wheels, `48 grousers/wheel`, `0.042 m/s` real top drive speed). No official badges or plates used.
- **Golombek Rock Abundance Model**: Golombek et al., *J. Geophys. Res.* (2012) exponential cumulative rock fraction `F_k(D) = k · exp(-q(k) · D)` with `q(k) = 1.79 + 0.152 / k`.
- **EVA Gait & Locomotion Froude Scaling**: Carr & McGee, *PLoS ONE* (2009) suited walk-to-run transition `Fr* ≈ 0.36`, unsuited `Fr* ≈ 0.50`, preferred Earth walk `Fr ≈ 0.222`.
- **Regolith Mechanics**: Sullivan et al., *J. Geophys. Res.* (2011) internal friction angle `30°–37°` (`33°` midpoint).
- **Live Space Weather Feed**: NASA DONKI API (`FLR` / `SEP` / `CME`) with deterministic archived fallback (`src/sim/nasaData.ts`).

## 2. Procedural 3D Models (`src/three/`)
- `src/three/marsEnvironment.ts`:
  - Dual-layout heightfield terrain (`SHOWCASE_LAYOUT` `170 m × 170 m` hero crater; `GAMEPLAY_LAYOUT` `180 m × 180 m` with flattened `90 m × 90 m` graded base pad, vertex-blended compacted road shoulders, and outer canyon ridge rings & mesas beyond `48 m`).
  - Martian butterscotch atmospheric sky dome shader + Henyey–Greenstein (`g = 0.7`) blue forward-scattering halo around a `~21 arcmin` solar disc + `dustTau` attenuation.
  - Procedural Phobos (`7.65 h` W→E orbit) and Deimos (`30.3 h` orbit) celestial bodies.
  - `InstancedMesh` stratified outcrops & angular volcanic basalt boulders sampled via Golombek `F_k(D)` and cleared from roads, paths, and station pads in gameplay.
- `src/three/outpostAssets.ts`:
  - Shared module builders instantiated from `SHOWCASE_LAYOUT` (landing/prologue/briefing compact view) or `GAMEPLAY_LAYOUT` (spacious connected gameplay base): Habitat 01 dome, airlock vestibule & suit vestibule link, CHAPEA crew wing, elevated pressurized skybridge overpass (`>= 2.2 m` clear underpass) with attachment collars & piers, Hydroponic bio-dome (expanded `4.5 m` radius in gameplay with dwarf orchard trees, multi-tier LED grow racks, tomato/pepper planters, aeroponic mist tower, soil workbench), `6×` Solar array + battery bank, Wind turbines, SWIM Ice Drill derrick, Ares landing pad, Rover charging pad, tall Comms/Weather mast, batched `4.0 m` Ring Road / `3.8 m` Spoke Roads / `1.8–2.0 m` Footpaths, instanced road kerbs & amber solar bollards, text-only base signposts, raised pipeline bridge, and bevelled cable ramps.
  - Suit Explorer Rig (Commander + 4 autonomous EVA Crew NPCs `AN`, `KS`, `LF`, `RC`): closed EVA pressure helmet with reflective gold polycarbonate sun visor, anodized neck seal collar, helmet lights, PLSS backpack + antenna, DCM chest display, lower-leg Martian dust gradient.
  - 6-Wheel Rocker-Bogie Rover Rig: articulated left/right rocker-bogie pivots, top differential bar, `0.525 m` 48-grouser procedural wheels, stereo camera mast, folded 5-DOF sample arm + turret, dynamic text nameplate.
  - First-person gloved EVA view-model arms (`firstPersonScene`, depth-cleared pass).

## 3. Procedural PBR Textures (`src/three/proceduralTextures.ts`)
- Canvas-generated albedo, normal, roughness, and AO maps (`hullPanel`, `solarWafer`, `thermalFoil`, `marsRegolith`, `martianRock`, `suitFabric`, `roverWheel` 48-grouser tread & curved spokes, `roadSurface` compacted regolith & amber shoulder stripe textures, `outpostSign` high-contrast slate/amber text-only CanvasTexture plaques with zero agency logos/flags/patches, `chestDisplay`, twin-peak explorer emblem badge).

## 4. Procedural Web Audio (`src/utils/soundEngine.ts`)
- Zero TTS (`window.speechSynthesis` completely absent).
- 100% Web Audio API synthesis: Master/Ambience/Effects mixer buses, outside muffled thin-air filter vs Habitat interior hum & airlock hiss, ~4 s EVA suit breathing + vent fan, physics-synced footsteps, hang-time landing thud, and distance-delayed (`d / 240 s`) spatial `PannerNode` rover motor/beeps.

## 5. Image Assets (`src/assets/images/`)
- `card_discover_sun_1794588148484.jpg`
- `card_explore_mars_1794588147230.jpg`
- `card_survive_outpost_1794588148605.jpg`
(Educational briefing cards bundled locally; zero runtime external image fetches.)
