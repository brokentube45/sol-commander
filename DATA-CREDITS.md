# Verified Scientific & Mission Data Credits — SOL COMMANDER: Last Habitat

This document catalogs every scientific data source, planetary model, and NASA dataset integrated into the simulation engine of **SOL COMMANDER: Last Habitat**.

---

## 1. NASA Space Weather Database Of Notifications, Knowledge, Information (DONKI)
- **API Endpoint**: `https://api.nasa.gov/DONKI/` (`FLR` Solar Flare, `SEP` Solar Energetic Particle, `CME` Coronal Mass Ejection notifications).
- **Game Usage**: Live space weather telemetry polled on campaign launch; dynamically seeds Martian radiation and solar storm risk for Mission 5 ("Storm Over the Ice").
- **Live vs. Archived Handling**: If the NASA API key is absent, rate-limited, or the client is offline, the game automatically switches to a deterministic archived dataset (`ARCHIVED_DONKI_FALLBACK` in `src/sim/nasaData.ts`) and displays `ARCHIVED` on the HUD visor so players always know the status of the data.
- **Attribution**: Space Weather Database of Notifications, Knowledge, Information (DONKI), Space Weather Laboratory, NASA Goddard Space Flight Center.

---

## 2. NASA Planetary & Atmospheric Physics Constants
- **Mars Surface Gravity**: $g = 3.73 \text{ m/s}^2$ ($\approx 38\%$ of Earth $9.81 \text{ m/s}^2$). Suited astronaut mass ($160\text{ kg} = 80\text{ kg human} + 80\text{ kg suit}$) exerts $596.8\text{ N}$ downward force on Mars vs $1,569.6\text{ N}$ on Earth.
- **Solar Irradiance**: $586.2 \text{ W/m}^2$ ($43.1\%$ of Earth's solar constant $1,361 \text{ W/m}^2$), driving power calculations for the $6\times$ solar panel field.
- **Atmospheric Pressure & Density**: Surface pressure $\sim 6.36 \text{ hPa}$ ($<1\%$ of Earth), $\rho \approx 0.016 \text{ kg/m}^3$ ($96\%\text{ CO}_2$). Dynamic wind pressure during $25 \text{ m/s}$ Martian storms is $q = \frac{1}{2}\rho v^2 \approx 5.0 \text{ Pa}$ ($\approx 76\times$ weaker than Earth).
- **Sol Length**: 88,775 seconds ($24\text{h } 39\text{m } 35\text{s}$).
- **Source**: NASA National Space Science Data Center (NSSDC) Mars Fact Sheet (Dr. David R. Williams, NASA GSFC).

---

## 3. Mars Acoustics & Sound Speed Profile
- **Two-Speed Sound Horizon**: Sound propagates at $c_{\text{low}} \approx 240 \text{ m/s}$ below $400 \text{ Hz}$ and $c_{\text{high}} \approx 250 \text{ m/s}$ above $400 \text{ Hz}$ in cold low-pressure $\text{CO}_2$, with severe high-frequency attenuation ($>20 \text{ dB/m}$ at $4 \text{ kHz}$).
- **Game Usage**: Audio engine implements Web Audio low-pass filtering and distance delay: $\tau = d / 240 \text{ s}$.
- **Source**: Maurice, S., et al. (2022). "In situ recording of Mars soundscape." *Nature*, 605, 653–658. Data from the SuperCam acoustic microphone aboard the NASA Mars 2020 Perseverance Rover.

---

## 4. Martian Regolith & Rock Distribution
- **Exponential Rock Abundance Model**: Cumulative rock fractional area $F_k(D) = k \cdot e^{-q(k) \cdot D}$, where $q(k) = 1.79 + 0.152 / k$. Rocks sampled at $k = 0.07$ (7% surface rock coverage typical of InSight/Gusev plains).
- **Source**: Golombek, M., et al. (2012). "Selection of the Mars Science Laboratory landing site." *Space Science Reviews*, 170(1–4), 641–737; Golombek & Rapp (1997), *J. Geophys. Res.*, 102(E2).

---

## 5. Locomotion & Froude Scaling Mechanics
- **Martian Gait Transition**: Walking-to-running transition determined by dynamic Froude similarity $Fr = v^2 / (g \cdot L)$.
  - Leg length $L = 0.90 \text{ m}$, suited walk speed $0.863 \text{ m/s}$, suited transition $Fr^* \approx 0.36$ ($1.099 \text{ m/s}$), unsuited transition $Fr^* \approx 0.50$ ($1.296 \text{ m/s}$), Martian lope speed $2.65 \text{ m/s}$.
  - Vertical jump mechanics: $v_0 = 2.10 \text{ m/s}$, apex $h = v_0^2 / (2g) = 0.59 \text{ m}$, hang time $t_{\text{hang}} = 2v_0 / g = 1.13 \text{ s}$.
- **Source**: Carr, C. E., & McGee, T. F. (2009). "Mars gravity simulation: Gait and locomotion." *PLoS ONE*, 4(7): e6319.

---

## 6. Mars 2020 Perseverance Rover Physical Dimensions
- **Rover Specifications**: Mass $1,025 \text{ kg}$, rocker-bogie differential suspension, 6 aluminum wheels ($0.525 \text{ m}$ diameter) with 48 curved grousers each.
- **Game Usage**: Geometry basis for companion rover Rusty (no trademarked NASA emblems or logos used).
- **Source**: NASA Jet Propulsion Laboratory (JPL) Mars 2020 Mission Technical Fact Sheets.

---

## 7. NASA Disclaimer
*SOL COMMANDER: Last Habitat is an independent educational simulation created for the NASA International Space Apps Challenge. It is not affiliated with, endorsed by, or certified by NASA.*
