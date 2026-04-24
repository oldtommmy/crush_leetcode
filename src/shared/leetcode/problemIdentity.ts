import type { Platform, ProblemDifficulty, ProblemIdentity } from '../types';
import { canonicalizeTags, titleFromSlug } from './display';

function detectPlatform(location: Location): Platform | undefined {
  if (location.hostname.includes('leetcode.cn')) {
    return 'leetcode-cn';
  }
  if (location.hostname.includes('leetcode.com')) {
    return 'leetcode';
  }
  return undefined;
}

function extractTitleSlug(pathname: string): string | undefined {
  const match = /\/problems\/([^/?#]+)/.exec(pathname);
  return match?.[1];
}

function text(selector: string): string | undefined {
  return document.querySelector(selector)?.textContent?.trim() || undefined;
}

function metaContent(selector: string): string | undefined {
  const element = document.querySelector(selector);
  return element?.getAttribute('content')?.trim() || undefined;
}

function stripQuestionNumber(value: string): string {
  return value.replace(/^\d+\.\s*/, '').trim();
}

function stripSiteSuffix(value: string): string {
  return value.replace(/\s*-\s*力扣（LeetCode）\s*$/u, '').replace(/\s*-\s*LeetCode\s*$/u, '').trim();
}

function includesChinese(value: string | undefined): boolean {
  return Boolean(value && /[\u3400-\u9fff]/.test(value));
}

function decodeJsonStringLiteral(value: string): string | undefined {
  try {
    return JSON.parse(value) as string;
  } catch {
    return undefined;
  }
}

export function extractTranslatedTitleFromScripts(scriptContents: Iterable<string>): string | undefined {
  const patterns = [
    /"(?:translatedTitle|translated_title|questionTitleZh|questionTitleCn|titleZh|titleCn)"\s*:\s*(".*?")/g,
    /'(?:translatedTitle|translated_title|questionTitleZh|questionTitleCn|titleZh|titleCn)'\s*:\s*(".*?")/g
  ];

  for (const content of scriptContents) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      const decoded = match?.[1] ? decodeJsonStringLiteral(match[1]) : undefined;
      if (decoded && includesChinese(decoded)) {
        return stripQuestionNumber(decoded);
      }
    }
  }

  return undefined;
}

export function extractQuestionFrontendIdFromScripts(scriptContents: Iterable<string>): string | undefined {
  for (const content of scriptContents) {
    const match = /"questionFrontendId"\s*:\s*"([^"]+)"/.exec(content);
    if (match?.[1]) {
      return match[1];
    }
  }
  return undefined;
}

function mapDifficulty(value: string | undefined): ProblemDifficulty {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return 'Unknown';
  }
  if (normalized === 'easy' || normalized === '简单') {
    return 'Easy';
  }
  if (normalized === 'medium' || normalized === '中等') {
    return 'Medium';
  }
  if (normalized === 'hard' || normalized === '困难') {
    return 'Hard';
  }
  return 'Unknown';
}

export function extractDifficultyFromScripts(scriptContents: Iterable<string>): ProblemDifficulty {
  for (const content of scriptContents) {
    const match = /"difficulty"\s*:\s*"(EASY|MEDIUM|HARD|Easy|Medium|Hard|简单|中等|困难)"/.exec(content);
    const difficulty = mapDifficulty(match?.[1]);
    if (difficulty !== 'Unknown') {
      return difficulty;
    }
  }
  return 'Unknown';
}

export function extractTagsFromScripts(scriptContents: Iterable<string>): string[] {
  const tags: string[] = [];

  for (const content of scriptContents) {
    const topicTagsMatch = /"topicTags"\s*:\s*\[(.*?)\]/s.exec(content);
    if (!topicTagsMatch?.[1]) {
      continue;
    }

    const objectMatches = topicTagsMatch[1].matchAll(/\{(.*?)\}/gs);
    for (const objectMatch of objectMatches) {
      const objectContent = objectMatch[1];
      const translatedMatch = /"translatedName"\s*:\s*(".*?")/.exec(objectContent);
      const fallbackMatch = /"name"\s*:\s*(".*?")/.exec(objectContent);
      const decoded = decodeJsonStringLiteral(fallbackMatch?.[1] ?? translatedMatch?.[1] ?? '');
      if (decoded?.trim()) {
        tags.push(decoded.trim());
      }
    }
  }

  return [...new Set(tags.filter(Boolean))];
}

function detectDifficulty(): ProblemDifficulty {
  const pageText = document.body.textContent ?? '';
  if (/\bEasy\b|简单/.test(pageText)) return 'Easy';
  if (/\bMedium\b|中等/.test(pageText)) return 'Medium';
  if (/\bHard\b|困难/.test(pageText)) return 'Hard';
  return 'Unknown';
}

function detectTags(): string[] {
  const tags: string[] = [];
  // LeetCode new UI
  document.querySelectorAll('a[href^="/tag/"]').forEach((el) => {
    const text = el.textContent?.trim();
    if (text) tags.push(text);
  });
  // Fallback or specific selectors
  if (tags.length === 0) {
    document.querySelectorAll('.tag__2P9D, .topic-tag__1S8Y').forEach((el) => {
      const text = el.textContent?.trim();
      if (text) tags.push(text);
    });
  }
  return [...new Set(tags)];
}

function detectChineseTitle(heading: string, platform: Platform): string | undefined {
  if (includesChinese(heading)) {
    return stripQuestionNumber(heading);
  }

  const selectorTitle =
    text('[data-cy="question-title"]') ||
    text('div[data-track-load="description_content"] [class*="text-title"]') ||
    stripSiteSuffix(metaContent('meta[property="og:title"]') || '');

  if (includesChinese(selectorTitle)) {
    return stripQuestionNumber(selectorTitle as string);
  }

  const translatedTitle = extractTranslatedTitleFromScripts(
    Array.from(document.scripts, (script) => script.textContent ?? '')
  );
  if (translatedTitle) {
    return translatedTitle;
  }

  if (platform === 'leetcode-cn') {
    return stripQuestionNumber(heading);
  }

  return undefined;
}

export function getProblemIdentity(locationRef = window.location): ProblemIdentity | undefined {
  const platform = detectPlatform(locationRef);
  const titleSlug = extractTitleSlug(locationRef.pathname);
  if (!platform || !titleSlug) {
    return undefined;
  }

  const scripts = Array.from(document.scripts, (script) => script.textContent ?? '');
  const heading =
    text('[data-cy="question-title"]') ||
    text('a[href^="/problems/"][class*="text-title"]') ||
    text('h1') ||
    titleFromSlug(titleSlug);
  const titleZh = detectChineseTitle(heading, platform);
  const frontendQuestionId = extractQuestionFrontendIdFromScripts(scripts);
  const normalizedTitle = stripQuestionNumber(heading);
  const displayTitle = platform === 'leetcode-cn' ? titleFromSlug(titleSlug, frontendQuestionId) : normalizedTitle;
  const difficultyFromScripts = extractDifficultyFromScripts(scripts);
  const scriptTags = extractTagsFromScripts(scripts);
  const detectedTags = detectTags();
  const tags = canonicalizeTags(scriptTags.length > 0 ? scriptTags : detectedTags);

  return {
    platform,
    titleSlug,
    title: displayTitle,
    titleZh: titleZh ? `${frontendQuestionId ? `${frontendQuestionId}. ` : ''}${stripQuestionNumber(stripSiteSuffix(titleZh))}` : undefined,
    difficulty: difficultyFromScripts !== 'Unknown' ? difficultyFromScripts : detectDifficulty(),
    tags,
    url: `${locationRef.origin}/problems/${titleSlug}/`
  };
}
