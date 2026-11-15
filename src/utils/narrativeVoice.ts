import { CrewMemberId } from '../sim/constants';
import {
  ACT1_CHORE_SPOTS,
  ACT1_CRYSTAL_CALLOUTS,
  formatWithRoverName,
  JUNIOR_MISSIONS,
  JUNIOR_TUTORIAL_STEPS,
  TutorialStepId,
} from '../sim/storyBeats';
import { MissionId } from '../sim/roverData';
import { normalizeForSpeech } from '../sim/speechNormalizer';
import { soundEngine } from './soundEngine';

/**
 * Character Audio Profiles
 * Maps each character to procedural sound identity and friendly role description
 */
interface CharacterVoiceProfile {
  name: string;
  role: string;
  speakerId: 'rusty' | 'hab' | 'amara' | 'kenji' | 'lucia' | 'rafi' | 'earth' | 'log';
  gender?: 'male' | 'female';
  pitchMod?: number;
  rateMod?: number;
}

const CHARACTERS: Record<string, CharacterVoiceProfile> = {
  rusty: {
    name: '{roverName}',
    role: 'Rover Friend',
    speakerId: 'rusty',
    gender: 'male',
    pitchMod: 1.09,
    rateMod: 1.04,
  },
  rafi: {
    name: 'Rafi',
    role: 'Botanist',
    speakerId: 'rafi',
    gender: 'male',
    pitchMod: 1.02,
    rateMod: 1.0,
  },
  amara: {
    name: 'Amara',
    role: 'Doctor',
    speakerId: 'amara',
    gender: 'female',
    pitchMod: 1.05,
    rateMod: 0.98,
  },
  kenji: {
    name: 'Kenji',
    role: 'Engineer',
    speakerId: 'kenji',
    gender: 'male',
    pitchMod: 1.03,
    rateMod: 1.02,
  },
  lucia: {
    name: 'Lucía',
    role: 'Geologist',
    speakerId: 'lucia',
    gender: 'female',
    pitchMod: 1.08,
    rateMod: 1.03,
  },
  capcom: {
    name: 'Hab Computer',
    role: 'Base System',
    speakerId: 'hab',
    gender: 'male',
    pitchMod: 0.96,
    rateMod: 0.98,
  },
  hab: {
    name: 'Hab Computer',
    role: 'Base System',
    speakerId: 'hab',
    gender: 'male',
    pitchMod: 0.96,
    rateMod: 0.98,
  },
  earth: {
    name: 'Earth Team',
    role: 'Mission Control',
    speakerId: 'earth',
    gender: 'male',
    pitchMod: 0.98,
    rateMod: 0.99,
  },
};

export type VoiceEmotionStyle = 'cheerful' | 'warm-companion' | 'storyteller' | 'calm-mentor';

export interface VoiceStyleConfig {
  id: VoiceEmotionStyle;
  label: string;
  description: string;
  basePitch: number;
  baseRate: number;
  preferredVoices: string[];
}

export const VOICE_STYLES: Record<VoiceEmotionStyle, VoiceStyleConfig> = {
  cheerful: {
    id: 'cheerful',
    label: 'Cheerful Explorer',
    description: 'Lively, friendly & emotional companion tone (Recommended)',
    basePitch: 1.14,
    baseRate: 1.05,
    preferredVoices: [
      'Ryan',
      'Eric',
      'Jenny',
      'Google UK English Female',
      'Aria',
      'Guy',
      'Google UK English Male',
      'Christopher',
    ],
  },
  'warm-companion': {
    id: 'warm-companion',
    label: 'Warm Companion',
    description: 'Natural, warm human expression & supportive guidance',
    basePitch: 1.07,
    baseRate: 1.02,
    preferredVoices: [
      'Guy',
      'Christopher',
      'Jenny',
      'Brian',
      'Google UK English Male',
      'Google UK English Female',
      'Daniel',
      'Oliver',
    ],
  },
  storyteller: {
    id: 'storyteller',
    label: 'Melodic Storyteller',
    description: 'Clear, expressive & melodic cadence with gentle inflection',
    basePitch: 1.06,
    baseRate: 0.98,
    preferredVoices: [
      'Jenny',
      'Aria',
      'Google UK English Female',
      'Christopher',
      'Samantha',
      'Oliver',
    ],
  },
  'calm-mentor': {
    id: 'calm-mentor',
    label: 'Calm Mentor',
    description: 'Confident, serene & supportive astronaut narrator',
    basePitch: 0.98,
    baseRate: 0.98,
    preferredVoices: [
      'Brian',
      'Steffan',
      'Guy',
      'Daniel',
      'Google UK English Male',
      'David',
    ],
  },
};

export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  const normalized = normalizeForSpeech(text);
  return normalized
    .replace(/\[REAL[^\]]*\]/gi, '')
    .replace(/\[SIM[^\]]*\]/gi, '')
    .replace(/\[DERIVED[^\]]*\]/gi, '')
    .replace(/\[[A-Z0-9_\s-]{1,12}\]/gi, '')
    .replace(/(\d+)\s*m\/s\^?2/gi, '$1 meters per second squared')
    .replace(/m\/s\^?2/gi, 'meters per second squared')
    .replace(/(\d+)\s*m\/s²/gi, '$1 meters per second squared')
    .replace(/m\/s²/gi, 'meters per second squared')
    .replace(/(\d+)\s*m\/s\b/gi, '$1 meters per second')
    .replace(/m\/s\b/gi, 'meters per second')
    .replace(/(\d+)\s*kg\/sol/gi, '$1 kilograms per sol')
    .replace(/kg\/sol/gi, 'kilograms per sol')
    .replace(/(\d+)\s*kg\b/gi, '$1 kilograms')
    .replace(/kg\b/gi, 'kilograms')
    .replace(/(\d+)\s*km\/h/gi, '$1 kilometers per hour')
    .replace(/(\d+)\s*km\b/gi, '$1 kilometers')
    .replace(/(\d+)\s*kPa\b/gi, '$1 kilopascals')
    .replace(/kPa\b/gi, 'kilopascals')
    .replace(/(\d+)\s*Pa\b/g, '$1 pascals')
    .replace(/\bPa\b/g, 'pascals')
    .replace(/(\d+)\s*mSv\b/gi, '$1 millisieverts')
    .replace(/mSv\b/gi, 'millisieverts')
    .replace(/(\d+)\s*kWh\b/gi, '$1 kilowatt hours')
    .replace(/kWh\b/gi, 'kilowatt hours')
    .replace(/CO[2₂]/g, 'carbon dioxide')
    .replace(/O[2₂]/g, 'oxygen')
    .replace(/H2O|H₂O/g, 'water')
    .replace(/-(\d+)\s*°?C\b/gi, 'minus $1 degrees')
    .replace(/(\d+)\s*°?C\b/gi, '$1 degrees Celsius')
    .replace(/(\d+)%/g, '$1 percent')
    .replace(/\bWASD\b/g, 'W, A, S, D')
    .replace(/\bD-Pad\b/gi, 'D-pad')
    .replace(/[*_#`~«»]/g, '')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface QueuedVoiceItem {
  characterKey: string;
  text: string;
  dedupKey: string;
  onEnd?: () => void;
}

/**
 * Narrative Voice Manager
 * Reads all lines from `src/sim/storyBeats.ts` (Single Source of Truth),
 * substitutes `{roverName}`, and provides rich expressive emotion-tuned speech
 * with customizable styles (Cheerful, Warm, Melodic, Mentor).
 */
class NarrativeVoiceManager {
  private lastSpokenKey = '';
  private lastSpokenAt = 0;
  private roverName = 'Rusty';
  private activeTimer: number | null = null;
  private isSpeakingNow = false;
  private waitingQueue: QueuedVoiceItem[] = [];
  private currentStyle: VoiceEmotionStyle = 'cheerful';
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const stored = window.localStorage.getItem('sol_commander_voice_style');
        if (stored && stored in VOICE_STYLES) {
          this.currentStyle = stored as VoiceEmotionStyle;
        }
      } catch {}

      try {
        this.loadVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      } catch {}
    }
  }

  private loadVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        this.cachedVoices = v;
      }
    } catch {}
  }

  public getVoiceStyle(): VoiceEmotionStyle {
    return this.currentStyle;
  }

  public setVoiceStyle(style: VoiceEmotionStyle): void {
    if (style in VOICE_STYLES) {
      this.currentStyle = style;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('sol_commander_voice_style', style);
        }
      } catch {}
    }
  }

  public getAvailableStyles(): VoiceStyleConfig[] {
    return Object.values(VOICE_STYLES);
  }

  public testVoice(styleOverride?: VoiceEmotionStyle): void {
    const prev = this.currentStyle;
    if (styleOverride) {
      this.currentStyle = styleOverride;
    }
    this.stopSpeaking();
    this.speakAs(
      'rusty',
      `Hello Commander! I am ${this.roverName}. All systems look fantastic! Let's explore Mars together!`,
      'voice-preview-test',
      0,
      undefined,
      true,
    );
    if (styleOverride) {
      this.currentStyle = prev;
    }
  }

  public setRoverName(name: string): void {
    this.roverName = name.trim() || 'Rusty';
  }

  public getRoverName(): string {
    return this.roverName;
  }

  /**
   * Select best natural, warm, expressive voice matching current emotion style
   */
  private getBestVoiceForStyle(
    styleConfig: VoiceStyleConfig,
    gender?: 'male' | 'female',
  ): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices =
      this.cachedVoices.length > 0
        ? this.cachedVoices
        : window.speechSynthesis.getVoices() ?? [];
    if (!voices || voices.length === 0) return null;

    // 1. Try preferred voices list for the active style (e.g. Ryan, Jenny, Guy, UK English)
    for (const pref of styleConfig.preferredVoices) {
      const match = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          v.name.toLowerCase().includes(pref.toLowerCase()) &&
          (!gender || (gender === 'female' ? !v.name.includes('Male') : !v.name.includes('Female'))),
      );
      if (match) return match;
    }

    // 2. Try any Natural neural voice
    const natural = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        v.name.toLowerCase().includes('natural') &&
        (!gender || (gender === 'female' ? !v.name.includes('Male') : !v.name.includes('Female'))),
    );
    if (natural) return natural;

    // 3. Try high-prosody Google UK voices before flatter Google US voices
    const googleUk = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        v.name.toLowerCase().includes('google uk') &&
        (!gender || (gender === 'female' ? v.name.includes('Female') : v.name.includes('Male'))),
    );
    if (googleUk) return googleUk;

    // 4. Any English voice with appropriate gender if possible
    const anyEnGender = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (!gender || (gender === 'female' ? v.name.includes('Female') || v.name.includes('Zira') : true)),
    );
    if (anyEnGender) return anyEnGender;

    const anyEnglish = voices.find((v) => v.lang.startsWith('en'));
    return anyEnglish ?? voices[0];
  }

  /**
   * Play character chime and trigger dialogue callback one voice at a time.
   * Per Bible Section 2 Rule 1: One voice at a time; queued lines wait their turn.
   */
  public speakAs(
    characterKey: keyof typeof CHARACTERS | string,
    rawText: string,
    dedupKey?: string,
    minIntervalMs = 2000,
    onEnd?: () => void,
    force = false,
  ): void {
    if (typeof window === 'undefined') return;
    if (soundEngine.isRoverHushed() || !soundEngine.isRoverVoiceEnabled()) return;

    const text = formatWithRoverName(rawText, this.roverName);
    const now = Date.now();
    const key = dedupKey ?? text.slice(0, 32);
    if (!force && this.lastSpokenKey === key && now - this.lastSpokenAt < minIntervalMs) {
      return;
    }

    this.lastSpokenKey = key;
    this.lastSpokenAt = now;

    if (this.isSpeakingNow && !force) {
      this.waitingQueue = [{ characterKey: String(characterKey), text, dedupKey: key, onEnd }];
      return;
    }

    this.playImmediate(String(characterKey), text, onEnd);
  }

  private playImmediate(characterKey: string, text: string, onEnd?: () => void): void {
    if (this.activeTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }

    this.isSpeakingNow = true;
    const char = CHARACTERS[characterKey] ?? CHARACTERS.rusty;
    soundEngine.playSpeakerChime(char.speakerId);

    // Speak with Web Speech API natural voice if supported & enabled
    let speechActive = false;
    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      !soundEngine.isRoverHushed() &&
      soundEngine.isRoverVoiceEnabled()
    ) {
      try {
        window.speechSynthesis.cancel();
        const spokenText = cleanTextForSpeech(text);
        if (spokenText) {
          const utterance = new SpeechSynthesisUtterance(spokenText);
          const styleConfig = VOICE_STYLES[this.currentStyle] ?? VOICE_STYLES.cheerful;

          // Modulate pitch and rate with character identity + emotional style for lively prosody
          const pitch = styleConfig.basePitch * (char.pitchMod ?? 1.0);
          const rate = styleConfig.baseRate * (char.rateMod ?? 1.0);

          utterance.rate = Math.max(0.85, Math.min(1.25, rate));
          utterance.pitch = Math.max(0.8, Math.min(1.4, pitch));
          utterance.volume = 1.0;

          const voice = this.getBestVoiceForStyle(styleConfig, char.gender);
          if (voice) {
            utterance.voice = voice;
            // If the browser only has David (older monotone SAPI), boost pitch to eliminate drone
            if (voice.name.includes('David') && utterance.pitch < 1.12) {
              utterance.pitch = 1.15;
              utterance.rate = 1.06;
            }
          }

          utterance.onend = () => {
            this.isSpeakingNow = false;
            onEnd?.();
            this.pumpQueue();
          };
          utterance.onerror = () => {
            this.isSpeakingNow = false;
            onEnd?.();
            this.pumpQueue();
          };

          window.speechSynthesis.speak(utterance);
          speechActive = true;
        }
      } catch {
        speechActive = false;
      }
    }

    if (!speechActive) {
      const readingDurationMs = Math.min(3200, Math.max(850, text.length * 36));
      if (typeof window !== 'undefined') {
        this.activeTimer = window.setTimeout(() => {
          this.activeTimer = null;
          this.isSpeakingNow = false;
          onEnd?.();
          this.pumpQueue();
        }, readingDurationMs);
      } else {
        this.isSpeakingNow = false;
        onEnd?.();
      }
    }
  }

  private pumpQueue(): void {
    if (!this.isSpeakingNow && this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift()!;
      this.playImmediate(next.characterKey, next.text, next.onEnd);
    }
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (this.activeTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
    this.isSpeakingNow = false;
    this.waitingQueue = [];
  }

  // --- 1. Tutorial Steps (Act 1 Look, Move, Jump, Gravity Card, Chores, Tank 2) ---

  public speakTutorialStep(step: TutorialStepId): void {
    if (step === 'complete') return;
    const stepDef = JUNIOR_TUTORIAL_STEPS[step];
    if (!stepDef) return;
    this.speakAs('rusty', stepDef.rustyLine, `tut-${step}`, 3000, undefined, true);
  }

  public speakCrystalCaught(count: number): void {
    const idx = Math.max(0, Math.min(2, count - 1));
    const line = ACT1_CRYSTAL_CALLOUTS[idx];
    this.speakAs('rusty', line, `crystal-${count}`, 500, undefined, true);
  }

  public speakChoreSpot(spot: 'greenhouse' | 'solar' | 'habitat'): void {
    const def = ACT1_CHORE_SPOTS.find((s) => s.id === spot);
    if (!def) return;
    const speakerKey = def.speaker.toLowerCase().includes('rafi')
      ? 'rafi'
      : def.speaker.toLowerCase().includes('kenji')
        ? 'kenji'
        : 'amara';

    this.speakAs(
      speakerKey,
      def.line,
      `chore-${spot}-1`,
      1200,
      def.secondLine
        ? () => {
            this.speakAs('lucia', def.secondLine!, `chore-${spot}-2`, 1000, undefined, true);
          }
        : undefined,
      true,
    );
  }

  // --- 2. Mission Incidents (Quiet Signal Speaker Ladder: Hab -> Specialist by radio -> {roverName}) ---

  public speakMissionIncident(missionId: MissionId): void {
    const mission = JUNIOR_MISSIONS[missionId];
    if (!mission) return;
    const [first, second, third] = mission.quietSignal;
    if (!first) return;

    this.speakAs(
      first.speaker,
      first.text,
      `incident-${missionId}-1`,
      1000,
      second
        ? () => {
            this.speakAs(
              second.speaker,
              second.text,
              `incident-${missionId}-2`,
              1000,
              third
                ? () => {
                    this.speakAs(third.speaker, third.text, `incident-${missionId}-3`, 1000, undefined, true);
                  }
                : undefined,
              true,
            );
          }
        : undefined,
      true,
    );
  }

  // --- 3. Mission Decisions & Resolutions (from storyBeats.ts) ---

  public speakMissionDecisions(missionId: MissionId, opt1Title: string, opt2Title: string): void {
    const prompt = `Commander, what is your plan? Option A: ${opt1Title} Or Option B: ${opt2Title}`;
    this.speakAs('rusty', prompt, `decisions-${missionId}`);
  }

  public speakDecisionResolution(missionId: MissionId, choice: 'a' | 'b' = 'a'): void {
    const mission = JUNIOR_MISSIONS[missionId];
    if (!mission) return;
    const resultLine = choice === 'b' ? mission.resultLines.optionB : mission.resultLines.optionA;
    this.speakAs(resultLine.speaker, resultLine.text, `resolved-${missionId}-${choice}`, 1000, undefined, true);
  }

  // --- 4. Quizzes ---

  public speakQuizQuestion(question: string, optALabel: string, optBLabel: string): void {
    this.speakAs(
      'rusty',
      `${question} A: ${optALabel}. Or B: ${optBLabel}.`,
      `quiz-q-${question.slice(0, 16)}`,
    );
  }

  public speakQuizFeedback(isCorrect: boolean, feedbackText: string): void {
    this.speakAs('rusty', feedbackText, `quiz-feedback-${isCorrect}`, 500, undefined, true);
  }

  // --- 5. Science Discovery Cards ---

  public speakScienceCard(title: string, oneSentenceFact: string): void {
    this.speakAs('rusty', `${title}. ${oneSentenceFact}`, `card-${title}`);
  }

  // --- 6. Crew Member In-Person Greetings ---

  public speakCrewMember(crewId: CrewMemberId): void {
    switch (crewId) {
      case 'amara':
        this.speakAs('amara', ACT1_CHORE_SPOTS[2].line, 'crew-amara', 8000);
        break;
      case 'kenji':
        this.speakAs('kenji', ACT1_CHORE_SPOTS[1].line, 'crew-kenji', 8000);
        break;
      case 'lucia':
        this.speakAs(
          'lucia',
          ACT1_CHORE_SPOTS[2].secondLine ?? 'Look at this rock! It has stripes. Water may have been here long ago.',
          'crew-lucia',
          8000,
        );
        break;
      case 'rafi':
        this.speakAs('rafi', ACT1_CHORE_SPOTS[0].line, 'crew-rafi', 8000);
        break;
    }
  }

  // --- 7. Landmark Station Arrivals ---

  public speakLandmark(stationId: string): void {
    switch (stationId) {
      case 'habitat':
        this.speakAs('rusty', 'This is our home. Everyone is safe inside.', 'station-habitat', 14000);
        break;
      case 'greenhouse':
        this.speakAs(
          'rusty',
          'Plants need light, water and warmth. A greenhouse protects them from the cold.',
          'station-greenhouse',
          14000,
        );
        break;
      case 'solar':
        this.speakAs('rusty', 'Solar panels turn sunlight into power.', 'station-solar', 14000);
        break;
      case 'tank2':
        this.speakAs('rusty', 'This is Tank two. It holds our air.', 'station-tank2', 14000);
        break;
      case 'ice-drill':
        this.speakAs('rusty', 'Faster beeps mean more ice. Listen closely.', 'station-ice-drill', 14000);
        break;
      case 'recycler':
        this.speakAs('rusty', 'Recycling lets us use water again.', 'station-recycler', 14000);
        break;
      case 'shelter':
        this.speakAs('rusty', 'Water walls help block space radiation.', 'station-shelter', 14000);
        break;
      case 'landing-pad':
        this.speakAs('rusty', 'Lander pad. Where our supply ship touched down.', 'station-landing-pad', 14000);
        break;
    }
  }

  // --- 8. Weather & Resource Alerts ---

  public speakWeatherAlert(title: string, windSpeedMs: number): void {
    this.speakAs(
      'hab',
      `Notice. ${title} with wind speed of ${Math.round(windSpeedMs)} meters per second.`,
      'weather-emergency',
      12000,
    );
  }

  public speakLowResourceWarning(resource: 'oxygen' | 'battery' | 'water' | 'food'): void {
    const text =
      resource === 'oxygen'
        ? 'Notice. Oxygen Tank 2 pressure is a little low.'
        : resource === 'battery'
          ? 'Notice. Solar power is lower than normal.'
          : resource === 'water'
            ? 'Notice. Water cleaning is slow.'
            : 'Notice. Greenhouse heater is off.';
    this.speakAs('hab', text, `low-res-${resource}`, 20000);
  }

  // --- 9. Mission Victory & Badge Celebration ---

  public speakBadgeUnlocked(badgeTitle: string): void {
    this.speakAs('rusty', `Badge earned: ${badgeTitle}!`, `badge-${badgeTitle}`);
  }

  public stop(): void {
    if (this.activeTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
    this.isSpeakingNow = false;
    this.waitingQueue = [];
    soundEngine.stopSpeaking();
  }
}

export const narrativeVoice = new NarrativeVoiceManager();
