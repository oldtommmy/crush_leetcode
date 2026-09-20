import { localizeText } from '../announcements';
import type { AnnouncementAction, ExtensionAnnouncement, Locale } from '../types';

interface AnnouncementBannerProps {
  announcement: ExtensionAnnouncement;
  locale: Locale;
  compact?: boolean;
  onAction: (action: AnnouncementAction) => void;
  onDismiss: (noticeId: string) => void;
}

const severityClassName: Record<ExtensionAnnouncement['severity'], string> = {
  info: 'border-border-soft bg-brand-soft text-brand-strong',
  success: 'border-border-soft bg-easy-soft text-easy-ink',
  warning: 'border-border-soft bg-hard-soft text-hard-ink',
  critical: 'border-border-soft bg-stuck-soft text-stuck-ink'
};

export function AnnouncementBanner({
  announcement,
  locale,
  compact = false,
  onAction,
  onDismiss
}: AnnouncementBannerProps) {
  const title = localizeText(announcement.title, locale);
  const body = localizeText(announcement.body, locale);
  const dismissLabel = locale === 'zh-CN' ? '不再提示' : 'Dismiss';

  return (
    <section className={`rounded-sm border p-3 shadow-sm ${severityClassName[announcement.severity]}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xs bg-surface text-current shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12" />
            <path d="m17 8-5-5-5 5" />
            <path d="M5 21h14" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className={`${compact ? 'text-xs' : 'text-sm'} font-semibold leading-snug`}>
              {title}
            </h2>
            <button
              type="button"
              className="rounded-xs p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
              onClick={() => onDismiss(announcement.noticeId)}
              title={dismissLabel}
              aria-label={dismissLabel}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          {body ? (
            <p className={`${compact ? 'text-[11px]' : 'text-xs'} mt-1 leading-relaxed opacity-80`}>
              {body}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {announcement.actions.map((action) => (
              <button
                key={`${announcement.noticeId}-${action.url}`}
                type="button"
                className="rounded-sm bg-brand px-3 py-1.5 text-[11px] font-semibold text-white transition hover:-translate-y-0.5 active:scale-[0.98]"
                onClick={() => onAction(action)}
              >
                {localizeText(action.label, locale)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
