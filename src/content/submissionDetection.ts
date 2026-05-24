const acceptedPattern = /^(accepted|通过)$/i;
const failedPattern = /^(wrong answer|runtime error|compile error|time limit exceeded|memory limit exceeded|output limit exceeded|internal error|unknown error|答案错误|执行出错|编译出错|超出时间限制|超出内存限制|输出超出限制|内部错误|未知错误)$/i;
const ACCEPTED_STATUS_CODE = 10;
const runCodeSubmissionIdPattern = /^runcode_/i;

function mentionsSubmitCode(value: unknown, depth = 0): boolean {
  if (!value || depth > 5) {
    return false;
  }

  if (typeof value === 'string') {
    return /submitCode|submit_code/i.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => mentionsSubmitCode(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(
      ([key, nestedValue]) => /submitCode|submit_code/i.test(key) || mentionsSubmitCode(nestedValue, depth + 1)
    );
  }

  return false;
}

function hasKnownSubmissionId(value: unknown, submittedIds: Set<string>): boolean {
  return Boolean(findKnownSubmittedId(value, submittedIds));
}

function getExplicitVerdict(object: Record<string, unknown>): 'accepted' | 'failed' | undefined {
  const statusTextKeys = ['status_msg', 'statusMsg', 'statusDisplay', 'status_display', 'status', 'message'];
  for (const key of statusTextKeys) {
    const value = object[key];
    if (typeof value !== 'string') {
      continue;
    }
    const normalized = value.trim();
    if (acceptedPattern.test(normalized)) {
      return 'accepted';
    }
    if (failedPattern.test(normalized)) {
      return 'failed';
    }
  }

  const statusCode = object.status_code ?? object.statusCode;
  if (typeof statusCode === 'number') {
    return statusCode === ACCEPTED_STATUS_CODE ? 'accepted' : 'failed';
  }

  return undefined;
}

function isCompletedJudgeResult(object: Record<string, unknown>): boolean {
  const state = typeof object.state === 'string' ? object.state.trim().toUpperCase() : undefined;
  if (state && state !== 'SUCCESS') {
    return false;
  }

  if (object.run_success === false || object.finished === false) {
    return false;
  }

  if (typeof object.total_correct === 'number' && typeof object.total_testcases === 'number') {
    return object.total_correct === object.total_testcases;
  }

  return true;
}

export function containsAccepted(value: unknown, depth = 0): boolean {
  if (!value || depth > 5) {
    return false;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    return isCompletedJudgeResult(object) && getExplicitVerdict(object) === 'accepted';
  }

  return false;
}

export function containsAcceptedVerdict(value: unknown, submittedIds?: Set<string>, depth = 0): boolean {
  if (!value || depth > 6) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsAcceptedVerdict(item, submittedIds, depth + 1));
  }

  if (typeof value !== 'object') {
    return false;
  }

  const object = value as Record<string, unknown>;
  const verdict = getExplicitVerdict(object);
  if (verdict === 'failed') {
    return false;
  }
  if (verdict === 'accepted' && isCompletedJudgeResult(object) && (!submittedIds || hasKnownSubmissionId(object, submittedIds))) {
    return true;
  }

  return Object.values(object).some((nestedValue) => containsAcceptedVerdict(nestedValue, submittedIds, depth + 1));
}

export function containsKnownSubmittedId(value: unknown, submittedIds: Set<string>, depth = 0): boolean {
  return Boolean(findKnownSubmittedId(value, submittedIds, depth));
}

export function findKnownSubmittedId(value: unknown, submittedIds: Set<string>, depth = 0): string | undefined {
  if (!value || submittedIds.size === 0 || depth > 5) {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const id = String(value);
    return submittedIds.has(id) ? id : undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const id = findKnownSubmittedId(item, submittedIds, depth + 1);
      if (id) return id;
    }
    return undefined;
  }

  if (typeof value === 'object') {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const id = findKnownSubmittedId(nestedValue, submittedIds, depth + 1);
      if (id) return id;
    }
  }

  return undefined;
}

export function isSubmitUrl(url: unknown): boolean {
  return /\/submit\/?(?:\?|$)/i.test(String(url || ''));
}

export function isSubmissionCheckUrl(url: unknown): boolean {
  return /\/submissions\/detail\/[^/]+\/(?:v\d+\/)?check\/?(?:\?|$)/i.test(String(url || ''));
}

export function isGraphqlUrl(url: unknown): boolean {
  return /\/graphql\/?(?:\?|$)/i.test(String(url || ''));
}

export function isSubmitRequest(url: unknown, requestPayload?: unknown, responsePayload?: unknown): boolean {
  return isSubmitUrl(url) || (isGraphqlUrl(url) && (mentionsSubmitCode(requestPayload) || mentionsSubmitCode(responsePayload)));
}

export function extractProblemPathname(url: unknown, baseHref: string): string | undefined {
  try {
    const parsed = new URL(String(url || ''), baseHref);
    const match = parsed.pathname.match(/\/problems\/[^/]+\/submit\/?/i);
    return match ? parsed.pathname : undefined;
  } catch {
    return undefined;
  }
}

export function shouldInspectUrl(url: unknown): boolean {
  return isSubmitUrl(url) || isSubmissionCheckUrl(url) || isGraphqlUrl(url);
}

export function extractCheckSubmissionId(url: unknown): string | undefined {
  const match = String(url || '').match(/\/submissions\/detail\/([^/]+)\/(?:v\d+\/)?check\/?/i);
  return match?.[1];
}

export function isRunCodeSubmissionId(id: unknown): boolean {
  return runCodeSubmissionIdPattern.test(String(id || ''));
}

export function extractSubmittedId(payload: unknown, depth = 0): string | undefined {
  if (!payload || depth > 4) {
    return undefined;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const id = extractSubmittedId(item, depth + 1);
      if (id) return id;
    }
    return undefined;
  }

  if (typeof payload !== 'object') {
    return undefined;
  }

  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (/^submission_?id$/i.test(key) && (typeof value === 'string' || typeof value === 'number')) {
      return String(value);
    }

    const nested = extractSubmittedId(value, depth + 1);
    if (nested) return nested;
  }

  return undefined;
}

export function inspectSubmissionResponse(
  url: unknown,
  payload: unknown,
  submittedIds: Set<string>,
  requestPayload?: unknown,
  options?: { allowMatchingCheckResult?: boolean }
): boolean {
  if (isSubmitRequest(url, requestPayload, payload)) {
    const submittedId = extractSubmittedId(payload);
    if (submittedId) {
      submittedIds.add(submittedId);
    }
    return false;
  }

  if (!isSubmissionCheckUrl(url) && !isGraphqlUrl(url)) {
    return false;
  }

  const checkedId = extractCheckSubmissionId(url);
  if (checkedId) {
    if (isRunCodeSubmissionId(checkedId)) {
      return false;
    }

    const responseSubmittedId = extractSubmittedId(payload);
    const isMatchingCheckResult = responseSubmittedId === checkedId;
    if (isMatchingCheckResult && options?.allowMatchingCheckResult) {
      submittedIds.add(checkedId);
    }
    return submittedIds.has(checkedId) && containsAcceptedVerdict(payload);
  }

  const graphqlSubmittedId = findKnownSubmittedId(payload, submittedIds) ?? findKnownSubmittedId(requestPayload, submittedIds);
  return isGraphqlUrl(url) && Boolean(graphqlSubmittedId) && containsAcceptedVerdict(payload);
}
