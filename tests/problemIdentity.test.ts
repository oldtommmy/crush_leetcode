import { describe, expect, it } from 'vitest';
import {
  extractDifficultyFromScripts,
  extractQuestionFrontendIdFromScripts,
  extractTagsFromScripts,
  extractTranslatedTitleFromScripts
} from '../src/shared/leetcode/problemIdentity';
import { displayProblemTags, displayProblemTitle } from '../src/shared/leetcode/display';

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
