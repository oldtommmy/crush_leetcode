import { describe, expect, it } from 'vitest';
import {
  containsKnownSubmittedId,
  containsAccepted,
  extractCheckSubmissionId,
  extractProblemPathname,
  extractSubmittedId,
  findKnownSubmittedId,
  inspectSubmissionResponse,
  isGraphqlUrl,
  isRunCodeSubmissionId,
  isSubmitRequest,
  isSubmitUrl,
  isSubmissionCheckUrl,
  shouldInspectUrl
} from '../src/content/submissionDetection';

describe('submission detection', () => {
  it('detects official submit and check URLs only', () => {
    expect(isSubmitUrl('https://leetcode.com/problems/two-sum/submit/')).toBe(true);
    expect(isSubmitUrl('https://leetcode.com/problems/two-sum/interpret_solution/')).toBe(false);
    expect(isSubmissionCheckUrl('https://leetcode.com/submissions/detail/123456/check/')).toBe(true);
    expect(isSubmissionCheckUrl('https://leetcode.cn/submissions/detail/726831735/v2/check/')).toBe(true);
    expect(isGraphqlUrl('https://leetcode.com/graphql/')).toBe(true);
    expect(shouldInspectUrl('https://leetcode.com/graphql/')).toBe(true);
  });

  it('extracts submitted ids from submit responses and check URLs', () => {
    expect(extractSubmittedId({ submission_id: 123456 })).toBe('123456');
    expect(extractSubmittedId({ data: { submit: { submissionId: 'abc' } } })).toBe('abc');
    expect(extractSubmittedId({ interpret_id: 'run-code-id' })).toBeUndefined();
    expect(extractCheckSubmissionId('https://leetcode.com/submissions/detail/123456/check/')).toBe('123456');
    expect(extractCheckSubmissionId('https://leetcode.cn/submissions/detail/726831735/v2/check/')).toBe('726831735');
  });

  it('extracts the submitted problem pathname from absolute and relative submit URLs', () => {
    expect(extractProblemPathname('https://leetcode.com/problems/two-sum/submit/', 'https://leetcode.com/problems/next/')).toBe(
      '/problems/two-sum/submit/'
    );
    expect(extractProblemPathname('/problems/add-two-numbers/submit/', 'https://leetcode.com/problems/two-sum/')).toBe(
      '/problems/add-two-numbers/submit/'
    );
    expect(extractProblemPathname('/submissions/detail/123/check/', 'https://leetcode.com/problems/two-sum/')).toBeUndefined();
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

  it('never treats runcode check results as accepted submissions', () => {
    const submittedIds = new Set<string>();

    expect(isRunCodeSubmissionId('runcode_1779555533.520855_VTTFCzrmQJ')).toBe(true);
    expect(
      inspectSubmissionResponse(
        'https://leetcode.cn/submissions/detail/runcode_1779555533.520855_VTTFCzrmQJ/check/',
        {
          status_code: 10,
          lang: 'java',
          run_success: true,
          task_name: 'judger.runcodetask.RunCode',
          correct_answer: true,
          compare_result: '111',
          status_msg: 'Accepted',
          state: 'SUCCESS',
          total_correct: 3,
          total_testcases: 3,
          submission_id: 'runcode_1779555533.520855_VTTFCzrmQJ'
        },
        submittedIds,
        undefined,
        { allowMatchingCheckResult: true }
      )
    ).toBe(false);
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

  it('does not self-register the current check response shape without an explicit submit signal', () => {
    const submittedIds = new Set<string>();

    expect(
      inspectSubmissionResponse(
        'https://leetcode.cn/submissions/detail/726823811/check/',
        {
          status_code: 10,
          lang: 'java',
          run_success: true,
          status_runtime: '30 ms',
          memory: 95688000,
          question_id: '128',
          finished: true,
          status_msg: 'Accepted',
          state: 'SUCCESS',
          total_correct: 85,
          total_testcases: 85,
          submission_id: '726823811'
        },
        submittedIds
      )
    ).toBe(false);
    expect(submittedIds.has('726823811')).toBe(false);
  });

  it('detects the current LeetCode check response shape after an explicit submit signal', () => {
    const submittedIds = new Set<string>();

    expect(
      inspectSubmissionResponse(
        'https://leetcode.cn/submissions/detail/726823811/check/',
        {
          status_code: 10,
          lang: 'java',
          run_success: true,
          status_runtime: '30 ms',
          memory: 95688000,
          question_id: '128',
          finished: true,
          status_msg: 'Accepted',
          state: 'SUCCESS',
          total_correct: 85,
          total_testcases: 85,
          submission_id: '726823811'
        },
        submittedIds,
        undefined,
        { allowMatchingCheckResult: true }
      )
    ).toBe(true);
    expect(submittedIds.has('726823811')).toBe(true);
  });

  it('detects the current LeetCode v2 submit check response shape', () => {
    const submittedIds = new Set<string>();

    inspectSubmissionResponse(
      'https://leetcode.cn/problems/two-sum/submit/',
      { submission_id: 726831735 },
      submittedIds
    );

    expect(
      inspectSubmissionResponse(
        'https://leetcode.cn/submissions/detail/726831735/v2/check/',
        {
          status_code: 10,
          lang: 'java',
          run_success: true,
          status_runtime: '2 ms',
          memory: 47792000,
          display_runtime: '2',
          question_id: '1',
          elapsed_time: 153,
          compare_result: '111111111111111111111111111111111111111111111111111111111111111',
          code_output: '',
          std_output: '',
          last_testcase: '',
          expected_output: '',
          task_finish_time: 1779555633113,
          task_name: 'judger.judgetask.Judge',
          finished: true,
          status_msg: 'Accepted',
          state: 'SUCCESS',
          fast_submit: false,
          total_correct: 63,
          total_testcases: 63,
          submission_id: '726831735',
          pretty_lang: 'Java'
        },
        submittedIds
      )
    ).toBe(true);
  });

  it('accepts numeric status code 10 only in a completed known submission result', () => {
    const submittedIds = new Set<string>(['numeric-accepted-id']);

    expect(
      inspectSubmissionResponse(
        'https://leetcode.com/submissions/detail/numeric-accepted-id/check/',
        { state: 'SUCCESS', status_code: 10, run_success: true },
        submittedIds
      )
    ).toBe(true);
    expect(
      inspectSubmissionResponse(
        'https://leetcode.com/submissions/detail/numeric-accepted-id/check/',
        { state: 'PENDING', status_code: 10, run_success: true },
        submittedIds
      )
    ).toBe(false);
    expect(
      inspectSubmissionResponse(
        'https://leetcode.com/submissions/detail/numeric-accepted-id/check/',
        { state: 'SUCCESS', status_code: 10, run_success: false },
        submittedIds
      )
    ).toBe(false);
    expect(
      inspectSubmissionResponse(
        'https://leetcode.com/submissions/detail/numeric-accepted-id/check/',
        { state: 'SUCCESS', status_code: 10, run_success: true, total_correct: 84, total_testcases: 85 },
        submittedIds
      )
    ).toBe(false);
  });

  it('ignores accepted-looking payloads that are not tied to the submitted id', () => {
    const submittedIds = new Set<string>(['known-id']);

    expect(
      inspectSubmissionResponse(
        'https://leetcode.cn/graphql/',
        { data: { submission: { id: 'other-id', statusDisplay: 'Accepted' } } },
        submittedIds
      )
    ).toBe(false);
  });

  it('does not treat failed submissions or unrelated numeric status codes as accepted', () => {
    const submittedIds = new Set<string>(['failed-id', 'numeric-id']);

    expect(containsAccepted({ status_code: 10, message: 'Runtime Error' })).toBe(false);
    expect(
      inspectSubmissionResponse(
        'https://leetcode.com/submissions/detail/failed-id/check/',
        { status_msg: 'Runtime Error', state: 'SUCCESS' },
        submittedIds
      )
    ).toBe(false);
    expect(
      inspectSubmissionResponse(
        'https://leetcode.cn/graphql/',
        { data: { submission: { id: 'numeric-id', statusCode: 10, statusDisplay: 'Wrong Answer' } } },
        submittedIds
      )
    ).toBe(false);
  });

  it('tracks GraphQL submitCode responses and accepted follow-up payloads', () => {
    const submittedIds = new Set<string>();
    const submitRequest = {
      operationName: 'submitCode',
      variables: { input: { questionSlug: 'move-zeroes' } }
    };

    expect(isSubmitRequest('https://leetcode.cn/graphql/', submitRequest)).toBe(true);
    inspectSubmissionResponse(
      'https://leetcode.cn/graphql/',
      { data: { submitCode: { submission_id: 'graphql-submit-id' } } },
      submittedIds,
      submitRequest
    );

    expect(containsKnownSubmittedId({ data: { submission: { id: 'graphql-submit-id' } } }, submittedIds)).toBe(true);
    expect(findKnownSubmittedId({ data: { submission: { id: 'graphql-submit-id' } } }, submittedIds)).toBe('graphql-submit-id');
    expect(
      inspectSubmissionResponse(
        'https://leetcode.cn/graphql/',
        { data: { submission: { id: 'graphql-submit-id', statusDisplay: 'Accepted' } } },
        submittedIds
      )
    ).toBe(true);
  });

  it('detects GraphQL accepted results when the submission id is only in the request payload', () => {
    const submittedIds = new Set<string>(['request-only-id']);

    expect(
      inspectSubmissionResponse(
        'https://leetcode.cn/graphql/',
        { data: { submissionDetails: { statusCode: 10, statusDisplay: 'Accepted', state: 'SUCCESS' } } },
        submittedIds,
        { operationName: 'submissionDetails', variables: { submissionId: 'request-only-id' } }
      )
    ).toBe(true);
  });

  it('can identify GraphQL submit responses even when the request body is unavailable', () => {
    const submittedIds = new Set<string>();

    inspectSubmissionResponse(
      'https://leetcode.cn/graphql/',
      { data: { submitCode: { submission_id: 'response-only-id' } } },
      submittedIds
    );

    expect(submittedIds.has('response-only-id')).toBe(true);
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
