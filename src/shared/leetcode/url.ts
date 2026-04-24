import type { Locale } from '../types';

export function isProblemPage(url = window.location.href): boolean {
  return /^https:\/\/leetcode\.(com|cn)\/problems\/[^/]+\/?/.test(url);
}

export function problemUrlForLocale(titleSlug: string, locale: Locale): string {
  const host = locale === 'zh-CN' ? 'leetcode.cn' : 'leetcode.com';
  return `https://${host}/problems/${titleSlug}/`;
}
