import { CrewMemberId } from '../sim/constants';
import { TutorialStepId } from '../sim/juniorData';
import { MissionId } from '../sim/roverData';
import { soundEngine } from './soundEngine';

/**
 * Character Audio Profiles for Web Speech API
 */
interface CharacterVoiceProfile {
  name: string;
  role: string;
  rate: number;
  pitch: number;
}

const CHARACTERS: Record<string, CharacterVoiceProfile> = {
  rusty: {
    name: 'Rover Rusty',
    role: 'Companion AI',
    rate: 0.96,
    pitch: 1.18, // Cheerful, slightly robotic companion pitch
  },
  rafi: {
    name: 'Rafi',
    role: 'Life Support Botanist',
    rate: 1.02,
    pitch: 1.05, // Expressive, energetic
  },
  amara: {
    name: 'Dr. Amara',
    role: 'Flight Surgeon',
    rate: 0.94,
    pitch: 1.0, // Calm, reassuring medical tone
  },
  kenji: {
    name: 'Kenji',
    role: 'Chief Engineer',
    rate: 0.98,
    pitch: 0.92, // Practical, steady engineer
  },
  lucia: {
    name: 'Lucía',
    role: 'Lead Geologist',
    rate: 1.0,
    pitch: 1.1, // Enthusiastic explorer
  },
  capcom: {
    name: 'Outpost AI',
    role: 'Base Computer Alert',
    rate: 0.9,
    pitch: 0.85, // Authoritative, deep alarm tone
  },
};

/**
 * Narrative Voice Manager
 * Orchestrates all real-time voiceovers for missions, quizzes, landmarks,
 * crew members, and weather emergencies.
 */
class NarrativeVoiceManager {
  private lastSpokenKey = '';
  private lastSpokenAt = 0;

  /**
   * Play speech using character profile and deduplication
   */
  public speakAs(
    characterKey: keyof typeof CHARACTERS,
    text: string,
    dedupKey?: string,
    minIntervalMs = 6000,
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

    // Use Web Speech API directly with character pitch/rate tuning
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const cleaned = text
          .replace(/[*_#`[\]()]/g, '')
          .replace(/["“”«»]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (!cleaned) return;

        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.rate = char.rate;
        utterance.pitch = char.pitch;
        utterance.volume = Math.max(0.2, soundEngine.getMixerLevels().master);

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          // Select preferred English voice
          const preferred =
            characterKey === 'kenji' || characterKey === 'capcom'
              ? voices.find((v) => v.lang.startsWith('en') && (v.name.includes('David') || v.name.includes('Male')))
              : voices.find(
                  (v) =>
                    v.lang.startsWith('en') &&
                    (v.name.includes('Natural') ||
                      v.name.includes('Zira') ||
                      v.name.includes('Samantha') ||
                      v.name.includes('Google UK English Female') ||
                      v.name.includes('Female')),
                );
          utterance.voice = preferred ?? voices.find((v) => v.lang.startsWith('en')) ?? voices[0];
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
          "Welcome to Mars, Commander! Use your WASD keys or touch D-Pad to take your first steps on the red planet!",
          'tut-move',
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
