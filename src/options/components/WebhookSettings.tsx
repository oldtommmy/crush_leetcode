import { useState, useEffect } from 'react';
import type { Locale, UserSettings } from '../../shared/types';
import { t } from '../../shared/i18n/messages';

interface WebhookSettingsProps {
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
  onTest: () => void;
  showTest: boolean;
}

export function WebhookSettings({ settings, onChange, onTest, showTest }: WebhookSettingsProps) {
  const locale: Locale = settings.locale;
  const email = settings.emailWebhook;
  const [showConfirm, setShowConfirm] = useState(false);
  const [inputEmail, setInputEmail] = useState(email.toEmail ?? '');

  useEffect(() => {
    setInputEmail(email.toEmail ?? '');
  }, [email.toEmail]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = !inputEmail || emailRegex.test(inputEmail);
  const hasChanged = inputEmail !== (email.toEmail ?? '');

  const updateEmail = (patch: Partial<typeof email>) => {
    onChange({
      ...settings,
      emailWebhook: {
        ...email,
        ...patch
      }
    });
  };

  const handleSave = () => {
    updateEmail({ toEmail: inputEmail });
    setShowConfirm(false);
  };

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-[#262626]">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{t(locale, 'officialDigest')}</h2>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={email.enabled}
            onChange={(event) => updateEmail({ enabled: event.target.checked })}
          />
          <div className="peer h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-neutral-600 dark:bg-neutral-700"></div>
        </label>
      </div>

      <div className={`space-y-6 transition-opacity ${email.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <div className="rounded-xl bg-neutral-50 p-4 text-xs text-neutral-600 dark:bg-neutral-900/50 dark:text-neutral-300">
          {t(locale, 'weeklyDigestDesc')}
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-neutral-900 dark:text-neutral-100">{t(locale, 'recipientEmail')}</label>
          <input
            className={`w-full rounded-xl border px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 dark:bg-neutral-900 dark:text-neutral-100 ${
              !isValidEmail
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                : 'border-neutral-200 focus:border-amber-500 focus:ring-amber-500/10 dark:border-neutral-800'
            }`}
            value={inputEmail}
            onChange={(event) => {
              setInputEmail(event.target.value);
              if (showConfirm) setShowConfirm(false);
            }}
            placeholder="you@example.com"
          />
          {!isValidEmail && inputEmail && (
            <p className="mt-1.5 text-xs font-medium text-red-500">{locale === 'zh-CN' ? '邮箱格式不正确' : 'Invalid email format'}</p>
          )}
          {hasChanged && isValidEmail && !showConfirm && (
            <button
              className="mt-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-amber-600 active:scale-95"
              onClick={() => setShowConfirm(true)}
            >
              {locale === 'zh-CN' ? '确认保存' : 'Confirm & Save'}
            </button>
          )}
          {showConfirm && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <p className="text-xs text-neutral-700 dark:text-neutral-300">
                {locale === 'zh-CN' ? `确认将邮箱设置为：${inputEmail}？` : `Confirm saving email: ${inputEmail}?`}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-amber-600 active:scale-95"
                  onClick={handleSave}
                >
                  {locale === 'zh-CN' ? '确认' : 'Confirm'}
                </button>
                <button
                  className="rounded-lg border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-700 transition-all hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  onClick={() => setShowConfirm(false)}
                >
                  {locale === 'zh-CN' ? '取消' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>

        {email.lastError && (
          <div className="rounded-xl bg-red-500/10 p-4 text-xs font-medium text-red-600 dark:text-red-400">
            {email.lastError}
          </div>
        )}

        {showTest && (
          <button 
            className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-bold text-neutral-700 transition-all hover:border-amber-500 hover:text-amber-500 active:scale-[0.98] dark:border-neutral-800 dark:bg-[#262626] dark:text-neutral-300" 
            onClick={onTest}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            {t(locale, 'sendTestDigest')}
          </button>
        )}
      </div>
    </section>
  );
}
