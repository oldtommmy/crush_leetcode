import { useEffect, useState } from 'react';
import { DAILY_ALARM_NAME } from '../shared/constants';
import { nextLocalTime } from '../shared/date';
import {
  applyDebugScenarioPreset,
  DEBUG_SCENARIO_PRESETS,
  getState,
  importState,
  loadDebugQaCoveragePack,
  updateState
} from '../shared/storage/chromeStorage';
import type {
  AnnouncementAction,
  ExtensionAnnouncement,
  DebugScenarioPreset,
  ExtensionStorageState,
  RuntimeRequest,
  RuntimeResponse,
  UserSettings
} from '../shared/types';
import { ReminderSettings } from './components/ReminderSettings';
import { WebhookSettings } from './components/WebhookSettings';
import { ImportExportPanel } from './components/ImportExportPanel';
import { InstallationCheck } from './components/InstallationCheck';
import { t } from '../shared/i18n/messages';
import { AnnouncementBanner } from '../shared/ui/AnnouncementBanner';

const DEBUG_TAP_TARGET = 7;
const DEBUG_TAP_WINDOW_MS = 2000;

async function scheduleAlarm(settings: UserSettings) {
  await chrome.alarms.clear(DAILY_ALARM_NAME);
  if (!settings.reminders.enabled) return;
  chrome.alarms.create(DAILY_ALARM_NAME, {
    when: nextLocalTime(settings.reminders.dailyReminderTime).getTime(),
    periodInMinutes: 24 * 60
  });
}

export function OptionsApp() {
  const [state, setLoadedState] = useState<ExtensionStorageState | undefined>();
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | undefined>();
  const [showDonate, setShowDonate] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [announcement, setAnnouncement] = useState<ExtensionAnnouncement | undefined>();

  useEffect(() => {
    getState().then(setLoadedState).catch((error) => setMessage({ text: String(error), type: 'error' }));
  }, []);

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

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(undefined), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (logoTapCount === 0) {
      return;
    }

    const timer = setTimeout(() => setLogoTapCount(0), DEBUG_TAP_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [logoTapCount]);

  const saveSettings = async (settings: UserSettings) => {
    if (!state) return;
    const nextState = await updateState((latestState) => ({
      ...latestState,
      settings
    }));
    setLoadedState(nextState);
    await scheduleAlarm(settings);
    setMessage({ text: 'Settings saved', type: 'success' });
  };

  const runImport = async (input: unknown) => {
    try {
      const nextState = await importState(input);
      setLoadedState(nextState);
      await scheduleAlarm(nextState.settings);
      setMessage({ text: 'Data imported successfully', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : String(error), type: 'error' });
    }
  };

  const testEmail = () => {
    chrome.runtime.sendMessage({ type: 'SEND_TEST_EMAIL' } satisfies RuntimeRequest)
      .then((res: RuntimeResponse) => {
        if (res.ok) setMessage({ text: state?.settings.locale === 'zh-CN' ? '测试周报已发送' : 'Test digest sent!', type: 'success' });
        else throw new Error(res.error);
      })
      .catch((err) => setMessage({ text: String(err), type: 'error' }));
  };

  const testNotification = () => {
    chrome.runtime.sendMessage({ type: 'SEND_TEST_NOTIFICATION' } satisfies RuntimeRequest)
      .then((res: RuntimeResponse<{ permissionLevel?: string }>) => {
        if (res.ok) {
          const locale = state?.settings.locale;
          const text =
            locale === 'zh-CN'
              ? `测试通知已发送。若没看到横幅，请检查系统里的 Google Chrome 通知权限：macOS 在“系统设置 > 通知”，Windows 在“设置 > 系统 > 通知”。Chrome 权限：${res.data?.permissionLevel ?? 'unknown'}`
              : `Test notification sent. If no banner appears, allow Google Chrome notifications in system settings: macOS System Settings > Notifications, or Windows Settings > System > Notifications. Chrome permission: ${res.data?.permissionLevel ?? 'unknown'}`;
          setMessage({ text, type: 'success' });
        }
        else throw new Error(res.error);
      })
      .catch((err) => setMessage({ text: err instanceof Error ? err.message : String(err), type: 'error' }));
  };

  const exportWeeklyReport = () => {
    const currentLocale = state?.settings.locale ?? 'en';
    chrome.runtime.sendMessage({ type: 'EXPORT_WEEKLY_REPORT' } satisfies RuntimeRequest)
      .then((res: RuntimeResponse<{ filename?: string }>) => {
        if (res.ok) {
          const filename = res.data?.filename;
          setMessage({
            text:
              currentLocale === 'zh-CN'
                ? `${t(currentLocale, 'weeklyReportExported')}${filename ? `：${filename}` : ''}`
                : `${t(currentLocale, 'weeklyReportExported')}${filename ? `: ${filename}` : ''}`,
            type: 'success'
          });
        } else {
          throw new Error(res.error);
        }
      })
      .catch((err) => setMessage({ text: err instanceof Error ? err.message : String(err), type: 'error' }));
  };

  const openAnnouncementAction = (action: AnnouncementAction) => {
    chrome.runtime
      .sendMessage({ type: 'OPEN_ANNOUNCEMENT_ACTION', payload: { action } } satisfies RuntimeRequest)
      .then((res: RuntimeResponse) => {
        if (!res.ok) throw new Error(res.error);
      })
      .catch((err) => setMessage({ text: err instanceof Error ? err.message : String(err), type: 'error' }));
  };

  const dismissAnnouncement = (noticeId: string) => {
    setAnnouncement(undefined);
    chrome.runtime
      .sendMessage({ type: 'DISMISS_ANNOUNCEMENT', payload: { noticeId } } satisfies RuntimeRequest)
      .catch(() => undefined);
  };

  const openProblemLibrary = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('library.html') });
  };

  const toggleDebugMode = async () => {
    if (!state) return;
    const nextState = await updateState((latestState) => ({
      ...latestState,
      metadata: {
        ...latestState.metadata,
        debugMode: !latestState.metadata.debugMode
      }
    }));
    setLoadedState(nextState);
    setMessage({ text: nextState.metadata.debugMode ? 'Debug mode enabled' : 'Debug mode disabled', type: 'success' });
  };

  const handleLogoClick = () => {
    const nextTapCount = logoTapCount + 1;
    if (nextTapCount >= DEBUG_TAP_TARGET) {
      setLogoTapCount(0);
      void toggleDebugMode();
      return;
    }

    setLogoTapCount(nextTapCount);
  };

  const loadDemoData = async () => {
    try {
      const nextState = await loadDebugQaCoveragePack();
      setLoadedState(nextState);
      setMessage({ text: 'QA coverage pack loaded', type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : String(error), type: 'error' });
    }
  };

  const applyScenario = async (preset: DebugScenarioPreset) => {
    try {
      const nextState = await applyDebugScenarioPreset(preset);
      setLoadedState(nextState);
      setMessage({ text: `Debug preset applied: ${preset}`, type: 'success' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : String(error), type: 'error' });
    }
  };

  if (!state) return null;
  const locale = state.settings.locale;
  const totalProblems = Object.keys(state.problemsById).length;

  return (
    <main className="min-h-screen bg-[#f7f8fa] pb-20 text-neutral-900 dark:bg-[#1a1a1a] dark:text-neutral-100 font-sans">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-neutral-800 dark:bg-[#262626]/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl"
              onClick={handleLogoClick}
              title={state.metadata.debugMode ? 'Debug Tools enabled' : undefined}
            >
              <img src="/icons/icon.png" alt="Logo" className="h-full w-full object-cover" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Crush LeetCode</h1>
              <p className="text-xs font-medium text-neutral-500">{t(locale, 'tagline')}</p>
            </div>
          </div>

          {message && (
            <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-4 ${
              message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {message.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              )}
              {message.text}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto mt-8 max-w-4xl px-6">
        <div className="grid gap-8 md:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            <ReminderSettings
              settings={state.settings}
              onChange={saveSettings}
              onTestNotification={testNotification}
              onExportWeeklyReport={exportWeeklyReport}
            />
            <WebhookSettings
              settings={state.settings}
              onChange={saveSettings}
              onTest={testEmail}
              showTest={Boolean(state.metadata.debugMode)}
            />
          </div>
          <aside className="space-y-6">
            {announcement ? (
              <AnnouncementBanner
                announcement={announcement}
                locale={locale}
                onAction={openAnnouncementAction}
                onDismiss={dismissAnnouncement}
              />
            ) : null}
            <InstallationCheck settings={state.settings} totalProblems={totalProblems} locale={locale} />
            <button
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-black text-white transition-all hover:bg-black active:scale-95 dark:bg-white dark:text-neutral-900"
              onClick={openProblemLibrary}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h18v18H3z" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              {locale === 'zh-CN' ? '打开完整题库' : 'Open library'}
            </button>
            <ImportExportPanel
              state={state}
              locale={locale}
              onImport={(input) => void runImport(input)}
              onChanged={setLoadedState}
            />

             <div className="rounded-2xl bg-amber-500/10 p-6 text-amber-600 dark:bg-amber-500/5 dark:text-amber-500 border border-amber-500/10">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {t(locale, 'proTip')}
              </h3>
              <p className="mt-2 text-xs leading-relaxed opacity-80">
                {t(locale, 'proTipDesc')}
              </p>
            </div>

            {state.metadata.debugMode && (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6 text-violet-700 dark:text-violet-300">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold">Debug Tools</h3>
                    <p className="mt-1 text-xs opacity-80">One-click QA presets to visually verify all key states. Tap the logo 7 times again to hide this panel.</p>
                  </div>
                  <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white">
                    Debug On
                  </span>
                </div>
                <button
                  type="button"
                  className="mt-4 w-full rounded-xl border border-violet-500/20 bg-white px-4 py-3 text-sm font-bold text-violet-700 transition-all hover:border-violet-500 hover:bg-violet-50 dark:bg-[#262626] dark:text-violet-300 dark:hover:bg-violet-500/10"
                  onClick={() => void loadDemoData()}
                >
                  Load QA coverage pack
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {DEBUG_SCENARIO_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                        state.metadata.debugActivePreset === preset
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-violet-700 hover:bg-violet-50 dark:bg-[#262626] dark:text-violet-300'
                      }`}
                      onClick={() => void applyScenario(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
                  {DEBUG_SCENARIO_PRESETS.map((preset) => {
                    const covered = state.metadata.debugCoveredPresets?.includes(preset);
                    return (
                      <span
                        key={`covered-${preset}`}
                        className={`rounded-full px-2 py-1 ${covered ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}
                      >
                        {covered ? 'Checked' : 'Pending'}: {preset}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <a
                href="https://github.com/oldtommmy/crush_leetcode"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-black active:scale-95 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.44-1.304.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                {t(locale, 'giveMeAStar')}
              </a>
              <button
                onClick={() => setShowDonate(true)}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition-all hover:bg-rose-100 active:scale-95 dark:bg-rose-500/10 dark:text-rose-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  <line x1="6" y1="1" x2="6" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="4" />
                  <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
                {t(locale, 'buyMeATea')}
              </button>
            </div>
          </aside>
        </div>

      </div>

      {/* Donation Modal */}
      {showDonate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-[#262626] animate-in zoom-in-95 duration-200">
            <div className="bg-rose-500 p-8 text-center text-white">
              <h3 className="text-xl font-bold">{t(locale, 'buyMeATea')}</h3>
              <p className="mt-2 text-sm opacity-90 text-rose-50">感谢你的支持！❤️</p>
            </div>
            <div className="p-8 text-center">
              <div className="mx-auto aspect-square w-48 overflow-hidden rounded-2xl bg-neutral-100 shadow-inner">
                <img
                  src="/icons/wechat-pay.png"
                  alt="WeChat Pay"
                  className="h-full w-full object-contain p-2"
                  onError={(e) => {
                    e.currentTarget.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Please%20replace%20with%20your%20QR%20code';
                  }}
                />
              </div>
              <button
                onClick={() => setShowDonate(false)}
                className="mt-8 w-full rounded-xl bg-neutral-900 py-3 text-sm font-bold text-white transition-all hover:bg-black active:scale-95 dark:bg-white dark:text-neutral-900"
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
