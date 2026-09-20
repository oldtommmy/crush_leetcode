import type { ReviewRating } from '../types';

/**
 * Rating color scale — the single source of truth (UI plan §3.1).
 *
 * The four ratings map to a fixed semantic scale. ProblemCard, EvaluationModal,
 * the library "recent rating" column and any stats view MUST consume this, so
 * the same rating never renders with different colors again (P0 bug: ProblemCard
 * used emerald/blue while EvaluationModal used blue/emerald — swapped).
 *
 * - `soft`  : token background (bg-*-soft)
 * - `ink`   : AA-contrast text/icon color on the soft background (text-*-ink)
 * - `solid` : full-strength accent for filled emphasis blocks
 */
export interface RatingStyle {
  /** Tailwind class for the soft background. */
  soft: string;
  /** Tailwind class for AA-contrast text on the soft background. */
  ink: string;
  /** Tailwind class for a solid accent background. */
  solid: string;
  /** Tailwind class for solid-block text (dark ink on the solid accent). */
  solidText: string;
  /** Hover border color (matches the v1 prototype's colored outline on lift). */
  hoverBorder: string;
  /** Hover glow shadow tinted with the rating's soft color (v1 prototype). */
  hoverShadow: string;
}

export const RATING_STYLES: Record<ReviewRating, RatingStyle> = {
  too_easy: {
    soft: 'bg-easy-soft',
    ink: 'text-easy-ink',
    solid: 'bg-easy',
    solidText: 'text-white',
    hoverBorder: 'hover:border-easy',
    hoverShadow: 'hover:shadow-[0_6px_16px_var(--r-easy-soft)]'
  },
  normal: {
    soft: 'bg-good-soft',
    ink: 'text-good-ink',
    solid: 'bg-good',
    solidText: 'text-white',
    hoverBorder: 'hover:border-good',
    hoverShadow: 'hover:shadow-[0_6px_16px_var(--r-good-soft)]'
  },
  hard: {
    soft: 'bg-hard-soft',
    ink: 'text-hard-ink',
    solid: 'bg-hard',
    solidText: 'text-white',
    hoverBorder: 'hover:border-hard',
    hoverShadow: 'hover:shadow-[0_6px_16px_var(--r-hard-soft)]'
  },
  no_clue: {
    soft: 'bg-stuck-soft',
    ink: 'text-stuck-ink',
    solid: 'bg-stuck',
    solidText: 'text-white',
    hoverBorder: 'hover:border-stuck',
    hoverShadow: 'hover:shadow-[0_6px_16px_var(--r-stuck-soft)]'
  }
};

/**
 * Rating emoji — mirrors the v1 prototype's rating buttons so the popup card
 * and the AC modal share the exact same face for each rating.
 * 😎 too_easy · 🙂 normal · 😓 hard · 😵 no_clue
 */
export const RATING_EMOJI: Record<ReviewRating, string> = {
  too_easy: '😎',
  normal: '🙂',
  hard: '😓',
  no_clue: '😵'
};

/** Ratings in canonical display order (easy → stuck). */
export const RATING_ORDER: ReviewRating[] = ['too_easy', 'normal', 'hard', 'no_clue'];
