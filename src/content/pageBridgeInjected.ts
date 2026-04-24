declare global {
  interface Window {
    __quizRecallBridgeInstalled?: boolean;
  }

  interface XMLHttpRequest {
    __quizRecallUrl?: string;
  }
}

export {};

const ACCEPTED_MESSAGE_TYPE = 'QUIZ_RECALL_ACCEPTED_SUBMISSION';
const acceptedPattern = /accepted|通过/i;
const submitOrCheckPattern = /\/submit\/?|\/submissions\/detail\/|\/check\/?|submission|graphql/i;

function containsAccepted(value: unknown, depth = 0): boolean {
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

function notifyAccepted() {
  window.postMessage({ type: ACCEPTED_MESSAGE_TYPE }, window.location.origin);
}

function inspect(url: unknown, payload: unknown) {
  if (!submitOrCheckPattern.test(String(url || ''))) {
    return;
  }

  if (containsAccepted(payload)) {
    notifyAccepted();
  }
}

function installBridge() {
  if (window.__quizRecallBridgeInstalled) {
    return;
  }
  window.__quizRecallBridgeInstalled = true;

  const originalFetch = window.fetch;
  window.fetch = async function patchedFetch(input, init) {
    const response = await originalFetch.apply(this, [input, init]);
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    if (submitOrCheckPattern.test(String(url || ''))) {
      response
        .clone()
        .json()
        .then((payload) => inspect(url, payload))
        .catch(() => {
          response
            .clone()
            .text()
            .then((payload) => inspect(url, payload))
            .catch(() => {});
        });
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function patchedOpen(method: string, url: string | URL) {
    this.__quizRecallUrl = String(url);
    return (originalOpen as unknown as (...args: unknown[]) => void).apply(this, arguments as unknown as unknown[]);
  };

  XMLHttpRequest.prototype.send = function patchedSend(body?: Document | XMLHttpRequestBodyInit | null) {
    this.addEventListener('load', function handleLoad() {
      const url = this.__quizRecallUrl;
      if (!submitOrCheckPattern.test(String(url || ''))) {
        return;
      }
      try {
        inspect(url, JSON.parse(this.responseText));
      } catch {
        inspect(url, this.responseText);
      }
    });
    return (originalSend as unknown as (...args: unknown[]) => void).apply(this, arguments as unknown as unknown[]);
  };
}

installBridge();
