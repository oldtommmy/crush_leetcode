import { describe, expect, it, vi } from 'vitest';
import { createProblemIdentityDetector } from '../src/content/leetcodeDetector';
import {
  extractDifficultyFromScripts,
  extractQuestionFrontendIdFromScripts,
  extractTagsFromScripts,
  extractTranslatedTitleFromScripts
} from '../src/shared/leetcode/problemIdentity';
import type { ProblemIdentity } from '../src/shared/types';
import { displayProblemTags, displayProblemTitle } from '../src/shared/leetcode/display';

function identity(titleSlug: string, difficulty: ProblemIdentity['difficulty']): ProblemIdentity {
  return {
    difficulty,
    platform: 'leetcode',
    tags: [],
    title: titleSlug,
    titleSlug,
    url: `https://leetcode.com/problems/${titleSlug}/`
  };
}

describe('problem identity cache', () => {
  it('retries a provisional identity and caches the completed result', () => {
    let currentTime = 0;
    const provisional = identity('two-sum', 'Unknown');
    const complete = identity('two-sum', 'Easy');
    const resolve = vi
      .fn()
      .mockReturnValueOnce({ complete: false, identity: provisional })
      .mockReturnValue({ complete: true, identity: complete });
    const detector = createProblemIdentityDetector({
      currentPathname: () => '/problems/two-sum/',
      isProblemPage: () => true,
      now: () => currentTime,
      provisionalRetryIntervalMs: 100,
      resolve
    });

    expect(detector.detect()).toBe(provisional);
    currentTime = 99;
    expect(detector.detect()).toBe(provisional);
    expect(resolve).toHaveBeenCalledTimes(1);
    currentTime = 100;
    expect(detector.detect()).toBe(complete);
    currentTime = 10_000;
    expect(detector.detect()).toBe(complete);
    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('invalidates the complete cache when navigation changes pathname', () => {
    let pathname = '/problems/two-sum/';
    const resolve = vi.fn(() => ({
      complete: true,
      identity: identity(pathname.includes('two-sum') ? 'two-sum' : 'three-sum', 'Easy')
    }));
    const detector = createProblemIdentityDetector({
      currentPathname: () => pathname,
      isProblemPage: () => true,
      resolve
    });

    expect(detector.detect()?.titleSlug).toBe('two-sum');
    pathname = '/problems/three-sum/';
    expect(detector.detect()?.titleSlug).toBe('three-sum');
    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('expires provisional metadata after its bounded cache lifetime', () => {
    let currentTime = 0;
    const resolve = vi.fn(() => ({ complete: false, identity: identity('two-sum', 'Unknown') }));
    const detector = createProblemIdentityDetector({
      currentPathname: () => '/problems/two-sum/',
      isProblemPage: () => true,
      maxProvisionalAttempts: 1,
      now: () => currentTime,
      provisionalCacheTtlMs: 100,
      resolve
    });

    detector.detect();
    currentTime = 99;
    detector.detect();
    expect(resolve).toHaveBeenCalledTimes(1);
    currentTime = 100;
    detector.detect();
    expect(resolve).toHaveBeenCalledTimes(2);
  });
});

describe('problemIdentity', () => {
  it('extracts translated Chinese titles from embedded script payloads', () => {
    const title = extractTranslatedTitleFromScripts([
      '{"data":{"question":{"translatedTitle":"\\u4e24\\u6570\\u4e4b\\u548c","title":"Two Sum"}}}'
    ]);

    expect(title).toBe('两数之和');
  });

  it('ignores non-Chinese translated titles', () => {
    const title = extractTranslatedTitleFromScripts([
      '{"data":{"question":{"translatedTitle":"Two Sum","title":"Two Sum"}}}'
    ]);

    expect(title).toBeUndefined();
  });

  it('extracts frontend question id, difficulty, and tags from embedded question payloads', () => {
    const script = '{"data":{"question":{"questionFrontendId":"11","difficulty":"MEDIUM","topicTags":[{"name":"Array","translatedName":"数组"},{"name":"Two Pointers","translatedName":"双指针"}]}}}';

    expect(extractQuestionFrontendIdFromScripts([script])).toBe('11');
    expect(extractDifficultyFromScripts([script])).toBe('Medium');
    expect(extractTagsFromScripts([script])).toEqual(['Array', 'Two Pointers']);
  });

  it('ignores stale script question data when the title slug does not match', () => {
    const script = '{"data":{"question":{"titleSlug":"two-sum","questionFrontendId":"1","difficulty":"EASY","topicTags":[{"name":"Array","translatedName":"数组"}]}}}';

    expect(extractQuestionFrontendIdFromScripts([script], 'longest-consecutive-sequence')).toBeUndefined();
    expect(extractDifficultyFromScripts([script], 'longest-consecutive-sequence')).toBe('Unknown');
    expect(extractTagsFromScripts([script], 'longest-consecutive-sequence')).toEqual([]);
  });

  it('falls back to English title from slug for legacy Chinese stored titles in English locale', () => {
    const title = displayProblemTitle(
      {
        title: '1. 两数之和',
        titleZh: '1. 两数之和',
        titleSlug: 'two-sum'
      },
      'en'
    );

    expect(title).toBe('1. Two Sum');
  });

  it('localizes tags for English and Chinese UI modes', () => {
    expect(displayProblemTags(['数组', 'Hash Table', 'Two Pointers'], 'en')).toEqual([
      'Array',
      'Hash Table',
      'Two Pointers'
    ]);
    expect(displayProblemTags(['Array', 'Hash Table', 'Two Pointers'], 'zh-CN')).toEqual([
      '数组',
      '哈希表',
      '双指针'
    ]);
  });
});
