import type { AnnouncementAction, AnnouncementSeverity, ExtensionAnnouncement, Locale, LocalizedText } from './types';

const DEFAULT_SEVERITY: AnnouncementSeverity = 'info';
const SUPPORTED_SEVERITIES = new Set(['info', 'success', 'warning', 'critical']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isLocalizedText(value: unknown): value is LocalizedText {
  if (typeof value === 'string') return value.trim().length > 0;
  if (!isRecord(value)) return false;

  return Object.values(value).some((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

function normalizeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeAction(value: unknown): AnnouncementAction | undefined {
  if (!isRecord(value) || !isLocalizedText(value.label)) return undefined;

  const url = normalizeUrl(value.url);
  if (!url) return undefined;

  return {
    label: value.label,
    url,
    download: value.download === true
  };
}

function isAnnouncementAction(value: AnnouncementAction | undefined): value is AnnouncementAction {
  return Boolean(value);
}

function isAnnouncementSeverity(value: string): value is AnnouncementSeverity {
  return SUPPORTED_SEVERITIES.has(value);
}

function normalizeVersion(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function compareVersions(left: string, right: string): number {
  const leftParts = left.split(/[.-]/).map((part) => Number.parseInt(part, 10));
  const rightParts = right.split(/[.-]/).map((part) => Number.parseInt(part, 10));
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
    const rightValue = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

export function localizeText(value: LocalizedText | undefined, locale: Locale): string {
  if (!value) return '';
  if (typeof value === 'string') return value;

  return value[locale] ?? value.en ?? value['zh-CN'] ?? '';
}

export function normalizeAnnouncement(input: unknown): ExtensionAnnouncement | undefined {
  if (!isRecord(input)) return undefined;

  const noticeId = typeof input.noticeId === 'string' ? input.noticeId.trim() : '';
  const latestVersion = normalizeVersion(input.latestVersion);
  const minVersion = normalizeVersion(input.minVersion);
  const actions = Array.isArray(input.actions) ? input.actions.map(normalizeAction).filter(isAnnouncementAction) : [];

  if (!noticeId || !latestVersion || !isLocalizedText(input.title) || actions.length === 0) {
    return undefined;
  }

  const severity = typeof input.severity === 'string' && isAnnouncementSeverity(input.severity)
    ? input.severity
    : DEFAULT_SEVERITY;

  return {
    schemaVersion: 1,
    noticeId,
    latestVersion,
    minVersion,
    severity,
    title: input.title,
    body: isLocalizedText(input.body) ? input.body : undefined,
    actions
  };
}

export function shouldShowAnnouncement(
  announcement: ExtensionAnnouncement,
  currentVersion: string,
  dismissedAnnouncementIds: string[] = []
): boolean {
  if (dismissedAnnouncementIds.includes(announcement.noticeId)) return false;
  if (compareVersions(currentVersion, announcement.latestVersion) >= 0) return false;

  return !announcement.minVersion || compareVersions(currentVersion, announcement.minVersion) >= 0;
}
