import { describe, expect, it } from 'vitest';
import {
  extractCheckSubmissionId,
  extractSubmittedId,
  inspectSubmissionResponse,
  isSubmitUrl,
  isSubmissionCheckUrl,
  shouldInspectUrl
} from '../src/content/submissionDetection';

describe('submission detection', () => {
  it('detects official submit and check URLs only', () => {
    expect(isSubmitUrl('https://leetcode.com/problems/two-sum/submit/')).toBe(true);
    expect(isSubmitUrl('https://leetcode.com/problems/two-sum/interpret_solution/')).toBe(false);
    expect(isSubmissionCheckUrl('https://leetcode.com/submissions/detail/123456/check/')).toBe(true);
    expect(shouldInspectUrl('https://leetcode.com/graphql/')).toBe(false);
  });

  it('extracts submitted ids from submit responses and check URLs', () => {
    expect(extractSubmittedId({ submission_id: 123456 })).toBe('123456');
    expect(extractSubmittedId({ data: { submit: { submissionId: 'abc' } } })).toBe('abc');
    expect(extractSubmittedId({ interpret_id: 'run-code-id' })).toBeUndefined();
    expect(extractCheckSubmissionId('https://leetcode.com/submissions/detail/123456/check/')).toBe('123456');
  });

  it('ignores accepted run-code checks that were not created by a submit response', () => {
    const submittedIds = new Set<string>();
    const shouldNotify = inspectSubmissionResponse(
      'https://leetcode.com/submissions/detail/run-code-id/check/',
      { status_msg: 'Accepted', state: 'SUCCESS' },
      submittedIds
    );

    expect(shouldNotify).toBe(false);
  });

  it('notifies accepted checks for known submitted ids', () => {
    const submittedIds = new Set<string>();
    inspectSubmissionResponse(
      'https://leetcode.com/problems/two-sum/submit/',
      { submission_id: 123456 },
      submittedIds
    );

    const shouldNotify = inspectSubmissionResponse(
      'https://leetcode.com/submissions/detail/123456/check/',
      { status_msg: 'Accepted', state: 'SUCCESS' },
      submittedIds
    );

    expect(shouldNotify).toBe(true);
  });

  it('detects accepted status inside nested GraphQL-style wrappers', () => {
    const submittedIds = new Set<string>();
    inspectSubmissionResponse(
      'https://leetcode.com/problems/two-sum/submit/',
      { data: { submitCode: { submissionId: 'abc' } } },
      submittedIds
    );

    const shouldNotify = inspectSubmissionResponse(
      'https://leetcode.com/submissions/detail/abc/check/',
      { data: { submission: { statusDisplay: 'Accepted' } } },
      submittedIds
    );

    expect(shouldNotify).toBe(true);
  });
});
