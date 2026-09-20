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
import { HotQuestionsPanel } from './components/HotQuestionsPanel';
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
  const [activeTab, setActiveTab] = useState<'review' | 'hot'>('review');
  // Mount the hot-questions panel once (on first open) and then keep it mounted,
  // so switching tabs is an instant show/hide instead of an unmount + refetch +
  // skeleton flash + layout thrash (the "卡一下" jank).
  const [hotMounted, setHotMounted] = useState(false);

  useEffect(() => {
    if (activeTab === 'hot') setHotMounted(true);
  }, [activeTab]);

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
    <main className="relative flex min-h-[520px] w-[400px] flex-col overflow-hidden rounded-xl bg-bg text-text">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border-soft bg-surface px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <img
            src="/icons/icon.png"
            alt="Crush LeetCode"
            className="h-[34px] w-[34px] rounded-[10px] object-cover shadow-brand"
          />
          <div>
            <h1 className="text-sm font-extrabold leading-tight tracking-[-.01em]">Crush LeetCode</h1>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-text-3">{t(locale, 'dailyPlan')}</p>
          </div>
        </div>
        <button
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-text-2 transition-all hover:bg-surface-2 hover:text-text active:scale-90"
          onClick={() => chrome.runtime.openOptionsPage()}
          title={t(locale, 'settings')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4">
        {error ? (
          <div className="mb-4 rounded-sm bg-stuck-soft p-3 text-xs font-medium text-stuck-ink">
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
          <div className="relative mb-4 flex rounded-m bg-surface-2 p-1">
            <span
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[calc(var(--r-m)-4px)] bg-surface shadow-sm transition-transform duration-[240ms] ease-spring"
              style={{ transform: activeTab === 'hot' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            <button
              className={`relative z-[1] flex-1 py-2 text-xs font-extrabold transition-colors ${activeTab === 'review' ? 'text-text' : 'text-text-2 hover:text-text'}`}
              onClick={() => setActiveTab('review')}
            >
              {locale === 'zh-CN' ? '今日计划' : 'Today'}
            </button>
            <button
              className={`relative z-[1] flex-1 py-2 text-xs font-extrabold transition-colors ${activeTab === 'hot' ? 'text-text' : 'text-text-2 hover:text-text'}`}
              onClick={() => setActiveTab('hot')}
            >
              {locale === 'zh-CN' ? '大厂高频' : 'Company Hot'}
            </button>
          </div>
        ) : null}

        {data ? (
          <>
            <div className={activeTab === 'review' ? 'clc-fade-in' : 'hidden'}>
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
              <NoteEditor
                problems={problems}
                notes={data.state.notesByProblemId}
                locale={locale}
                onSaved={load}
              />
            </div>

            {hotMounted ? (
              <div className={activeTab === 'hot' ? 'clc-fade-in' : 'hidden'}>
                <HotQuestionsPanel locale={locale} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Footer Buttons */}
      <footer className="mt-auto border-t border-border-soft bg-surface p-3">
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/oldtommmy/crush_leetcode"
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-brand py-2.5 text-[11px] font-semibold text-white shadow-brand transition-transform duration-200 ease-spring hover:-translate-y-0.5 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.44-1.304.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            {t(locale, 'giveMeAStar')}
          </a>
          <button
            onClick={() => setShowDonate(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-border bg-surface-2 py-2.5 text-[11px] font-semibold text-text-2 transition-all duration-200 ease-standard hover:bg-surface active:scale-95"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6 clc-fade-in">
          <div className="w-full max-w-xs overflow-hidden rounded-lg bg-elevated shadow-lg clc-modal-in">
            <div className="bg-surface-2 p-6 text-center">
              <h3 className="text-lg font-semibold text-text">{t(locale, 'buyMeATea')}</h3>
              <p className="mt-1 text-xs text-text-2">感谢你的支持！❤️</p>
            </div>
            <div className="p-6">
              <div className="aspect-square w-full overflow-hidden rounded-m bg-surface-2">
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
                className="mt-6 w-full rounded-sm border border-border bg-surface-2 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface"
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
