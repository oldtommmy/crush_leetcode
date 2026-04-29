import { useState, useEffect } from 'react';
import type { Locale, UserSettings } from '../../shared/types';
import { t } from '../../shared/i18n/messages';

interface WebhookSettingsProps {
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
  onTest: () => void;
  showTest: boolean;
}

export function WebhookSettings({
  settings,
  onChange,
  onTest,
  showTest
}: WebhookSettingsProps) {
  const locale: Locale = settings.locale;
  const email = settings.emailWebhook;
  const [showConfirm, setShowConfirm] = useState(false);
  const [inputEmail, setInputEmail] = useState(email.toEmail ?? '');
  const [inputBetaCode, setInputBetaCode] = useState(email.betaAccessCode ?? '');

  useEffect(() => {
    setInputEmail(email.toEmail ?? '');
  }, [email.toEmail]);

  useEffect(() => {
    setInputBetaCode(email.betaAccessCode ?? '');
  }, [email.betaAccessCode]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = !inputEmail || emailRegex.test(inputEmail);
  const hasChanged = inputEmail !== (email.toEmail ?? '');
  const hasBetaCode = Boolean(email.betaAccessCode?.trim());
  const betaCodeChanged = inputBetaCode.trim() !== (email.betaAccessCode ?? '');

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

  const handleSaveBetaCode = () => {
    updateEmail({
      betaAccessCode: inputBetaCode.trim() || undefined,
      enabled: inputBetaCode.trim() ? email.enabled : false
    });
  };

  const showOfficialControls = showTest || hasBetaCode;

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
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{t(locale, 'officialDigest')}</h2>
            <span
              className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                showOfficialControls
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
              }`}
            >
              {showOfficialControls ? t(locale, 'configured') : t(locale, 'officialDigestBetaBadge')}
            </span>
          </div>
        </div>
        {showOfficialControls && (
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={email.enabled}
              onChange={(event) => updateEmail({ enabled: event.target.checked })}
            />
            <div className="peer h-6 w-11 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-neutral-600 dark:bg-neutral-700"></div>
          </label>
        )}
      </div>

      {!showOfficialControls && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-900 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-100">
            <p className="font-bold">{t(locale, 'officialDigestBetaDesc')}</p>
            <p className="mt-2 text-xs opacity-90">{t(locale, 'officialDigestBetaApply')}</p>
            <p className="mt-2 text-xs opacity-80">{t(locale, 'officialDigestBetaUnlockHint')}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="mb-2 block text-xs font-black text-neutral-800 dark:text-neutral-100">
              {t(locale, 'officialDigestBetaCode')}
            </label>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium transition-all focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/10 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
                value={inputBetaCode}
                onChange={(event) => setInputBetaCode(event.target.value)}
                placeholder={locale === 'zh-CN' ? '输入确认邮件里的访问码' : 'Enter access code'}
              />
              <button
                type="button"
                className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white transition-all hover:bg-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleSaveBetaCode}
                disabled={!inputBetaCode.trim()}
              >
                {t(locale, 'saveBetaAccessCode')}
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href="https://github.com/oldtommmy/crush_leetcode"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-neutral-900 px-4 py-3 text-center text-xs font-black text-white transition-all hover:bg-black active:scale-[0.98] dark:bg-neutral-800 dark:hover:bg-neutral-700"
            >
              {t(locale, 'giveMeAStar')}
            </a>
            <a
              href="mailto:tommychan@foxmail.com?subject=Crush%20LeetCode%20official%20digest%20beta"
              className="rounded-xl border border-orange-200 bg-white px-4 py-3 text-center text-xs font-black text-orange-700 transition-all hover:border-orange-400 hover:bg-orange-50 active:scale-[0.98] dark:border-orange-500/20 dark:bg-neutral-900 dark:text-orange-300 dark:hover:bg-orange-500/10"
            >
              tommychan@foxmail.com
            </a>
          </div>
        </div>
      )}

      {showOfficialControls && (
      <div className={`space-y-6 transition-opacity ${email.enabled ? 'opacity-100' : 'opacity-60'}`}>
        <div className="rounded-xl bg-neutral-50 p-4 text-xs text-neutral-600 dark:bg-neutral-900/50 dark:text-neutral-300">
          {t(locale, 'weeklyDigestDesc')}
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-neutral-900 dark:text-neutral-100">{t(locale, 'officialDigestBetaCode')}</label>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/10 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              value={inputBetaCode}
              onChange={(event) => setInputBetaCode(event.target.value)}
              placeholder={locale === 'zh-CN' ? '输入确认邮件里的访问码' : 'Enter access code'}
            />
            {betaCodeChanged && (
              <button
                type="button"
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-amber-600 active:scale-95"
                onClick={handleSaveBetaCode}
              >
                {locale === 'zh-CN' ? '保存' : 'Save'}
              </button>
            )}
          </div>
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
      )}
    </section>
  );
}
