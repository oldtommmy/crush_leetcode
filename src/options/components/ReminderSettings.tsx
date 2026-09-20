import type { Locale, UserSettings } from '../../shared/types';
import { t } from '../../shared/i18n/messages';
import { Select } from '../../shared/ui/Select';

interface ReminderSettingsProps {
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
  onTestNotification: () => void;
  onExportWeeklyReport: () => void;
}

export function ReminderSettings({ settings, onChange, onTestNotification, onExportWeeklyReport }: ReminderSettingsProps) {
  const locale: Locale = settings.locale;

  return (
    <section className="rounded-m border border-border-soft bg-surface p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand-soft text-brand-strong">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2l-.2.1a2 2 0 0 1-2.43.38l-.2-.1a2 2 0 0 0-2.5 1l-.2.35a2 2 0 0 0 1 2.5l.1.2a2 2 0 0 1-.38 2.43l-.1.2a2 2 0 0 0 0 2.5l.2.35a2 2 0 0 0 2.5 1l.2-.1a2 2 0 0 1 2.43.38l.2.1a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2l.2-.1a2 2 0 0 1 2.43-.38l.2.1a2 2 0 0 0 2.5-1l.2-.35a2 2 0 0 0-1-2.5l-.1-.2a2 2 0 0 1 .38-2.43l.1-.2a2 2 0 0 0 0-2.5l-.2-.35a2 2 0 0 0-2.5-1l-.2.1a2 2 0 0 1-2.43-.38l-.2-.1a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-text">{t(locale, 'settings')}</h2>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-text">{t(locale, 'language')}</span>
            <p className="text-xs text-text-2">{t(locale, 'languageDesc')}</p>
          </div>
          <Select
            className="w-44"
            ariaLabel={t(locale, 'language')}
            value={settings.locale}
            onChange={(next) => onChange({ ...settings, locale: next as Locale })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'zh-CN', label: '中文 (简体)' }
            ]}
          />
        </div>

        <div className="h-px bg-border-soft" />

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-text">{t(locale, 'autoPopup')}</span>
            <p className="text-xs text-text-2">{t(locale, 'autoPopupDesc')}</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={settings.autoShowAcceptedModal}
              onChange={(event) => onChange({ ...settings, autoShowAcceptedModal: event.target.checked })}
            />
            <div className="peer h-6 w-11 rounded-full bg-surface-2 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow-sm after:transition-all after:duration-200 after:ease-spring after:content-[''] peer-checked:bg-success peer-checked:after:translate-x-full peer-focus:outline-none"></div>
          </label>
        </div>

        <div className="h-px bg-border-soft" />

        <div className="space-y-4 rounded-sm border border-border-soft bg-surface-2 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-text">
                {t(locale, 'notifications')}
              </span>
              <p className="text-xs text-text-2">{t(locale, 'notificationsDesc')}</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={settings.reminders.enabled}
                onChange={(event) =>
                  onChange({
                    ...settings,
                    reminders: {
                      ...settings.reminders,
                      enabled: event.target.checked
                    }
                  })
                }
              />
              <div className="peer h-6 w-11 rounded-full bg-surface after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow-sm after:transition-all after:duration-200 after:ease-spring after:content-[''] peer-checked:bg-success peer-checked:after:translate-x-full peer-focus:outline-none"></div>
            </label>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-semibold text-text">{t(locale, 'reminderTime')}</span>
              <p className="text-xs text-text-2">{t(locale, 'reminderTimeDesc')}</p>
            </div>
            <input
              className="rounded-sm border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-all focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
              type="time"
              value={settings.reminders.dailyReminderTime}
              disabled={!settings.reminders.enabled}
              onChange={(event) =>
                onChange({
                  ...settings,
                  reminders: {
                    ...settings.reminders,
                    dailyReminderTime: event.target.value
                  }
                })
              }
            />
          </div>

          <button
            type="button"
            className="w-full rounded-sm border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-text-2 transition-all hover:bg-surface-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onTestNotification}
            disabled={!settings.reminders.enabled}
          >
            {t(locale, 'testNotification')}
          </button>

          <div className="h-px bg-border" />

          <div className="space-y-3 rounded-sm border border-border-soft bg-surface p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-sm font-semibold text-text">
                  {t(locale, 'localWeeklyReport')}
                </span>
                <p className="text-xs leading-5 text-text-2">{t(locale, 'localWeeklyReportDesc')}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-sm bg-brand px-3 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                onClick={onExportWeeklyReport}
              >
                {t(locale, 'exportWeeklyReport')}
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-text">
                  {t(locale, 'autoWeeklyReportExport')}
                </span>
                <p className="text-[11px] leading-5 text-text-2">{t(locale, 'autoWeeklyReportExportDesc')}</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={settings.reminders.weeklyReportExportEnabled}
                  disabled={!settings.reminders.enabled}
                  onChange={(event) =>
                    onChange({
                      ...settings,
                      reminders: {
                        ...settings.reminders,
                        weeklyReportExportEnabled: event.target.checked
                      }
                    })
                  }
                />
                <div className="peer h-6 w-11 rounded-full bg-surface-2 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow-sm after:transition-all after:duration-200 after:ease-spring after:content-[''] peer-checked:bg-success peer-checked:after:translate-x-full peer-disabled:cursor-not-allowed peer-disabled:opacity-50"></div>
              </label>
            </div>
          </div>

          <div className="rounded-sm border border-border-soft bg-good-soft p-3 text-xs leading-5 text-good-ink">
            <div className="mb-1 font-semibold">
              {locale === 'zh-CN' ? '收不到通知时请检查系统权限' : 'If notifications do not appear'}
            </div>
            <p>
              {locale === 'zh-CN'
                ? 'macOS：系统设置 > 通知 > Google Chrome，允许通知并开启横幅；Windows：设置 > 系统 > 通知 > Google Chrome，允许通知。也请确认没有开启专注模式/勿扰模式。'
                : 'macOS: System Settings > Notifications > Google Chrome, allow notifications and banners. Windows: Settings > System > Notifications > Google Chrome, allow notifications. Also check Focus / Do Not Disturb mode.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
