import { describe, expect, it } from 'vitest';
import { createSubmissionBridgeState } from '../src/content/submissionBridgeState';

const runCodeCheckUrl = 'https://leetcode.cn/submissions/detail/runcode_1779555533.520855_VTTFCzrmQJ/check/';
const submitUrl = 'https://leetcode.cn/problems/two-sum/submit/';
const submitCheckUrl = 'https://leetcode.cn/submissions/detail/726831735/v2/check/';

const runCodeAcceptedPayload = {
  status_code: 10,
  lang: 'java',
  run_success: true,
  status_runtime: '0 ms',
  task_name: 'judger.runcodetask.RunCode',
  correct_answer: true,
  compare_result: '111',
  status_msg: 'Accepted',
  state: 'SUCCESS',
  total_correct: 3,
  total_testcases: 3,
  submission_id: 'runcode_1779555533.520855_VTTFCzrmQJ'
};

const submitAcceptedPayload = {
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
};

function createHarness() {
  let currentTime = 1_000;
  let pathname = '/problems/two-sum/description/';
  const state = createSubmissionBridgeState({
    currentHref: () => `https://leetcode.cn${pathname}`,
    currentPathname: () => pathname,
    now: () => currentTime
  });

  return {
    advance(ms: number) {
      currentTime += ms;
    },
    setPathname(nextPathname: string) {
      pathname = nextPathname;
    },
    state
  };
}

describe('submission bridge state simulated E2E', () => {
  it('does not emit an accepted event for Run even when runcode check returns Accepted', () => {
    const { state } = createHarness();

    state.markRunSignal();

    expect(state.shouldProbeResourceUrl(runCodeCheckUrl)).toBe(false);
    expect(state.inspect(runCodeCheckUrl, runCodeAcceptedPayload)).toBeUndefined();
  });

  it('emits an accepted event for Submit followed by v2 check Accepted', () => {
    const { state } = createHarness();

    state.markSubmitSignal();

    expect(state.inspect(submitUrl, { submission_id: 726831735 })).toBeUndefined();
    expect(state.inspect(submitCheckUrl, submitAcceptedPayload)).toEqual({
      pathname: '/problems/two-sum/submit/',
      submissionId: '726831735'
    });
  });

  it('uses the performance fallback when submit response is missed but submit intent was observed', () => {
    const { state } = createHarness();

    state.markSubmitSignal();

    expect(state.shouldProbeResourceUrl(submitCheckUrl)).toBe(true);
    expect(state.inspect(submitCheckUrl, submitAcceptedPayload)).toEqual({
      pathname: '/problems/two-sum/description/',
      submissionId: '726831735'
    });
  });

  it('suppresses stale submit fallback after a later Run click', () => {
    const { state, advance } = createHarness();

    state.markSubmitSignal();
    advance(500);
    state.markRunSignal();

    expect(state.shouldProbeResourceUrl(submitCheckUrl)).toBe(false);
    expect(state.inspect(submitCheckUrl, submitAcceptedPayload)).toBeUndefined();
  });

  it('keeps the accepted event tied to the submitted problem after navigation', () => {
    const { state, setPathname } = createHarness();

    state.markSubmitSignal();
    setPathname('/problems/container-with-most-water/description/');

    expect(state.inspect(submitCheckUrl, submitAcceptedPayload)).toEqual({
      pathname: '/problems/two-sum/description/',
      submissionId: '726831735'
    });
  });
});
