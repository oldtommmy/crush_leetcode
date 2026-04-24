import type { ReviewRating } from '../types';

export const RATING_LABELS: Record<ReviewRating, { en: string; zh: string }> = {
  too_easy: {
    en: 'Easy',
    zh: '轻松'
  },
  normal: {
    en: 'Good',
    zh: '还行'
  },
  hard: {
    en: 'Hard',
    zh: '吃力'
  },
  no_clue: {
    en: 'Stuck',
    zh: '没思路'
  }
};
