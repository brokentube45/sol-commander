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
}

const CHARACTERS: Record<string, CharacterVoiceProfile> = {
  rusty: {
    name: '{roverName}',
    role: 'Rover Friend',
    speakerId: 'rusty',
  },
  rafi: {
    name: 'Rafi',
    role: 'Botanist',
    speakerId: 'rafi',
  },
  amara: {
    name: 'Amara',
    role: 'Doctor',
    speakerId: 'amara',
  },
  kenji: {
    name: 'Kenji',
    role: 'Engineer',
    speakerId: 'kenji',
  },
  lucia: {
    name: 'Lucía',
    role: 'Geologist',
    speakerId: 'lucia',
  },
  capcom: {
    name: 'Hab Computer',
    role: 'Base System',
    speakerId: 'hab',
  },
  hab: {
    name: 'Hab Computer',
    role: 'Base System',
    speakerId: 'hab',
  },
  earth: {
    name: 'Earth Team',
    role: 'Mission Control',
    speakerId: 'earth',
  },
};

export function cleanTextForSpeech(text: string): string {
  return normalizeForSpeech(text);
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
 * substitutes `{roverName}`, and enforces a strict one-voice-at-a-time queue
 * with procedural Web Audio chimes + subtitles by default.
 */
class NarrativeVoiceManager {
  private lastSpokenKey = '';
  private lastSpokenAt = 0;
  private roverName = 'Rusty';
  private activeTimer: number | null = null;
  private isSpeakingNow = false;
  private waitingQueue: QueuedVoiceItem[] = [];

  public setRoverName(name: string): void {
    this.roverName = name.trim() || 'Rusty';
  }

  public getRoverName(): string {
    return this.roverName;
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
      // Bible Rule 1: Max one waiting unless chained via onEnd
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

    const readingDurationMs = Math.min(3200, Math.max(850, text.length * 36));
    if (typeof window !== 'undefined') {
      this.activeTimer = window.setTimeout(() => {
        this.activeTimer = null;
        this.isSpeakingNow = false;
        onEnd?.();
        if (!this.isSpeakingNow && this.waitingQueue.length > 0) {
          const next = this.waitingQueue.shift()!;
          this.playImmediate(next.characterKey, next.text, next.onEnd);
        }
      }, readingDurationMs);
    } else {
      this.isSpeakingNow = false;
      onEnd?.();
    }
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
