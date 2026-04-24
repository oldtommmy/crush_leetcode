import type { Locale, UserSettings } from '../../shared/types';
import { t } from '../../shared/i18n/messages';

interface InstallationCheckProps {
  settings: UserSettings;
  totalProblems: number;
  locale: Locale;
}

export function InstallationCheck({ settings, totalProblems, locale }: InstallationCheckProps) {
  const checks = [
    {
      label: t(locale, 'autoPopupStatus'),
      status: settings.autoShowAcceptedModal ? 'enabled' : 'disabled',
      ok: settings.autoShowAcceptedModal,
    },
    {
      label: t(locale, 'desktopNotifications'),
      status: settings.reminders.enabled ? 'enabled' : 'disabled',
      ok: settings.reminders.enabled,
    },
    {
      label: t(locale, 'emailReminders'),
      status: settings.emailWebhook.enabled ? 'configured' : 'notConfigured',
      ok: settings.emailWebhook.enabled,
    },
    {
      label: t(locale, 'dataBackup'),
      status: totalProblems > 0 ? 'configured' : 'notConfigured',
      ok: totalProblems > 0,
    },
  ];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200 dark:bg-[#262626] dark:ring-neutral-800">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        {t(locale, 'installationCheck')}
      </h3>
      <div className="space-y-3">
        {checks.map((check) => (
          <div key={check.label} className="flex min-w-0 items-center justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-neutral-500" title={check.label}>
              {check.label}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                check.ok 
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                  : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
              }`}>
                {t(locale, check.status as any)}
              </span>
              {check.ok ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-neutral-300 dark:text-neutral-700"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
