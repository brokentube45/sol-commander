/**
 * Speech Text Normalizer (SOL_COMMANDER_STORY_BIBLE v2, Section 3)
 * Converts on-screen text into child-friendly spoken English without digits,
 * units, symbols, or forbidden technical terms.
 */

const NUMBER_WORDS: Record<number, string> = {
  0: 'zero',
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
  13: 'thirteen',
  14: 'fourteen',
  15: 'fifteen',
  16: 'sixteen',
  17: 'seventeen',
  18: 'eighteen',
  19: 'nineteen',
  20: 'twenty',
  21: 'twenty-one',
  22: 'twenty-two',
  24: 'twenty-four',
  28: 'twenty-eight',
  30: 'thirty',
  31: 'thirty-one',
  33: 'thirty-three',
  34: 'thirty-four',
  35: 'thirty-five',
  38: 'thirty-eight',
  39: 'thirty-nine',
  40: 'forty',
  44: 'forty-four',
  49: 'forty-nine',
  50: 'fifty',
  51: 'fifty-one',
  52: 'fifty-two',
  53: 'fifty-three',
  55: 'fifty-five',
  60: 'sixty',
  63: 'sixty-three',
  64: 'sixty-four',
  66: 'sixty-six',
  67: 'sixty-seven',
  68: 'sixty-eight',
  70: 'seventy',
  79: 'seventy-nine',
  80: 'eighty',
  84: 'eighty-four',
  86: 'eighty-six',
  87: 'eighty-seven',
  88: 'eighty-eight',
  90: 'ninety',
  100: 'one hundred',
};

export function numberToWords(num: number): string {
  if (NUMBER_WORDS[num]) return NUMBER_WORDS[num];
  if (num < 100) {
    const tens = Math.floor(num / 10) * 10;
    const units = num % 10;
    return `${NUMBER_WORDS[tens] || tens}-${NUMBER_WORDS[units] || units}`;
  }
  return num.toString();
}

/**
 * Normalizes text to voice-ready format:
 * - Strips bracket tags like [REAL], [SIM], [DERIVED], emojis, brackets, symbols
 * - Spells out units and symbols per Section 3.1
 * - Applies easy-word swaps per Section 3.2
 * - Spells out standalone digits into English words
 */
export function normalizeForSpeech(text: string): string {
  if (!text) return '';

  let s = text;

  // 1. Remove bracketed provenance tags and UI tags completely
  s = s.replace(/\[REAL[^\]]*\]/gi, '');
  s = s.replace(/\[SIM[^\]]*\]/gi, '');
  s = s.replace(/\[DERIVED[^\]]*\]/gi, '');
  s = s.replace(/\[[A-Za-z0-9_\s-]{1,20}\]/g, '');

  // 2. Unit and symbol conversions (Section 3.1)
  s = s.replace(/m\/s\^?2|m\/s²/gi, 'meters per second squared');
  s = s.replace(/m\/s\b/gi, 'meters per second');
  s = s.replace(/km\/h\b/gi, 'kilometers per hour');
  s = s.replace(/kg\/sol\b/gi, 'kilograms per sol');
  s = s.replace(/kg\b/gi, 'kilograms');
  s = s.replace(/kPa\b/gi, 'kilopascals');
  s = s.replace(/\bPa\b/g, 'pascals');
  s = s.replace(/mb\b/gi, 'millibars');
  s = s.replace(/mSv\b/gi, 'millisieverts');
  s = s.replace(/kWh\b/gi, 'kilowatt hours');
  s = s.replace(/Wh\b/gi, 'watt hours');
  s = s.replace(/−63\s*°C|-63\s*°C/gi, 'minus sixty-three degrees');
  s = s.replace(/°C\b/g, 'degrees Celsius');
  s = s.replace(/%/g, ' percent');
  s = s.replace(/×/g, ' times ');
  s = s.replace(/[~≈]/g, 'about ');
  s = s.replace(/CO[2₂]/g, 'carbon dioxide');
  s = s.replace(/O[2₂]/g, 'oxygen');
  s = s.replace(/H2O|H₂O/g, 'water');
  s = s.replace(/\b24\s*h\s*39\s*min\b/gi, 'twenty-four hours and thirty-nine minutes');
  s = s.replace(/\b3:00\b/g, 'three minutes');
  s = s.replace(/\bNASA\b/g, 'N A S A');
  s = s.replace(/\bDONKI\b/g, 'the space weather team');
  s = s.replace(/\bCME\b/g, 'solar storm');
  s = s.replace(/→/g, ' to ');

  // 3. Easy-word swaps (Section 3.2)
  s = s.replace(/\bisolation valve\b/gi, 'shut-off valve');
  s = s.replace(/\bfracture\b/gi, 'crack');
  s = s.replace(/\bvent\b/gi, 'leak');
  s = s.replace(/\bcryogenic\b/gi, 'very cold');
  s = s.replace(/\bperchlorates\b/gi, 'salty chemicals');
  s = s.replace(/\bsub-surface\b/gi, 'under the ground');
  s = s.replace(/\bphotovoltaic\b/gi, 'solar');
  s = s.replace(/\bdistillation\b/gi, 'cleaning');
  s = s.replace(/\breclamation\b/gi, 'cleaning');
  s = s.replace(/\bproton radiation\b/gi, 'space radiation');
  s = s.replace(/\bcoronal mass ejection\b/gi, 'solar storm');
  s = s.replace(/\bmagnetic field\b/gi, 'magnetic shield');
  s = s.replace(/\bhydrogen wall\b/gi, 'water wall');
  s = s.replace(/\batmosphere\b/gi, 'air');
  s = s.replace(/\bEVA\b/g, 'outside walk');
  s = s.replace(/\btelemetry\b/gi, 'numbers');
  s = s.replace(/\bregolith\b/gi, 'Mars dust and soil');
  s = s.replace(/\bkatabatic[a-z]*\b/gi, 'wind');
  s = s.replace(/\belectrostatic squall[a-z]*\b/gi, 'dust storm');
  s = s.replace(/\bStarship\b/gi, 'the lander');
  s = s.replace(/\bdeadly\b/gi, 'harmful');
  s = s.replace(/\bdanger of death\b/gi, 'harmful conditions');
  s = s.replace(/\b100% safe\b/gi, 'much better protected');

  // Specific phrases
  s = s.replace(/\bSol (\d+)\b/gi, (_, n) => `Sol ${numberToWords(parseInt(n, 10))}`);
  s = s.replace(/\bTank (\d+)\b/gi, (_, n) => `Tank ${numberToWords(parseInt(n, 10))}`);
  s = s.replace(/\bValve (\d+)\b/gi, (_, n) => `Valve ${numberToWords(parseInt(n, 10))}`);
  s = s.replace(/\bPipe (\d+)\b/gi, (_, n) => `Pipe ${numberToWords(parseInt(n, 10))}`);

  // 4. Convert remaining digits to words
  s = s.replace(/\b(\d+)\s*–\s*(\d+)\b/g, (_, a, b) => {
    return `${numberToWords(parseInt(a, 10))} to ${numberToWords(parseInt(b, 10))}`;
  });
  s = s.replace(/\b(\d+)\s*-\s*(\d+)\b/g, (_, a, b) => {
    return `${numberToWords(parseInt(a, 10))} to ${numberToWords(parseInt(b, 10))}`;
  });
  s = s.replace(/\b(\d+)\b/g, (_, n) => numberToWords(parseInt(n, 10)));

  // 5. Clean up symbols, slashes, brackets
  s = s.replace(/[\/\\#$*_~`|«»"“”^²]/g, ' ');
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Strict regex lint check for spoken text:
 * Rejects digits, brackets, exponent signs, percentage, degree, multiplication,
 * approximate signs, arrows, slashes, or raw technical units.
 */
export const FORBIDDEN_SPEECH_REGEX = /[\d]|[\[\]²%°×≈~→/]|m\/s|kg|kPa|mSv/;

export function validateSpeechLint(speech: string): { valid: boolean; match?: string } {
  const match = speech.match(FORBIDDEN_SPEECH_REGEX);
  if (match) {
    return { valid: false, match: match[0] };
  }
  return { valid: true };
}
