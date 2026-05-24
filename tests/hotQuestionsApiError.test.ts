import { describe, expect, it } from 'vitest';
import { formatCodeTopFetchError } from '../src/background/hotQuestions';

describe('hot question API errors', () => {
  it('normalizes Cloudflare Tunnel 530 responses', () => {
    expect(formatCodeTopFetchError(530, '530 The origin has been unregistered from Argo Tunnel')).toBe(
      'CodeTop API temporarily unavailable: Cloudflare Tunnel origin is not registered. Showing cached data if available.'
    );
  });

  it('truncates generic upstream response bodies', () => {
    expect(formatCodeTopFetchError(502, 'bad gateway'.repeat(40))).toMatch(/^CodeTop API failed: 502 bad gateway/);
    expect(formatCodeTopFetchError(502, 'bad gateway'.repeat(40)).length).toBeLessThan(230);
  });
});
