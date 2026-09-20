import { describe, expect, it } from 'vitest';
import { RATING_ORDER, RATING_STYLES } from '../src/shared/ui/rating';
import type { ReviewRating } from '../src/shared/types';

/**
 * P0 regression: the same rating must render with the same color everywhere.
 * ProblemCard and EvaluationModal previously hard-coded conflicting scales
 * (emerald/blue vs blue/emerald). Both now consume RATING_STYLES, so this test
 * pins the single mapping.
 */
describe('RATING_STYLES (P0 rating color consistency)', () => {
  const expected: Record<ReviewRating, { soft: string; ink: string; solid: string }> = {
    too_easy: { soft: 'bg-easy-soft', ink: 'text-easy-ink', solid: 'bg-easy' },
    normal: { soft: 'bg-good-soft', ink: 'text-good-ink', solid: 'bg-good' },
    hard: { soft: 'bg-hard-soft', ink: 'text-hard-ink', solid: 'bg-hard' },
    no_clue: { soft: 'bg-stuck-soft', ink: 'text-stuck-ink', solid: 'bg-stuck' }
  };

  it('maps each rating to its semantic token, in order', () => {
    expect(RATING_ORDER).toEqual(['too_easy', 'normal', 'hard', 'no_clue']);
    for (const rating of RATING_ORDER) {
      expect(RATING_STYLES[rating].soft).toBe(expected[rating].soft);
      expect(RATING_STYLES[rating].ink).toBe(expected[rating].ink);
      expect(RATING_STYLES[rating].solid).toBe(expected[rating].solid);
    }
  });

  it('never reuses a color token across two ratings', () => {
    const solids = RATING_ORDER.map((r) => RATING_STYLES[r].solid);
    expect(new Set(solids).size).toBe(solids.length);
  });

  it('easy is green (easy) and normal is blue (good), not swapped', () => {
    // This is the exact regression: too_easy must be the "easy" (green) token,
    // normal must be the "good" (blue) token.
    expect(RATING_STYLES.too_easy.solid).toBe('bg-easy');
    expect(RATING_STYLES.normal.solid).toBe('bg-good');
  });
});
