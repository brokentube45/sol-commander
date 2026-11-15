import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Wrench,
  Sun,
  Filter,
  Radar,
  Thermometer,
  Droplets,
  Shield,
  ArrowRight,
  Sparkles,
  Bot,
  Radio,
  Volume2,
} from 'lucide-react';
import { MissionId } from '../sim/roverData';
import {
  formatWithRoverName,
  JUNIOR_MISSIONS,
  M3_LUCIA_ICE_CALL,
} from '../sim/storyBeats';
import { soundEngine } from '../utils/soundEngine';
import { narrativeVoice } from '../utils/narrativeVoice';

interface MissionMiniActivityProps {
  missionId: MissionId;
  roverName?: string;
  onComplete: () => void;
}

export function MissionMiniActivity({
  missionId,
  roverName = 'Rusty',
  onComplete,
}: MissionMiniActivityProps) {
  const displayRover = roverName.trim() || 'Rusty';
  switch (missionId) {
    case 'm1':
      return <PipeDetectiveActivity roverName={displayRover} onComplete={onComplete} />;
    case 'm2':
      return <SunlightSliderActivity roverName={displayRover} onComplete={onComplete} />;
    case 'm3':
      return <FilterAndIceScannerActivity roverName={displayRover} onComplete={onComplete} />;
    case 'm4':
      return <PlantHelperAndThermostatActivity roverName={displayRover} onComplete={onComplete} />;
    case 'm5':
      return <ShieldBuilderActivity roverName={displayRover} onComplete={onComplete} />;
  }
}

/**
 * M1.3: Pipe Detective (Bible Section 6 Mission 1)
 * 3 pipes on Oxygen Tank 2. Pipe 2 has a blinking amber light, a small white puff,
 * and a faint 3D hiss sound. Pressing E (or clicking) on Pipe 2 finds the loose valve.
 */
function PipeDetectiveActivity({
  roverName,
  onComplete,
}: {
  roverName: string;
  onComplete: () => void;
}) {
  const [checkedPipes, setCheckedPipes] = useState<Record<1 | 2 | 3, boolean>>({
    1: false,
    2: false,
    3: false,
  });
  const [selectedPipe, setSelectedPipe] = useState<1 | 2 | 3 | null>(null);
  const foundLooseValve = checkedPipes[2];

  // Play a faint 3D hiss when Pipe Detective opens
  useEffect(() => {
    soundEngine.playAirlockCycle();
    narrativeVoice.speakAs(
      'rafi',
      JUNIOR_MISSIONS.m1.lookLine.text,
      'm1-pipe-detective-rafi',
      1500,
    );
  }, []);

  const inspectPipe = (pipe: 1 | 2 | 3) => {
    setSelectedPipe(pipe);
    setCheckedPipes((prev) => ({ ...prev, [pipe]: true }));
    if (pipe === 2) {
      soundEngine.playAirlockCycle();
      soundEngine.playRoverBeep('alert');
      narrativeVoice.speakAs(
        'rusty',
        formatWithRoverName(JUNIOR_MISSIONS.m1.miniActivity.rustyPrompt, roverName),
        'm1-found-valve2',
        1000,
        undefined,
        true,
      );
    } else {
      soundEngine.playClick();
    }
  };

  // Keyboard E shortcut to inspect pipes in order or inspect Pipe 2
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE') {
        e.preventDefault();
        if (!checkedPipes[1]) inspectPipe(1);
        else if (!checkedPipes[2]) inspectPipe(2);
        else if (!checkedPipes[3]) inspectPipe(3);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="rounded-2xl border border-[#FFB703]/45 bg-[#0D213B]/90 p-5 text-[#F8F9FA]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#FFB703]">
          <Wrench className="h-4 w-4" aria-hidden="true" />
          <span>M1.3 Activity · {JUNIOR_MISSIONS.m1.miniActivity.title}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            soundEngine.playAirlockCycle();
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#38BDF8]/40 bg-[#071324]/85 px-2.5 py-1 text-[11px] font-bold text-[#38BDF8] hover:border-[#38BDF8]"
        >
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Listen to 3D Whisper Hiss</span>
        </button>
      </div>

      {/* Rafi Look prompt */}
      <div className="mt-3 rounded-xl border border-[#38BDF8]/35 bg-[#071324]/85 px-3.5 py-2 text-xs font-bold text-[#E0F2FE]">
        Rafi: &ldquo;{JUNIOR_MISSIONS.m1.lookLine.text}&rdquo;
      </div>

      <p className="mt-2.5 text-sm font-bold text-[#F8F9FA]/95">
        {JUNIOR_MISSIONS.m1.miniActivity.instruction}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([1, 2, 3] as const).map((pipe) => {
          const isLeakingPipe = pipe === 2;
          const isChecked = checkedPipes[pipe];
          return (
            <button
              key={pipe}
              type="button"
              onClick={() => inspectPipe(pipe)}
              className={`relative flex cursor-pointer flex-col items-center justify-between rounded-xl border p-4 text-center transition-all ${
                isChecked && isLeakingPipe
                  ? 'border-[#FFB703] bg-[#FFB703]/20 shadow-[0_0_20px_rgba(255,183,3,0.3)]'
                  : isChecked
                    ? 'border-[#22C55E]/55 bg-[#22C55E]/10'
                    : 'border-white/15 bg-[#071324]/80 hover:border-[#FFB703]'
              }`}
            >
              {/* Blinking amber light + small white puff on Pipe 2 */}
              <div className="flex w-full items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#F8F9FA]/70">
                  Press [E]
                </span>
                <span
                  className={`h-3 w-3 rounded-full ${
                    isLeakingPipe
                      ? 'animate-ping bg-[#FFB703] shadow-[0_0_10px_#FFB703]'
                      : 'bg-[#22C55E]'
                  }`}
                />
              </div>

              <span className="mt-2 font-[family-name:var(--font-display)] text-base font-extrabold">
                Pipe {pipe}
              </span>

              {/* Small white vapor puff on Pipe 2 */}
              {isLeakingPipe ? (
                <div className="mt-1.5 flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white shadow-[0_0_8px_#fff]" />
                  <span>White Puff · Faint Hiss</span>
                </div>
              ) : (
                <span className="mt-1.5 text-[11px] font-semibold text-[#F8F9FA]/65">
                  Quiet &amp; Steady
                </span>
              )}

              <span
                className={`mt-2.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                  !isChecked
                    ? 'bg-[#1B3A5F] text-[#38BDF8]'
                    : isLeakingPipe
                      ? 'bg-[#FFB703] text-[#071324]'
                      : 'bg-[#22C55E]/20 text-[#22C55E]'
                }`}
              >
                {!isChecked
                  ? 'Inspect Pipe [E]'
                  : isLeakingPipe
                    ? 'Amber Blink · Loose Valve 2!'
                    : 'Seal Tight ✓'}
              </span>
            </button>
          );
        })}
      </div>

      {selectedPipe && selectedPipe !== 2 && !foundLooseValve && (
        <p className="mt-3 text-xs font-bold text-[#22C55E]">
          Pipe {selectedPipe} is quiet and tight. Follow the faint whisper sound to the blinking amber pipe!
        </p>
      )}

      {foundLooseValve && (
        <div className="mt-4 rounded-xl border border-[#22C55E]/50 bg-[#071324]/90 p-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-[#22C55E]">
            <Bot className="h-4 w-4" aria-hidden="true" />
            <span>
              {roverName}: &ldquo;{JUNIOR_MISSIONS.m1.miniActivity.rustyPrompt}&rdquo;
            </span>
          </div>
          <p className="mt-1 text-xs text-[#F8F9FA]/85">
            Great detective work! Now answer {roverName}&apos;s quick question before choosing how to handle Valve 2.
          </p>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onComplete();
              }}
              className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] px-5 py-2 text-xs font-extrabold text-[#071324] shadow-lg hover:scale-[1.02] transition-transform"
            >
              <span>Continue to Quiz →</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * M2.3: Sunlight Slider (Bible Section 6 Mission 2)
 * Slider moves from Clear Sky to Dusty Sky; power meter drops as dust increases.
 */
function SunlightSliderActivity({
  roverName,
  onComplete,
}: {
  roverName: string;
  onComplete: () => void;
}) {
  const [dustPercent, setDustPercent] = useState(15);
  const [testedClear, setTestedClear] = useState(true);
  const [testedDusty, setTestedDusty] = useState(false);

  const powerPercent = Math.max(22, Math.round(100 - dustPercent * 0.72));
  const done = testedClear && testedDusty;

  useEffect(() => {
    narrativeVoice.speakAs(
      'rusty',
      JUNIOR_MISSIONS.m2.miniActivity.rustyPrompt,
      'm2-slider-prompt',
      1500,
    );
  }, []);

  const handleSliderChange = (val: number) => {
    setDustPercent(val);
    if (val <= 25) setTestedClear(true);
    if (val >= 65) {
      if (!testedDusty) {
        soundEngine.playSuccess();
      }
      setTestedDusty(true);
    }
  };

  return (
    <div className="rounded-2xl border border-[#FFB703]/45 bg-[#0D213B]/90 p-5 text-[#F8F9FA]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#FFB703]">
          <Sun className="h-4 w-4" aria-hidden="true" />
          <span>M2.3 Activity · {JUNIOR_MISSIONS.m2.miniActivity.title}</span>
        </span>
        <span className="text-xs font-bold text-[#38BDF8]">
          {done ? 'Sunlight Slider Tested!' : 'Slide from Clear Sky to Dusty Sky'}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#22C55E]/40 bg-[#071324]/85 px-3.5 py-2 text-xs font-bold text-[#22C55E]">
        <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {roverName}: &ldquo;{JUNIOR_MISSIONS.m2.miniActivity.rustyPrompt}&rdquo;
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-white/15 bg-[#071324]/85 p-4">
        <div className="flex items-center justify-between text-xs font-extrabold">
          <span className="text-[#38BDF8]">Clear Sky</span>
          <span className="text-[#FFB703]">Dust in Sky: {dustPercent}%</span>
          <span className="text-[#E85D04]">Dusty Sky</span>
        </div>

        <input
          type="range"
          min={0}
          max={90}
          step={5}
          value={dustPercent}
          onChange={(e) => handleSliderChange(Number(e.target.value))}
          aria-label="Sunlight Slider from Clear Sky to Dusty Sky"
          className="mt-2.5 h-3 w-full cursor-pointer accent-[#FFB703]"
        />

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span>Solar Panel Power Meter</span>
            <span className={powerPercent < 55 ? 'text-[#FFB703]' : 'text-[#22C55E]'}>
              {powerPercent}% Power
            </span>
          </div>
          <div className="mt-1.5 h-3.5 w-full overflow-hidden rounded-full bg-[#1B3A5F]">
            <div
              className={`h-full transition-all duration-200 ${
                powerPercent < 55
                  ? 'bg-gradient-to-r from-[#E85D04] to-[#FFB703]'
                  : 'bg-gradient-to-r from-[#22C55E] to-[#38BDF8]'
              }`}
              style={{ width: `${powerPercent}%` }}
            />
          </div>
        </div>
      </div>

      {done && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#22C55E]/50 bg-[#22C55E]/15 p-3">
          <span className="flex items-center gap-2 text-xs font-extrabold text-[#22C55E]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>You saw how airborne dust blocks sunlight and lowers solar panel power!</span>
          </span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onComplete();
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2 text-xs font-extrabold text-[#071324]"
          >
            <span>Continue to Quiz →</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * M3.2–M3.4: Filter Fit -> Lucía's Ice Call -> Ice Scanner (Bible Section 6 Mission 3)
 * Step 1: Fit the clean filter in the right slot.
 * Step 2: Lucía's ice call + Scan 3 spots outside (faster beeps = more likely "possible ice", never "confirmed").
 */
function FilterAndIceScannerActivity({
  roverName,
  onComplete,
}: {
  roverName: string;
  onComplete: () => void;
}) {
  const [filterFitted, setFilterFitted] = useState(false);
  const [scannedSpots, setScannedSpots] = useState<Record<'A' | 'B' | 'C', boolean>>({
    A: false,
    B: false,
    C: false,
  });

  const allScanned = scannedSpots.A && scannedSpots.B && scannedSpots.C;
  const done = filterFitted && allScanned;

  useEffect(() => {
    narrativeVoice.speakAs(
      'amara',
      JUNIOR_MISSIONS.m3.lookLine.text,
      'm3-amara-filter',
      1500,
    );
  }, []);

  const handleFitFilter = () => {
    soundEngine.playSuccess();
    setFilterFitted(true);
    // Rusty says "Click! That looks right." then Lucía calls on the radio!
    narrativeVoice.speakAs(
      'rusty',
      'Click! That looks right.',
      'm3-rusty-click',
      500,
      () => {
        narrativeVoice.speakAs(
          'lucia',
          formatWithRoverName(M3_LUCIA_ICE_CALL.luciaLine.text, roverName),
          'm3-lucia-ice-call',
          500,
          () => {
            narrativeVoice.speakAs(
              'rusty',
              M3_LUCIA_ICE_CALL.rustyLine.text,
              'm3-rusty-love-scanning',
              500,
              undefined,
              true,
            );
          },
          true,
        );
      },
      true,
    );
  };

  const scanSpot = (spot: 'A' | 'B' | 'C') => {
    if (spot === 'B') {
      // Faster beeps for strongest possible ice reflection
      soundEngine.playRoverBeep('happy');
      window.setTimeout(() => soundEngine.playRoverBeep('happy'), 140);
      window.setTimeout(() => soundEngine.playRoverBeep('happy'), 280);
    } else if (spot === 'C') {
      soundEngine.playRoverBeep('ok');
      window.setTimeout(() => soundEngine.playRoverBeep('ok'), 240);
    } else {
      soundEngine.playRoverBeep('ok');
    }
    setScannedSpots((prev) => ({ ...prev, [spot]: true }));
  };

  return (
    <div className="rounded-2xl border border-[#38BDF8]/45 bg-[#0D213B]/90 p-5 text-[#F8F9FA]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#38BDF8]">
          <Filter className="h-4 w-4" aria-hidden="true" />
          <span>
            M3.2–M3.4 · {JUNIOR_MISSIONS.m3.miniActivity.title} &amp;{' '}
            {JUNIOR_MISSIONS.m3.miniActivity.secondaryTitle}
          </span>
        </span>
        <span className="text-xs font-bold text-[#FFB703]">
          {!filterFitted
            ? 'Step 1: Filter Fit'
            : !allScanned
              ? 'Step 2: Ice Scanner (3 Spots)'
              : 'Filter & Radar Complete!'}
        </span>
      </div>

      {/* Step 1: Filter Fit */}
      <div className="mt-3 rounded-xl border border-white/15 bg-[#071324]/85 p-3.5">
        <p className="text-xs font-bold text-[#E0F2FE]">
          Amara: &ldquo;{JUNIOR_MISSIONS.m3.lookLine.text}&rdquo;
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold text-[#F8F9FA]">
              Step 1 · {JUNIOR_MISSIONS.m3.miniActivity.title}
            </p>
            <p className="text-[11px] text-[#F8F9FA]/75">
              {filterFitted
                ? `${roverName}: "Click! That looks right."`
                : 'Pull out the clogged cartridge and click the clean filter into the slot.'}
            </p>
          </div>
          <button
            type="button"
            disabled={filterFitted}
            onClick={handleFitFilter}
            className={`min-h-[38px] cursor-pointer rounded-xl px-4 py-1.5 text-xs font-extrabold transition-all ${
              filterFitted
                ? 'border border-[#22C55E] bg-[#22C55E]/20 text-[#22C55E]'
                : 'bg-[#38BDF8] text-[#071324] hover:scale-[1.02]'
            }`}
          >
            {filterFitted ? 'Filter Fitted ✓' : 'Fit Clean Filter'}
          </button>
        </div>
      </div>

      {/* Step 2: Lucía's Ice Call + Ice Scanner */}
      <div
        className={`mt-3 rounded-xl border border-white/15 bg-[#071324]/85 p-3.5 ${
          !filterFitted ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        {/* M3.3 Lucía's ice call */}
        <div className="mb-3 space-y-1.5 rounded-xl border border-[#38BDF8]/35 bg-[#0C4A6E]/30 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-extrabold text-[#38BDF8]">
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Lucía (radio): &ldquo;
              {formatWithRoverName(M3_LUCIA_ICE_CALL.luciaLine.text, roverName)}&rdquo;
            </span>
          </p>
          <p className="font-bold text-[#22C55E]">
            {roverName}: &ldquo;{M3_LUCIA_ICE_CALL.rustyLine.text}&rdquo; · &ldquo;
            {JUNIOR_MISSIONS.m3.miniActivity.rustyPrompt}&rdquo;
          </p>
        </div>

        <p className="flex items-center gap-1.5 text-xs font-extrabold text-[#F8F9FA]">
          <Radar className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
          <span>Step 2 · {JUNIOR_MISSIONS.m3.miniActivity.secondaryTitle} (Scan 3 Spots Outside)</span>
        </p>

        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              {
                id: 'A',
                label: 'Spot A · Ridge Rim',
                beeps: 'Slow beep',
                reading: 'Dry dust & basalt rock',
              },
              {
                id: 'B',
                label: 'Spot B · North Terrace',
                beeps: 'Fast triple beep!',
                reading: 'Strong possible ice reflection (~2.4 m deep)',
              },
              {
                id: 'C',
                label: 'Spot C · Shallow Basin',
                beeps: 'Medium double beep',
                reading: 'Thin possible ice frost (~4.1 m deep)',
              },
            ] as const
          ).map((spot) => {
            const isScanned = scannedSpots[spot.id];
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => scanSpot(spot.id)}
                className={`cursor-pointer rounded-xl border p-2.5 text-left transition-all ${
                  isScanned
                    ? spot.id === 'B'
                      ? 'border-[#22C55E] bg-[#22C55E]/15'
                      : 'border-[#38BDF8]/60 bg-[#38BDF8]/10'
                    : 'border-white/15 bg-[#0D213B] hover:border-[#38BDF8]'
                }`}
              >
                <p className="text-xs font-extrabold text-[#F8F9FA]">{spot.label}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#38BDF8]">
                  {isScanned ? `${spot.beeps} — ${spot.reading}` : 'Click to Ping Radar'}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {done && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#22C55E]/50 bg-[#22C55E]/15 p-3">
          <span className="flex items-center gap-2 text-xs font-extrabold text-[#22C55E]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Filter fitted &amp; Spot B marked as possible ice!</span>
          </span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onComplete();
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2 text-xs font-extrabold text-[#071324]"
          >
            <span>Continue to Quiz →</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * M4.3: Plant Helper & Thermostat Fix (Bible Section 6 Mission 4)
 * Place sunlight, water, and warmth icons next to the plant, then fix the thermostat to 22 °C.
 */
function PlantHelperAndThermostatActivity({
  roverName,
  onComplete,
}: {
  roverName: string;
  onComplete: () => void;
}) {
  const [needsGiven, setNeedsGiven] = useState<Record<'sunlight' | 'water' | 'warmth', boolean>>({
    sunlight: false,
    water: false,
    warmth: false,
  });
  const [targetTempC, setTargetTempC] = useState(8);

  const allIconsPlaced = needsGiven.sunlight && needsGiven.water && needsGiven.warmth;
  const thermostatFixed = targetTempC >= 20;
  const done = allIconsPlaced && thermostatFixed;

  useEffect(() => {
    narrativeVoice.speakAs(
      'rusty',
      JUNIOR_MISSIONS.m4.miniActivity.rustyPrompt,
      'm4-plant-helper-prompt',
      1500,
    );
  }, []);

  const toggleNeed = (need: 'sunlight' | 'water' | 'warmth') => {
    soundEngine.playRoverBeep('happy');
    setNeedsGiven((prev) => ({ ...prev, [need]: true }));
  };

  return (
    <div className="rounded-2xl border border-[#22C55E]/45 bg-[#0D213B]/90 p-5 text-[#F8F9FA]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#22C55E]">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>
            M4.3 · {JUNIOR_MISSIONS.m4.miniActivity.title} &amp;{' '}
            {JUNIOR_MISSIONS.m4.miniActivity.secondaryTitle}
          </span>
        </span>
        <span className="text-xs font-bold text-[#FFB703]">
          {done ? 'Plants Warm & Perky!' : 'Give Sunlight, Water & Warmth + Fix Thermostat'}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#22C55E]/40 bg-[#071324]/85 px-3.5 py-2 text-xs font-bold text-[#22C55E]">
        <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {roverName}: &ldquo;{JUNIOR_MISSIONS.m4.miniActivity.rustyPrompt}&rdquo;
        </span>
      </div>

      {/* Step 1: Plant Helper (Place 3 care icons next to the tomato plant) */}
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => toggleNeed('sunlight')}
          className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-all ${
            needsGiven.sunlight
              ? 'border-[#FFB703] bg-[#FFB703]/20 text-[#FFB703]'
              : 'border-white/15 bg-[#071324]/80 text-[#F8F9FA] hover:border-[#FFB703]'
          }`}
        >
          <span className="flex items-center gap-2 text-xs font-extrabold">
            <Sun className="h-4 w-4" aria-hidden="true" />
            <span>1. Sunlight</span>
          </span>
          <span className="text-[11px] font-bold">{needsGiven.sunlight ? 'Placed ✓' : '+ Place'}</span>
        </button>

        <button
          type="button"
          onClick={() => toggleNeed('water')}
          className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-all ${
            needsGiven.water
              ? 'border-[#38BDF8] bg-[#38BDF8]/20 text-[#38BDF8]'
              : 'border-white/15 bg-[#071324]/80 text-[#F8F9FA] hover:border-[#38BDF8]'
          }`}
        >
          <span className="flex items-center gap-2 text-xs font-extrabold">
            <Droplets className="h-4 w-4" aria-hidden="true" />
            <span>2. Clean Water</span>
          </span>
          <span className="text-[11px] font-bold">{needsGiven.water ? 'Placed ✓' : '+ Place'}</span>
        </button>

        <button
          type="button"
          onClick={() => toggleNeed('warmth')}
          className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-left transition-all ${
            needsGiven.warmth
              ? 'border-[#22C55E] bg-[#22C55E]/20 text-[#22C55E]'
              : 'border-white/15 bg-[#071324]/80 text-[#F8F9FA] hover:border-[#22C55E]'
          }`}
        >
          <span className="flex items-center gap-2 text-xs font-extrabold">
            <Thermometer className="h-4 w-4" aria-hidden="true" />
            <span>3. Warmth</span>
          </span>
          <span className="text-[11px] font-bold">{needsGiven.warmth ? 'Placed ✓' : '+ Place'}</span>
        </button>
      </div>

      {/* Step 2: Thermostat Fix */}
      <div className="mt-3 rounded-xl border border-white/15 bg-[#071324]/85 p-3.5">
        <div className="flex items-center justify-between text-xs font-extrabold">
          <span>Step 2 · {JUNIOR_MISSIONS.m4.miniActivity.secondaryTitle}</span>
          <span className={thermostatFixed ? 'text-[#22C55E]' : 'text-[#38BDF8]'}>
            {targetTempC} °C {thermostatFixed ? '(Warm & Cozy ✓)' : '(Too Cold — Slide to 22 °C)'}
          </span>
        </div>
        <input
          type="range"
          min={6}
          max={24}
          step={2}
          value={targetTempC}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val >= 20 && targetTempC < 20) {
              soundEngine.playSuccess();
            }
            setTargetTempC(val);
          }}
          aria-label="Greenhouse Thermostat Slider"
          className="mt-2 h-3 w-full cursor-pointer accent-[#22C55E]"
        />
      </div>

      {done && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#22C55E]/50 bg-[#22C55E]/15 p-3">
          <span className="flex items-center gap-2 text-xs font-extrabold text-[#22C55E]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Sunlight, water, and warmth placed — and thermostat set!</span>
          </span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onComplete();
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2 text-xs font-extrabold text-[#071324]"
          >
            <span>Continue to Quiz →</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * M5.3: Shield Builder (Bible Section 7 Mission 5)
 * Put the water layer on the shelter wall; the protection bar fills to 100%.
 * Rusty: "More water means more protection. Look at the bar."
 * (Note: Crew 1..4 counter, Lucía/Rusty return, and Hold E hatch seal happen in M5.6 Action!)
 */
function ShieldBuilderActivity({
  roverName,
  onComplete,
}: {
  roverName: string;
  onComplete: () => void;
}) {
  const [waterLayersAdded, setWaterLayersAdded] = useState(0);
  const shieldInstalled = waterLayersAdded >= 3;
  const protectionPercent = Math.min(100, Math.round((waterLayersAdded / 3) * 100));

  useEffect(() => {
    narrativeVoice.speakAs(
      'rusty',
      JUNIOR_MISSIONS.m5.miniActivity.rustyPrompt,
      'm5-shield-builder-prompt',
      1500,
    );
  }, []);

  const handleAddWaterLayer = () => {
    const next = Math.min(3, waterLayersAdded + 1);
    setWaterLayersAdded(next);
    if (next >= 3) {
      soundEngine.playSuccess();
    } else {
      soundEngine.playRoverBeep('ok');
    }
  };

  return (
    <div className="rounded-2xl border border-[#38BDF8]/45 bg-[#0D213B]/90 p-5 text-[#F8F9FA]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#38BDF8]">
          <Shield className="h-4 w-4" aria-hidden="true" />
          <span>M5.3 Activity · {JUNIOR_MISSIONS.m5.miniActivity.title}</span>
        </span>
        <span className="text-xs font-bold text-[#22C55E]">
          Protection Bar: {protectionPercent}%
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#22C55E]/40 bg-[#071324]/85 px-3.5 py-2 text-xs font-bold text-[#22C55E]">
        <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {roverName}: &ldquo;{JUNIOR_MISSIONS.m5.miniActivity.rustyPrompt}&rdquo;
        </span>
      </div>

      {/* Water Layer & Protection Bar */}
      <div className="mt-3 rounded-xl border border-white/15 bg-[#071324]/85 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold text-[#F8F9FA]">
              Shelter Water Wall Layers ({waterLayersAdded} of 3 Installed)
            </p>
            <p className="text-[11px] text-[#F8F9FA]/75">
              Put the water containers on the shelter wall to fill the radiation protection bar!
            </p>
          </div>
          <button
            type="button"
            disabled={shieldInstalled}
            onClick={handleAddWaterLayer}
            className={`min-h-[40px] cursor-pointer rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${
              shieldInstalled
                ? 'border border-[#22C55E] bg-[#22C55E]/20 text-[#22C55E]'
                : 'bg-[#38BDF8] text-[#071324] hover:scale-[1.02]'
            }`}
          >
            {shieldInstalled
              ? 'Water Wall Full (100%) ✓'
              : `Put Water Layer (${waterLayersAdded + 1}/3)`}
          </button>
        </div>

        {/* Protection Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#38BDF8]">
            <span>Shelter Radiation Protection Bar</span>
            <span>{protectionPercent}%</span>
          </div>
          <div className="mt-1 h-3.5 w-full overflow-hidden rounded-full bg-[#1B3A5F]">
            <div
              className="h-full bg-gradient-to-r from-[#38BDF8] to-[#22C55E] transition-all duration-300"
              style={{ width: `${protectionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {shieldInstalled && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#22C55E]/50 bg-[#22C55E]/15 p-3">
          <span className="flex items-center gap-2 text-xs font-extrabold text-[#22C55E]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Water shield wall ready! Next: Quick Quiz (timer paused).</span>
          </span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onComplete();
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#22C55E] px-4 py-2 text-xs font-extrabold text-[#071324]"
          >
            <span>Continue to Quiz →</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
