import type { DailyCompletionMessage, DailyCompletionMessagesConfig, Locale, LocalizedText } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isLocalizedText(value: unknown): value is LocalizedText {
  if (typeof value === 'string') return value.trim().length > 0;
  if (!isRecord(value)) return false;

  return Object.values(value).some((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

function normalizeMessage(input: unknown): DailyCompletionMessage | undefined {
  if (!isRecord(input) || !isLocalizedText(input.title) || !isLocalizedText(input.body)) {
    return undefined;
  }

  return {
    title: input.title,
    body: input.body
  };
}

function isDailyCompletionMessage(value: DailyCompletionMessage | undefined): value is DailyCompletionMessage {
  return Boolean(value);
}

export function localizeDailyCompletionText(value: LocalizedText | undefined, locale: Locale): string {
  if (!value) return '';
  if (typeof value === 'string') return value;

  return value[locale] ?? value.en ?? value['zh-CN'] ?? '';
}

export function normalizeDailyCompletionMessages(input: unknown): DailyCompletionMessagesConfig | undefined {
  if (!isRecord(input) || input.enabled !== true) return undefined;

  const messages = Array.isArray(input.messages)
    ? input.messages.map(normalizeMessage).filter(isDailyCompletionMessage)
    : [];

  if (messages.length < 1) return undefined;

  return {
    schemaVersion: 1,
    enabled: true,
    messages
  };
}
