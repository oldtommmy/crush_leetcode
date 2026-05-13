import { describe, expect, it } from 'vitest';
import { compareVersions, localizeText, normalizeAnnouncement, shouldShowAnnouncement } from '../src/shared/announcements';

describe('announcements', () => {
  it('compares dotted versions numerically', () => {
    expect(compareVersions('0.0.2', '0.0.3')).toBeLessThan(0);
    expect(compareVersions('0.0.10', '0.0.3')).toBeGreaterThan(0);
    expect(compareVersions('1.2.0', '1.2')).toBe(0);
  });

  it('normalizes valid announcement payloads', () => {
    const announcement = normalizeAnnouncement({
      noticeId: 'release-0.0.3',
      latestVersion: '0.0.3',
      severity: 'warning',
      title: {
        en: 'New version',
        'zh-CN': '有新版本了'
      },
      actions: [
        {
          label: 'Download',
          url: 'https://crushlc.site/downloads/crush-leetcode-0.0.3.zip',
          download: true
        }
      ]
    });

    expect(announcement?.noticeId).toBe('release-0.0.3');
    expect(announcement?.actions[0].download).toBe(true);
    expect(localizeText(announcement?.title, 'zh-CN')).toBe('有新版本了');
  });

  it('hides dismissed or already installed announcements', () => {
    const announcement = normalizeAnnouncement({
      noticeId: 'release-0.0.3',
      latestVersion: '0.0.3',
      title: 'New version',
      actions: [{ label: 'GitHub', url: 'https://github.com/oldtommmy/crush_leetcode/releases' }]
    });

    expect(announcement).toBeDefined();
    expect(shouldShowAnnouncement(announcement!, '0.0.2')).toBe(true);
    expect(shouldShowAnnouncement(announcement!, '0.0.3')).toBe(false);
    expect(shouldShowAnnouncement(announcement!, '0.0.2', ['release-0.0.3'])).toBe(false);
  });
});
