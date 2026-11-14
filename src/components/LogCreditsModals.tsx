import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  BookOpen,
  Database,
  ExternalLink,
  AlertCircle,
  Bot,
  Wind,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  Camera,
  Flag,
} from 'lucide-react';
import {
  ARCHIVED_MARS_GALLERY,
  DATA_CREDITS_LEDGER,
  NasaMarsPhotoItem,
  fetchNasaMarsGallery,
} from '../sim/nasaData';
import { LocalizedWeatherEvent, LogEntry } from '../sim/simEngine';

interface LogModalProps {
  open: boolean;
  onClose: () => void;
  log: LogEntry[];
  activeWeatherEvent: LocalizedWeatherEvent | null;
  weatherSecondsLeft: number;
  habitatDistMeters: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  ripples: {
    m1LeakUnsealed: boolean;
    m2GreenhouseShed: boolean;
    m2RoverSentInStorm: boolean;
    m2PanelsCleanedAfterStorm: boolean;
    m3EmergencyWaterUsed: boolean;
    m3IceFound: boolean;
    m4EmergencyFoodUsed: boolean;
    m5EvaDuringStorm: boolean;
  };
}

export function CommandersLogModal({
  open,
  onClose,
  log,
  activeWeatherEvent,
  weatherSecondsLeft,
  habitatDistMeters,
  soundEnabled,
  onToggleSound,
  ripples,
}: LogModalProps) {
  const activeRipples = [
    ripples.m1LeakUnsealed && 'M1: Tank 2 left open — extra O₂ lost.',
    ripples.m2GreenhouseShed && 'M2: Greenhouse dimmed — −30% crop growth.',
    ripples.m2RoverSentInStorm && 'M2: Rover drove inside dust storm.',
    ripples.m2PanelsCleanedAfterStorm && 'M2: Panels swept — +25% solar boost!',
    ripples.m3EmergencyWaterUsed && 'M3: 60 kg backup water spent.',
    ripples.m3IceFound && 'M3: Buried ice found (+70% drill odds).',
    ripples.m4EmergencyFoodUsed && 'M4: Backup food packs opened.',
    ripples.m5EvaDuringStorm && 'M5: Outside walk added radiation dose.',
  ].filter(Boolean) as string[];

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#040B16]/45"
          onClick={onClose}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-drawer-title"
            initial={{ x: '100%', opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-[420px] flex-col border-l border-[#E85D04]/60 bg-[#071324]/95 text-[#F8F9FA] shadow-[-12px_0_40px_rgba(232,93,4,0.28)] font-[family-name:var(--font-game)]"
          >
            {/* Top Orange Rim Bar */}
            <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#E85D04] via-[#FFB703] to-[#22C55E]" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[11px] font-bold text-[#FFB703]">Commander&apos;s Journal</p>
                <h2
                  id="log-drawer-title"
                  className="mt-0.5 flex items-center gap-2 text-lg font-extrabold tracking-tight text-[#F8F9FA]"
                >
                  <BookOpen className="h-4.5 w-4.5 text-[#FFB703]" aria-hidden="true" />
                  <span>Mission Timeline</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close journal"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E85D04]/45 bg-[#0E2038] text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Active Localized Weather Alert */}
              {activeWeatherEvent && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#E85D04] bg-[#240F13]/92 p-3.5 shadow-[0_0_22px_rgba(232,93,4,0.35)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#FFB703]">
                      <Wind className="h-4 w-4 text-[#E85D04]" aria-hidden="true" />
                      Weather Alert · Seek Shelter
                    </span>
                    <span className="rounded bg-[#E85D04] px-2 py-0.5 text-xs font-black text-[#F8F9FA] tabular-nums">
                      {weatherSecondsLeft}s
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-base font-extrabold text-[#F8F9FA]">
                    {activeWeatherEvent.title} ({activeWeatherEvent.windSpeedMs} m/s)
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#F8F9FA]/90">
                    {activeWeatherEvent.shelterInstruction} Habitat Airlock is{' '}
                    <strong className="text-[#22C55E] tabular-nums">{habitatDistMeters} m</strong>{' '}
                    away.
                  </p>
                  <p className="mt-2 rounded-lg bg-[#071324]/80 px-2.5 py-1.5 text-[11px] leading-snug text-[#F8F9FA]/80">
                    {activeWeatherEvent.scienceNote}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#22C55E] px-3 text-xs font-extrabold text-[#071324] hover:brightness-110 cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      <span>Run to Habitat!</span>
                    </button>
                    {!soundEnabled && (
                      <button
                        type="button"
                        onClick={onToggleSound}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#FFB703]/60 bg-[#0E2038] px-3 text-xs font-bold text-[#FFB703] cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Audio</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Compact Later Effects */}
              {activeRipples.length > 0 && (
                <div className="rounded-xl border border-[#E85D04]/35 bg-[#0D213B]/75 p-3">
                  <p className="text-[11px] font-bold text-[#FFB703]">Active Effects</p>
                  <ul className="mt-1.5 space-y-1 text-xs text-[#F8F9FA]/90">
                    {activeRipples.map((r) => (
                      <li key={r} className="leading-snug">
                        • {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Vertical Timeline Entries */}
              <div>
                <p className="mb-3 text-[11px] font-bold text-[#F8F9FA]/65">
                  Events &amp; Decisions ({log.length})
                </p>

                {log.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-[#0D213B]/55 p-4 text-xs leading-relaxed text-[#F8F9FA]/75">
                    No decisions or storms logged yet. Walk to the glowing mission beacon and press{' '}
                    <strong className="text-[#FFB703]">E</strong> to start.
                  </div>
                ) : (
                  <div className="relative pl-5 space-y-3 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-[#E85D04]/35">
                    {log.map((entry) => {
                      const isWeather = entry.kind === 'weather';
                      const isShelterSafe = entry.kind === 'shelter' && entry.severity === 'info';
                      const isShelterWarn =
                        entry.kind === 'shelter' && entry.severity === 'warning';

                      const iconColor = isWeather
                        ? 'border-[#E85D04] bg-[#2D1418] text-[#E85D04]'
                        : isShelterSafe
                          ? 'border-[#22C55E] bg-[#0E2923] text-[#22C55E]'
                          : isShelterWarn
                            ? 'border-[#FFB703] bg-[#2B1F16] text-[#FFB703]'
                            : 'border-[#38BDF8] bg-[#0D213B] text-[#38BDF8]';

                      const cardBorder = isWeather
                        ? 'border-[#E85D04]/60 bg-[#240F13]/75'
                        : isShelterSafe
                          ? 'border-[#22C55E]/45 bg-[#0D213B]/80'
                          : isShelterWarn
                            ? 'border-[#FFB703]/45 bg-[#231914]/80'
                            : 'border-[#E85D04]/30 bg-[#0D213B]/75';

                      return (
                        <div key={entry.id} className="relative">
                          {/* Timeline Node Icon */}
                          <span
                            className={`absolute -left-5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border ${iconColor}`}
                          >
                            {isWeather ? (
                              <Wind className="h-2.5 w-2.5" aria-hidden="true" />
                            ) : isShelterSafe ? (
                              <ShieldCheck className="h-2.5 w-2.5" aria-hidden="true" />
                            ) : isShelterWarn ? (
                              <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
                            ) : (
                              <Flag className="h-2.5 w-2.5" aria-hidden="true" />
                            )}
                          </span>

                          {/* Compact Timeline Card */}
                          <div className={`rounded-xl border p-3 ${cardBorder}`}>
                            <div className="flex items-center justify-between gap-2 text-[11px] font-bold tabular-nums">
                              <span className="text-[#FFB703]">Sol {entry.sol}</span>
                              <span className="truncate text-[#38BDF8]">{entry.choiceLabel}</span>
                            </div>
                            <h3 className="mt-0.5 text-xs font-extrabold text-[#F8F9FA]">
                              {entry.title}
                            </h3>
                            <p className="mt-1 text-[11px] leading-snug text-[#F8F9FA]/85">
                              {entry.outcomeSummary}
                            </p>
                            {entry.rippleNote && (
                              <p className="mt-1 text-[11px] font-bold text-[#FFB703]">
                                → {entry.rippleNote}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

interface DataCreditsModalProps {
  open: boolean;
  onClose: () => void;
  donkiStatus: 'LIVE' | 'ARCHIVED';
  donkiDateLabel: string;
}

export function DataCreditsModal({
  open,
  onClose,
  donkiStatus,
  donkiDateLabel,
}: DataCreditsModalProps) {
  const [gallery, setGallery] = useState<NasaMarsPhotoItem[]>(ARCHIVED_MARS_GALLERY);
  const [galleryLoaded, setGalleryLoaded] = useState(false);

  useEffect(() => {
    if (!open || galleryLoaded) return;
    let active = true;
    fetchNasaMarsGallery().then((items) => {
      if (!active) return;
      setGallery(items);
      setGalleryLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [open, galleryLoaded]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#040B16]/55"
          onClick={onClose}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="credits-drawer-title"
            initial={{ x: '100%', opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-xl flex-col border-l border-[#E85D04]/60 bg-[#071324]/96 text-[#F8F9FA] shadow-[-12px_0_40px_rgba(232,93,4,0.25)] font-[family-name:var(--font-game)]"
          >
            <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#38BDF8] via-[#FFB703] to-[#22C55E]" />

            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[11px] font-bold text-[#FFB703]">Science &amp; NASA Data</p>
                <h2
                  id="credits-drawer-title"
                  className="mt-0.5 flex items-center gap-2 text-lg font-extrabold tracking-tight"
                >
                  <Database className="h-4.5 w-4.5 text-[#FFB703]" aria-hidden="true" />
                  <span>Real NASA Science vs Game Values</span>
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close NASA data drawer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E85D04]/45 bg-[#0E2038] text-[#F8F9FA] hover:border-[#FFB703] cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Provenance Legend */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="rounded-xl border border-[#22C55E]/40 bg-[#0D213B]/75 p-2.5">
                  <span className="text-[10px] font-extrabold text-[#22C55E]">REAL</span>
                  <p className="mt-0.5 text-[11px] text-[#F8F9FA]/85 leading-snug">
                    Published NASA, JPL, SwRI, PDS, or USGS mission data.
                  </p>
                </div>
                <div className="rounded-xl border border-[#38BDF8]/40 bg-[#0D213B]/75 p-2.5">
                  <span className="text-[10px] font-extrabold text-[#38BDF8]">DERIVED</span>
                  <p className="mt-0.5 text-[11px] text-[#F8F9FA]/85 leading-snug">
                    Calculated from real NASA baselines (e.g., 4 crew × 0.84 kg O₂/day).
                  </p>
                </div>
                <div className="rounded-xl border border-[#FFB703]/40 bg-[#0D213B]/75 p-2.5">
                  <span className="text-[10px] font-extrabold text-[#FFB703]">SIMULATION</span>
                  <p className="mt-0.5 text-[11px] text-[#F8F9FA]/85 leading-snug">
                    Balanced gameplay numbers (tanks, repair odds, harvests).
                  </p>
                </div>
              </div>

              {/* Honesty Statement */}
              <div className="rounded-xl border border-white/12 bg-[#0D213B]/65 p-3 text-xs leading-relaxed text-[#F8F9FA]/88">
                <p className="flex items-center gap-1.5 font-bold text-[#FFB703]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  DONKI Space Weather ({donkiStatus} · {donkiDateLabel})
                </p>
                <p className="mt-1 text-[11px]">
                  NASA DONKI models when solar storms may hit Mars to trigger Mission 5.
                </p>
                <p className="mt-2 flex items-center gap-1.5 font-bold text-[#22C55E]">
                  <Bot className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Rover Honesty Note
                </p>
                <p className="mt-0.5 text-[11px]">
                  Rover hints use pre-written NASA science notes and never invent fake stats.
                </p>
              </div>

              {/* Dataset Ledger */}
              <div className="space-y-2">
                {DATA_CREDITS_LEDGER.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-xl border border-white/10 bg-[#0D213B]/60 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-extrabold text-[#F8F9FA]">
                        {d.id} · {d.dataset}
                      </span>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#38BDF8] hover:underline"
                      >
                        <span>{d.provider}</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                    <p className="mt-1 text-[11px] text-[#F8F9FA]/85">
                      <strong className="text-[#F8F9FA]">Fields:</strong> {d.fieldsUsed} ({d.unitsRange})
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#F8F9FA]/75">
                      <strong className="text-[#FFB703]">Game Use:</strong> {d.gameUse}
                    </p>
                  </div>
                ))}
              </div>

              {/* NASA Mars Photos */}
              <div className="rounded-xl border border-white/12 bg-[#0D213B]/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#38BDF8]">
                    <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>NASA Mars Photos</span>
                  </p>
                  <span className="text-[10px] font-bold text-[#22C55E]">
                    {gallery[0]?.status ?? 'ARCHIVED'}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {gallery.slice(0, 4).map((item) => (
                    <a
                      key={item.id}
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#071324]/85 p-2 hover:border-[#FFB703]"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          loading="lazy"
                          className="h-11 w-14 shrink-0 rounded object-cover bg-[#0E2038]"
                        />
                      ) : (
                        <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded bg-[#0E2038] text-[9px] font-bold text-[#FFB703]">
                          {item.center}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-[#F8F9FA]">{item.title}</p>
                        <p className="truncate text-[10px] text-[#F8F9FA]/70">
                          {item.status} · {item.dateCreated}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-[#F8F9FA]/60">
                Science data from NASA, JPL-Caltech, SwRI, PDS, and USGS. Independent educational
                project.
              </p>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
