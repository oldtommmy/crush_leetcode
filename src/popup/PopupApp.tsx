import { useCallback, useEffect, useState } from 'react';
import type {
  AnnouncementAction,
  DueProblem,
  ExtensionAnnouncement,
  ExtensionStorageState,
  Problem,
  ReviewStats,
  RuntimeRequest,
  RuntimeResponse
} from '../shared/types';
import { t } from '../shared/i18n/messages';
import { DailyPlan } from './components/DailyPlan';
import { NoteEditor } from './components/NoteEditor';
import { AnnouncementBanner } from '../shared/ui/AnnouncementBanner';

interface DailyPlanResponse {
  state: ExtensionStorageState;
  dueProblems: DueProblem[];
  dailyRemainingProblems: DueProblem[];
  totalDailyRemainingCount: number;
  completedTodayProblems: Problem[];
  allProblems: Problem[];
  stats: ReviewStats;
}

export function PopupApp() {
  const [data, setData] = useState<DailyPlanResponse | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [showDonate, setShowDonate] = useState(false);
  const [announcement, setAnnouncement] = useState<ExtensionAnnouncement | undefined>();

  const load = useCallback(() => {
    chrome.runtime
      .sendMessage({ type: 'GET_DAILY_PLAN' } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<DailyPlanResponse>) => {
        if (!response.ok || !response.data) {
          throw new Error(response.error ?? 'Failed to load daily plan.');
        }
        setData(response.data);
        setError(undefined);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => load(), [load]);

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: 'CHECK_ANNOUNCEMENT' } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<ExtensionAnnouncement | undefined>) => {
        if (response.ok) {
          setAnnouncement(response.data);
        }
      })
      .catch(() => undefined);
  }, []);

  const openAnnouncementAction = useCallback((action: AnnouncementAction) => {
    chrome.runtime
      .sendMessage({ type: 'OPEN_ANNOUNCEMENT_ACTION', payload: { action } } satisfies RuntimeRequest)
      .then((response: RuntimeResponse) => {
        if (!response.ok) {
          throw new Error(response.error);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const dismissAnnouncement = useCallback((noticeId: string) => {
    setAnnouncement(undefined);
    chrome.runtime
      .sendMessage({ type: 'DISMISS_ANNOUNCEMENT', payload: { noticeId } } satisfies RuntimeRequest)
      .catch(() => undefined);
  }, []);

  const updateDailyReviewLimit = useCallback((limit: number) => {
    chrome.runtime
      .sendMessage({ type: 'UPDATE_DAILY_REVIEW_LIMIT', payload: { limit } } satisfies RuntimeRequest)
      .then((response: RuntimeResponse<ExtensionStorageState>) => {
        if (!response.ok) {
          throw new Error(response.error ?? 'Failed to update daily review limit.');
        }
        load();
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [load]);

  const locale = data?.state.settings.locale ?? 'en';
  const problems = data ? Object.values(data.state.problemsById).filter((problem) => !problem.archived) : [];

  return (
    <main className="relative flex min-h-[520px] w-[400px] flex-col bg-[#f7f8fa] text-neutral-900 dark:bg-[#1a1a1a] dark:text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-neutral-800 dark:bg-[#262626]/80">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
            <img src="/icons/icon.png" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Crush LeetCode</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">{t(locale, 'dailyPlan')}</p>
          </div>
        </div>
        <button
          className="flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          onClick={() => chrome.runtime.openOptionsPage()}
          title={t(locale, 'settings')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600 dark:text-neutral-400">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2l-.2.1a2 2 0 0 1-2.43.38l-.2-.1a2 2 0 0 0-2.5 1l-.2.35a2 2 0 0 0 1 2.5l.1.2a2 2 0 0 1-.38 2.43l-.1.2a2 2 0 0 0 0 2.5l.2.35a2 2 0 0 0 2.5 1l.2-.1a2 2 0 0 1 2.43.38l.2.1a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2l.2-.1a2 2 0 0 1 2.43-.38l.2.1a2 2 0 0 0 2.5-1l.2-.35a2 2 0 0 0-1-2.5l-.1-.2a2 2 0 0 1 .38-2.43l.1-.2a2 2 0 0 0 0-2.5l-.2-.35a2 2 0 0 0-2.5-1l-.2.1a2 2 0 0 1-2.43-.38l-.2-.1a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>{t(locale, 'settings')}</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 pb-20">
        {error ? (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        ) : null}

        {announcement ? (
          <div className="mb-4">
            <AnnouncementBanner
              announcement={announcement}
              locale={locale}
              compact
              onAction={openAnnouncementAction}
              onDismiss={dismissAnnouncement}
            />
          </div>
        ) : null}

        {data ? (
          <DailyPlan
            dueProblems={data.dailyRemainingProblems}
            totalDailyRemainingCount={data.totalDailyRemainingCount}
            completedTodayProblems={data.completedTodayProblems}
            allProblems={data.allProblems}
            stats={data.stats}
            locale={locale}
            dailyReviewLimit={data.state.settings.dailyReviewLimit}
            onDailyReviewLimitChange={updateDailyReviewLimit}
            onChanged={load}
          />
        ) : null}

        {data ? (
          <NoteEditor
            problems={problems}
            notes={data.state.notesByProblemId}
            locale={locale}
            onSaved={load}
          />
        ) : null}
      </div>

      {/* Footer Buttons */}
      <footer className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white/50 p-3 backdrop-blur-sm dark:border-neutral-800 dark:bg-[#1a1a1a]/50">
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/oldtommmy/crush_leetcode"
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 text-[11px] font-bold text-white transition-all hover:bg-black active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.44-1.304.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            {t(locale, 'giveMeAStar')}
          </a>
          <button
            onClick={() => setShowDonate(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-50 py-2.5 text-[11px] font-bold text-rose-600 transition-all hover:bg-rose-100 active:scale-95 dark:bg-rose-500/10 dark:text-rose-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="14" x2="14" y2="4" />
            </svg>
            {t(locale, 'buyMeATea')}
          </button>
        </div>
      </footer>

      {/* Donation Modal */}
      {showDonate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-[#262626] animate-in zoom-in-95 duration-200">
            <div className="bg-rose-500 p-6 text-center text-white">
              <h3 className="text-lg font-bold">{t(locale, 'buyMeATea')}</h3>
              <p className="mt-1 text-xs opacity-90">感谢你的支持！❤️</p>
            </div>
            <div className="p-6">
              <div className="aspect-square w-full overflow-hidden rounded-2xl bg-neutral-100">
                <img
                  src="/icons/wechat-pay.png"
                  alt="WeChat Pay"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Please%20replace%20with%20your%20QR%20code';
                  }}
                />
              </div>
              <button
                onClick={() => setShowDonate(false)}
                className="mt-6 w-full rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white transition-all hover:bg-black dark:bg-white dark:text-neutral-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
