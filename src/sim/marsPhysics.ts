import { MARS_FACTS, PHYSICS_CONSTANTS } from './constants';

export interface LocalMarsGravityInfo {
  gravityMs2: number;
  earthRatioPct: number;
  anomalyMgal: number;
  elevationMeters: number;
  zoneLabel: string;
  explanation: string;
}

export interface MartianWindPhysics {
  windSpeedMs: number;
  airDensityKgM3: number;
  earthDensityKgM3: number;
  dynamicPressurePa: number;
  earthEquivalentPa: number;
  turbineRpm: number;
  turbineKw: number;
  turbineKwhPerSol: number;
}

export interface MarsJumpTelemetry {
  peakHeightMeters: number;
  earthPeakHeightMeters: number;
  hangTimeSeconds: number;
  earthHangTimeSeconds: number;
  heightMultiplier: number;
}

export interface MarsFreeFallMetrics {
  heightMeters: number;
  gravityMs2: number;
  fallTimeSeconds: number;
  impactSpeedMs: number;
  earthFallTimeSeconds: number;
  earthImpactSpeedMs: number;
}

export interface MarsEnvironmentSnapshot {
  localTimeLabel: string;
  airTempC: number;
  pressurePa: number;
  solarIrradianceWm2: number;
  gravity: LocalMarsGravityInfo;
  wind: MartianWindPhysics;
  lastJump: MarsJumpTelemetry | null;
}

/**
 * [DERIVED] Computes free-fall time sqrt(2h/g) and impact speed sqrt(2gh) for Mars vs Earth.
 */
export function computeFreeFallMetrics(
  heightMeters = 2.0,
  gravityMs2 = MARS_FACTS.GRAVITY_MS2,
): MarsFreeFallMetrics {
  const h = Math.max(0.01, heightMeters);
  const gMars = Math.max(1.0, gravityMs2);
  const gEarth = MARS_FACTS.EARTH_GRAVITY_MS2;
  return {
    heightMeters: h,
    gravityMs2: gMars,
    fallTimeSeconds: Math.sqrt((2 * h) / gMars),
    impactSpeedMs: Math.sqrt(2 * gMars * h),
    earthFallTimeSeconds: Math.sqrt((2 * h) / gEarth),
    earthImpactSpeedMs: Math.sqrt(2 * gEarth * h),
  };
}

/**
 * [DERIVED] Froude gait similarity speed v = sqrt(Fr * g * L).
 */
export function computeFroudeWalkSpeed(
  froude: number,
  gravityMs2 = MARS_FACTS.GRAVITY_MS2,
  legLengthM = PHYSICS_CONSTANTS.LEG_LENGTH_M,
): number {
  return Math.sqrt(Math.max(0, froude) * Math.max(0.1, gravityMs2) * Math.max(0.1, legLengthM));
}

/**
 * [DERIVED] Dynamic aerodynamic wind pressure force F = 0.5 * rho * v^2 * Cd * A.
 */
export function computeWindForceN(
  windSpeedMs: number,
  airDensityKgM3 = MARS_FACTS.MARS_AIR_DENSITY_KGM3,
  dragCoeff = 1.0,
  frontalAreaM2 = 1.0,
): number {
  return 0.5 * airDensityKgM3 * windSpeedMs * windSpeedMs * dragCoeff * frontalAreaM2;
}

/**
 * Computes realistic, spatially varying Mars surface gravity (m/s^2) combining:
 * 1. [REAL] NASA NSSDC mean Mars surface gravity: 3.730 m/s^2
 * 2. Free-air elevation gradient (~ -0.0022 m/s^2 per km; scaled gently for gameplay relief)
 * 3. Crustal mascon & buried-ice density anomalies (measured on real Mars by MRO/MGS orbiters)
 */
export function computeLocalMarsGravity(
  x: number,
  z: number,
  terrainY: number,
): LocalMarsGravityInfo {
  const baseG = MARS_FACTS.GRAVITY_MS2;

  const craterDist = Math.hypot(x + 10.5, z + 3.2);
  const craterMascon = Math.exp(-Math.pow(craterDist / 7.5, 2)) * 0.022;

  const ridgeDist = Math.hypot(x - 16.5, z + 8.5);
  const ridgeDrop = -Math.exp(-Math.pow(ridgeDist / 8.5, 2)) * 0.018;

  const elevEffect = -terrainY * 0.0065;

  const rawG = baseG + craterMascon + ridgeDrop + elevEffect;
  const gravityMs2 = Number(Math.max(3.69, Math.min(3.77, rawG)).toFixed(3));
  const anomalyMgal = Math.round((gravityMs2 - baseG) * 100000);
  const earthRatioPct = Number(((gravityMs2 / MARS_FACTS.EARTH_GRAVITY_MS2) * 100).toFixed(1));
  const elevationMeters = Math.round(terrainY * 14);

  let zoneLabel = 'Outpost Plain';
  let explanation =
    'Normal Mars gravity (~3.73 m/s², 38% of Earth). Mars gravity changes slightly from place to place!';

  if (craterDist < 8.5) {
    zoneLabel = 'Crater Ice Basin';
    explanation =
      'Slightly stronger pull! Heavy buried rock and water-ice under this crater add extra gravity.';
  } else if (terrainY > 0.65 || ridgeDist < 9.5) {
    zoneLabel = 'High Wind Ridge';
    explanation =
      'Slightly lighter pull! Standing higher up on the ridge makes gravity a tiny bit weaker.';
  } else if (Math.hypot(x - 16.8, z - 9.2) < 6.5) {
    zoneLabel = 'Landing Pad Flats';
    explanation =
      'Flat, packed ground keeps gravity steady here—great for landing rockets safely!';
  }

  return {
    gravityMs2,
    earthRatioPct,
    anomalyMgal,
    elevationMeters,
    zoneLabel,
    explanation,
  };
}

/**
 * Computes Martian thin-air aerodynamics & wind-turbine output.
 * [REAL] NSSDC Mars surface density ~0.016 kg/m^3 vs Earth sea-level 1.217 kg/m^3 (~76x thinner).
 * [SIM] 3-turbine outpost array power output anchored to wind aerodynamics.
 */
export function computeMartianWindPhysics(
  windSpeedMs: number,
  dustTau: number,
): MartianWindPhysics {
  const airDensityKgM3 = MARS_FACTS.MARS_AIR_DENSITY_KGM3;
  const earthDensityKgM3 = MARS_FACTS.EARTH_AIR_DENSITY_KGM3;
  const v = Math.max(0.5, windSpeedMs);

  const dynamicPressurePa = Number((0.5 * airDensityKgM3 * v * v).toFixed(2));
  const earthEquivalentPa = Number((0.5 * earthDensityKgM3 * v * v).toFixed(1));

  const turbineRpm = Number(Math.min(72, Math.max(8, v * 1.95)).toFixed(1));

  const stormBoost = dustTau > 1.5 ? 1.15 : 1.0;
  const rawKw = Math.min(2.4, 0.28 + Math.pow(v / 14, 1.55) * 0.72 * stormBoost);
  const turbineKw = Number(rawKw.toFixed(2));
  const turbineKwhPerSol = Math.round(turbineKw * 18);

  return {
    windSpeedMs: Number(v.toFixed(1)),
    airDensityKgM3,
    earthDensityKgM3,
    dynamicPressurePa,
    earthEquivalentPa,
    turbineRpm,
    turbineKw,
    turbineKwhPerSol,
  };
}

/**
 * [DERIVED] Computes real vertical jump physics on Mars vs Earth for a given takeoff speed (m/s).
 */
export function computeJumpTelemetry(
  takeoffVelMs: number,
  localGravityMs2: number,
): MarsJumpTelemetry {
  const gMars = Math.max(3.5, localGravityMs2);
  const gEarth = MARS_FACTS.EARTH_GRAVITY_MS2;
  const peakHeightMeters = Number(((takeoffVelMs * takeoffVelMs) / (2 * gMars)).toFixed(2));
  const earthPeakHeightMeters = Number(((takeoffVelMs * takeoffVelMs) / (2 * gEarth)).toFixed(2));
  const hangTimeSeconds = Number(((2 * takeoffVelMs) / gMars).toFixed(2));
  const earthHangTimeSeconds = Number(((2 * takeoffVelMs) / gEarth).toFixed(2));
  const heightMultiplier = Number((gEarth / gMars).toFixed(2));

  return {
    peakHeightMeters,
    earthPeakHeightMeters,
    hangTimeSeconds,
    earthHangTimeSeconds,
    heightMultiplier,
  };
}

/**
 * Computes diurnal Martian temperature, solar irradiance & LMST clock anchored to Viking 1 / MEDA [REAL].
 */
export function computeDiurnalMarsWeather(
  sol: number,
  elapsedSec: number,
  dustFactor: number,
  dustTau: number,
  terrainX: number,
  terrainZ: number,
  terrainY: number,
  activeWxWindMs?: number,
  lastJump: MarsJumpTelemetry | null = null,
): MarsEnvironmentSnapshot {
  const dayPhase = (((elapsedSec / 240 + 0.6) % 1) + 1) % 1;
  const totalMinutes = Math.floor(dayPhase * (24 * 60 + 39));
  const hh = String(Math.floor(totalMinutes / 60) % 25).padStart(2, '0');
  const mm = String(totalMinutes % 60).padStart(2, '0');

  const sunWave = Math.max(0.15, Math.sin(Math.max(0.08, dayPhase * Math.PI)));
  const tempBase = -85 + sunWave * 52 * (0.72 + 0.28 * dustFactor);
  const airTempC = Math.round(tempBase);

  const solarIrradianceWm2 = Math.round(
    MARS_FACTS.SOLAR_IRRADIANCE_WM2 * (0.35 + 0.65 * sunWave) * dustFactor,
  );

  const pressurePa = Math.round(
    MARS_FACTS.SURFACE_PRESSURE_MB * 100 + Math.sin(dayPhase * Math.PI * 2) * 18,
  );

  const baseWind = dustTau > 1.8 ? 14.8 : 6.4 + Math.sin(elapsedSec * 0.25 + sol) * 1.4;
  const windMs = activeWxWindMs ? activeWxWindMs : baseWind;

  return {
    localTimeLabel: `${hh}:${mm} LMST`,
    airTempC,
    pressurePa,
    solarIrradianceWm2,
    gravity: computeLocalMarsGravity(terrainX, terrainZ, terrainY),
    wind: computeMartianWindPhysics(windMs, dustTau),
    lastJump,
  };
}
