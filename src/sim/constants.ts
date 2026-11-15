/**
 * MARS: LAST HABITAT / SOL COMMANDER — Scientific & Simulation Constants
 *
 * Single source of truth for all planetary, physics, kinematics, and campaign constants.
 * Every constant carries an explicit provenance tag:
 * - [REAL]    Directly from a NASA or peer-reviewed source
 * - [DERIVED] Computed analytically from [REAL] values (formula documented)
 * - [SIM]     Gameplay/engineering tuning; labelled "simulation value" in player UI
 */

export type ProvenanceTag = 'REAL' | 'DERIVED' | 'SIM';

export type ResourceStatus = 'NOMINAL' | 'WARNING' | 'CRITICAL';

export type CrewMemberId = 'amara' | 'kenji' | 'lucia' | 'rafi';

export interface CrewMemberProfile {
  id: CrewMemberId;
  name: string;
  role: string;
  specialty: string;
  avatarColor: string;
  initials: string;
}

export const CREW_PROFILES: CrewMemberProfile[] = [
  {
    id: 'amara',
    name: 'Dr. Amara Nwosu',
    role: 'Medical Officer',
    specialty: 'Crew health, radiation dosimetry & stress care',
    avatarColor: '#22C55E',
    initials: 'AN',
  },
  {
    id: 'kenji',
    name: 'Kenji Sato',
    role: 'Flight Engineer',
    specialty: 'Repairs, valve isolation & Rover maintenance',
    avatarColor: '#FFB703',
    initials: 'KS',
  },
  {
    id: 'lucia',
    name: 'Lucía Ferreira',
    role: 'Science Officer',
    specialty: 'Geology, buried-ice prospecting & core sampling',
    avatarColor: '#38BDF8',
    initials: 'LF',
  },
  {
    id: 'rafi',
    name: 'Rafi Chowdhury',
    role: 'Life-Support & ISRU Engineer',
    specialty: 'Oxygen generation, water recycling & greenhouse',
    avatarColor: '#E85D04',
    initials: 'RC',
  },
];

export const MARS_FACTS = {
  /** [REAL] NASA NSSDC Mars Fact Sheet (https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) */
  GRAVITY_MS2: 3.73,
  /** [REAL] Earth standard reference gravity (NIST / NSSDC Earth Fact Sheet) */
  EARTH_GRAVITY_MS2: 9.80665,
  /** [REAL] Mean solar irradiance at Mars 586.2 W/m² = 43.1% of Earth's 1361.0 W/m² (NSSDC Mars Fact Sheet) */
  SOLAR_IRRADIANCE_WM2: 586.2,
  EARTH_SOLAR_IRRADIANCE_WM2: 1361.0,
  SOLAR_EARTH_PERCENT: 43.1,
  /** [REAL] Mean surface pressure ~6.36 mb (4.0–8.7 mb seasonal) — NSSDC Mars Fact Sheet */
  SURFACE_PRESSURE_MB: 6.36,
  /** [REAL] Current NSSDC Mars Fact Sheet surface density ~0.016 kg/m³ (older editions cite 0.020) */
  MARS_AIR_DENSITY_KGM3: 0.016,
  /** [REAL] NSSDC Earth Fact Sheet sea-level surface density 1.217 kg/m³ */
  EARTH_AIR_DENSITY_KGM3: 1.217,
  /** [REAL] Martian atmosphere scale height ~11.1 km — NSSDC Mars Fact Sheet */
  SCALE_HEIGHT_KM: 11.1,
  /** [REAL] Mean surface temperature ~210 K (-63 °C) & Viking 1 range — NSSDC */
  AVG_TEMP_C: -63,
  TEMP_RANGE_MIN_C: -89,
  TEMP_RANGE_MAX_C: -31,
  /** [REAL] Martian atmosphere CO2 share (%) — NSSDC Mars Fact Sheet */
  ATMOSPHERE_CO2_PERCENT: 96,
  /** [REAL] Mars solar day 24 h 39 m 35 s = 88,775 s — NSSDC Mars Fact Sheet */
  SOL_LENGTH_SECONDS: 88775,
  SOL_DURATION_LABEL: '24 h 39 min',
  /** [REAL] Speed of sound on Mars: ~240 m/s (<240 Hz), ~250 m/s (>240 Hz); Earth ~340 m/s — Maurice et al., Nature 605 (2022) */
  SPEED_OF_SOUND_LOW_HZ_MS: 240,
  SPEED_OF_SOUND_HIGH_HZ_MS: 250,
  EARTH_SPEED_OF_SOUND_MS: 340,
  /** [REAL] Regolith internal friction angle 30°–37° (midpoint 33°) — Sullivan et al., JGR 2011 */
  REGOLITH_FRICTION_ANGLE_DEG: 33,
  /** [DERIVED] μ = tan(33°) ≈ 0.6494 */
  REGOLITH_FRICTION_MU: Math.tan((33 * Math.PI) / 180),
  /** [REAL] One-way Earth–Mars light-time comms delay range (minutes) — NASA Mars Exploration */
  COMMS_DELAY_MIN_MINUTES: 4,
  COMMS_DELAY_MAX_MINUTES: 24,
  /** [REAL] SWIM buried mid-latitude ice depth (meters) — NASA SWIM / Putzig et al. */
  ICE_DEPTH_LABEL: '0 to >5 m buried mid-latitude ice',
  /** [REAL] Perseverance MOXIE peak O2 output (g/hr) & total produced — NASA JPL */
  MOXIE_PEAK_G_PER_HR: 12,
  /** [DERIVED] 12 g × 24 h ≈ 288 g/sol (~1/3 of 1 astronaut's 840 g/day) */
  MOXIE_DAILY_EQUIV_G: 288,
  MOXIE_TOTAL_RUN_G: 122,
  /** [REAL] Apparent angular diameter of the Sun at Mars (~21 arcmin vs ~32 arcmin on Earth) */
  SUN_ANGULAR_DIAMETER_ARCMIN: 21,
  /** [REAL] Martian forward-scattering dust asymmetry parameter g ≈ 0.7 (Pollack et al. / Tomasko et al.) */
  HG_ASYMMETRY_G: 0.7,
  /** [REAL] Phobos orbital period (~7.65 h, rises west → sets east) & Deimos orbital period (~30.3 h) */
  PHOBOS_ORBIT_HOURS: 7.65,
  DEIMOS_ORBIT_HOURS: 30.3,
  /** [REAL] Golombek et al. (2012) exponential cumulative rock abundance k values */
  GOLOMBEK_K_PLAINS: 0.05,
  GOLOMBEK_K_SANDY_HOLLOW: 0.02,
  GOLOMBEK_K_ROCKY_PATCH: 0.19,
  /** [REAL] Thin-CO2 Mars acoustic high-frequency attenuation vs 1 bar Earth air (~ -20 dB) */
  MARS_SOUND_ATTENUATION_DB: -20,
} as const;

const UNSUITED_TAKEOFF_MS_VALUE = Math.sqrt(2 * MARS_FACTS.EARTH_GRAVITY_MS2 * 0.45); // ≈ 2.97086 m/s
const SUITED_TAKEOFF_MS_VALUE = UNSUITED_TAKEOFF_MS_VALUE * Math.sqrt(80 / 160); // ≈ 2.10072 m/s
const EARTH_WALK_FROUDE_VALUE = (1.4 * 1.4) / (MARS_FACTS.EARTH_GRAVITY_MS2 * 0.9); // ≈ 0.22207

export const PHYSICS_CONSTANTS = {
  /** [SIM] Fixed Rapier physics timestep (120 Hz) */
  FIXED_DT_S: 1 / 120,
  MAX_FRAME_DT_S: 0.1,

  /** [SIM] Single-source terrain heightfield grid (170 m span, 1.0 m triangle cell resolution) */
  TERRAIN_SIZE_M: 170,
  TERRAIN_SEGMENTS: 170,
  /** [SIM] Walkable outpost crater basin radius (meters) inside canyon rim */
  WALKABLE_CENTER_X: 2.0,
  WALKABLE_CENTER_Z: -1.0,
  WALKABLE_BOUNDARY_RADIUS_M: 43.0,

  /** [SIM] Minimum solid collider thickness rules (prevents rigid/character tunneling) */
  STRUCTURE_MIN_FLOOR_THICKNESS_M: 0.3,
  STRUCTURE_MIN_WALL_THICKNESS_M: 0.2,

  /** [SIM] Player EVA character capsule dimensions (radius 0.35 m, total height 1.80 m) */
  CAPSULE_RADIUS_M: 0.35,
  CAPSULE_HALF_HEIGHT_M: 0.55,
  CAPSULE_TOTAL_HEIGHT_M: 1.8, // 2 * 0.55 + 2 * 0.35
  CONTROLLER_OFFSET_M: 0.02,
  AUTOSTEP_MAX_HEIGHT_M: 0.3,
  AUTOSTEP_MIN_WIDTH_M: 0.12,
  SNAP_TO_GROUND_M: 0.2,
  /** [REAL] Regolith angle of repose / friction angle lower bound (~30° max climbable slope) */
  MAX_SLOPE_CLIMB_DEG: 30,
  /** [DERIVED] Slide down slopes steeper than 35° (Sullivan et al., JGR 2011) */
  MIN_SLOPE_SLIDE_DEG: 35,

  /** [SIM] Commander body + xEMU-class Mars suit/PLSS masses (kg) */
  PLAYER_BODY_MASS_KG: 80,
  SUIT_PACK_MASS_KG: 80,
  /** [DERIVED] 80 kg + 80 kg = 160 kg total suited mass */
  PLAYER_TOTAL_MASS_KG: 160,
  /** [SIM] Effective leg pendulum length L for Froude similarity (m) */
  LEG_LENGTH_M: 0.9,

  /** [SIM] Earth unsuited jump apex baseline (m) */
  EARTH_UNSUITED_JUMP_APEX_M: 0.45,
  /** [DERIVED] v0 = sqrt(2 * 9.80665 * 0.45) ≈ 2.971 m/s */
  UNSUITED_TAKEOFF_MS: UNSUITED_TAKEOFF_MS_VALUE,
  /** [DERIVED] Energy-scaled suited takeoff v_suit = v0 * sqrt(80 / 160) ≈ 2.101 m/s */
  SUITED_TAKEOFF_MS: SUITED_TAKEOFF_MS_VALUE,

  /** [REAL] Earth preferred human walking speed ~1.4 m/s (Cavagna / Minetti) */
  EARTH_PREFERRED_WALK_MS: 1.4,
  /** [DERIVED] Froude number Fr = v² / (g * L) ≈ 0.2221 */
  WALK_FROUDE: EARTH_WALK_FROUDE_VALUE,
  /** [DERIVED] Mars preferred walking speed = sqrt(0.2221 * 3.73 * 0.9) ≈ 0.863 m/s */
  MARS_WALK_SPEED_MS: Math.sqrt(EARTH_WALK_FROUDE_VALUE * MARS_FACTS.GRAVITY_MS2 * 0.9),
  /** [REAL] Suited Apollo walk-to-run transition Froude Fr* ≈ 0.36 ± 0.11 — Carr & McGee, PLoS ONE 2009 */
  SUITED_TRANSITION_FROUDE: 0.36,
  /** [DERIVED] Mars suited walk-to-lope transition = sqrt(0.36 * 3.73 * 0.9) ≈ 1.099 m/s */
  MARS_SUITED_TRANSITION_MS: Math.sqrt(0.36 * MARS_FACTS.GRAVITY_MS2 * 0.9),
  /** [REAL] Unsuited walk-to-run transition Froude Fr* ≈ 0.50 — Carr & McGee 2009 */
  UNSUITED_TRANSITION_FROUDE: 0.5,
  /** [DERIVED] Mars unsuited walk-to-run transition = sqrt(0.5 * 3.73 * 0.9) ≈ 1.296 m/s */
  MARS_UNSUITED_TRANSITION_MS: Math.sqrt(0.5 * MARS_FACTS.GRAVITY_MS2 * 0.9),
  /** [SIM] Bounding lope flight-phase speed above 1.10 m/s transition (capped <= 3.0 m/s) */
  MARS_LOPE_SPEED_MS: 2.65,
  /** [SIM] Optional accessibility "Quick mode (×1.4 speed, simulation)" multiplier */
  QUICK_MODE_SPEED_MULT: 1.4,

  /** [SIM] Responsive horizontal inertia response while preserving suited momentum (s) */
  PLAYER_ACCEL_TIME_S: 0.15,
  PLAYER_DECEL_TIME_S: 0.11,
  /** [SIM] Ground contact grace window & walk/lope transition hysteresis */
  GROUND_HYSTERESIS_S: 0.08,
  GAIT_HYSTERESIS_MS: 0.1,
  /** [SIM] Anti-stuck threshold & max gentle depenetration speed */
  ANTI_STUCK_WINDOW_S: 1.0,
  ANTI_STUCK_MIN_DISP_M: 0.05,
  ANTI_STUCK_DEPEN_SPEED_MS: 1.4,

  /** [SIM] Golombek rock sizing & streamed collider thresholds (m) */
  ROCK_VISUAL_MIN_DIAMETER_M: 0.1,
  ROCK_COLLIDER_MIN_DIAMETER_M: 0.3,
  ROCK_STREAM_ENTER_RADIUS_M: 32.0,
  ROCK_STREAM_EXIT_RADIUS_M: 36.0,

  /** [SIM] Safe fall & soft landing thud thresholds (m) */
  SOFT_LANDING_THUD_MIN_HEIGHT_M: 0.22,
  SAFE_FALL_NO_DAMAGE_HEIGHT_M: 3.0,

  /** [SIM] Camera pitch clamp ±89° and first-person eye offset */
  CAMERA_PITCH_MAX_RAD: (89 * Math.PI) / 180,
  FIRST_PERSON_EYE_HEIGHT_M: 1.58,

  /** [REAL] NASA Mars 2020 Perseverance Rover specifications (science.nasa.gov/mission/mars-2020-perseverance/) */
  ROVER_MASS_KG: 1025,
  ROVER_WHEEL_DIAMETER_M: 0.525,
  ROVER_WHEEL_RADIUS_M: 0.2625,
  ROVER_WHEEL_CIRCUMFERENCE_M: Math.PI * 0.525, // ≈ 1.649 m/rev
  ROVER_GROUSERS_PER_WHEEL: 48,
  ROVER_REAL_TOP_SPEED_MS: 0.042, // 4.2 cm/s (152 m/h)

  /** [SIM] Rover companion hysteresis, make-way yielding, simulation drive speed & tilt limits */
  ROVER_PARK_START_FOLLOW_M: 8.0,
  ROVER_PARK_STOP_FOLLOW_M: 4.0,
  ROVER_SIM_DRIVE_SPEED_MS: 1.0,
  ROVER_MAKE_WAY_SPEED_MS: 0.72,
  ROVER_MAKE_WAY_TRIGGER_DIST_M: 3.0,
  ROVER_MAKE_WAY_PUSH_TIME_S: 0.6,
  ROVER_MAKE_WAY_COOLDOWN_S: 4.0,
  ROVER_SOFT_SAND_SINK_RATIO: 0.0, // Keep wheels cleanly atop regolith & road surfaces without clipping
  ROVER_TILT_WARN_DEG: 30,
  ROVER_TILT_LIMIT_DEG: 45,

  /** [SIM] Crew NPC player-yield clearance constants */
  CREW_YIELD_TRIGGER_DIST_M: 1.2,
  CREW_YIELD_SIDESTEP_M: 0.9,

  /** [SIM] EVA Suit breathing cycle period (seconds) */
  SUIT_BREATH_CYCLE_S: 4.0,
} as const;

export const SIM_CONSTANTS = {
  /** [SIM] Campaign crew size (mirrors CHAPEA 4-person crew) */
  CREW_COUNT: 4,

  /** [REAL] Daily per-crew-member consumption baselines (kg/CM/day) */
  O2_KG_PER_CM_DAY: 0.84,
  CO2_KG_PER_CM_DAY: 1.0,
  FOOD_KG_PER_CM_DAY: 0.62,
  WATER_DRINK_PREP_KG_PER_CM_DAY: 2.37,

  /** [DERIVED] 4-crew totals (kg/sol) */
  O2_CREW_USE_PER_SOL: 3.36, // 0.84 × 4
  CO2_CREW_PRODUCED_PER_SOL: 4.0, // 1.00 × 4
  FOOD_CREW_USE_PER_SOL: 2.48, // 0.62 × 4
  WATER_DRINK_PREP_PER_SOL: 9.5, // 2.37 × 4 ≈ 9.48

  /** [SIM] Hygiene water & recycler efficiency */
  WATER_HYGIENE_PER_SOL: 4.0,
  WATER_GROSS_USE_PER_SOL: 13.5, // 9.5 + 4.0
  WATER_RECYCLER_NOMINAL: 0.85,
  WATER_RECYCLER_DEGRADED: 0.4,

  /** [SIM] Supply generators */
  ISRU_O2_PRODUCTION_PER_SOL: 3.0, // at 25 kWh/sol
  ISRU_O2_POWER_COST: 25,
  GREENHOUSE_FOOD_PER_SOL: 0.8,
  GREENHOUSE_HARVEST_KG: 15, // [SIM] compressed ~20-sol harvest

  /** [SIM] Power grid loads (kWh/sol) */
  POWER_DEMAND_BREAKDOWN: {
    lifeSupport: 40,
    waterRecycler: 15,
    greenhouse: 30,
    comms: 10,
    scienceRover: 20,
    isruO2: 25,
  },
  POWER_DEMAND_TOTAL_KWH: 140,
  POWER_CLEAR_GEN_KWH: 160,
  WIND_TURBINE_NOMINAL_KWH: 14, // [SIM] 3-turbine thin-air wind microgrid backup
  WIND_TURBINE_STORM_KWH: 34, // [SIM] storm gusts supplement solar dips
  BATTERY_CAPACITY_KWH: 300,

  /** [DERIVED] Opportunity Sols 5105–5107 dust-opacity power fractions */
  DUST_TAU_1_FACTOR: 1.0,
  DUST_TAU_2_1_FACTOR: 0.74, // 345 / 468 Wh
  DUST_TAU_3_FACTOR: 0.28, // 133 / 468 Wh
  /** [REAL] Settled dust lag after severe storm */
  DUST_SETTLING_LAG_SOLS: 21,
  /** [SIM] Post-storm panel cleaning bonus */
  CLEAN_PANELS_BONUS: 0.25,

  /** [REAL] Surface Galactic Cosmic Rays (GCR) dose rate (mSv/day) */
  SURFACE_GCR_MSV_PER_DAY: 0.67,
  /** [SIM] Habitat shielding multiplier (0.5 -> 0.335 mSv/sol inside) */
  HABITAT_SHIELDING_FACTOR: 0.5,
  /** [REAL] NASA career astronaut radiation limit (mSv) */
  CAREER_RADIATION_LIMIT_MSV: 600,
  /** [REAL] Solar particle event limit (mSv, NASA-STD-3001) */
  EVENT_RADIATION_LIMIT_MSV: 250,
  EVENT_RADIATION_WARN_MSV: 100,

  /** [SIM] Initial Critical Sol 1 levels */
  START_SOL: 21,
  START_OXYGEN_KG: 60,
  START_WATER_KG: 220,
  START_FOOD_KG: 90,
  START_BATTERY_KWH: 240,
  START_CREW_HEALTH: 100,
  START_CREW_STRESS: 20,
  START_CAREER_DOSE_MSV: 15, // [SIM] baseline prior surface/transit fraction for mission window
  START_SPARE_PARTS: 3,
  START_EMERGENCY_WATER_KG: 60,
  START_EMERGENCY_FOOD_KG: 20,
  START_EMERGENCY_O2_KG: 8,
  CREW_SLOTS_PER_SOL: 4,

  /** [SIM] Resource thresholds */
  THRESHOLDS: {
    oxygen: { warn: 30, crit: 12 },
    water: { warn: 100, crit: 40 },
    food: { warn: 40, crit: 15 },
    battery: { warn: 80, crit: 30 },
  },
} as const;

export const SCORE_WEIGHTS = {
  crewSafety: 35,
  resourceEfficiency: 20,
  missionObjectives: 15,
  decisionQuality: 20,
  exploration: 10,
} as const;

export function getResourceStatus(
  kind: 'oxygen' | 'water' | 'food' | 'battery',
  value: number,
): ResourceStatus {
  const { warn, crit } = SIM_CONSTANTS.THRESHOLDS[kind];
  if (value < crit) return 'CRITICAL';
  if (value < warn) return 'WARNING';
  return 'NOMINAL';
}

export function computeDaysLeft(
  kind: 'oxygen' | 'water' | 'food' | 'battery',
  value: number,
  dailyNetBurn?: number,
): number {
  if (value <= 0) return 0;
  let rate = dailyNetBurn;
  if (rate === undefined) {
    if (kind === 'oxygen') rate = SIM_CONSTANTS.O2_CREW_USE_PER_SOL;
    else if (kind === 'water')
      rate = SIM_CONSTANTS.WATER_GROSS_USE_PER_SOL * (1 - SIM_CONSTANTS.WATER_RECYCLER_NOMINAL);
    else if (kind === 'food') rate = SIM_CONSTANTS.FOOD_CREW_USE_PER_SOL;
    else rate = SIM_CONSTANTS.POWER_DEMAND_TOTAL_KWH;
  }
  if (rate <= 0) return 99;
  return Math.max(0, Math.floor(value / rate));
}

export function dustFactorFromTau(tau: number): number {
  if (tau <= 1.0) return SIM_CONSTANTS.DUST_TAU_1_FACTOR;
  if (tau < 2.5) return SIM_CONSTANTS.DUST_TAU_2_1_FACTOR;
  return SIM_CONSTANTS.DUST_TAU_3_FACTOR;
}
