const acceptedPattern = /accepted|通过/i;

export function containsAccepted(value: unknown, depth = 0): boolean {
  if (!value || depth > 5) {
    return false;
  }

  if (typeof value === 'string') {
    return acceptedPattern.test(value);
  }

  if (typeof value === 'number') {
    return value === 10;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsAccepted(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([key, nestedValue]) => {
      const interestingKey = /status|state|result|submission|message|code/i.test(key);
      return interestingKey && containsAccepted(nestedValue, depth + 1);
    });
  }

  return false;
}

export function isSubmitUrl(url: unknown): boolean {
  return /\/submit\/?(?:\?|$)/i.test(String(url || ''));
}

export function isSubmissionCheckUrl(url: unknown): boolean {
  return /\/submissions\/detail\/[^/]+\/check\/?(?:\?|$)/i.test(String(url || ''));
}

export function shouldInspectUrl(url: unknown): boolean {
  return isSubmitUrl(url) || isSubmissionCheckUrl(url);
}

export function extractCheckSubmissionId(url: unknown): string | undefined {
  const match = String(url || '').match(/\/submissions\/detail\/([^/]+)\/check\/?/i);
  return match?.[1];
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
  submittedIds: Set<string>
): boolean {
  if (isSubmitUrl(url)) {
    const submittedId = extractSubmittedId(payload);
    if (submittedId) {
      submittedIds.add(submittedId);
    }
    return false;
  }

  if (!isSubmissionCheckUrl(url)) {
    return false;
  }

  const checkedId = extractCheckSubmissionId(url);
  return Boolean(checkedId && submittedIds.has(checkedId) && containsAccepted(payload));
}
