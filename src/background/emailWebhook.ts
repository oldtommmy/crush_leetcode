import type { DueProblem, EmailWebhookSettings, Locale, WeeklySummaryStats } from '../shared/types';
import { displayProblemTitle } from '../shared/leetcode/display';
import { problemUrlForLocale } from '../shared/leetcode/url';

export interface WeeklySummaryEmailPayload {
  locale: Locale;
  totalProblems: number;
  dueCount: number;
  overdueCount: number;
  reviewedProblemsThisWeekCount: number;
  acceptedProblemsThisWeekCount: number;
  dailyReviewPoints: WeeklySummaryStats['dailyReviewPoints'];
  topOverdueProblems: Array<Pick<DueProblem, 'id' | 'title' | 'titleZh' | 'titleSlug' | 'url' | 'daysOverdue'>>;
}

function createWeeklySummaryPayload(
  summary: WeeklySummaryStats,
  dueProblems: DueProblem[],
  settings: EmailWebhookSettings,
  locale: Locale
): WeeklySummaryEmailPayload {
  return {
    locale,
    totalProblems: summary.totalProblems,
    dueCount: summary.dueCount,
    overdueCount: summary.overdueCount,
    reviewedProblemsThisWeekCount: summary.reviewedProblemsThisWeekCount,
    acceptedProblemsThisWeekCount: summary.acceptedProblemsThisWeekCount,
    dailyReviewPoints: summary.dailyReviewPoints,
    topOverdueProblems: dueProblems
      .filter((problem) => problem.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue)
      .slice(0, 3)
      .map((problem) => ({
        id: problem.id,
        title: problem.title,
        titleZh: problem.titleZh,
        titleSlug: problem.titleSlug,
        url: problem.url,
        daysOverdue: problem.daysOverdue
      }))
  };
}

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Email webhook failed: ${response.status} ${text}`.trim());
  }
}

function renderChart(points: WeeklySummaryStats['dailyReviewPoints']): string {
  const maxCount = Math.max(1, ...points.map((point) => point.reviewCount));
  return `
    <div style="display:flex;align-items:flex-end;gap:10px;height:120px;margin:20px 0 8px;">
      ${points
        .map((point) => {
          const height = Math.max(8, Math.round((point.reviewCount / maxCount) * 100));
          return `
            <div style="flex:1;text-align:center;">
              <div style="height:${height}px;border-radius:10px 10px 4px 4px;background:${
                point.reviewCount > 0 ? '#f59e0b' : '#e5e7eb'
              };"></div>
              <div style="margin-top:6px;font-size:11px;color:#737373;">${point.label}</div>
              <div style="font-size:11px;color:#171717;font-weight:700;">${point.reviewCount}</div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderWeeklySummaryHtml(payload: WeeklySummaryEmailPayload): string {
  const locale = payload.locale;
  const title = locale === 'zh-CN' ? '本周刷题周报' : 'Your Weekly Review Digest';
  const subtitle =
    locale === 'zh-CN'
      ? '这周的复习节奏已经整理好了，花 1 分钟看一眼。'
      : 'Here is your weekly review snapshot in one quick glance.';
  const statLabels =
    locale === 'zh-CN'
      ? {
          reviewed: '本周复习题数',
          accepted: '本周新 AC',
          total: '累计题数',
          due: '待复习',
          overdue: '已逾期'
        }
      : {
          reviewed: 'Reviewed This Week',
          accepted: 'New Accepted',
          total: 'Total Problems',
          due: 'Due Now',
          overdue: 'Overdue'
        };

  const overdueHeading = locale === 'zh-CN' ? '当前最该回看的题' : 'Most overdue right now';
  const overdueEmpty = locale === 'zh-CN' ? '这周没有逾期题，节奏不错。' : 'No overdue problems this week. Nice pace.';
  const overdueUnit = locale === 'zh-CN' ? '天未复习' : 'day(s) overdue';

  return `
    <div style="margin:0;padding:24px;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#171717;">
      <div style="max-width:640px;margin:0 auto;background:white;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;">
        <div style="padding:24px 28px;background:#111827;color:white;">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.75;">Crush LeetCode</div>
          <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;">${title}</h1>
          <p style="margin:8px 0 0;color:#d1d5db;font-size:14px;">${subtitle}</p>
        </div>
        <div style="padding:24px 28px;">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
            <div style="padding:16px;border-radius:16px;background:#fff7ed;border:1px solid #fed7aa;">
              <div style="font-size:12px;color:#9a3412;">${statLabels.reviewed}</div>
              <div style="margin-top:8px;font-size:28px;font-weight:800;">${payload.reviewedProblemsThisWeekCount}</div>
            </div>
            <div style="padding:16px;border-radius:16px;background:#eff6ff;border:1px solid #bfdbfe;">
              <div style="font-size:12px;color:#1d4ed8;">${statLabels.accepted}</div>
              <div style="margin-top:8px;font-size:28px;font-weight:800;">${payload.acceptedProblemsThisWeekCount}</div>
            </div>
            <div style="padding:16px;border-radius:16px;background:#f9fafb;border:1px solid #e5e7eb;">
              <div style="font-size:12px;color:#525252;">${statLabels.total}</div>
              <div style="margin-top:8px;font-size:28px;font-weight:800;">${payload.totalProblems}</div>
            </div>
            <div style="padding:16px;border-radius:16px;background:#fef2f2;border:1px solid #fecaca;">
              <div style="font-size:12px;color:#b91c1c;">${statLabels.overdue}</div>
              <div style="margin-top:8px;font-size:28px;font-weight:800;">${payload.overdueCount}</div>
            </div>
          </div>

          <div style="margin-top:24px;padding:18px;border-radius:18px;background:#fafafa;border:1px solid #e5e7eb;">
            <div style="font-size:14px;font-weight:700;margin-bottom:6px;">${locale === 'zh-CN' ? '最近 7 天复习趋势' : 'Last 7 days review trend'}</div>
            ${renderChart(payload.dailyReviewPoints)}
            <div style="font-size:12px;color:#737373;">${locale === 'zh-CN' ? `当前待复习 ${payload.dueCount} 题。` : `${payload.dueCount} problem(s) are currently due.`}</div>
          </div>

          <div style="margin-top:24px;">
            <div style="font-size:14px;font-weight:700;margin-bottom:12px;">${overdueHeading}</div>
            ${
              payload.topOverdueProblems.length > 0
                ? payload.topOverdueProblems
                    .map(
                      (problem) => `
                        <div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:14px;margin-bottom:10px;">
                          <div style="font-size:14px;font-weight:700;">${displayProblemTitle(problem, locale)}</div>
                          <div style="margin-top:4px;font-size:12px;color:#737373;">${problem.daysOverdue} ${overdueUnit}</div>
                          <a href="${problemUrlForLocale(problem.titleSlug, locale)}" style="display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:#d97706;text-decoration:none;">
                            ${locale === 'zh-CN' ? '打开题目' : 'Open problem'}
                          </a>
                        </div>
                      `
                    )
                    .join('')
                : `<div style="font-size:13px;color:#737373;">${overdueEmpty}</div>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function sendWeeklySummaryEmail(
  summary: WeeklySummaryStats,
  dueProblems: DueProblem[],
  settings: EmailWebhookSettings,
  locale: Locale
): Promise<void> {
  if (!settings.enabled) {
    return;
  }

  if (!settings.toEmail) {
    throw new Error('Official digest requires recipient email.');
  }

  const payload = createWeeklySummaryPayload(summary, dueProblems, settings, locale);

  await postJson(
    'https://crush-leetcode-official-mailer.vercel.app/api/send-reminder',
    {
      'Content-Type': 'application/json'
    },
    {
      recipientEmail: settings.toEmail,
      locale,
      totalProblems: payload.totalProblems,
      dueCount: payload.dueCount,
      overdueCount: payload.overdueCount,
      reviewedProblemsThisWeekCount: payload.reviewedProblemsThisWeekCount,
      acceptedProblemsThisWeekCount: payload.acceptedProblemsThisWeekCount,
      dailyReviewPoints: payload.dailyReviewPoints,
      topOverdueProblems: payload.topOverdueProblems,
      eventId: `weekly-summary|${payload.dailyReviewPoints.at(-1)?.date ?? new Date().toISOString().slice(0, 10)}`
    }
  );
}
