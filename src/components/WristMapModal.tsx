import { Compass, MapPin, Navigation, ShieldAlert, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CREW_PROFILES, CrewMemberId, PHYSICS_CONSTANTS } from '../sim/constants';
import { MissionDefinition, MissionZoneId } from '../sim/missionsData';
import { GAMEPLAY_LAYOUT } from '../sim/outpostLayout';

export interface TelemetryCrewDot {
  id: CrewMemberId;
  name: string;
  color: string;
  x: number;
  z: number;
}

export interface GameplayPoseTelemetry {
  x: number;
  z: number;
  headingDeg: number;
  speedMs: number;
  roverX: number;
  roverZ: number;
  crewDots: TelemetryCrewDot[];
}

interface WristMapModalProps {
  open: boolean;
  onClose: () => void;
  telemetry: GameplayPoseTelemetry;
  activeMission: MissionDefinition;
  weatherAlertActive: boolean;
  quickMode: boolean;
  roverName: string;
  reducedMotion: boolean;
}

const STATION_LABELS: Array<{
  id: string;
  label: string;
  x: number;
  z: number;
  w?: number;
  h?: number;
  r?: number;
  kind: 'core' | 'pad' | 'sector';
  zoneId?: MissionZoneId;
}> = [
  { id: 'habitat', label: 'Habitat 01', x: 0, z: 0, r: 3.1, kind: 'core' },
  { id: 'chapea', label: 'CHAPEA Wing', x: 0, z: -6.4, w: 4.8, h: 3.5, kind: 'core' },
  { id: 'airlock', label: 'Airlock', x: 0, z: 6.2, w: 2.0, h: 2.6, kind: 'core' },
  {
    id: 'greenhouse',
    label: 'Greenhouse',
    x: 20.5,
    z: 1.5,
    r: 4.5,
    kind: 'sector',
    zoneId: 'greenhouse',
  },
  { id: 'solar', label: 'Solar Field', x: 19.0, z: -19.2, w: 10.5, h: 8.2, kind: 'sector', zoneId: 'solar' },
  { id: 'tank2', label: 'Tank Farm', x: -16.5, z: -5.5, w: 4.6, h: 2.4, kind: 'sector', zoneId: 'tank2' },
  { id: 'recycler', label: 'Water Bay', x: -8.5, z: -16.5, w: 2.6, h: 2.0, kind: 'sector', zoneId: 'recycler' },
  { id: 'shelter', label: 'Rad Shelter', x: 8.5, z: 20.0, w: 3.2, h: 2.4, kind: 'sector', zoneId: 'shelter' },
  { id: 'rover-pad', label: 'Rover Pad', x: -13.0, z: 14.5, w: 8.0, h: 8.0, kind: 'pad' },
  { id: 'landing-pad', label: 'Landing Pad', x: 24.0, z: 19.5, r: 5.08, kind: 'pad' },
  { id: 'ice-drill', label: 'Ice Drill', x: -24.8, z: 4.5, r: 2.2, kind: 'sector' },
  { id: 'windmills', label: 'Wind Field', x: -23.5, z: -10.2, w: 6.0, h: 8.5, kind: 'sector' },
  { id: 'comms', label: 'Weather Mast', x: 4.0, z: -15.6, r: 1.2, kind: 'sector' },
  { id: 'console', label: 'Power Desk', x: 2.8, z: 7.6, r: 1.0, kind: 'core' },
];

export function WristMapModal({
  open,
  onClose,
  telemetry,
  activeMission,
  weatherAlertActive,
  quickMode,
  roverName,
  reducedMotion,
}: WristMapModalProps) {
  const activeGoal = weatherAlertActive
    ? GAMEPLAY_LAYOUT.destinationWaypoints.airlock
    : {
        label: activeMission.zoneLabel,
        x: GAMEPLAY_LAYOUT.zoneCoords[activeMission.zoneId].x,
        z: GAMEPLAY_LAYOUT.zoneCoords[activeMission.zoneId].z,
      };

  const goalDistM = Math.round(
    Math.hypot(activeGoal.x - telemetry.x, activeGoal.z - telemetry.z),
  );
  const walkSpeed =
    PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS * (quickMode ? PHYSICS_CONSTANTS.QUICK_MODE_SPEED_MULT : 1);
  const walkEtaS = Math.max(1, Math.round(goalDistM / walkSpeed));
  const lopeEtaS = Math.max(
    1,
    Math.round(
      goalDistM /
        (PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS * (quickMode ? PHYSICS_CONSTANTS.QUICK_MODE_SPEED_MULT : 1)),
    ),
  );

  const gridLines = [-30, -20, -10, 0, 10, 20, 30];

  return (
    <AnimatePresence>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="EVA Wrist Tablet Outpost Map"
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#040B16]/75 p-4 backdrop-blur-sm font-[family-name:var(--font-game)]"
          onClick={onClose}
        >
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 border-[#38BDF8]/65 bg-[#071324]/96 shadow-[0_0_48px_rgba(56,189,248,0.28)]"
          >
            {/* Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0B1D36]/90 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#38BDF8]/15 text-[#38BDF8]">
                  <Compass className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#F8F9FA] leading-tight">
                    Outpost Surface Map · 90 m × 90 m Base Pad
                  </h2>
                  <p className="text-[11px] font-semibold text-[#38BDF8]/90 tabular-nums">
                    Grid: 10 m squares · You: ({telemetry.x.toFixed(1)} m, {telemetry.z.toFixed(1)} m) · Heading{' '}
                    {Math.round(telemetry.headingDeg)}°
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-white/15 bg-[#0E2038] px-3 text-xs font-bold text-[#F8F9FA] hover:border-[#FFB703] hover:text-[#FFB703] cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span>Close [M]</span>
              </button>
            </div>

            {/* Body: Top-Down SVG Map + Live Waypoint Legend */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_270px]">
              <div className="relative bg-[#130C0E] p-3">
                <svg
                  viewBox="-35 -31 70 62"
                  className="h-auto w-full max-h-[66vh] rounded-xl border border-[#E85D04]/35 bg-[#1B1211]"
                  role="img"
                  aria-label="Top-down schematic map of the Mars Outpost"
                >
                  <defs>
                    <radialGradient id="padGlow" cx="50%" cy="50%" r="55%">
                      <stop offset="0%" stopColor="#3B2118" stopOpacity="0.95" />
                      <stop offset="85%" stopColor="#261613" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#180E0D" stopOpacity="1" />
                    </radialGradient>
                  </defs>

                  {/* Graded 90m Base Pad */}
                  <rect x="-35" y="-31" width="70" height="62" fill="url(#padGlow)" />

                  {/* 10 m Dashed Engineering Grid */}
                  {gridLines.map((g) => (
                    <g key={`grid-${g}`}>
                      <line
                        x1={g}
                        y1={-31}
                        x2={g}
                        y2={31}
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={0.14}
                        strokeDasharray="0.6 0.6"
                      />
                      <line
                        x1={-35}
                        y1={g}
                        x2={35}
                        y2={g}
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={0.14}
                        strokeDasharray="0.6 0.6"
                      />
                    </g>
                  ))}

                  {/* Walkable Crater Boundary Hint */}
                  <circle
                    cx={0}
                    cy={0}
                    r={33}
                    fill="none"
                    stroke="rgba(232,93,4,0.22)"
                    strokeWidth={0.22}
                    strokeDasharray="1.2 1.2"
                  />

                  {/* Roads, Spokes & Service Footpaths */}
                  {GAMEPLAY_LAYOUT.roads.map((seg) => (
                    <line
                      key={seg.id}
                      x1={seg.x1}
                      y1={seg.z1}
                      x2={seg.x2}
                      y2={seg.z2}
                      stroke={
                        seg.category === 'footpath'
                          ? '#7F6A5E'
                          : seg.category === 'plaza'
                            ? '#9E8577'
                            : '#917869'
                      }
                      strokeWidth={Math.max(0.85, seg.widthM * 0.62)}
                      strokeLinecap="round"
                      opacity={seg.category === 'footpath' ? 0.72 : 0.88}
                    />
                  ))}

                  {/* Elevated Habitat-Greenhouse Skybridge Overpass */}
                  <line
                    x1={GAMEPLAY_LAYOUT.modules.connHabGh.startX}
                    y1={GAMEPLAY_LAYOUT.modules.connHabGh.startZ}
                    x2={GAMEPLAY_LAYOUT.modules.connHabGh.endX}
                    y2={GAMEPLAY_LAYOUT.modules.connHabGh.endZ}
                    stroke="#38BDF8"
                    strokeWidth={1.1}
                    strokeLinecap="round"
                    opacity={0.78}
                  />

                  {/* Modules & Landing/Rover Pads */}
                  {STATION_LABELS.map((st) => {
                    const isGoal =
                      (!weatherAlertActive && st.zoneId === activeMission.zoneId) ||
                      (weatherAlertActive && st.id === 'airlock');
                    const fill =
                      st.kind === 'core'
                        ? '#E2E8F0'
                        : st.kind === 'pad'
                          ? '#475569'
                          : '#334155';
                    const stroke = isGoal
                      ? weatherAlertActive
                        ? '#22C55E'
                        : '#FFB703'
                      : st.id === 'greenhouse'
                        ? '#22C55E'
                        : '#94A3B8';

                    return (
                      <g key={st.id}>
                        {st.r !== undefined ? (
                          <circle
                            cx={st.x}
                            cy={st.z}
                            r={st.r}
                            fill={fill}
                            fillOpacity={st.id === 'greenhouse' ? 0.28 : 0.78}
                            stroke={stroke}
                            strokeWidth={isGoal ? 0.45 : 0.24}
                          />
                        ) : (
                          <rect
                            x={st.x - (st.w ?? 2) * 0.5}
                            y={st.z - (st.h ?? 2) * 0.5}
                            width={st.w ?? 2}
                            height={st.h ?? 2}
                            rx={0.5}
                            fill={fill}
                            fillOpacity={0.72}
                            stroke={stroke}
                            strokeWidth={isGoal ? 0.45 : 0.22}
                          />
                        )}
                        <text
                          x={st.x}
                          y={st.z + (st.r ? st.r + 1.45 : (st.h ?? 2) * 0.5 + 1.45)}
                          textAnchor="middle"
                          fontSize={1.32}
                          fontWeight="700"
                          fill={isGoal ? '#FFB703' : '#F8FAFC'}
                        >
                          {st.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Pulsing Active Objective Target Ring */}
                  <g transform={`translate(${activeGoal.x}, ${activeGoal.z})`}>
                    <circle
                      cx={0}
                      cy={0}
                      r={2.5}
                      fill="none"
                      stroke={weatherAlertActive ? '#22C55E' : '#FFB703'}
                      strokeWidth={0.35}
                      strokeDasharray="0.9 0.5"
                    />
                    <circle
                      cx={0}
                      cy={0}
                      r={0.85}
                      fill={weatherAlertActive ? '#22C55E' : '#FFB703'}
                      opacity={0.9}
                    />
                  </g>

                  {/* ROVER-7 Live Dot */}
                  <g transform={`translate(${telemetry.roverX}, ${telemetry.roverZ})`}>
                    <rect
                      x={-0.85}
                      y={-0.85}
                      width={1.7}
                      height={1.7}
                      rx={0.35}
                      fill="#F472B6"
                      stroke="#071324"
                      strokeWidth={0.28}
                    />
                    <text y={-1.35} textAnchor="middle" fontSize={1.15} fontWeight="800" fill="#F9A8D4">
                      {roverName}
                    </text>
                  </g>

                  {/* Autonomous Crew Live Dots */}
                  {telemetry.crewDots.map((c) => {
                    const prof = CREW_PROFILES.find((p) => p.id === c.id);
                    return (
                      <g key={c.id} transform={`translate(${c.x}, ${c.z})`}>
                        <circle
                          cx={0}
                          cy={0}
                          r={0.85}
                          fill={c.color}
                          stroke="#071324"
                          strokeWidth={0.28}
                        />
                        <text
                          y={0.35}
                          textAnchor="middle"
                          fontSize={0.88}
                          fontWeight="900"
                          fill="#071324"
                        >
                          {prof?.initials ?? c.id.slice(0, 2).toUpperCase()}
                        </text>
                      </g>
                    );
                  })}

                  {/* Live Player Position & Heading Chevron (0° = North / -Z) */}
                  <g
                    transform={`translate(${telemetry.x}, ${telemetry.z}) rotate(${telemetry.headingDeg})`}
                  >
                    <circle cx={0} cy={0} r={1.8} fill="#38BDF8" fillOpacity={0.2} />
                    <polygon
                      points="0,-1.65 1.15,1.25 0,0.65 -1.15,1.25"
                      fill="#38BDF8"
                      stroke="#FFFFFF"
                      strokeWidth={0.26}
                    />
                  </g>

                  {/* Compass Rose (Top-Right inside map) */}
                  <g transform="translate(30.5, -26.5)">
                    <circle cx={0} cy={0} r={2.4} fill="rgba(7,19,36,0.85)" stroke="#38BDF8" strokeWidth={0.2} />
                    <text x={0} y={-1.0} textAnchor="middle" fontSize={1.35} fontWeight="900" fill="#FFB703">
                      N
                    </text>
                    <text x={0} y={1.9} textAnchor="middle" fontSize={1.0} fontWeight="700" fill="#94A3B8">
                      S
                    </text>
                    <text x={-1.55} y={0.38} textAnchor="middle" fontSize={1.0} fontWeight="700" fill="#94A3B8">
                      W
                    </text>
                    <text x={1.55} y={0.38} textAnchor="middle" fontSize={1.0} fontWeight="700" fill="#94A3B8">
                      E
                    </text>
                  </g>
                </svg>
              </div>

              {/* Side Legend & Travel ETA Panel */}
              <div className="flex flex-col justify-between gap-3 border-t border-white/10 bg-[#09182D] p-4 lg:border-l lg:border-t-0">
                <div className="space-y-3">
                  <div
                    className={`rounded-xl border p-3 ${
                      weatherAlertActive
                        ? 'border-[#22C55E]/70 bg-[#0D2A24]'
                        : 'border-[#FFB703]/55 bg-[#0E2038]'
                    }`}
                  >
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#FFB703]">
                      {weatherAlertActive ? (
                        <ShieldAlert className="h-3.5 w-3.5 text-[#22C55E]" aria-hidden="true" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{weatherAlertActive ? 'Shelter Target' : 'Active Mission Target'}</span>
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-[#F8F9FA]">
                      {activeGoal.label}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#38BDF8] tabular-nums">
                      Distance: {goalDistM} m · Walk ~{walkEtaS}s · Lope ~{lopeEtaS}s
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#F8F9FA]/70">
                      <Navigation className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                      Map Key
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#38BDF8] ring-2 ring-white/80" />
                      <span className="font-semibold text-[#F8F9FA]">Commander (You)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm bg-[#F472B6]" />
                      <span className="font-semibold text-[#F8F9FA]">{roverName} (6-Wheel Rover)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-4 rounded-sm bg-[#917869]" />
                      <span className="font-semibold text-[#F8F9FA]/85">Graded EVA Roads &amp; Paths</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-1 w-4 rounded-full bg-[#38BDF8]" />
                      <span className="font-semibold text-[#F8F9FA]/85">Elevated Skybridge (2.57 m high)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-white/10 pt-2.5 text-xs">
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#F8F9FA]/70">
                      <Users className="h-3.5 w-3.5 text-[#FFB703]" aria-hidden="true" />
                      EVA Crew Locations
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {telemetry.crewDots.map((c) => {
                        const d = Math.round(Math.hypot(c.x - telemetry.x, c.z - telemetry.z));
                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between rounded-lg bg-[#071324] px-2.5 py-1 text-[11px] tabular-nums"
                          >
                            <span className="inline-flex items-center gap-1.5 font-bold text-[#F8F9FA]">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: c.color }}
                              />
                              {c.name}
                            </span>
                            <span className="font-semibold text-[#38BDF8]">{d} m</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="rounded-lg border border-white/10 bg-[#071324]/80 px-2.5 py-2 text-[11px] leading-snug text-[#F8F9FA]/75">
                  Tip: Mars gravity makes normal walking <strong className="text-[#FFB703]">0.86 m/s</strong>.
                  Hold <strong className="text-[#FFB703]">[Shift]</strong> to lope across the base at{' '}
                  <strong className="text-[#22C55E]">2.65 m/s</strong>!
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
