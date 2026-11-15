import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_SPEECH_REGEX,
  normalizeForSpeech,
  validateSpeechLint,
} from '../speechNormalizer';
import {
  RUSTY_VARIANT_GROUPS,
  SOL_POSTCARDS,
  STORY_BEATS,
} from '../storyBeats';

describe('Story Beats, Speech Normalizer & Lint Compliance [UNIT]', () => {
  it('correctly normalizes numbers, units, tags, and technical terms to spoken English', () => {
    const raw = 'Sol 21: Tank 2 pressure at 25 kPa. [REAL] 3.73 m/s² gravity, isolation valve leaking.';
    const speech = normalizeForSpeech(raw);

    expect(speech).not.toContain('[REAL]');
    expect(speech).not.toContain('21');
    expect(speech).not.toContain('2');
    expect(speech).not.toContain('25');
    expect(speech).not.toContain('kPa');
    expect(speech).not.toContain('m/s²');
    expect(speech).not.toContain('isolation valve');
    expect(speech).toContain('Sol twenty-one');
    expect(speech).toContain('Tank two');
    expect(speech).toContain('shut-off valve');

    const lint = validateSpeechLint(speech);
    expect(lint.valid, `Lint error on: ${speech}`).toBe(true);
  });

  it('verifies every beat in STORY_BEATS passes the strict speech lint test (no digits or symbols)', () => {
    expect(STORY_BEATS.length).toBeGreaterThanOrEqual(40);
    for (const beat of STORY_BEATS) {
      const lint = validateSpeechLint(beat.speech);
      expect(
        lint.valid,
        `Beat ${beat.id} has forbidden token '${lint.match}' in speech: "${beat.speech}"`,
      ).toBe(true);

      // Verify no banned rush words in Rusty lines
      if (beat.speaker === 'rusty') {
        const lower = beat.text.toLowerCase();
        expect(lower).not.toMatch(/\b(hurry|rush|quick quick|go go|fast fast)\b/);
      }
    }
  });

  it('verifies every Sol Postcard passes speech lint test', () => {
    expect(SOL_POSTCARDS.length).toBeGreaterThanOrEqual(10);
    for (const pc of SOL_POSTCARDS) {
      const lint = validateSpeechLint(pc.speech);
      expect(
        lint.valid,
        `Postcard Sol ${pc.sol} has forbidden token '${lint.match}' in speech: "${pc.speech}"`,
      ).toBe(true);
    }
  });

  it('verifies all Rusty variant groups pass speech lint and contain at least 3 distinct variants', () => {
    for (const [groupName, variants] of Object.entries(RUSTY_VARIANT_GROUPS)) {
      expect(variants.length).toBeGreaterThanOrEqual(3);
      for (const variant of variants) {
        const lint = validateSpeechLint(normalizeForSpeech(variant));
        expect(
          lint.valid,
          `Variant in group '${groupName}' failed lint: "${variant}"`,
        ).toBe(true);
      }
    }
  });
});
