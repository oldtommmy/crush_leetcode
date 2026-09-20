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

  const normalizeBetaCode = (code: string) => code.replace(/\s+/g, '');

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
  const normalizedInputBetaCode = normalizeBetaCode(inputBetaCode);
  const betaCodeChanged = normalizedInputBetaCode !== (email.betaAccessCode ?? '');

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
      betaAccessCode: normalizedInputBetaCode || undefined,
      enabled: normalizedInputBetaCode ? email.enabled : false
    });
  };

  const showOfficialControls = showTest || hasBetaCode;

  return (
    <section className="rounded-m border border-border-soft bg-surface p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand-soft text-brand-strong">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-text">{t(locale, 'officialDigest')}</h2>
            <span
              className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                showOfficialControls
                  ? 'bg-easy-soft text-easy-ink'
                  : 'bg-hard-soft text-hard-ink'
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
            <div className="peer h-6 w-11 rounded-full bg-surface-2 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow-sm after:transition-all after:duration-200 after:ease-spring after:content-[''] peer-checked:bg-success peer-checked:after:translate-x-full peer-focus:outline-none"></div>
          </label>
        )}
      </div>

      {!showOfficialControls && (
        <div className="space-y-3">
          <p className="rounded-sm bg-hard-soft px-3 py-2 text-xs font-medium text-hard-ink">
            {locale === 'zh-CN'
              ? '官方周报服务需要访问码，可邮件联系开通。'
              : 'Official digest requires an access code. Email us to enable it.'}
          </p>
          <div>
            <label className="mb-2 block text-xs font-semibold text-text">
              {t(locale, 'officialDigestBetaCode')}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                className="min-w-0 flex-1 rounded-sm border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-text transition-all focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand"
                value={inputBetaCode}
                onChange={(event) => setInputBetaCode(event.target.value)}
                placeholder={locale === 'zh-CN' ? '输入确认邮件里的访问码' : 'Enter access code'}
              />
              <button
                type="button"
                className="rounded-sm bg-brand px-4 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleSaveBetaCode}
                disabled={!normalizedInputBetaCode}
              >
                {t(locale, 'saveBetaAccessCode')}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-text-3">
              {locale === 'zh-CN' ? '导出备份时会自动剔除此访问码。' : 'This code is stripped from exported backups automatically.'}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href="https://github.com/oldtommmy/crush_leetcode"
              target="_blank"
              rel="noreferrer"
              className="rounded-sm bg-brand px-4 py-3 text-center text-xs font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {t(locale, 'giveMeAStar')}
            </a>
            <a
              href="mailto:tommychan@foxmail.com?subject=Crush%20LeetCode%20official%20digest%20beta"
              className="rounded-sm border border-border bg-surface px-4 py-3 text-center text-xs font-semibold text-text-2 transition-all hover:bg-surface-2 active:scale-[0.98]"
            >
              tommychan@foxmail.com
            </a>
          </div>
        </div>
      )}

      {showOfficialControls && (
      <div className={`space-y-6 transition-opacity ${email.enabled ? 'opacity-100' : 'opacity-60'}`}>
        <p className="rounded-sm bg-surface-2 px-3 py-2 text-xs font-medium text-text-2">
          {locale === 'zh-CN' ? '开启后可接收官方周报邮件。' : 'Enable to receive official weekly digest emails.'}
        </p>

        <div>
          <label className="mb-2 block text-sm font-semibold text-text">{t(locale, 'officialDigestBetaCode')}</label>
          <div className="flex gap-2">
            <input
              type="password"
              className="min-w-0 flex-1 rounded-sm border border-border bg-surface-2 px-4 py-2.5 text-sm text-text transition-all focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand"
              value={inputBetaCode}
              onChange={(event) => setInputBetaCode(event.target.value)}
              placeholder={locale === 'zh-CN' ? '输入确认邮件里的访问码' : 'Enter access code'}
            />
            {betaCodeChanged && (
              <button
                type="button"
                className="rounded-sm bg-brand px-4 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-95"
                onClick={handleSaveBetaCode}
              >
                {locale === 'zh-CN' ? '保存' : 'Save'}
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-text-3">
            {locale === 'zh-CN' ? '导出备份时会自动剔除此访问码。' : 'This code is stripped from exported backups automatically.'}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-text">{t(locale, 'recipientEmail')}</label>
          <input
            className={`w-full rounded-sm border bg-surface-2 px-4 py-2.5 text-sm text-text transition-all focus:outline-none focus:ring-4 ${
              !isValidEmail
                ? 'border-danger focus:border-danger focus:ring-stuck-soft'
                : 'border-border focus:border-brand focus:ring-brand'
            }`}
            value={inputEmail}
            onChange={(event) => {
              setInputEmail(event.target.value);
              if (showConfirm) setShowConfirm(false);
            }}
            placeholder="you@example.com"
          />
          {!isValidEmail && inputEmail && (
            <p className="mt-1.5 text-xs font-medium text-danger">{locale === 'zh-CN' ? '邮箱格式不正确' : 'Invalid email format'}</p>
          )}
          {hasChanged && isValidEmail && !showConfirm && (
            <button
              className="mt-2 rounded-sm bg-brand px-4 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-95"
              onClick={() => setShowConfirm(true)}
            >
              {locale === 'zh-CN' ? '确认保存' : 'Confirm & Save'}
            </button>
          )}
          {showConfirm && (
            <div className="mt-3 rounded-sm border border-border-soft bg-brand-soft p-4">
              <p className="text-xs text-text-2">
                {locale === 'zh-CN' ? `确认将邮箱设置为：${inputEmail}？` : `Confirm saving email: ${inputEmail}?`}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-sm bg-brand px-4 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-95"
                  onClick={handleSave}
                >
                  {locale === 'zh-CN' ? '确认' : 'Confirm'}
                </button>
                <button
                  className="rounded-sm border border-border px-4 py-2 text-xs font-semibold text-text-2 transition-all hover:bg-surface-2"
                  onClick={() => setShowConfirm(false)}
                >
                  {locale === 'zh-CN' ? '取消' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>

        {email.lastError && (
          <div className="rounded-sm bg-stuck-soft p-4 text-xs font-medium text-stuck-ink">
            {email.lastError}
          </div>
        )}

        {showTest && (
          <button
            className="flex items-center justify-center gap-2 rounded-sm border border-border bg-surface px-6 py-3 text-sm font-semibold text-text-2 transition-all hover:border-brand hover:text-brand-strong active:scale-[0.98]"
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
