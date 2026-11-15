/**
 * SOL COMMANDER: Last Habitat — Single Source of Truth for Scientific Credits,
 * Provenance, Software Attribution, and AI Disclosures.
 */

export interface NasaDatasetCredit {
  id: string;
  dataset: string;
  agency: string;
  gameUse: string;
  status: 'LIVE' | 'ARCHIVED' | 'STATIC';
  dateOrVersion: string;
  notes: string;
  url: string;
}

export interface ScienceReferenceCredit {
  title: string;
  authors: string;
  publication: string;
  roleInGame: string;
  citationUrl?: string;
}

export interface SoftwareLibraryCredit {
  name: string;
  version: string;
  license: string;
  role: string;
}

export const CREDITS_DATA = {
  projectTitle: 'SOL COMMANDER: Last Habitat',
  challengeName: 'NASA International Space Apps Challenge 2026',
  challengeCategory: 'Junior Astronaut Mission Trainer',
  teamName: 'Sol Commander Team',

  disclaimers: {
    independence:
      'This is an independent educational project made for the NASA Space Apps Challenge 2026. NASA does not endorse, certify, or sponsor this project.',
    simulationValues:
      'Many numbers are simulation values balanced for youth gameplay; they are clearly labelled as SIMULATION or CALCULATION in the game.',
    badgeAchievement:
      'Badges are in-game educational achievements, not official NASA certificates or government credentials.',
  },

  aiDisclosure:
    'This game was built with AI-assisted tools: Cursor, Antigravity, Google AI Studio (Gemini) and Claude (Anthropic). The tools helped write code, tests, documents and prompts. People on the team designed the game, chose the science content, reviewed the work and tested the game. The game contains no AI-generated voice or Web Speech API TTS. Sound effects are synthesised procedurally in the browser using the Web Audio API.',

  audioAttribution:
    'All sound effects and speaker tonal chimes are synthesised in real time in your browser with the Web Audio API. Zero audio files or external audio samples are loaded over the network.',

  nasaDatasets: [
    {
      id: 'NSSDC-MARS',
      dataset: 'NSSDC Mars Fact Sheet',
      agency: 'NASA Goddard Space Flight Center',
      gameUse: 'Surface gravity (3.73 m/s²), solar constant (586.2 W/m² = 43.1% Earth), surface pressure (~6.36 mb), and Sol length (88,775 s).',
      status: 'STATIC',
      dateOrVersion: 'NSSDC 2024 Reference',
      notes: 'Planetary baseline for character jump apex (0.59 m) and suited walking Froude mechanics.',
      url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
    },
    {
      id: 'DONKI-SPACE-WEATHER',
      dataset: 'Space Weather Database Of Notifications, Knowledge, Information (DONKI)',
      agency: 'NASA CCMC / Goddard Space Flight Center',
      gameUse: 'Live solar flare (FLR), solar energetic particle (SEP), and coronal mass ejection (CME) alerts driving Mission 5 space radiation warnings.',
      status: 'LIVE',
      dateOrVersion: 'Live Query (or deterministic verified fallback archive)',
      notes: 'Displays ARCHIVED tag with observation timestamp if the NASA API is rate-limited or offline.',
      url: 'https://api.nasa.gov/',
    },
    {
      id: 'OPPORTUNITY-DUST',
      dataset: 'Opportunity (MER-B) 2007 Global Dust Storm Solar Power Loss Records',
      agency: 'NASA Jet Propulsion Laboratory',
      gameUse: 'Mission 2 Solar Array dust degradation curve (tau optical depth vs power generation decay).',
      status: 'ARCHIVED',
      dateOrVersion: 'Sol 1200–1250 Historical Archive',
      notes: 'Demonstrates dust accumulation on photovoltaic panels and cleaning events.',
      url: 'https://mars.nasa.gov/mer/mission/status_opportunityAll.html',
    },
    {
      id: 'CURIOSITY-RAD',
      dataset: 'Curiosity Radiation Assessment Detector (RAD) Measurements',
      agency: 'NASA JPL / SwRI',
      gameUse: 'Martian surface GCR and SPE radiation dose baseline (~0.64 mSv/day quiet sun, spiking during events).',
      status: 'ARCHIVED',
      dateOrVersion: 'MSL Science Archive',
      notes: 'Used in Mission 5 Storm Shelter water-wall radiation mitigation calculations.',
      url: 'https://mars.nasa.gov/msl/spacecraft/instruments/rad/',
    },
    {
      id: 'PERSEVERANCE-MEDA',
      dataset: 'Perseverance Mars Environmental Dynamics Analyzer (MEDA)',
      agency: 'NASA JPL / Centro de Astrobiología',
      gameUse: 'Daily atmospheric temperature swings (-80°C night to -15°C day) and diurnal pressure cycles.',
      status: 'ARCHIVED',
      dateOrVersion: 'Mars 2020 Science Team',
      notes: 'Thermal contraction and expansion cycles that cause pipe O-ring fatigue in Mission 1.',
      url: 'https://mars.nasa.gov/mars2020/spacecraft/instruments/meda/',
    },
    {
      id: 'MOXIE-OXYGEN',
      dataset: 'Mars Oxygen ISRU Experiment (MOXIE)',
      agency: 'NASA JPL / MIT',
      gameUse: 'Solid oxide electrolysis production rates (6–10 g O₂/hour) informing Habitat life-support calculations.',
      status: 'ARCHIVED',
      dateOrVersion: '2021–2023 Mission Demonstration',
      notes: 'Educational context for secondary O₂ regeneration in Habitat Core.',
      url: 'https://mars.nasa.gov/mars2020/spacecraft/instruments/moxie/',
    },
    {
      id: 'SWIM-ICE',
      dataset: 'Subsurface Water Ice Mapping (SWIM) on Mars',
      agency: 'NASA Planetary Science Division / PSI',
      gameUse: 'Radar and neutron spectrometer data identifying shallow subsurface ice for Mission 3 Ice Drill Rig.',
      status: 'ARCHIVED',
      dateOrVersion: 'SWIM 2020–2023 Global Map',
      notes: 'Locations of shallow Martian ice sheets in Arcadia and Deuteronilus Planitiae.',
      url: 'https://swim.psi.edu/',
    },
  ] as NasaDatasetCredit[],

  scienceReferences: [
    {
      title: 'In situ recording of Mars soundscape',
      authors: 'Maurice, S., Chide, B., Murdoch, N., et al.',
      publication: 'Nature 605, 653–658 (2022)',
      roleInGame: 'Perseverance SuperCam microphone data proving dual sound speed (240 m/s low-pitch, 250 m/s high-pitch) and CO₂ acoustic attenuation, driving game distance-delayed audio.',
      citationUrl: 'https://doi.org/10.1038/s41586-022-04679-0',
    },
    {
      title: 'Selection of the Mars Science Laboratory landing site',
      authors: 'Golombek, M., et al.',
      publication: 'Space Science Reviews 170(1–4), 641–737 (2012)',
      roleInGame: 'Exponential rock abundance distribution model F_k(D) = k * exp(-q(k)*D) used to procedurally scatter basalt rocks.',
      citationUrl: 'https://doi.org/10.1007/s11214-012-9916-y',
    },
    {
      title: 'Mars gravity simulation: Gait and locomotion',
      authors: 'Carr, C. E., & McGee, T. F.',
      publication: 'PLoS ONE 4(7): e6319 (2009)',
      roleInGame: 'Dynamic Froude locomotion scaling: suited walk speed 0.863 m/s, transition Fr* ≈ 0.36, Martian lope speed 2.65 m/s.',
      citationUrl: 'https://doi.org/10.1371/journal.pone.0006319',
    },
    {
      title: 'Cohesive and noncohesive regolith properties on Mars',
      authors: 'Sullivan, R., et al.',
      publication: 'J. Geophys. Res. 116, E02006 (2011)',
      roleInGame: 'Martian regolith internal friction angle (33° midpoint) and wheel-grouser sinkage physics in Rapier.',
      citationUrl: 'https://doi.org/10.1029/2010JE003625',
    },
  ] as ScienceReferenceCredit[],

  softwareLibraries: [
    { name: 'three', version: '0.187.0', license: 'MIT', role: 'WebGL 3D graphics rendering engine' },
    { name: '@dimforge/rapier3d-compat', version: '0.21.0', license: 'Apache-2.0', role: 'WebAssembly 3D physics engine' },
    { name: 'react & react-dom', version: '19.0.1', license: 'MIT', role: 'HUD and UI component framework' },
    { name: 'motion', version: '12.23.24', license: 'MIT', role: 'Hardware-accelerated UI animations' },
    { name: 'lucide-react', version: '0.546.0', license: 'ISC', role: 'Accessibility UI vector icons' },
    { name: 'tailwindcss', version: '4.3.3', license: 'MIT', role: 'Utility styling system' },
    { name: 'vite', version: '8.3.0', license: 'MIT', role: 'Build bundler & dev server' },
    { name: 'vitest', version: '5.1.0', license: 'MIT', role: 'Automated physics and headless unit test framework' },
  ] as SoftwareLibraryCredit[],
};
