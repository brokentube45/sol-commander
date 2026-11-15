import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Droplets,
  FastForward,
  Flame,
  Lock,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Sprout,
  Sun,
  Wrench,
} from 'lucide-react';
import { MissionId } from '../sim/roverData';
import { soundEngine } from '../utils/soundEngine';

interface MissionMiniActivitiesProps {
  missionId: MissionId;
  roverName: string;
  alreadyCompleted: boolean;
  onComplete: () => void;
  onSkip: () => void;
  reducedMotion?: boolean;
}

/* ============================================================================
 * MISSION 1: PIPE DETECTIVE (Check 3 pipes, find blinking warning, hold E/button)
 * ============================================================================ */
function PipeDetectiveActivity({
  roverName,
  onComplete,
}: {
  roverName: string;
  onComplete: () => void;
}) {
  const [checkedPipes, setCheckedPipes] = useState<number[]>([]);
  const [foundLeak, setFoundLeak] = useState(false);
  const [holdPct, setHoldPct] = useState(0);
  const [holding, setHolding] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [hint, setHint] = useState('Tap the 3 pipes to find which one has the blinking leak!');

  // Keyboard Hold-E support for closing Valve 2
  useEffect(() => {
    if (!foundLeak || sealed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') setHolding(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') setHolding(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [foundLeak, sealed]);

  useEffect(() => {
    if (!holding || sealed) return;
    const id = window.setInterval(() => {
      setHoldPct((prev) => {
        const next = Math.min(100, prev + 8);
        if (next >= 100) {
          setHolding(false);
          setSealed(true);
          soundEngine.playQuizCorrect();
          onComplete();
        }
        return next;
      });
    }, 90);
    return () => window.clearInterval(id);
  }, [holding, sealed, onComplete]);

  const handleInspectPipe = (pipeNum: number) => {
    if (!checkedPipes.includes(pipeNum)) {
      setCheckedPipes((p) => [...p, pipeNum]);
    }
    if (pipeNum === 2) {
      soundEngine.playRoverBeep('happy');
      setFoundLeak(true);
      setHint('Found it! Pipe 2 has a loose valve. Hold the button (or hold E) to turn it shut!');
    } else {
      soundEngine.playInspect();
      setHint(`Pipe ${pipeNum} is tight and steady! Check the blinking amber pipe.`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((pipeNum) => {
          const isLeak = pipeNum === 2;
          const isChecked = checkedPipes.includes(pipeNum);
          return (
            <button
              key={pipeNum}
              type="button"
              onClick={() => handleInspectPipe(pipeNum)}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all cursor-pointer ${
                isLeak && sealed
                  ? 'border-[#22C55E] bg-[#22C55E]/15'
                  : isLeak && foundLeak
                    ? 'border-[#FFB703] bg-[#FFB703]/18 shadow-[0_0_20px_rgba(255,183,3,0.3)]'
                    : isChecked
                      ? 'border-[#38BDF8]/60 bg-[#1B3A5F]/65'
                      : 'border-white/15 bg-[#0D213B]/80 hover:border-[#FFB703]'
              }`}
            >
              {/* Status indicator light */}
              <span
                className={`mb-2 inline-flex h-4 w-4 rounded-full ${
                  isLeak && sealed
                    ? 'bg-[#22C55E]'
                    : isLeak
                      ? 'animate-pulse bg-[#FFB703] shadow-[0_0_12px_#FFB703]'
                      : isChecked
                        ? 'bg-[#22C55E]/80'
                        : 'bg-white/25'
                }`}
              />
              {/* Pipe graphic bar */}
              <div className="my-1.5 h-4 w-full rounded-full bg-[#38BDF8]/30 flex items-center justify-center">
                <div
                  className={`h-2.5 w-3/4 rounded-full ${
                    isLeak && !sealed ? 'bg-[#FFB703]' : 'bg-[#38BDF8]'
                  }`}
                />
              </div>
              <span className="mt-1 text-xs font-extrabold text-[#F8F9FA]">Pipe {pipeNum}</span>
              <span className="text-[11px] font-bold text-[#F8F9FA]/70">
                {isLeak && sealed
                  ? 'Valve Closed'
                  : isLeak && foundLeak
                    ? 'Leak Spotted!'
                    : isLeak
                      ? 'Warning Blinking'
                      : isChecked
                        ? 'Steady'
                        : 'Tap to Check'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border border-[#38BDF8]/35 bg-[#0D213B]/75 px-3.5 py-2.5 text-xs font-bold text-[#38BDF8]">
        <Bot className="h-4 w-4 shrink-0 text-[#22C55E]" aria-hidden="true" />
        <span>
          {roverName}: &ldquo;{hint}&rdquo;
        </span>
      </div>

      {foundLeak && !sealed && (
        <div className="rounded-xl border border-[#FFB703]/60 bg-[#1B3A5F]/55 p-4 text-center">
          <button
            type="button"
            onPointerDown={() => setHolding(true)}
            onPointerUp={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#E85D04] px-6 text-sm font-extrabold text-[#071324] shadow-lg active:scale-95 cursor-pointer"
          >
            <Wrench
              className={`h-4 w-4 transition-transform ${holding ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Hold Here (or Hold E) to Turn Valve 2</span>
          </button>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[#071324]">
            <div
              className="h-full bg-[#22C55E] transition-all duration-75"
              style={{ width: `${holdPct}%` }}
            />
          </div>
        </div>
      )}

      {sealed && (
        <div className="flex items-center gap-2 rounded-xl border border-[#22C55E]/60 bg-[#22C55E]/15 px-4 py-3 text-sm font-extrabold text-[#22C55E]">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Great detective work! Closing a valve stops air from leaking out of Tank 2.</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * MISSION 2: SUNLIGHT & DUST SLIDER (Drag Clear Sky -> Dusty Sky, see power drop)
 * ============================================================================ */
function SunlightSliderActivity({
  roverName,
  onComplete,
}: {
  roverName: string;
  onComplete: () => void;
}) {
  const [dustPct, setDustPct] = useState(10);
  const [completed, setCompleted] = useState(false);

  const solarOutputPct = Math.max(18, Math.round(100 - dustPct * 0.78));

  const handleDustChange = (val: number) => {
    setDustPct(val);
    if (val >= 65 && !completed) {
      setCompleted(true);
      soundEngine.playQuizCorrect();
      onComplete();
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#0D213B] p-4">
        {/* Sky & Dust Visual */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#FFB703]/60 transition-opacity"
              style={{
                backgroundColor: '#FFB703',
                opacity: Math.max(0.28, 1 - dustPct / 120),
              }}
            >
              <Sun className="h-7 w-7 text-[#071324]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-[#FFB703]">Mars Sunlight</p>
              <p className="text-xs text-[#F8F9FA]/80">
                {dustPct < 35
                  ? 'Bright light reaching solar panels'
                  : dustPct < 65
                    ? 'Orange haze dimming sunlight'
                    : 'Heavy sky dust blocking sunlight!'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-bold text-[#38BDF8]">Solar Power</p>
            <p className="text-base font-black text-[#F8F9FA] tabular-nums">
              {solarOutputPct >= 70 ? 'Strong' : solarOutputPct >= 42 ? 'Medium' : 'Low'}
            </p>
          </div>
        </div>

        {/* Live Output Meter Bar */}
        <div className="mt-3 h-4 w-full overflow-hidden rounded-full border border-white/10 bg-[#071324]">
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${solarOutputPct}%`,
              backgroundColor:
                solarOutputPct >= 70 ? '#22C55E' : solarOutputPct >= 42 ? '#FFB703' : '#E85D04',
            }}
          />
        </div>
      </div>

      {/* Tactile Slider */}
      <div className="rounded-xl border border-[#FFB703]/45 bg-[#1B3A5F]/50 p-4">
        <div className="flex items-center justify-between text-xs font-extrabold">
          <span className="text-[#38BDF8]">Clear Sky</span>
          <span className="text-[#FFB703]">Slide Dust Level</span>
          <span className="text-[#E85D04]">Dusty Sky</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={dustPct}
          aria-label="Sky dust level"
          onChange={(e) => handleDustChange(Number(e.target.value))}
          className="mt-2 h-3 w-full cursor-pointer accent-[#FFB703]"
        />
        <div className="mt-2.5 flex justify-between gap-2">
          {[
            { label: 'Clear Sky', val: 10 },
            { label: 'Hazy Sky', val: 45 },
            { label: 'Dusty Storm', val: 88 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                handleDustChange(preset.val);
              }}
              className="flex-1 rounded-lg border border-white/15 bg-[#071324] py-1.5 text-xs font-bold text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border border-[#38BDF8]/35 bg-[#0D213B]/75 px-3.5 py-2.5 text-xs font-bold text-[#38BDF8]">
        <Bot className="h-4 w-4 shrink-0 text-[#22C55E]" aria-hidden="true" />
        <span>
          {roverName}: &ldquo;
          {completed
            ? 'Look! More dust in the sky means less sunlight—and our panels make less power!'
            : 'Drag the slider right to see what happens when dust fills the Mars sky.'}
          &rdquo;
        </span>
      </div>
    </div>
  );
}

/* ============================================================================
 * MISSION 3: FILTER FIT & ICE SCANNER (Slot filter + scan 3 ground spots)
 * ============================================================================ */
function IceScannerActivity({
  roverName,
  onComplete,
}: {
  roverName: string;
  onComplete: () => void;
}) {
  const [filterFitted, setFilterFitted] = useState(false);
  const [scannedSpots, setScannedSpots] = useState<number[]>([]);
  const [activeScanMsg, setActiveScanMsg] = useState(
    'First, tap the Clean Water Filter to fit it into the Water Recycler!',
  );
  const completedRef = useRef(false);

  const handlePickPart = (part: 'filter' | 'bolt' | 'wire') => {
    if (part === 'filter') {
      soundEngine.playQuizCorrect();
      setFilterFitted(true);
      setActiveScanMsg(
        'Nice! The Water Recycler is spinning again. Now scan all 3 Mars ground spots with Rusty!',
      );
    } else {
      soundEngine.playQuizHint();
      setActiveScanMsg('That part will not clean dirty water—try the Clean Water Filter!');
    }
  };

  const handleScanSpot = (spot: number) => {
    if (!filterFitted) return;
    if (!scannedSpots.includes(spot)) {
      const next = [...scannedSpots, spot];
      setScannedSpots(next);
      if (spot === 3) {
        soundEngine.playCrystalCollect(3);
        setActiveScanMsg(
          'Beep-beep-beep! Spot 3 shows possible ice under the soil! Remember: melt and clean it first.',
        );
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
      } else {
        soundEngine.playRoverBeep('ok');
        setActiveScanMsg(`Spot ${spot} looks like dry rocks and dust. Keep scanning!`);
      }
    } else if (spot === 3) {
      soundEngine.playRoverBeep('happy');
    }
  };

  return (
    <div className="space-y-4">
      {/* Part 1: Filter Fit */}
      <div className="rounded-xl border border-white/15 bg-[#0D213B] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#38BDF8]">
            <Droplets className="h-4 w-4" aria-hidden="true" />
            <span>Step 1 · Water Recycler Status:</span>
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-extrabold ${
              filterFitted
                ? 'bg-[#22C55E]/20 text-[#22C55E]'
                : 'bg-[#FFB703]/20 text-[#FFB703]'
            }`}
          >
            {filterFitted ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Working</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Needs Filter</span>
              </>
            )}
          </span>
        </div>

        {!filterFitted && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { id: 'bolt' as const, label: 'Spare Bolt' },
              { id: 'filter' as const, label: 'Clean Water Filter' },
              { id: 'wire' as const, label: 'Solar Wire' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePickPart(p.id)}
                className="min-h-[44px] rounded-xl border border-white/15 bg-[#1B3A5F]/65 px-2 text-xs font-extrabold text-[#F8F9FA] hover:border-[#38BDF8] cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Part 2: 3 Ground Spots Ice Scanner */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: 1, name: 'Spot A · Ridge', ice: false },
          { id: 2, name: 'Spot B · Crater', ice: false },
          { id: 3, name: 'Spot C · Basin', ice: true },
        ].map((spot) => {
          const isScanned = scannedSpots.includes(spot.id);
          return (
            <button
              key={spot.id}
              type="button"
              disabled={!filterFitted}
              onClick={() => handleScanSpot(spot.id)}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 p-3.5 text-center transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                isScanned && spot.ice
                  ? 'border-[#38BDF8] bg-[#38BDF8]/20 shadow-[0_0_20px_rgba(56,189,248,0.35)]'
                  : isScanned
                    ? 'border-white/25 bg-[#1B3A5F]/45'
                    : 'border-white/15 bg-[#0D213B] hover:border-[#38BDF8]'
              }`}
            >
              {isScanned && spot.ice ? (
                <Snowflake className="h-6 w-6 text-[#38BDF8]" aria-hidden="true" />
              ) : (
                <Radio className="h-6 w-6 text-[#FFB703]" aria-hidden="true" />
              )}
              <span className="mt-1.5 text-xs font-extrabold text-[#F8F9FA]">{spot.name}</span>
              <span className="mt-0.5 text-[11px] font-bold text-[#F8F9FA]/75">
                {!filterFitted
                  ? 'Fit Filter First'
                  : isScanned
                    ? spot.ice
                      ? 'Possible Ice!'
                      : 'Dry Soil'
                    : 'Tap to Scan'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border border-[#38BDF8]/35 bg-[#0D213B]/75 px-3.5 py-2.5 text-xs font-bold text-[#38BDF8]">
        <Bot className="h-4 w-4 shrink-0 text-[#22C55E]" aria-hidden="true" />
        <span>
          {roverName}: &ldquo;{activeScanMsg}&rdquo;
        </span>
      </div>
    </div>
  );
}

/* ============================================================================
 * MISSION 4: PLANT HELPER & THERMOSTAT FIX (Place 3 needs + slot thermostat)
 * ============================================================================ */
function PlantHelperActivity({
  roverName,
  onComplete,
}: {
  roverName: string;
  onComplete: () => void;
}) {
  const [placedNeeds, setPlacedNeeds] = useState<string[]>([]);
  const [thermostatFixed, setThermostatFixed] = useState(false);

  const allNeedsPlaced = placedNeeds.length === 3;

  const toggleNeed = (need: string) => {
    if (placedNeeds.includes(need)) return;
    soundEngine.playInspect();
    setPlacedNeeds((p) => [...p, need]);
  };

  const handleFixThermostat = () => {
    if (!allNeedsPlaced || thermostatFixed) return;
    setThermostatFixed(true);
    soundEngine.playQuizCorrect();
    onComplete();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#0D213B] p-4 sm:flex-row">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all ${
              thermostatFixed
                ? 'border-[#22C55E] bg-[#22C55E]/20 text-[#22C55E] scale-105'
                : 'border-[#38BDF8]/55 bg-[#1B3A5F] text-[#38BDF8]'
            }`}
          >
            <Sprout className="h-8 w-8" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-[#F8F9FA]">
              {thermostatFixed
                ? 'Greenhouse Warm & Thriving!'
                : allNeedsPlaced
                  ? 'Needs Given! Now Fix Thermostat'
                  : 'Frosty Bio-Dome Plants'}
            </p>
            <p className="text-xs text-[#F8F9FA]/75">
              {thermostatFixed
                ? 'Leaves stand upright safely away from Mars cold.'
                : 'Tap all 3 plant helpers below, then fit the thermostat.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {['Sunlight', 'Water', 'Warmth'].map((item) => (
            <span
              key={item}
              className={`rounded-lg px-2 py-1 text-[11px] font-extrabold ${
                placedNeeds.includes(item)
                  ? 'bg-[#22C55E]/20 text-[#22C55E]'
                  : 'bg-[#071324] text-[#F8F9FA]/45'
              }`}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { id: 'Sunlight', Icon: Sun, color: '#FFB703' },
          { id: 'Water', Icon: Droplets, color: '#38BDF8' },
          { id: 'Warmth', Icon: Flame, color: '#E85D04' },
        ].map(({ id, Icon, color }) => {
          const placed = placedNeeds.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleNeed(id)}
              disabled={placed}
              className={`flex min-h-[58px] items-center justify-center gap-2 rounded-xl border-2 px-3 text-xs font-extrabold transition-all cursor-pointer ${
                placed
                  ? 'border-[#22C55E] bg-[#22C55E]/15 text-[#22C55E]'
                  : 'border-white/15 bg-[#1B3A5F]/65 text-[#F8F9FA] hover:border-[#FFB703]'
              }`}
            >
              <Icon className="h-5 w-5" style={{ color: placed ? '#22C55E' : color }} />
              <span>{placed ? `${id} Added` : `Give ${id}`}</span>
            </button>
          );
        })}
      </div>

      {allNeedsPlaced && !thermostatFixed && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleFixThermostat}
            className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#38BDF8] px-6 text-sm font-extrabold text-[#071324] shadow-lg hover:scale-[1.02] cursor-pointer"
          >
            <Wrench className="h-4 w-4" aria-hidden="true" />
            <span>Slot New Thermostat Module</span>
          </button>
        </div>
      )}

      <div className="flex items-center gap-2.5 rounded-xl border border-[#38BDF8]/35 bg-[#0D213B]/75 px-3.5 py-2.5 text-xs font-bold text-[#38BDF8]">
        <Bot className="h-4 w-4 shrink-0 text-[#22C55E]" aria-hidden="true" />
        <span>
          {roverName}: &ldquo;
          {thermostatFixed
            ? 'Warm grow lights are back! Plants need sunlight, water, and warmth to grow.'
            : 'Give the plants light, water, and warmth, then snap in the thermostat!'}
          &rdquo;
        </span>
      </div>
    </div>
  );
}

/* ============================================================================
 * MISSION 5: SHIELD BUILDER & HATCH SEAL (Test water wall shield + seal door)
 * ============================================================================ */
function ShieldBuilderActivity({
  roverName,
  onComplete,
}: {
  roverName: string;
  onComplete: () => void;
}) {
  const [selectedWall, setSelectedWall] = useState<'plastic' | 'metal' | 'water' | null>(null);
  const [sealPct, setSealPct] = useState(0);
  const [holding, setHolding] = useState(false);
  const [sealed, setSealed] = useState(false);

  const protectionPct =
    selectedWall === 'water'
      ? 92
      : selectedWall === 'metal'
        ? 58
        : selectedWall === 'plastic'
          ? 28
          : 12;

  useEffect(() => {
    if (selectedWall !== 'water' || sealed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') setHolding(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') setHolding(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedWall, sealed]);

  useEffect(() => {
    if (!holding || sealed) return;
    const id = window.setInterval(() => {
      setSealPct((prev) => {
        const next = Math.min(100, prev + 8);
        if (next >= 100) {
          setHolding(false);
          setSealed(true);
          soundEngine.playQuizCorrect();
          onComplete();
        }
        return next;
      });
    }, 90);
    return () => window.clearInterval(id);
  }, [holding, sealed, onComplete]);

  return (
    <div className="space-y-4">
      {/* Protection Visual Bar (zero scary mSv numbers!) */}
      <div className="rounded-2xl border border-[#FFB703]/45 bg-[#0D213B] p-4">
        <div className="flex items-center justify-between text-xs font-extrabold">
          <span className="inline-flex items-center gap-1.5 text-[#38BDF8]">
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span>Shelter Protection Level</span>
          </span>
          <span
            className={
              selectedWall === 'water'
                ? 'text-[#22C55E]'
                : selectedWall
                  ? 'text-[#FFB703]'
                  : 'text-[#F8F9FA]/70'
            }
          >
            {selectedWall === 'water'
              ? 'Strong Protection!'
              : selectedWall === 'metal'
                ? 'Medium Protection'
                : selectedWall === 'plastic'
                  ? 'Low Protection'
                  : 'Pick a Shield Layer'}
          </span>
        </div>

        <div className="mt-2.5 h-4 w-full overflow-hidden rounded-full border border-white/10 bg-[#071324]">
          <motion.div
            animate={{ width: `${protectionPct}%` }}
            transition={{ duration: 0.3 }}
            className="h-full"
            style={{
              backgroundColor:
                selectedWall === 'water'
                  ? '#22C55E'
                  : selectedWall === 'metal'
                    ? '#FFB703'
                    : '#E85D04',
            }}
          />
        </div>
      </div>

      {/* Shield Material Cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {[
          { id: 'plastic' as const, label: 'Thin Plastic Cover' },
          { id: 'metal' as const, label: 'Aluminum Sheet' },
          { id: 'water' as const, label: 'Water Tank Wall' },
        ].map((mat) => {
          const picked = selectedWall === mat.id;
          return (
            <button
              key={mat.id}
              type="button"
              onClick={() => {
                setSelectedWall(mat.id);
                if (mat.id === 'water') soundEngine.playRoverBeep('happy');
                else soundEngine.playInspect();
              }}
              className={`min-h-[54px] rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                picked && mat.id === 'water'
                  ? 'border-[#22C55E] bg-[#22C55E]/20 text-[#22C55E]'
                  : picked
                    ? 'border-[#FFB703] bg-[#FFB703]/15 text-[#FFB703]'
                    : 'border-white/15 bg-[#1B3A5F]/65 text-[#F8F9FA] hover:border-[#38BDF8]'
              }`}
            >
              {mat.label}
            </button>
          );
        })}
      </div>

      {selectedWall === 'water' && !sealed && (
        <div className="rounded-xl border border-[#22C55E]/55 bg-[#1B3A5F]/55 p-4 text-center">
          <button
            type="button"
            onPointerDown={() => setHolding(true)}
            onPointerUp={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#38BDF8] px-6 text-sm font-extrabold text-[#071324] shadow-lg active:scale-95 cursor-pointer"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            <span>Hold Here (or Hold E) to Seal Shelter Hatch</span>
          </button>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[#071324]">
            <div
              className="h-full bg-[#22C55E] transition-all duration-75"
              style={{ width: `${sealPct}%` }}
            />
          </div>
        </div>
      )}

      {sealed && (
        <div className="flex items-center gap-2 rounded-xl border border-[#22C55E]/60 bg-[#22C55E]/15 px-4 py-3 text-sm font-extrabold text-[#22C55E]">
          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Shelter hatch sealed! Thick water walls give astronauts strong protection.</span>
        </div>
      )}

      <div className="flex items-center gap-2.5 rounded-xl border border-[#38BDF8]/35 bg-[#0D213B]/75 px-3.5 py-2.5 text-xs font-bold text-[#38BDF8]">
        <Bot className="h-4 w-4 shrink-0 text-[#22C55E]" aria-hidden="true" />
        <span>
          {roverName}: &ldquo;
          {selectedWall === 'water'
            ? 'Water walls block space energy really well! Hold to close our shelter hatch.'
            : 'Try the different shield layers to see which protects the shelter best!'}
          &rdquo;
        </span>
      </div>
    </div>
  );
}

/* ============================================================================
 * EXPORTED WRAPPER
 * ============================================================================ */
export function MissionMiniActivities({
  missionId,
  roverName,
  alreadyCompleted,
  onComplete,
  onSkip,
  reducedMotion = false,
}: MissionMiniActivitiesProps) {
  const [done, setDone] = useState(alreadyCompleted);

  const handleActivityDone = () => {
    setDone(true);
    onComplete();
  };

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-extrabold text-[#FFB703]">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>Hands-On Mission Activity</span>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playClick();
            onSkip();
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0D213B] px-3 py-1 text-xs font-bold text-[#F8F9FA]/75 hover:border-[#FFB703] hover:text-[#F8F9FA] cursor-pointer"
        >
          <span>Skip to Next Step</span>
          <FastForward className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {missionId === 'm1' && (
        <PipeDetectiveActivity roverName={roverName} onComplete={handleActivityDone} />
      )}
      {missionId === 'm2' && (
        <SunlightSliderActivity roverName={roverName} onComplete={handleActivityDone} />
      )}
      {missionId === 'm3' && (
        <IceScannerActivity roverName={roverName} onComplete={handleActivityDone} />
      )}
      {missionId === 'm4' && (
        <PlantHelperActivity roverName={roverName} onComplete={handleActivityDone} />
      )}
      {missionId === 'm5' && (
        <ShieldBuilderActivity roverName={roverName} onComplete={handleActivityDone} />
      )}

      {done && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onSkip();
            }}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#38BDF8] px-5 text-sm font-extrabold text-[#071324] shadow-lg hover:scale-[1.02] cursor-pointer"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Next: Quick Science Quiz</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
