import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_DEBUG_OVERLAY_FLAGS,
  DebugCrewSnapshot,
  DebugOverlayFlags,
  DebugOverlayKey,
} from '../debug/diagnostics';
import { SelfTestReport } from '../debug/outpostAudit';
import { GamePhase } from '../data/missionData';
import {
  celebrate,
  celebrationEngine,
  CelebrationMissionId,
  CelebrationTelemetry,
  stopCelebration,
} from '../utils/celebration';
import { soundEngine } from '../utils/soundEngine';

interface DebugPanelProps {
  gamePhase: GamePhase;
  onStartGameplayDirect: () => void;
}

const OVERLAY_ITEMS: Array<{ key: DebugOverlayKey; hotkey: string; label: string }> = [
  { key: 'colliders', hotkey: '1', label: 'Colliders' },
  { key: 'crewGizmos', hotkey: '2', label: 'Crew Capsules' },
  { key: 'navGraph', hotkey: '3', label: 'Nav & Path' },
  { key: 'moduleBounds', hotkey: '4', label: 'Bounds / Seams' },
  { key: 'stationSlots', hotkey: '5', label: 'Station Slots' },
  { key: 'doorways', hotkey: '6', label: 'Doorways' },
];

export function DebugPanel({ gamePhase, onStartGameplayDirect }: DebugPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [overlays, setOverlays] = useState<DebugOverlayFlags>({ ...DEFAULT_DEBUG_OVERLAY_FLAGS });
  const [selectedCrew, setSelectedCrew] = useState('rafi');
  const [gameSpeed, setGameSpeed] = useState(1);
  const [playerText, setPlayerText] = useState('—');
  const [roverText, setRoverText] = useState('—');
  const [crewList, setCrewList] = useState<DebugCrewSnapshot[]>([]);
  const [camOverridden, setCamOverridden] = useState(false);
  const [report, setReport] = useState<SelfTestReport | null>(null);
  const [runningTest, setRunningTest] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [celebTelemetry, setCelebTelemetry] = useState<CelebrationTelemetry>(() =>
    celebrationEngine.getTelemetry(),
  );

  const syncFromWindow = useCallback(() => {
    setCelebTelemetry(celebrationEngine.getTelemetry());
    const api = window.__MARS_DEBUG__;
    if (!api) return;
    setOverlays({ ...api.overlays });
    setSelectedCrew(api.getSelectedCrewId());
    setGameSpeed(api.getGameSpeed());
    setCamOverridden(api.camera.overridden);
    const p = api.player;
    setPlayerText(
      `(${p.x.toFixed(2)}, ${p.footY.toFixed(2)}, ${p.z.toFixed(2)}) v=${p.speedMs.toFixed(2)}m/s ${p.grounded ? 'GND' : 'AIR'}`,
    );
    const r = api.rover;
    setRoverText(`${r.state} (${r.x.toFixed(1)}, ${r.z.toFixed(1)}) tilt=${r.tiltDeg}°`);
    setCrewList(api.crew);
    const cached = api.getLastReport();
    if (cached) setReport(cached);
  }, []);

  useEffect(() => {
    syncFromWindow();
    const id = window.setInterval(syncFromWindow, 250);
    const onOverlayChanged = () => syncFromWindow();
    window.addEventListener('mars-debug-sync', onOverlayChanged);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('mars-debug-sync', onOverlayChanged);
    };
  }, [syncFromWindow]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (ev.key === 'F9') {
        ev.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleToggleOverlay = (key: DebugOverlayKey) => {
    const api = window.__MARS_DEBUG__;
    if (!api) return;
    api.toggleOverlay(key);
    syncFromWindow();
  };

  const handleRunSelfTest = async () => {
    const api = window.__MARS_DEBUG__;
    if (!api || runningTest) return;
    setRunningTest(true);
    setCopyStatus(null);
    try {
      const res = await api.runSelfTest();
      setReport(res);
    } finally {
      setRunningTest(false);
    }
  };

  const handleCopyJson = async () => {
    let targetReport = report;
    if (!targetReport && window.__MARS_DEBUG__) {
      targetReport = await window.__MARS_DEBUG__.runSelfTest();
      setReport(targetReport);
    }
    if (!targetReport) return;
    const text = JSON.stringify(targetReport, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Copied JSON to clipboard');
    } catch {
      setCopyStatus('Clipboard blocked — report stored on window.__MARS_DEBUG__.getLastReport()');
    }
  };

  const handleCopyMoveDiagnostics = async () => {
    const api = window.__MARS_DEBUG__;
    if (!api) return;
    const payload = {
      movement: api.getMovementDiagnostics(),
      player: api.player,
      rover: api.rover,
      crew: api.crew.map((c) => ({ id: c.id, state: c.state, position: c.position, speedMs: c.speedMs })),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyStatus('Copied U4/U5 Movement & Rover JSON');
    } catch {
      setCopyStatus('Clipboard blocked — inspect window.__MARS_DEBUG__.getMovementDiagnostics()');
    }
  };

  if (collapsed) {
    return (
      <div className="fixed top-3 right-3 z-50 font-mono text-xs">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="rounded border border-amber-400/70 bg-[#071324]/92 px-2.5 py-1.5 font-bold text-amber-300 shadow-lg hover:bg-[#0D213F]"
        >
          DEBUG [F9] {report ? (report.overallPass ? 'PASS' : `${report.failures.length} FAIL`) : ''}
        </button>
      </div>
    );
  }

  const physCount = crewList.filter((c) => c.physicsRegistered).length;

  return (
    <aside
      data-testid="mars-debug-panel"
      className="fixed top-3 right-3 z-50 w-[390px] max-h-[92vh] overflow-y-auto rounded-lg border border-amber-400/60 bg-[#061120]/94 p-3 font-mono text-[11px] text-slate-100 shadow-2xl backdrop-blur-sm select-text"
    >
      <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
        <div>
          <span className="font-bold text-amber-300">MARS OUTPOST DEBUG</span>
          <span className="ml-2 text-[10px] text-slate-400">?debug=1</span>
        </div>
        <div className="flex items-center gap-1.5">
          {gamePhase !== 'gameplay' && (
            <button
              type="button"
              onClick={onStartGameplayDirect}
              className="rounded border border-emerald-500/60 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-300 hover:bg-emerald-900/70"
            >
              Start Gameplay
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded border border-slate-600 bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
          >
            Hide [F9]
          </button>
        </div>
      </div>

      {/* 6 Toggleable 3D Overlays */}
      <div className="mb-2.5">
        <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
          <span>3D OVERLAYS (HOTKEYS 1–6)</span>
          <button
            type="button"
            onClick={() => {
              window.__MARS_DEBUG__?.cycleSelectedCrew();
              syncFromWindow();
            }}
            className="rounded border border-sky-500/50 bg-sky-950/60 px-1.5 py-0.5 text-[10px] text-sky-300 hover:bg-sky-900/60"
          >
            Crew Path [N]: {selectedCrew.toUpperCase()}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {OVERLAY_ITEMS.map((item) => {
            const active = overlays[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleToggleOverlay(item.key)}
                className={`rounded border px-1.5 py-1 text-left text-[10px] transition ${
                  active
                    ? 'border-cyan-400 bg-cyan-950/75 text-cyan-200 font-bold'
                    : 'border-slate-700 bg-slate-900/70 text-slate-400 hover:border-slate-500'
                }`}
              >
                [{item.hotkey}] {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Speed & Teleport Controls */}
      <div className="mb-2.5 space-y-1.5 border-t border-slate-800 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">GAME SPEED</span>
          <div className="flex gap-1">
            {[1, 2, 5, 10].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => {
                  window.__MARS_DEBUG__?.setGameSpeed(spd);
                  syncFromWindow();
                }}
                className={`rounded border px-1.5 py-0.5 text-[10px] ${
                  gameSpeed === spd
                    ? 'border-amber-400 bg-amber-950/70 text-amber-200 font-bold'
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => window.__MARS_DEBUG__?.teleport({ kind: 'player', x: 4.95, z: 2.65 })}
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] hover:border-slate-500"
          >
            TP Courtyard
          </button>
          <button
            type="button"
            onClick={() => window.__MARS_DEBUG__?.teleport({ kind: 'player', x: 6.4, z: 0.7 })}
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] hover:border-slate-500"
          >
            TP Greenhouse
          </button>
          <button
            type="button"
            onClick={() =>
              window.__MARS_DEBUG__?.teleport({
                kind: 'camera',
                x: 6.8,
                y: 3.1,
                z: 2.4,
                lookAt: { x: 7.2, y: 1.3, z: -1.1 },
              })
            }
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] hover:border-slate-500"
          >
            Cam GH Seam
          </button>
          <button
            type="button"
            onClick={() =>
              window.__MARS_DEBUG__?.teleport({
                kind: 'camera',
                x: 1.9,
                y: 2.7,
                z: -5.4,
                lookAt: { x: 4.4, y: 1.5, z: -6.6 },
              })
            }
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] hover:border-slate-500"
          >
            Cam CHAPEA Seam
          </button>
          {camOverridden && (
            <button
              type="button"
              onClick={() => {
                window.__MARS_DEBUG__?.teleport({ kind: 'camera-reset' });
                syncFromWindow();
              }}
              className="rounded border border-rose-500/70 bg-rose-950/60 px-1.5 py-0.5 text-[10px] text-rose-200"
            >
              Reset Cam
            </button>
          )}
        </div>
      </div>

      {/* Live Physics Telemetry */}
      <div className="mb-2.5 space-y-1 border-t border-slate-800 pt-2 text-[10px]">
        <div>
          <span className="text-slate-400">PLAYER: </span>
          <span className="text-slate-100">{playerText}</span>
        </div>
        <div>
          <span className="text-slate-400">ROVER: </span>
          <span className="text-slate-100">{roverText}</span>
        </div>
        <div>
          <span className="text-slate-400">CREW PHYSICS: </span>
          <span className={physCount === 4 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {physCount}/4 Rapier bodies
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[9.5px] text-slate-300">
          {crewList.map((c) => (
            <div key={c.id} className="truncate rounded bg-slate-900/80 px-1.5 py-0.5">
              {c.id}: {c.state} ({c.position.x.toFixed(1)},{c.position.z.toFixed(1)})
            </div>
          ))}
        </div>
      </div>

      {/* Step C Self-Test & U4/U5 Movement Diagnostics */}
      <div className="border-t border-slate-800 pt-2">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <button
            type="button"
            disabled={runningTest}
            onClick={handleRunSelfTest}
            className="flex-1 rounded border border-amber-400/70 bg-amber-950/60 px-2 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-900/70 disabled:opacity-50"
          >
            {runningTest ? 'Running C1–C8…' : 'Run Self-Test'}
          </button>
          <button
            type="button"
            onClick={handleCopyJson}
            className="rounded border border-sky-500/60 bg-sky-950/60 px-2 py-1 text-[10px] font-bold text-sky-200 hover:bg-sky-900/70"
          >
            Copy C1–C8 JSON
          </button>
          <button
            type="button"
            onClick={handleCopyMoveDiagnostics}
            className="rounded border border-emerald-500/60 bg-emerald-950/60 px-2 py-1 text-[10px] font-bold text-emerald-200 hover:bg-emerald-900/70"
          >
            Copy Move/U4-U5 JSON
          </button>
        </div>

        {copyStatus && (
          <div className="mb-1.5 rounded bg-slate-900 px-2 py-1 text-[10px] text-sky-300">
            {copyStatus}
          </div>
        )}

        {report && (
          <div className="space-y-1.5">
            <div
              className={`rounded px-2 py-1 text-[10px] font-bold ${
                report.overallPass
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/50'
                  : 'bg-rose-950/75 text-rose-200 border border-rose-500/60'
              }`}
            >
              {report.overallPass
                ? 'OVERALL: PASS (0 failures)'
                : `OVERALL: FAIL (${report.failures.length} check(s) non-passing)`}
            </div>

            {Object.values(report.checks)
              .sort((a, b) => (a.status === b.status ? 0 : a.status === 'FAIL' ? -1 : 1))
              .map((chk) => (
                <div
                  key={chk.id}
                  className="rounded border border-slate-800 bg-slate-900/80 px-2 py-1 text-[10px]"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-100">
                      {chk.id}: {chk.name}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1 py-0.2 text-[9px] font-bold ${
                        chk.status === 'PASS'
                          ? 'bg-emerald-900/80 text-emerald-200'
                          : chk.status === 'PARTIAL'
                            ? 'bg-amber-900/80 text-amber-200'
                            : 'bg-rose-900/80 text-rose-200'
                      }`}
                    >
                      {chk.status} [{chk.evidenceClass}]
                    </span>
                  </div>
                  <div className="mt-0.5 text-[9.5px] text-slate-300 leading-snug">
                    {chk.summary}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Celebration Particle Triggers & FPS Telemetry (?debug=1 only) */}
      <div className="mt-2.5 border-t border-slate-800 pt-2">
        <div className="mb-1 flex items-center justify-between text-[10px]">
          <span className="font-bold text-amber-300">CELEBRATION (?debug=1)</span>
          <span className="text-slate-300 tabular-nums">
            P={celebTelemetry.activeCount} · {celebTelemetry.running ? 'RUN' : 'IDLE'} ·{' '}
            {celebTelemetry.fpsBefore}/{celebTelemetry.fpsDuring || '—'} FPS
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {([1, 2, 3, 4, 5] as CelebrationMissionId[]).map((mId) => (
            <button
              key={mId}
              type="button"
              data-celebration-trigger="true"
              onClick={() => {
                soundEngine.playBadgeUnlock();
                celebrate({ kind: 'mission', missionId: mId });
                syncFromWindow();
              }}
              className="rounded border border-cyan-500/50 bg-cyan-950/60 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-900/70"
            >
              M{mId}
            </button>
          ))}
          <button
            type="button"
            data-celebration-trigger="true"
            onClick={() => {
              soundEngine.playBadgeUnlock();
              celebrate({ kind: 'final' });
              syncFromWindow();
            }}
            className="rounded border border-amber-400/70 bg-amber-950/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-200 hover:bg-amber-900/70"
          >
            Final
          </button>
          <button
            type="button"
            onClick={() => {
              stopCelebration();
              syncFromWindow();
            }}
            className="rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-slate-400"
          >
            Skip
          </button>
        </div>
      </div>
    </aside>
  );
}
