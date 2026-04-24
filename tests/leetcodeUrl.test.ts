import { describe, expect, it } from 'vitest';
import { problemUrlForLocale } from '../src/shared/leetcode/url';

describe('leetcode url helpers', () => {
  it('opens problems on the host that matches the current locale', () => {
    expect(problemUrlForLocale('two-sum', 'en')).toBe('https://leetcode.com/problems/two-sum/');
    expect(problemUrlForLocale('two-sum', 'zh-CN')).toBe('https://leetcode.cn/problems/two-sum/');
  });
});
