import type { Locale, UserSettings } from '../../shared/types';
import { t } from '../../shared/i18n/messages';

interface ReminderSettingsProps {
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
  onTestNotification: () => void;
}

export function ReminderSettings({ settings, onChange, onTestNotification }: ReminderSettingsProps) {
  const locale: Locale = settings.locale;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#262626]">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2l-.2.1a2 2 0 0 1-2.43.38l-.2-.1a2 2 0 0 0-2.5 1l-.2.35a2 2 0 0 0 1 2.5l.1.2a2 2 0 0 1-.38 2.43l-.1.2a2 2 0 0 0 0 2.5l.2.35a2 2 0 0 0 2.5 1l.2-.1a2 2 0 0 1 2.43.38l.2.1a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2l.2-.1a2 2 0 0 1 2.43-.38l.2.1a2 2 0 0 0 2.5-1l.2-.35a2 2 0 0 0-1-2.5l-.1-.2a2 2 0 0 1 .38-2.43l.1-.2a2 2 0 0 0 0-2.5l-.2-.35a2 2 0 0 0-2.5-1l-.2.1a2 2 0 0 1-2.43-.38l-.2-.1a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{t(locale, 'settings')}</h2>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{t(locale, 'language')}</span>
            <p className="text-xs text-neutral-500">{t(locale, 'languageDesc')}</p>
          </div>
          <select
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/10 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            value={settings.locale}
            onChange={(event) => onChange({ ...settings, locale: event.target.value as Locale })}
          >
            <option value="en">English</option>
            <option value="zh-CN">中文 (简体)</option>
          </select>
        </div>

        <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{t(locale, 'autoPopup')}</span>
            <p className="text-xs text-neutral-500">{t(locale, 'autoPopupDesc')}</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={settings.autoShowAcceptedModal}
              onChange={(event) => onChange({ ...settings, autoShowAcceptedModal: event.target.checked })}
            />
            <div className="peer h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-neutral-600 dark:bg-neutral-700"></div>
          </label>
        </div>

        <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

        <div className="space-y-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {t(locale, 'notifications')}
              </span>
              <p className="text-xs text-neutral-500">{t(locale, 'notificationsDesc')}</p>
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
              <div className="peer h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-neutral-600 dark:bg-neutral-700"></div>
            </label>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{t(locale, 'reminderTime')}</span>
              <p className="text-xs text-neutral-500">{t(locale, 'reminderTimeDesc')}</p>
            </div>
            <input
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
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
            className="w-full rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-xs font-bold text-amber-700 transition-all hover:border-amber-400 hover:bg-amber-50 active:scale-[0.99] dark:border-amber-500/20 dark:bg-neutral-900 dark:text-amber-400 dark:hover:bg-amber-500/10"
            onClick={onTestNotification}
            disabled={!settings.reminders.enabled}
          >
            {t(locale, 'testNotification')}
          </button>

          <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
            <div className="mb-1 font-bold">
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
