import { describe, expect, it } from 'vitest';
import {
  buildContentSettingsData,
  buildPopupDailyPlanData,
  buildProblemNoteData,
  buildProblemReviewContextData,
  isValidProblemId,
  normalizeSafeLeetCodeUrl,
  readContentSettingsData,
  reminderScheduleChanged
} from '../src/background/runtimeData';
import { createProblem, createReviewLog, createState } from './helpers/stateFactory';

function populatedState() {
  const state = createState();
  state.settings.emailWebhook.toEmail = 'private@example.test';
  state.settings.emailWebhook.betaAccessCode = 'private-code';
  state.settings.cloudSync.syncKey = 'private-legacy-sync-key';
  state.settings.cloudSync.recoveryCode = 'private-recovery-code';
  state.problemsById['leetcode:two-sum'] = createProblem({
    id: 'leetcode:two-sum',
    titleSlug: 'two-sum',
    title: 'Two Sum',
    url: 'https://leetcode.com/problems/two-sum/',
    nextReviewAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z'
  });
  state.reviewLogsById.log1 = createReviewLog({
    id: 'log1',
    problemId: 'leetcode:two-sum',
    reviewedAt: '2026-09-20T01:00:00.000Z'
  });
  state.notesByProblemId['leetcode:two-sum'] = {
    problemId: 'leetcode:two-sum',
    markdown: 'note',
    createdAt: '2026-09-20T02:00:00.000Z',
    updatedAt: '2026-09-20T02:00:00.000Z'
  };
  return state;
}

describe('runtime data projections', () => {
  it('returns popup data without settings, logs, or cloud credentials', () => {
    const data = buildPopupDailyPlanData(populatedState(), new Date('2026-09-21T12:00:00.000Z'));
    expect(data.locale).toBe('en');
    expect(data.notesByProblemId['leetcode:two-sum']?.markdown).toBe('note');
    expect('settings' in data).toBe(false);
    expect('reviewLogsById' in data).toBe(false);
    expect(JSON.stringify(data)).not.toContain('private@example.test');
    expect(JSON.stringify(data)).not.toContain('private-code');
    expect(JSON.stringify(data)).not.toContain('private-legacy-sync-key');
    expect(JSON.stringify(data)).not.toContain('private-recovery-code');
  });

  it('returns only content settings needed by a problem tab', () => {
    expect(buildContentSettingsData(populatedState())).toEqual({
      locale: 'en',
      autoShowAcceptedModal: true,
      petSize: 'medium'
    });
  });

  it('returns one problem review context and one note', () => {
    const state = populatedState();
    const context = buildProblemReviewContextData(state, 'leetcode:two-sum');
    expect(context.problem?.titleSlug).toBe('two-sum');
    expect(context.lastLog?.id).toBe('log1');
    expect(buildProblemNoteData(state, 'leetcode:two-sum')?.markdown).toBe('note');
    expect(JSON.stringify(context)).not.toContain('private@example.test');
  });

  it('reads live content settings without exposing the rest of storage', () => {
    const state = populatedState();
    state.settings.locale = 'zh-CN';
    state.settings.autoShowAcceptedModal = false;
    state.settings.petSize = 'large';
    expect(readContentSettingsData(state)).toEqual({
      locale: 'zh-CN',
      autoShowAcceptedModal: false,
      petSize: 'large'
    });
    expect(readContentSettingsData({ settings: { locale: 'invalid' } })).toBeUndefined();
  });

  it('reschedules reminders only when alarm-relevant settings change', () => {
    const before = populatedState();
    const unrelated = structuredClone(before);
    unrelated.settings.locale = 'zh-CN';
    expect(reminderScheduleChanged(before, unrelated)).toBe(false);

    const changed = structuredClone(before);
    changed.settings.reminders.dailyReminderTime = '17:30';
    expect(reminderScheduleChanged(before, changed)).toBe(true);
  });
});

describe('runtime request payload validation', () => {
  it('accepts canonical problem ids and rejects malformed values', () => {
    expect(isValidProblemId('leetcode:two-sum')).toBe(true);
    expect(isValidProblemId('leetcode-cn:1-bit-and-2-bit-characters')).toBe(true);
    expect(isValidProblemId('two-sum')).toBe(false);
    expect(isValidProblemId('leetcode:../two-sum')).toBe(false);
    expect(isValidProblemId(undefined)).toBe(false);
  });

  it('allows only safe LeetCode https URLs for open requests', () => {
    expect(normalizeSafeLeetCodeUrl('https://leetcode.com/problems/two-sum/')).toBe(
      'https://leetcode.com/problems/two-sum/'
    );
    expect(normalizeSafeLeetCodeUrl('javascript:alert(1)')).toBeUndefined();
    expect(normalizeSafeLeetCodeUrl('http://leetcode.com/problems/two-sum/')).toBeUndefined();
    expect(normalizeSafeLeetCodeUrl('https://leetcode.com.evil.test/problems/two-sum/')).toBeUndefined();
    expect(normalizeSafeLeetCodeUrl('https://user:pass@leetcode.com/problems/two-sum/')).toBeUndefined();
  });
});
