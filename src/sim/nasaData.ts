/**
 * NASA Space Weather (DONKI), Perseverance MEDA Archived Weather,
 * and Complete Science / Data Credits Ledger (D1-D10, S1-S22).
 *
 * Honesty rule: Show LIVE only if an actual API call succeeded this session.
 * Otherwise show ARCHIVED · date. Never label historical RAD/MEDA as live.
 */

export interface DonkiSpaceWeather {
  status: 'LIVE' | 'ARCHIVED';
  dateLabel: string;
  flareClass: 'A' | 'B' | 'C' | 'M' | 'X';
  flareLabel: string;
  marsArrivalTime: string;
  impactType: 'Glancing Blow' | 'Minor Impact' | 'Direct Watch' | 'Low Activity';
  isSevereStorm: boolean;
  summary: string;
  sourceUrl: string;
}

export interface MedaArchivedSol {
  sol: number;
  earthDate: string;
  location: string;
  pressurePa: number;
  airTempMinC: number;
  airTempMaxC: number;
  windMs: number;
  dustTau: number;
  note: string;
}

export interface DataCreditEntry {
  id: string;
  dataset: string;
  provider: string;
  fieldsUsed: string;
  unitsRange: string;
  gameUse: string;
  statusType: 'Static' | 'Static Archive' | 'Historical (2012-13)' | 'Live API + Fallback';
  limitations: string;
  url: string;
}

/** [REAL S14] Authentic fallback record from July 2026 DONKI WSA-Enlil Mars arrival */
export const ARCHIVED_DONKI_FALLBACK: DonkiSpaceWeather = {
  status: 'ARCHIVED',
  dateLabel: 'ARCHIVED · 2026-07-09',
  flareClass: 'M',
  flareLabel: 'M4.2 Solar Flare + CME',
  marsArrivalTime: '2026-07-13 14:20 UTC (modelled)',
  impactType: 'Glancing Blow',
  isSevereStorm: true,
  summary:
    'WSA-Enlil model forecast flags a Coronal Mass Ejection (CME) glancing blow toward Mars orbit. Triggered radiation watch for Mission 5.',
  sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/WSA-ENLIL/47478/1',
};

/** [REAL S20] Archived Perseverance MEDA sample sols (Jezero Crater, tagged ARCHIVED) */
export const ARCHIVED_MEDA_SOLS: MedaArchivedSol[] = [
  {
    sol: 412,
    earthDate: '2022-04-17',
    location: 'Jezero Crater (MEDA Archive)',
    pressurePa: 718,
    airTempMinC: -78,
    airTempMaxC: -21,
    windMs: 6.4,
    dustTau: 0.72,
    note: 'Clear afternoon breeze; steady sunlight reaches rover deck.',
  },
  {
    sol: 685,
    earthDate: '2023-01-23',
    location: 'Jezero Crater (MEDA Archive)',
    pressurePa: 742,
    airTempMinC: -82,
    airTempMaxC: -31,
    windMs: 14.8,
    dustTau: 2.05,
    note: 'Dusty haze lowers midday temperature swings and dims sunlight.',
  },
];

interface DonkiFlareRaw {
  classType?: string;
  beginTime?: string;
  peakTime?: string;
}

interface DonkiEnlilRaw {
  modelCompletionTime?: string;
  impactList?: Array<{
    location?: string;
    arrivalTime?: string;
    isGlancingBlow?: boolean;
  }>;
}

/**
 * Fetches live NASA DONKI FLR + WSAEnlilSimulations with strict 3.5s timeout.
 * Falls back transparently to ARCHIVED · 2026-07-09 if offline or rate-limited.
 */
export async function fetchDonkiSpaceWeather(): Promise<DonkiSpaceWeather> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3500);

  try {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const startDate = fmt(start);
    const endDate = fmt(end);

    const [flrRes, enlilRes] = await Promise.all([
      fetch(
        `https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=DEMO_KEY`,
        { signal: controller.signal },
      ),
      fetch(
        `https://api.nasa.gov/DONKI/WSAEnlilSimulations?startDate=${startDate}&endDate=${endDate}&api_key=DEMO_KEY`,
        { signal: controller.signal },
      ),
    ]);

    if (!flrRes.ok || !enlilRes.ok) {
      return ARCHIVED_DONKI_FALLBACK;
    }

    const flares = (await flrRes.json()) as DonkiFlareRaw[];
    const enlilRuns = (await enlilRes.json()) as DonkiEnlilRaw[];

    let latestFlare: DonkiFlareRaw | undefined;
    if (Array.isArray(flares) && flares.length > 0) {
      latestFlare = flares[flares.length - 1];
    }

    let marsImpact: { arrivalTime?: string; isGlancingBlow?: boolean } | undefined;
    if (Array.isArray(enlilRuns)) {
      for (let i = enlilRuns.length - 1; i >= 0; i--) {
        const imp = enlilRuns[i].impactList?.find((item) =>
          (item.location ?? '').toLowerCase().includes('mars'),
        );
        if (imp) {
          marsImpact = imp;
          break;
        }
      }
    }

    const rawClass = (latestFlare?.classType ?? 'C2.0').trim().toUpperCase();
    const firstChar = rawClass.charAt(0);
    const flareClass: DonkiSpaceWeather['flareClass'] =
      firstChar === 'X' || firstChar === 'M' || firstChar === 'C' || firstChar === 'B'
        ? firstChar
        : 'A';

    const hasMarsCme = Boolean(marsImpact);
    const isSevereStorm = flareClass === 'X' || flareClass === 'M' || hasMarsCme;
    const todayStr = new Date().toISOString().slice(0, 10);

    return {
      status: 'LIVE',
      dateLabel: `LIVE · ${todayStr}`,
      flareClass,
      flareLabel: latestFlare?.classType
        ? `${latestFlare.classType} Solar Flare`
        : 'Quiet Solar Baseline',
      marsArrivalTime: marsImpact?.arrivalTime
        ? `${marsImpact.arrivalTime.replace('T', ' ').slice(0, 16)} UTC (modelled)`
        : 'No direct Mars CME shock currently listed',
      impactType: hasMarsCme
        ? marsImpact?.isGlancingBlow
          ? 'Glancing Blow'
          : 'Minor Impact'
        : isSevereStorm
          ? 'Direct Watch'
          : 'Low Activity',
      isSevereStorm,
      summary: hasMarsCme
        ? `Live NASA DONKI WSA-Enlil record forecasts a CME ${
            marsImpact?.isGlancingBlow ? 'glancing blow' : 'minor impact'
          } near Mars.`
        : `Live NASA DONKI reports recent ${rawClass} solar flare activity monitored across the inner solar system.`,
      sourceUrl: 'https://api.nasa.gov/',
    };
  } catch {
    return ARCHIVED_DONKI_FALLBACK;
  } finally {
    window.clearTimeout(timer);
  }
}

export const DATA_CREDITS_LEDGER: DataCreditEntry[] = [
  {
    id: 'D1',
    dataset: 'NSSDC Mars Fact Sheet (S1, S1b)',
    provider: 'NASA GSFC',
    fieldsUsed: 'Gravity (3.73 m/s²), Solar Irradiance (586.2 W/m², 43.1% Earth), Pressure (~6.36 mb), Temp (-63 °C)',
    unitsRange: 'm/s², W/m², mb, °C',
    gameUse: 'Mars jump gravity, HUD physics facts, solar baseline',
    statusType: 'Static',
    limitations: 'Pressure & daily range (-89 to -31 °C) quoted for Viking 1 site and global means.',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
  },
  {
    id: 'D2',
    dataset: 'DONKI FLR & WSA-Enlil Impact List (S14)',
    provider: 'NASA CCMC / M2M SWAO',
    fieldsUsed: 'classType, beginTime, Mars impactList arrivalTime & glancing blow',
    unitsRange: 'Class A/B/C/M/X; UTC time',
    gameUse: 'Mission 5 solar storm trigger & Live/Archived Space Weather badge',
    statusType: 'Live API + Fallback',
    limitations:
      'Earth-observed flares are a proxy; Mars arrival is an experimental model forecast, not a base radiation dose measurement.',
    url: 'https://api.nasa.gov/',
  },
  {
    id: 'D3',
    dataset: 'Curiosity MSL RAD Measurements (S3, S4, S18)',
    provider: 'SwRI / NASA MSL / PDS',
    fieldsUsed: 'Surface GCR 0.67 mSv/day, Transit 1.8 mSv/day, Career limit 600 mSv',
    unitsRange: 'mSv/day, mSv',
    gameUse: 'Career & Event radiation dose meters',
    statusType: 'Historical (2012-13)',
    limitations: 'Measured at Gale Crater (Aug 2012–Jun 2013); solar-cycle dependent. Never labelled live.',
    url: 'https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars',
  },
  {
    id: 'D4',
    dataset: 'Opportunity Dust Storm Power Curve (S9, S10, S11)',
    provider: 'NASA JPL / NTRS',
    fieldsUsed: 'Sols 5105-5107: 468 → 345 → 133 Wh as tau rose ~1.0 → 2.1 → >3.0; ~21-sol dust lag',
    unitsRange: 'Wh/sol, optical depth tau',
    gameUse: 'Mission 2 dust-to-power multiplier (100% → 74% → 28%) & post-storm panel cleaning timing',
    statusType: 'Static',
    limitations: 'Rover panels are much smaller than a habitat array; used for curve shape only.',
    url: 'https://ntrs.nasa.gov/api/citations/20190028687/downloads/20190028687.pdf',
  },
  {
    id: 'D5',
    dataset: 'Perseverance MEDA Weather Archive (S20)',
    provider: 'NASA PDS Atmospheres',
    fieldsUsed: 'Pressure, air temperature, wind speed, dust tau',
    unitsRange: 'Pa, °C, m/s, tau',
    gameUse: 'Archived weather reference drawer during Mission 2',
    statusType: 'Static Archive',
    limitations: 'Recorded at Jezero Crater, not our fictional mid-latitude outpost. Always tagged ARCHIVED.',
    url: 'https://atmos.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html',
  },
  {
    id: 'D6',
    dataset: 'MOXIE Oxygen Experiment (S8, S21)',
    provider: 'NASA / MIT / PDS',
    fieldsUsed: 'Peak 12 g/h O₂ from 96% CO₂ air (122 g total across 16 runs)',
    unitsRange: 'g/hour, % purity',
    gameUse: 'ISRU Oxygen Generator scale comparison vs 1 astronaut daily need',
    statusType: 'Static',
    limitations: 'Experiment-scale technology demonstrator, scaled up in simulation for full crew ISRU.',
    url: 'https://mars.nasa.gov/mars2020/spacecraft/instruments/moxie/',
  },
  {
    id: 'D7',
    dataset: 'SWIM Buried Ice Map (S12, S13)',
    provider: 'NASA JPL / PSI / USGS',
    fieldsUsed: 'Shallowly buried mid-latitude (35–45°N) ice depth 0 to >5 m',
    unitsRange: 'Latitude, meters depth',
    gameUse: 'Outpost site trade-off (ice vs sunlight) & Mission 3/5 prospecting',
    statusType: 'Static',
    limitations: 'Orbital radar/neutron inference; not ground-truthed by drilling.',
    url: 'https://photojournal.jpl.nasa.gov/catalog/PIA26045',
  },
  {
    id: 'D8',
    dataset: 'NASA Life Support BVAD & NTRS Baselines (S5, S6, S7, S17)',
    provider: 'NASA JSC / ARC',
    fieldsUsed: '0.84 kg O₂, 1.00 kg CO₂, 0.62 kg food, 2.37 kg drink/prep water per crew/day; CHAPEA 4-crew structure',
    unitsRange: 'kg/CM/day',
    gameUse: 'Baseline 4-crew daily consumption math & greenhouse crop supplement concept',
    statusType: 'Static',
    limitations: 'Human-spaceflight planning assumptions, not measured Mars colony telemetry.',
    url: 'https://ntrs.nasa.gov/citations/20210024855',
  },
  {
    id: 'D10',
    dataset: 'NASA Space Communications Latency (S15, S16)',
    provider: 'NASA Space Comms',
    fieldsUsed: '4–24 min one-way signal delay; ~2-week solar conjunction blackouts',
    unitsRange: 'minutes, days',
    gameUse: 'Mission Control advice countdown timer',
    statusType: 'Static',
    limitations: 'Exact delay varies continuously with Earth–Mars orbital distance.',
    url: 'https://www.nasa.gov/solar-system/space-communications-7-things-you-need-to-know/',
  },
  {
    id: 'D11',
    dataset: 'NASA MGS/MRO Crustal Gravity & Ames Thin-Air Wind Turbine Studies',
    provider: 'NASA GSFC / ARC',
    fieldsUsed: 'Spatially varying gravity anomalies (mascons/elevation around 3.73 m/s²) & 0.020 kg/m³ CO₂ wind turbine curves',
    unitsRange: 'm/s², mGal, kg/m³, Pa',
    gameUse: 'Local Mars gravity field sensor & wide-chord wind turbine backup generation',
    statusType: 'Static',
    limitations: 'Crater mascon relief & turbine kilowatt output are scaled for educational clarity across the playable base.',
    url: 'https://science.nasa.gov/mission/mars-reconnaissance-orbiter/',
  },
];

export interface NasaMarsPhotoItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  dateCreated: string;
  center: string;
  status: 'LIVE' | 'ARCHIVED';
  sourceUrl: string;
}

export const ARCHIVED_MARS_GALLERY: NasaMarsPhotoItem[] = [
  {
    id: 'PIA26045',
    title: 'SWIM Buried Mid-Latitude Water Ice Map',
    description:
      'NASA Mars Reconnaissance Orbiter & Mars Odyssey radar/neutron synthesis showing buried water-ice seams beneath Martian mid-latitude plains.',
    imageUrl: '',
    dateCreated: '2023-10-25',
    center: 'JPL-Caltech',
    status: 'ARCHIVED',
    sourceUrl: 'https://photojournal.jpl.nasa.gov/catalog/PIA26045',
  },
  {
    id: 'PIA24926',
    title: 'Perseverance Jezero Crater Delta & Wind Scour',
    description:
      'Real rover survey showing layered sedimentary outcrops and wind-carved Martian regolith dunes studied by MEDA weather sensors.',
    imageUrl: '',
    dateCreated: '2022-04-17',
    center: 'JPL-Caltech',
    status: 'ARCHIVED',
    sourceUrl: 'https://images.nasa.gov/details/PIA24926',
  },
  {
    id: 'ARC-CHAPEA-2023',
    title: 'NASA CHAPEA 3D-Printed Mars Habitat Analog',
    description:
      '1,700 sq ft simulated Mars habitat at Johnson Space Center where 4-person crews live and manage water, crops, and communications delay.',
    imageUrl: '',
    dateCreated: '2023-06-25',
    center: 'JSC',
    status: 'ARCHIVED',
    sourceUrl: 'https://www.nasa.gov/humans-in-space/chapea/',
  },
];

interface NasaImagesSearchRaw {
  collection?: {
    items?: Array<{
      data?: Array<{
        nasa_id?: string;
        title?: string;
        description?: string;
        date_created?: string;
        center?: string;
      }>;
      links?: Array<{
        href?: string;
        rel?: string;
        render?: string;
      }>;
    }>;
  };
}

/**
 * Fetches real NASA Image & Video Library Mars surface/outpost photographs (CORS-friendly, no API key needed).
 * Strictly displayed inside HTML Data Credits UI (never used as WebGL textures).
 */
export async function fetchNasaMarsGallery(): Promise<NasaMarsPhotoItem[]> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(
      'https://images-api.nasa.gov/search?q=Mars+Perseverance+surface&media_type=image&page_size=6',
      { signal: controller.signal },
    );
    if (!res.ok) return ARCHIVED_MARS_GALLERY;

    const json = (await res.json()) as NasaImagesSearchRaw;
    const rawItems = json.collection?.items ?? [];
    const parsed: NasaMarsPhotoItem[] = [];

    for (const item of rawItems) {
      const meta = item.data?.[0];
      const thumb = item.links?.find((l) => l.rel === 'preview' && l.href)?.href;
      if (!meta?.title || !thumb) continue;
      const cleanDesc = (meta.description ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160);
      parsed.push({
        id: meta.nasa_id ?? `NASA-${parsed.length}`,
        title: meta.title,
        description: cleanDesc || 'Official NASA Mars surface & exploration archive imagery.',
        imageUrl: thumb,
        dateCreated: (meta.date_created ?? '').slice(0, 10) || 'NASA Archive',
        center: meta.center ?? 'NASA / JPL',
        status: 'LIVE',
        sourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(meta.nasa_id ?? '')}`,
      });
      if (parsed.length >= 4) break;
    }

    return parsed.length > 0 ? parsed : ARCHIVED_MARS_GALLERY;
  } catch {
    return ARCHIVED_MARS_GALLERY;
  } finally {
    window.clearTimeout(timer);
  }
}

