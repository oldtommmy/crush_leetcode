import { todayDateString } from '../shared/date';
import { displayProblemTags, displayProblemTitle } from '../shared/leetcode/display';
import { problemUrlForLocale } from '../shared/leetcode/url';
import type { DueProblem, Locale, WeeklyProblemSummary, WeeklySummaryStats } from '../shared/types';

const LOCAL_REPORT_CARD_LIMIT = 4;

export interface WeeklyReportExportResult {
  filename: string;
  downloadId: number;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function difficultyLabel(difficulty: WeeklyProblemSummary['difficulty'], locale: Locale): string {
  if (locale !== 'zh-CN') {
    return difficulty;
  }

  return {
    Easy: '简单',
    Medium: '中等',
    Hard: '困难',
    Unknown: '未知'
  }[difficulty];
}

function masteryLabel(tier: WeeklyProblemSummary['masteryTier'], locale: Locale): string {
  const labels = {
    new: locale === 'zh-CN' ? '陌生' : 'New',
    familiar: locale === 'zh-CN' ? '熟悉' : 'Familiar',
    proficient: locale === 'zh-CN' ? '熟练' : 'Proficient',
    mastered: locale === 'zh-CN' ? '精通' : 'Mastered'
  };
  return labels[tier];
}

function dueToSummary(problem: DueProblem): WeeklyProblemSummary {
  return {
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
  };
}

function renderChart(points: WeeklySummaryStats['dailyReviewPoints'], locale: Locale): string {
  const maxCount = Math.max(1, ...points.map((point) => point.reviewCount));
  const total = points.reduce((sum, point) => sum + point.reviewCount, 0);
  const activeDays = points.filter((point) => point.reviewCount > 0).length;

  return `
    <section class="panel chart-panel">
      <div class="section-title">${locale === 'zh-CN' ? '每日刷题趋势' : 'Daily review trend'}</div>
      <div class="chart">
        ${points
          .map((point) => {
            const height = Math.max(10, Math.round((point.reviewCount / maxCount) * 120));
            return `
              <div class="bar-item">
                <div class="bar-track">
                  <div class="bar ${point.reviewCount > 0 ? 'bar-active' : ''}" style="height:${height}px"></div>
                </div>
                <div class="bar-label">${escapeHtml(point.label)}</div>
                <div class="bar-value">${point.reviewCount}</div>
              </div>
            `;
          })
          .join('')}
      </div>
      <div class="chips">
        <span>${locale === 'zh-CN' ? `${total} 次复习` : `${total} reviews`}</span>
        <span>${locale === 'zh-CN' ? `${activeDays}/7 天有练习` : `${activeDays}/7 active days`}</span>
      </div>
    </section>
  `;
}

function renderProblemCard(problem: WeeklyProblemSummary, locale: Locale): string {
  const title = displayProblemTitle(problem, locale);
  const tags = displayProblemTags(problem.tags, locale).slice(0, 3);
  const strength = formatPercent(problem.retrievability);

  return `
    <article class="problem-card">
      <div class="problem-head">
        <div>
          <div class="badges">
            <span class="badge difficulty-${problem.difficulty.toLowerCase()}">${escapeHtml(difficultyLabel(problem.difficulty, locale))}</span>
            <span class="badge neutral">${escapeHtml(masteryLabel(problem.masteryTier, locale))}</span>
            ${problem.daysOverdue > 0 ? `<span class="badge overdue">${locale === 'zh-CN' ? `${problem.daysOverdue} 天逾期` : `${problem.daysOverdue}d overdue`}</span>` : ''}
          </div>
          <h3>${escapeHtml(title)}</h3>
        </div>
        <a href="${escapeHtml(problemUrlForLocale(problem.titleSlug, locale))}">${locale === 'zh-CN' ? '打开' : 'Open'}</a>
      </div>
      <div class="tags">
        ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
      </div>
      <div class="memory">
        <div style="width:${strength}%"></div>
      </div>
      <div class="meta">
        <span>${locale === 'zh-CN' ? '记忆强度' : 'Memory'} <strong>${strength}%</strong></span>
        <span>${locale === 'zh-CN' ? '练习' : 'Reviews'} <strong>${problem.reviewCount}</strong></span>
        <span>${locale === 'zh-CN' ? '下次' : 'Next'} <strong>${escapeHtml(problem.nextReviewAt.slice(0, 10))}</strong></span>
      </div>
    </article>
  `;
}

function renderProblemSection(title: string, emptyText: string, problems: WeeklyProblemSummary[], locale: Locale): string {
  return `
    <section class="section-block">
      <div class="section-title">${escapeHtml(title)}</div>
      ${
        problems.length > 0
          ? problems.map((problem) => renderProblemCard(problem, locale)).join('')
          : `<div class="empty">${escapeHtml(emptyText)}</div>`
      }
    </section>
  `;
}

export function renderWeeklyReportHtml(
  summary: WeeklySummaryStats,
  dueProblems: DueProblem[],
  locale: Locale,
  generatedAt = new Date()
): string {
  const queueProblems = [...dueProblems]
    .sort((a, b) => {
      if (Math.abs(a.retrievability - b.retrievability) > 0.001) {
        return a.retrievability - b.retrievability;
      }
      return b.daysOverdue - a.daysOverdue;
    })
    .slice(0, LOCAL_REPORT_CARD_LIMIT)
    .map(dueToSummary);
  const acceptedProblemCards = (summary.acceptedProblemCards ?? []).slice(0, LOCAL_REPORT_CARD_LIMIT);
  const reviewedProblemCards = (summary.reviewedProblemCards ?? []).slice(0, LOCAL_REPORT_CARD_LIMIT);
  const title = locale === 'zh-CN' ? '本周刷题周报' : 'Weekly Review Report';
  const generatedText =
    locale === 'zh-CN'
      ? `生成时间：${generatedAt.toLocaleString()}`
      : `Generated at ${generatedAt.toLocaleString()}`;

  return `<!doctype html>
<html lang="${locale === 'zh-CN' ? 'zh-CN' : 'en'}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Crush LeetCode - ${title}</title>
  <style>
    :root { color-scheme: light; --ink:#1c1917; --muted:#78716c; --line:#e7e5e4; --paper:#fffaf2; --card:#ffffff; --accent:#f97316; }
    * { box-sizing: border-box; }
    body { margin:0; background:#f4f1ea; color:var(--ink); font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .shell { max-width: 920px; margin: 0 auto; padding: 28px 18px 48px; }
    .hero { border-radius: 30px; padding: 30px; color: white; background: radial-gradient(circle at top right,#facc15 0,#f97316 34%,#1c1917 72%); box-shadow: 0 24px 70px rgba(88,64,38,.18); }
    .eyebrow { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; opacity: .8; font-weight: 900; }
    h1 { margin: 12px 0 0; font-size: clamp(28px, 5vw, 44px); line-height: 1.05; }
    .hero p { margin: 12px 0 0; color: #ffedd5; }
    .stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
    .stat, .panel, .problem-card { border: 1px solid var(--line); border-radius: 20px; background: var(--card); }
    .stat { padding: 16px; }
    .stat span { display:block; color: var(--muted); font-size: 12px; font-weight: 800; }
    .stat strong { display:block; margin-top: 8px; font-size: 30px; line-height: 1; }
    .panel { padding: 18px; }
    .section-title { margin-bottom: 12px; font-size: 15px; font-weight: 950; }
    .chart { display:flex; align-items:flex-end; gap:10px; height: 160px; }
    .bar-item { flex:1; min-width:0; text-align:center; }
    .bar-track { height:120px; display:flex; align-items:flex-end; justify-content:center; }
    .bar { width:100%; max-width:38px; min-height:10px; border-radius:999px; background:#e7e5e4; opacity:.5; }
    .bar-active { background:linear-gradient(180deg,#fbbf24,#f97316); opacity:1; box-shadow:0 10px 18px rgba(249,115,22,.22); }
    .bar-label { margin-top:8px; font-size:11px; color:var(--muted); }
    .bar-value { margin-top:2px; font-size:13px; font-weight:900; }
    .chips, .tags, .badges, .meta { display:flex; flex-wrap:wrap; gap:8px; }
    .chips { margin-top:12px; }
    .chips span, .tags span { border-radius:999px; background:#f5f5f4; color:#57534e; padding:6px 10px; font-size:12px; font-weight:800; }
    .grid-2 { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
    .section-block { margin-top: 22px; }
    .problem-card { padding: 16px; margin-bottom: 10px; box-shadow: 0 8px 24px rgba(28,25,23,.04); }
    .problem-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .problem-card h3 { margin: 8px 0 0; font-size: 16px; line-height: 1.35; }
    .problem-head a { flex: 0 0 auto; border-radius: 10px; background: var(--accent); color: white; text-decoration: none; padding: 8px 11px; font-size: 12px; font-weight: 900; }
    .badge { border-radius: 8px; padding: 4px 8px; font-size: 11px; font-weight: 900; background:#fafaf9; border:1px solid #d6d3d1; color:#57534e; }
    .difficulty-easy { color:#059669; background:#ecfdf5; border-color:#a7f3d0; }
    .difficulty-medium { color:#d97706; background:#fffbeb; border-color:#fde68a; }
    .difficulty-hard { color:#dc2626; background:#fef2f2; border-color:#fecaca; }
    .overdue { color:white; background:#7c3aed; border-color:#7c3aed; }
    .tags { margin-top: 10px; }
    .memory { height: 8px; margin-top: 14px; overflow:hidden; border-radius:999px; background:#f5f5f4; }
    .memory div { height: 100%; border-radius:999px; background:#10b981; }
    .meta { margin-top: 9px; color:var(--muted); font-size:12px; font-weight:700; }
    .meta strong { color:var(--ink); }
    .empty { border:1px dashed #d6d3d1; border-radius:16px; padding:14px; color:var(--muted); background:#fafaf9; }
    @media (max-width: 720px) { .stats, .grid-2 { grid-template-columns: 1fr; } .hero { border-radius: 22px; padding: 24px; } }
  </style>
</head>
<body>
  <main class="shell">
    <header class="hero">
      <div class="eyebrow">Crush LeetCode</div>
      <h1>${title}</h1>
      <p>${escapeHtml(generatedText)}</p>
    </header>

    <section class="stats">
      <div class="stat"><span>${locale === 'zh-CN' ? '本周复习' : 'Reviewed'}</span><strong>${summary.reviewedProblemsThisWeekCount}</strong></div>
      <div class="stat"><span>${locale === 'zh-CN' ? '新 AC' : 'New AC'}</span><strong>${summary.acceptedProblemsThisWeekCount}</strong></div>
      <div class="stat"><span>${locale === 'zh-CN' ? '累计题数' : 'Total'}</span><strong>${summary.totalProblems}</strong></div>
      <div class="stat"><span>${locale === 'zh-CN' ? '待复习' : 'Due'}</span><strong>${summary.dueCount}</strong></div>
      <div class="stat"><span>${locale === 'zh-CN' ? '已逾期' : 'Overdue'}</span><strong>${summary.overdueCount}</strong></div>
    </section>

    ${renderChart(summary.dailyReviewPoints, locale)}

    <section class="grid-2">
      <div class="panel">
        <div class="section-title">${locale === 'zh-CN' ? '难度分布' : 'Difficulty'}</div>
        <div class="chips">
          ${(summary.difficultyBreakdown ?? []).map((item) => `<span>${escapeHtml(difficultyLabel(item.difficulty, locale))} ${item.count}</span>`).join('') || '<span>-</span>'}
        </div>
      </div>
      <div class="panel">
        <div class="section-title">${locale === 'zh-CN' ? '高频标签' : 'Top tags'}</div>
        <div class="chips">
          ${(summary.topTags ?? []).map((item) => `<span>${escapeHtml(item.tag)} ${item.count}</span>`).join('') || '<span>-</span>'}
        </div>
      </div>
    </section>

    ${renderProblemSection(
      locale === 'zh-CN' ? '下一批最该回看的题' : 'Next review queue',
      locale === 'zh-CN' ? '当前没有待复习题。' : 'No due problems right now.',
      queueProblems,
      locale
    )}
    ${renderProblemSection(
      locale === 'zh-CN' ? '本周新增 AC' : 'New accepts this week',
      locale === 'zh-CN' ? '这周还没有新增 AC。' : 'No new accepted problems this week.',
      acceptedProblemCards,
      locale
    )}
    ${renderProblemSection(
      locale === 'zh-CN' ? '最近复习过' : 'Recently reviewed',
      locale === 'zh-CN' ? '这周还没有完成复习。' : 'No reviews completed this week.',
      reviewedProblemCards,
      locale
    )}
  </main>
</body>
</html>`;
}

export function weeklyReportFilename(now = new Date()): string {
  return `crush-leetcode-weekly-${todayDateString(now)}.html`;
}

export async function exportWeeklyReportHtml(
  summary: WeeklySummaryStats,
  dueProblems: DueProblem[],
  locale: Locale,
  now = new Date()
): Promise<WeeklyReportExportResult> {
  const filename = weeklyReportFilename(now);
  const html = renderWeeklyReportHtml(summary, dueProblems, locale, now);
  const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

  const downloadId = await new Promise<number>((resolve, reject) => {
    chrome.downloads.download(
      {
        url,
        filename,
        conflictAction: 'uniquify',
        saveAs: false
      },
      (id) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(id);
      }
    );
  });

  return { filename, downloadId };
}
