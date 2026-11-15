import { CrewMemberId } from '../sim/constants';
import { TutorialStepId } from '../sim/juniorData';
import { MissionId } from '../sim/roverData';
import { soundEngine } from './soundEngine';

/**
 * Character Audio Profiles for Web Speech API
 * Clean, warm, human-like voice settings with natural pitch
 */
interface CharacterVoiceProfile {
  name: string;
  role: string;
  rate: number;
  pitch: number;
  gender: 'female' | 'male';
}

export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Strip technical provenance and UI brackets
    .replace(/\[REAL[^\]]*\]/gi, '')
    .replace(/\[SIM[^\]]*\]/gi, '')
    .replace(/\[DERIVED[^\]]*\]/gi, '')
    .replace(/\[[A-Z0-9_\s-]{1,12}\]/gi, '')
    // Units and symbols to friendly spoken words
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
    // Punctuation and formatting
    .replace(/[*_#`~«»]/g, '')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const CHARACTERS: Record<string, CharacterVoiceProfile> = {
  rusty: {
    name: 'Rover Rusty',
    role: 'Companion Guide',
    rate: 0.96, // Clear, friendly cadence for kids
    pitch: 1.0, // Natural human tone with emotion (not robotic or squeaky)
    gender: 'male', // Expressive natural male voice (Guy / Christopher)
  },
  rafi: {
    name: 'Rafi',
    role: 'Life Support Botanist',
    rate: 0.98,
    pitch: 1.0,
    gender: 'male', // Natural male voice
  },
  amara: {
    name: 'Dr. Amara',
    role: 'Flight Surgeon',
    rate: 0.95,
    pitch: 1.0,
    gender: 'female',
  },
  kenji: {
    name: 'Kenji',
    role: 'Chief Engineer',
    rate: 0.98,
    pitch: 0.98,
    gender: 'male',
  },
  lucia: {
    name: 'Lucía',
    role: 'Lead Geologist',
    rate: 0.98,
    pitch: 1.0,
    gender: 'female',
  },
  capcom: {
    name: 'Outpost AI',
    role: 'Base Computer Alert',
    rate: 0.92,
    pitch: 0.98,
    gender: 'male',
  },
};

/**
 * Narrative Voice Manager
 * Orchestrates all real-time voiceovers for missions, quizzes, landmarks,
 * crew members, and weather emergencies using natural human voices.
 */
class NarrativeVoiceManager {
  private lastSpokenKey = '';
  private lastSpokenAt = 0;

  /**
   * Select best natural, human-sounding neural voice for kids
   */
  private getBestNaturalVoice(gender: 'female' | 'male'): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    if (gender === 'male') {
      // 1. Natural Neural Expressive Male voices (Microsoft Guy, Christopher, Eric, Ryan)
      const neuralMale = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Guy') ||
            v.name.includes('Christopher') ||
            v.name.includes('Eric') ||
            v.name.includes('Ryan') ||
            (v.name.includes('Natural') && v.name.includes('Male'))),
      );
      if (neuralMale) return neuralMale;

      // 2. High-quality standard male voices
      const goodMale = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google UK English Male') ||
            v.name.includes('Google US English') ||
            v.name.includes('Mark') ||
            v.name.includes('Daniel') ||
            v.name.includes('Oliver') ||
            v.name.includes('George')),
      );
      if (goodMale) return goodMale;

      // 3. Any English voice that is not robotic David Desktop
      const nonDavid = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          !v.name.includes('David Desktop') &&
          !v.name.toLowerCase().includes('robot'),
      );
      if (nonDavid) return nonDavid;
    } else {
      // Natural Neural Female voices (Jenny, Aria, Samantha)
      const neuralFemale = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Jenny') ||
            v.name.includes('Aria') ||
            v.name.includes('Samantha') ||
            (v.name.includes('Natural') && v.name.includes('Female'))),
      );
      if (neuralFemale) return neuralFemale;

      const goodFemale = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Zira') ||
            v.name.includes('Victoria') ||
            v.name.includes('Google UK English Female') ||
            v.name.includes('Female')),
      );
      if (goodFemale) return goodFemale;
    }

    const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
    const nonDavid = englishVoices.find((v) => !v.name.includes('David Desktop'));
    return nonDavid ?? englishVoices[0] ?? voices[0];
  }

  /**
   * Play speech using character profile and deduplication
   */
  public speakAs(
    characterKey: keyof typeof CHARACTERS,
    text: string,
    dedupKey?: string,
    minIntervalMs = 2500,
    onEnd?: () => void,
  ): void {
    if (typeof window === 'undefined') return;
    if (soundEngine.isRoverHushed() || !soundEngine.isRoverVoiceEnabled()) return;

    const now = Date.now();
    const key = dedupKey ?? text.slice(0, 32);
    if (this.lastSpokenKey === key && now - this.lastSpokenAt < minIntervalMs) {
      return;
    }

    this.lastSpokenKey = key;
    this.lastSpokenAt = now;

    const char = CHARACTERS[characterKey] ?? CHARACTERS.rusty;

    // Use Web Speech API directly with natural pitch/rate tuning
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const cleaned = cleanTextForSpeech(text);
        if (!cleaned) return;

        // If voices aren't loaded in the browser yet, wait for onvoiceschanged
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) {
          const onVoicesReady = () => {
            window.speechSynthesis.onvoiceschanged = null;
            this.speakAs(characterKey, text, dedupKey, minIntervalMs, onEnd);
          };
          window.speechSynthesis.onvoiceschanged = onVoicesReady;
          window.setTimeout(() => {
            if (window.speechSynthesis.onvoiceschanged === onVoicesReady) {
              window.speechSynthesis.onvoiceschanged = null;
              this.speakAs(characterKey, text, dedupKey, minIntervalMs, onEnd);
            }
          }, 250);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.rate = char.rate;
        utterance.pitch = char.pitch;
        utterance.volume = Math.max(0.2, soundEngine.getMixerLevels().master);

        const voice = this.getBestNaturalVoice(char.gender);
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onend = () => {
          onEnd?.();
        };
        utterance.onerror = () => {
          onEnd?.();
        };

        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Safe fallback
    }
  }

  // --- 1. Tutorial Steps Voiceovers ---

  public speakTutorialStep(step: TutorialStepId): void {
    switch (step) {
      case 'move':
        this.speakAs(
          'rusty',
          "Welcome to Mars, Commander! Use your W, A, S, D keys or touch D-pad to take your first steps on the red planet!",
          'tut-move',
          1500,
        );
        break;
      case 'inspect-rover':
        this.speakAs(
          'rusty',
          "That's me, Rover Rusty! Walk close and press E to explore our outpost systems.",
          'tut-rover',
        );
        break;
      case 'jump-crystals':
        this.speakAs(
          'rusty',
          "Whoa Commander! Mars gravity is super light! Press Spacebar to jump high and grab those 3 glowing gravity crystals!",
          'tut-jump',
        );
        break;
      case 'gravity-card':
        this.speakAs(
          'rusty',
          "Awesome jump! You bounce way higher here because Mars gravity is only thirty-eight percent of Earth!",
          'tut-grav-card',
        );
        break;
      case 'inspect-oxygen':
        this.speakAs(
          'rusty',
          "Follow your compass to Oxygen Tank 2 to check our life support air supply.",
          'tut-oxygen-tank',
        );
        break;
      case 'tutorial-quiz':
        this.speakAs(
          'rusty',
          "Quick check Commander: Can we breathe the air on Mars? Option A: Yes like Earth, or Option B: No, we need oxygen tanks!",
          'tut-quiz',
        );
        break;
      case 'crew-map-intro':
        this.speakAs(
          'rusty',
          "This is our Mars Habitat Home! Our crew is safe inside. Review the outpost layout to start our expedition!",
          'tut-crew-map',
        );
        break;
      default:
        break;
    }
  }

  // --- 2. Mission Emergency Incident Announcements ---

  public speakMissionIncident(missionId: MissionId): void {
    switch (missionId) {
      case 'm1':
        this.speakAs(
          'rafi',
          "Commander! Rafi here from Life Support! Sensors just spiked—Oxygen Tank 2 has a high-pressure fracture! Oxygen is venting into the atmosphere right now! Rush to the tank!",
          'incident-m1',
        );
        break;
      case 'm2':
        this.speakAs(
          'rusty',
          "Look at the sky Commander! A giant Martian dust storm is rising! The orange dust is blocking the Sun, and our solar batteries are draining fast!",
          'incident-m2',
        );
        break;
      case 'm3':
        this.speakAs(
          'lucia',
          "Commander! My ground radar found sub-surface ice sheets near the crater, but our Water Recycler filter just clogged! Let's inspect the water bay!",
          'incident-m3',
        );
        break;
      case 'm4':
        this.speakAs(
          'rafi',
          "Brrr! Outside temperature is minus sixty-three degrees! The Bio-Dome heater broke and frost is covering the tomato plants! Let's save the crops!",
          'incident-m4',
        );
        break;
      case 'm5':
        this.speakAs(
          'capcom',
          "CRITICAL WARNING! Solar Particle Event detected! Deadly solar radiation arriving in sixty seconds! All crew must enter the Storm Shelter NOW!",
          'incident-m5',
        );
        break;
    }
  }

  // --- 3. Mission Decision Choices Read-Aloud ---

  public speakMissionDecisions(missionId: MissionId, opt1Title: string, opt2Title: string): void {
    const prompt = `Commander, how do we solve this? Choice 1: ${opt1Title}. Or Choice 2: ${opt2Title}.`;
    this.speakAs('rusty', prompt, `decisions-${missionId}`);
  }

  public speakDecisionResolution(missionId: MissionId): void {
    switch (missionId) {
      case 'm1':
        this.speakAs(
          'rusty',
          "Great call Commander! The valve is closed. The oxygen leak has stopped and the crew has plenty of air!",
          'resolved-m1',
        );
        break;
      case 'm2':
        this.speakAs(
          'rusty',
          "Smart thinking Commander! Saving power for air and heaters kept our outpost alive through the dust storm!",
          'resolved-m2',
        );
        break;
      case 'm3':
        this.speakAs(
          'rusty',
          "Recycler is humming again! Clean water is flowing, and we saved our emergency reserves!",
          'resolved-m3',
        );
        break;
      case 'm4':
        this.speakAs(
          'rusty',
          "Heaters are back online! The frost is melting and our fresh Mars plants are growing tall!",
          'resolved-m4',
        );
        break;
      case 'm5':
        this.speakAs(
          'rusty',
          "Hatch sealed tight! Thick water walls are blocking the radiation. The entire crew is safe!",
          'resolved-m5',
        );
        break;
    }
  }

  // --- 4. Junior Science Quizzes Read-Aloud ---

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

  // --- 5. Science Discovery Cards Read-Aloud ---

  public speakScienceCard(title: string, oneSentenceFact: string): void {
    this.speakAs('rusty', `${title}! ${oneSentenceFact}`, `card-${title}`);
  }

  // --- 6. Astronaut Crew Member Interactions ---

  public speakCrewMember(crewId: CrewMemberId): void {
    switch (crewId) {
      case 'amara':
        this.speakAs(
          'amara',
          "Good sol, Commander! Crew vitals are healthy. Don't forget to stay hydrated during EVA walks!",
          'crew-amara',
          10000,
        );
        break;
      case 'kenji':
        this.speakAs(
          'kenji',
          "Hey Commander! Rover wheel motors and solar array cables are running at peak efficiency today.",
          'crew-kenji',
          10000,
        );
        break;
      case 'lucia':
        this.speakAs(
          'lucia',
          "Check out these layered core samples, Commander! There might be frozen water just a few meters beneath our boots!",
          'crew-lucia',
          10000,
        );
        break;
      case 'rafi':
        this.speakAs(
          'rafi',
          "The greenhouse cherry tomatoes are ripening! Fresh salad on Mars tastes ten times better than packaged rations!",
          'crew-rafi',
          10000,
        );
        break;
    }
  }

  // --- 7. Landmark Station Arrival Audio ---

  public speakLandmark(stationId: string): void {
    switch (stationId) {
      case 'habitat':
        this.speakAs(
          'rusty',
          "Habitat Airlock. Stepping inside seals out the Martian vacuum and repressurizes your EVA suit.",
          'station-habitat',
          14000,
        );
        break;
      case 'greenhouse':
        this.speakAs(
          'rusty',
          "Welcome to the Bio-Dome! Smell that fresh oxygen? Plants are growing nicely in the Martian soil.",
          'station-greenhouse',
          14000,
        );
        break;
      case 'solar':
        this.speakAs(
          'rusty',
          "Solar Farm tracking arrays. Photo-voltaic panels orienting toward the Martian sun.",
          'station-solar',
          14000,
        );
        break;
      case 'tank2':
        this.speakAs(
          'rusty',
          "Oxygen Tank 2. High-pressure cryogenic tank supplying breathable air to the habitat.",
          'station-tank2',
          14000,
        );
        break;
      case 'ice-drill':
        this.speakAs(
          'rusty',
          "Sub-surface Ice Drill Rig. Deep core sensors penetrating the permafrost.",
          'station-ice-drill',
          14000,
        );
        break;
      case 'recycler':
        this.speakAs(
          'rusty',
          "Water Reclamation Facility. Closed-loop distillation turning humidity into pure drinking water.",
          'station-recycler',
          14000,
        );
        break;
      case 'shelter':
        this.speakAs(
          'rusty',
          "Radiation Storm Shelter. Reinforced water-jacket walls designed to block energetic solar protons.",
          'station-shelter',
          14000,
        );
        break;
      case 'landing-pad':
        this.speakAs(
          'rusty',
          "Cargo Landing Pad. Reinforced dust-free apron for Earth resupply landers.",
          'station-landing-pad',
          14000,
        );
        break;
    }
  }

  // --- 8. Severe Weather & Low Resource Alarms ---

  public speakWeatherAlert(title: string, windSpeedMs: number): void {
    this.speakAs(
      'capcom',
      `WARNING! ${title} incoming with wind speeds of ${Math.round(windSpeedMs)} meters per second! Run to Habitat Airlock now!`,
      'weather-emergency',
      12000,
    );
  }

  public speakLowResourceWarning(resource: 'oxygen' | 'battery' | 'water' | 'food'): void {
    const text =
      resource === 'oxygen'
        ? "Warning: Suit oxygen low! Return to the habitat airlock to refill!"
        : resource === 'battery'
          ? "Caution: Outpost battery critical! Conserve power immediately!"
          : resource === 'water'
            ? "Caution: Clean water reserve low! Check the recycler bay!"
            : "Caution: Food storage low! Check greenhouse crops!";
    this.speakAs('rusty', text, `low-res-${resource}`, 20000);
  }

  // --- 9. Mission Victory & Badge Celebration ---

  public speakBadgeUnlocked(badgeTitle: string): void {
    this.speakAs(
      'rusty',
      `Outstanding leadership, Commander! You completed the mission and earned the ${badgeTitle} badge!`,
      `badge-${badgeTitle}`,
    );
  }
}

export const narrativeVoice = new NarrativeVoiceManager();
