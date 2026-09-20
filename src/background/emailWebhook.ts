import type {
  DueProblem,
  EmailWebhookSettings,
  Locale,
  WeeklyDifficultyCount,
  WeeklyProblemSummary,
  WeeklySummaryStats,
  WeeklyTagCount
} from '../shared/types';

const DEFAULT_OFFICIAL_MAILER_BASE_URL = 'https://mail.crushlc.site';
const MISSING_ACCESS_CODE_MESSAGE = 'Official digest requires the beta access code from your confirmation email.';
const WEEKLY_EMAIL_CARD_LIMIT = 3;

type WeeklyEmailProblemCard = Pick<
  WeeklyProblemSummary,
  | 'title'
  | 'titleZh'
  | 'titleSlug'
  | 'difficulty'
  | 'tags'
  | 'reviewCount'
  | 'nextReviewAt'
  | 'daysOverdue'
  | 'retrievability'
  | 'masteryTier'
>;

export interface WeeklySummaryEmailPayload {
  locale: Locale;
  totalProblems: number;
  dueCount: number;
  overdueCount: number;
  reviewedProblemsThisWeekCount: number;
  acceptedProblemsThisWeekCount: number;
  dailyReviewPoints: WeeklySummaryStats['dailyReviewPoints'];
  difficultyBreakdown: WeeklyDifficultyCount[];
  topTags: WeeklyTagCount[];
  acceptedProblemCards: WeeklyEmailProblemCard[];
  reviewedProblemCards: WeeklyEmailProblemCard[];
  reviewQueueProblems: WeeklyEmailProblemCard[];
}

function summaryToEmailCard(problem: WeeklyProblemSummary): WeeklyEmailProblemCard {
  return {
    title: problem.title,
    titleZh: problem.titleZh,
    titleSlug: problem.titleSlug,
    difficulty: problem.difficulty,
    tags: problem.tags?.slice(0, 3),
    reviewCount: problem.reviewCount,
    nextReviewAt: problem.nextReviewAt,
    daysOverdue: problem.daysOverdue,
    retrievability: problem.retrievability,
    masteryTier: problem.masteryTier
  };
}

function dueProblemToEmailCard(problem: DueProblem): WeeklyEmailProblemCard {
  return summaryToEmailCard({
    id: problem.id,
    title: problem.title,
    titleZh: problem.titleZh,
    titleSlug: problem.titleSlug,
    url: problem.url,
    difficulty: problem.difficulty,
    tags: problem.tags,
    reviewCount: problem.reviewCount,
    nextReviewAt: problem.nextReviewAt,
    stability: problem.stability,
    daysOverdue: problem.daysOverdue,
    retrievability: problem.retrievability,
    masteryTier: problem.masteryTier
  });
}

function createWeeklySummaryPayload(
  summary: WeeklySummaryStats,
  dueProblems: DueProblem[],
  settings: EmailWebhookSettings,
  locale: Locale
): WeeklySummaryEmailPayload {
  void settings;

  const sortedDueProblems = [...dueProblems].sort((a, b) => {
    if (Math.abs(a.retrievability - b.retrievability) > 0.001) {
      return a.retrievability - b.retrievability;
    }
    return b.daysOverdue - a.daysOverdue;
  });

  return {
    locale,
    totalProblems: summary.totalProblems,
    dueCount: summary.dueCount,
    overdueCount: summary.overdueCount,
    reviewedProblemsThisWeekCount: summary.reviewedProblemsThisWeekCount,
    acceptedProblemsThisWeekCount: summary.acceptedProblemsThisWeekCount,
    dailyReviewPoints: summary.dailyReviewPoints,
    difficultyBreakdown: summary.difficultyBreakdown ?? [],
    topTags: summary.topTags ?? [],
    acceptedProblemCards: (summary.acceptedProblemCards ?? []).slice(0, WEEKLY_EMAIL_CARD_LIMIT).map(summaryToEmailCard),
    reviewedProblemCards: (summary.reviewedProblemCards ?? []).slice(0, WEEKLY_EMAIL_CARD_LIMIT).map(summaryToEmailCard),
    reviewQueueProblems: sortedDueProblems.slice(0, WEEKLY_EMAIL_CARD_LIMIT).map(dueProblemToEmailCard)
  };
}

function officialMailerHeaders(): Record<string, string> {
  // D3: no shared secret is shipped in the bundle. A Chrome extension is a
  // public zip, so any compiled-in `X-Crush-Secret` would be trivially
  // extractable and lets anyone drive the send endpoint. Per-user auth is
  // carried by the beta access code in the request body; the server is
  // responsible for validating it and rate-limiting by installId/email.
  return {
    'Content-Type': 'application/json'
  };
}

function officialMailerSendUrl(): string {
  const explicitUrl = import.meta.env.VITE_CRUSH_MAILER_SEND_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  const baseUrl = (import.meta.env.VITE_CRUSH_MAILER_BASE_URL?.trim() || DEFAULT_OFFICIAL_MAILER_BASE_URL).replace(/\/+$/, '');
  return `${baseUrl}/api/send-reminder`;
}

function normalizeBetaAccessCode(code?: string): string {
  return code?.replace(/\s+/g, '') ?? '';
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<void> {
  console.log(`[EmailWebhook] Posting to ${url}...`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(`[EmailWebhook] Server returned ${response.status}: ${text}`);
      throw new Error(`Email webhook failed: ${response.status} ${text}`.trim());
    }
    console.log('[EmailWebhook] Successfully sent.');
  } catch (error) {
    console.error('[EmailWebhook] Fetch error:', error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Network error or CORS block: Failed to fetch. Please check your internet connection and verify the mailer service is up.');
    }
    throw error;
  }
}

export async function sendWeeklySummaryEmail(
  summary: WeeklySummaryStats,
  dueProblems: DueProblem[],
  settings: EmailWebhookSettings,
  locale: Locale,
  options: { requireConfigured?: boolean } = {}
): Promise<void> {
  if (!settings.enabled) {
    return;
  }

  if (!settings.toEmail) {
    throw new Error('Official digest requires recipient email.');
  }

  // D3: gating is now based on the per-user beta access code (validated
  // server-side), not on a compiled-in shared secret. Without a code we skip
  // automatic delivery quietly and surface a clear error for manual tests.
  const betaAccessCode = normalizeBetaAccessCode(settings.betaAccessCode);
  if (!betaAccessCode) {
    if (options.requireConfigured) {
      throw new Error(MISSING_ACCESS_CODE_MESSAGE);
    }
    console.info('[EmailWebhook] Skipping official digest because no beta access code is configured.');
    return;
  }

  const payload = createWeeklySummaryPayload(summary, dueProblems, settings, locale);

  await postJson(
    officialMailerSendUrl(),
    officialMailerHeaders(),
    {
      recipientEmail: settings.toEmail,
      locale,
      totalProblems: payload.totalProblems,
      dueCount: payload.dueCount,
      overdueCount: payload.overdueCount,
      reviewedProblemsThisWeekCount: payload.reviewedProblemsThisWeekCount,
      acceptedProblemsThisWeekCount: payload.acceptedProblemsThisWeekCount,
      dailyReviewPoints: payload.dailyReviewPoints,
      difficultyBreakdown: payload.difficultyBreakdown,
      topTags: payload.topTags,
      acceptedProblemCards: payload.acceptedProblemCards,
      reviewedProblemCards: payload.reviewedProblemCards,
      reviewQueueProblems: payload.reviewQueueProblems,
      betaAccessCode,
      eventId: `weekly-summary|${payload.dailyReviewPoints[payload.dailyReviewPoints.length - 1]?.date ?? new Date().toISOString().slice(0, 10)}`
    }
  );
}
