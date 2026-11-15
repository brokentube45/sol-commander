import { CrewMemberId } from '../sim/constants';
import { TutorialStepId } from '../sim/juniorData';
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
    name: 'Rover Rusty',
    role: 'Companion Guide',
    speakerId: 'rusty',
  },
  rafi: {
    name: 'Rafi',
    role: 'Life Support Botanist',
    speakerId: 'rafi',
  },
  amara: {
    name: 'Dr. Amara',
    role: 'Flight Surgeon',
    speakerId: 'amara',
  },
  kenji: {
    name: 'Kenji',
    role: 'Chief Engineer',
    speakerId: 'kenji',
  },
  lucia: {
    name: 'Lucía',
    role: 'Lead Geologist',
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

/**
 * Narrative Voice Manager
 * Orchestrates dialogue cues, speaker ladder, and procedural sound chimes.
 * (Zero Web Speech / TTS per Space Apps submission rules: uses subtitles + procedural audio)
 */
class NarrativeVoiceManager {
  private lastSpokenKey = '';
  private lastSpokenAt = 0;

  /**
   * Play character chime and trigger dialogue callback
   */
  public speakAs(
    characterKey: keyof typeof CHARACTERS | string,
    text: string,
    dedupKey?: string,
    minIntervalMs = 2000,
    onEnd?: () => void,
    force = false,
  ): void {
    if (typeof window === 'undefined') return;
    if (soundEngine.isRoverHushed() || !soundEngine.isRoverVoiceEnabled()) return;

    const now = Date.now();
    const key = dedupKey ?? text.slice(0, 32);
    if (!force && this.lastSpokenKey === key && now - this.lastSpokenAt < minIntervalMs) {
      return;
    }

    this.lastSpokenKey = key;
    this.lastSpokenAt = now;

    const char = CHARACTERS[characterKey] ?? CHARACTERS.rusty;

    // Play character's unique procedural audio chime
    soundEngine.playSpeakerChime(char.speakerId);

    // Provide natural timing for subtitles / prompt progression
    if (onEnd) {
      const readingDurationMs = Math.min(3500, Math.max(900, text.length * 40));
      window.setTimeout(() => {
        onEnd();
      }, readingDurationMs);
    }
  }

  // --- 1. Tutorial Steps (Act 1 Look, Move, Jump, Chores) ---

  public speakTutorialStep(step: TutorialStepId): void {
    switch (step) {
      case 'move':
        this.speakAs(
          'rusty',
          'Welcome to Mars, Commander! Walk around to take your first steps on the red planet!',
          'tut-move',
          4000,
        );
        break;
      case 'inspect-rover':
        this.speakAs(
          'rusty',
          'That is me, Rover Rusty! Walk close and press E to explore our outpost systems.',
          'tut-rover',
        );
        break;
      case 'jump-crystals':
        this.speakAs(
          'rusty',
          'Try a jump! Press Space. Catch three glowing crystals.',
          'tut-jump',
        );
        break;
      case 'gravity-card':
        this.speakAs(
          'rusty',
          'Mars pulls you down less than Earth does. You can jump higher here!',
          'tut-grav-card',
        );
        break;
      case 'inspect-oxygen':
        this.speakAs(
          'rusty',
          'This is Tank 2. It holds our air.',
          'tut-oxygen-tank',
        );
        break;
      case 'tutorial-quiz':
        this.speakAs(
          'rusty',
          'Quick question. Can we breathe the air on Mars? Option A: Yes, like Earth, or Option B: No, we need oxygen!',
          'tut-quiz',
        );
        break;
      case 'crew-map-intro':
        this.speakAs(
          'rusty',
          'This is our home. Everyone is safe inside.',
          'tut-crew-map',
        );
        break;
      default:
        break;
    }
  }

  // --- 2. Mission Incidents (Speaker Ladder: Hab -> Specialist -> Rusty) ---

  public speakMissionIncident(missionId: MissionId): void {
    switch (missionId) {
      case 'm1':
        // M1: Whisper in Tank 2 (Sol 21)
        this.speakAs('hab', 'Notice. Oxygen Tank 2 pressure is a little low.', 'incident-m1-hab', 1000, () => {
          this.speakAs(
            'rafi',
            'Commander, Rafi here. Tank 2 is dropping slowly. Can you meet me at the oxygen bay?',
            'incident-m1-rafi',
            1000,
            () => {
              this.speakAs('rusty', 'I will come with you. Beep!', 'incident-m1-rusty');
            },
          );
        });
        break;
      case 'm2':
        // M2: Red Sky (Sol 34)
        this.speakAs('hab', 'Notice. Solar power is lower than normal.', 'incident-m2-hab', 1000, () => {
          this.speakAs(
            'kenji',
            'Commander, Kenji. The sky is full of dust. The panels make less power. Meet me at the solar field.',
            'incident-m2-kenji',
            1000,
            () => {
              this.speakAs('rusty', 'The Sun looks small and orange today.', 'incident-m2-rusty');
            },
          );
        });
        break;
      case 'm3':
        // M3: Water You Can't Drink Yet (Sol 52)
        this.speakAs('hab', 'Notice. Water cleaning is slow.', 'incident-m3-hab', 1000, () => {
          this.speakAs(
            'amara',
            'Commander, Amara. The water recycler is slow. We need clean water to stay healthy. Meet me at the water bay.',
            'incident-m3-amara',
            1000,
            () => {
              this.speakAs('rusty', 'Click! Let us check the filters.', 'incident-m3-rusty');
            },
          );
        });
        break;
      case 'm4':
        // M4: Cold Greenhouse (Sol 67)
        this.speakAs('hab', 'Notice. Greenhouse heater is off.', 'incident-m4-hab', 1000, () => {
          this.speakAs(
            'rafi',
            'Commander, Rafi. My tomato plants look sleepy. The greenhouse is cold. Please come.',
            'incident-m4-rafi',
            1000,
            () => {
              this.speakAs('rusty', 'Plants need light, water and warmth.', 'incident-m4-rusty');
            },
          );
        });
        break;
      case 'm5':
        // M5: Storm Over the Ice (Sol 88)
        this.speakAs('hab', 'Watch. The space weather team reports a solar storm.', 'incident-m5-hab', 1000, () => {
          this.speakAs(
            'amara',
            'Commander, Amara. Strong space radiation can hurt people. We need the shelter. Please meet me there.',
            'incident-m5-amara',
            1000,
            () => {
              this.speakAs('rusty', 'Water walls help block space radiation.', 'incident-m5-rusty');
            },
          );
        });
        break;
    }
  }

  // --- 3. Mission Decisions & Resolutions ---

  public speakMissionDecisions(missionId: MissionId, opt1Title: string, opt2Title: string): void {
    const prompt = `Commander, what is your plan? Choice 1: ${opt1Title}. Or Choice 2: ${opt2Title}.`;
    this.speakAs('rusty', prompt, `decisions-${missionId}`);
  }

  public speakDecisionResolution(missionId: MissionId, choice?: 'a' | 'b'): void {
    switch (missionId) {
      case 'm1':
        if (choice === 'b') {
          this.speakAs(
            'rafi',
            'We are safe. But the tank is still losing air. We will fix it soon.',
            'resolved-m1',
          );
        } else {
          this.speakAs(
            'rafi',
            'The whisper stopped. Good job, Commander.',
            'resolved-m1',
          );
        }
        break;
      case 'm2':
        if (choice === 'b') {
          this.speakAs(
            'kenji',
            'Everything is on, but the battery is dropping fast.',
            'resolved-m2',
          );
        } else {
          this.speakAs(
            'kenji',
            'Smart plan. Power for life support comes first.',
            'resolved-m2',
          );
        }
        break;
      case 'm3':
        if (choice === 'b') {
          this.speakAs(
            'amara',
            'We have water today. But the backup tank is empty now.',
            'resolved-m3',
          );
        } else {
          this.speakAs(
            'amara',
            'The recycler is humming. Clean water is flowing.',
            'resolved-m3',
          );
        }
        break;
      case 'm4':
        if (choice === 'b') {
          this.speakAs(
            'rafi',
            'We have food today. But I will miss my tomatoes.',
            'resolved-m4',
          );
        } else {
          this.speakAs(
            'rafi',
            'Look! The leaves are standing up again.',
            'resolved-m4',
          );
        }
        break;
      case 'm5':
        this.speakAs(
          'rusty',
          'We did it, Commander! The crew is safe in the shielded shelter.',
          'resolved-m5',
        );
        break;
    }
  }

  // --- 4. Quizzes ---

  public speakQuizQuestion(question: string, optALabel: string, optBLabel: string): void {
    this.speakAs(
      'rusty',
      `${question} Option A: ${optALabel}. Or Option B: ${optBLabel}.`,
      `quiz-q-${question.slice(0, 16)}`,
    );
  }

  public speakQuizFeedback(isCorrect: boolean, feedbackText: string): void {
    this.speakAs('rusty', feedbackText, `quiz-feedback-${isCorrect}`);
  }

  // --- 5. Science Discovery Cards ---

  public speakScienceCard(title: string, oneSentenceFact: string): void {
    this.speakAs('rusty', `${title}! ${oneSentenceFact}`, `card-${title}`);
  }

  // --- 6. Crew Member In-Person Greetings ---

  public speakCrewMember(crewId: CrewMemberId): void {
    switch (crewId) {
      case 'amara':
        this.speakAs(
          'amara',
          'Welcome, Commander. Drink some water. Mars air is very dry.',
          'crew-amara',
          10000,
        );
        break;
      case 'kenji':
        this.speakAs(
          'kenji',
          'These panels turn sunlight into power. Mars is dim, so every panel counts. Keep them clean and they keep us cozy.',
          'crew-kenji',
          10000,
        );
        break;
      case 'lucia':
        this.speakAs(
          'lucia',
          'Look at this rock! It has stripes. Water may have been here long ago.',
          'crew-lucia',
          10000,
        );
        break;
      case 'rafi':
        this.speakAs(
          'rafi',
          'Welcome to my garden! These tomato seeds are my babies. They need light, water and warmth. I hope the nights stay kind.',
          'crew-rafi',
          10000,
        );
        break;
    }
  }

  // --- 7. Landmark Station Arrivals ---

  public speakLandmark(stationId: string): void {
    switch (stationId) {
      case 'habitat':
        this.speakAs(
          'rusty',
          'Habitat Airlock. Stepping inside repressurizes your spacesuit.',
          'station-habitat',
          14000,
        );
        break;
      case 'greenhouse':
        this.speakAs(
          'rusty',
          'Welcome to the Greenhouse! Plants are growing in the warm dome.',
          'station-greenhouse',
          14000,
        );
        break;
      case 'solar':
        this.speakAs(
          'rusty',
          'Solar field arrays. Panels turn sunlight into clean power.',
          'station-solar',
          14000,
        );
        break;
      case 'tank2':
        this.speakAs(
          'rusty',
          'Oxygen Tank 2. It holds our breathable air supply.',
          'station-tank2',
          14000,
        );
        break;
      case 'ice-drill':
        this.speakAs(
          'rusty',
          'Ice drill site. Radar scans for frozen water under the soil.',
          'station-ice-drill',
          14000,
        );
        break;
      case 'recycler':
        this.speakAs(
          'rusty',
          'Water facility. Cleans and recycles water for the crew.',
          'station-recycler',
          14000,
        );
        break;
      case 'shelter':
        this.speakAs(
          'rusty',
          'Storm shelter. Water walls help block space radiation.',
          'station-shelter',
          14000,
        );
        break;
      case 'landing-pad':
        this.speakAs(
          'rusty',
          'Lander landing pad. Where our supply lander touches down.',
          'station-landing-pad',
          14000,
        );
        break;
    }
  }

  // --- 8. Weather & Resource Alerts ---

  public speakWeatherAlert(title: string, windSpeedMs: number): void {
    this.speakAs(
      'hab',
      `Notice. ${title} with wind speed of ${Math.round(windSpeedMs)} meters per second. Return to shelter if needed.`,
      'weather-emergency',
      12000,
    );
  }

  public speakLowResourceWarning(resource: 'oxygen' | 'battery' | 'water' | 'food'): void {
    const text =
      resource === 'oxygen'
        ? 'Notice. Suit oxygen is low. Return to the airlock to refill.'
        : resource === 'battery'
          ? 'Notice. Outpost battery is low. Conserve power.'
          : resource === 'water'
            ? 'Notice. Clean water reserve is low. Check the recycler.'
            : 'Notice. Food storage is low. Check greenhouse crops.';
    this.speakAs('hab', text, `low-res-${resource}`, 20000);
  }

  // --- 9. Mission Victory & Badge Celebration ---

  public speakBadgeUnlocked(badgeTitle: string): void {
    this.speakAs(
      'rusty',
      `Great teamwork, Commander! You completed the mission and earned the ${badgeTitle} badge!`,
      `badge-${badgeTitle}`,
    );
  }

  public stop(): void {
    soundEngine.stopSpeaking();
  }
}

export const narrativeVoice = new NarrativeVoiceManager();
