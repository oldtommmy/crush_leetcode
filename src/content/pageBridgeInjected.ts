import { inspectSubmissionResponse, shouldInspectUrl } from './submissionDetection';

declare global {
  interface Window {
    __quizRecallBridgeInstalled?: boolean;
  }

  interface XMLHttpRequest {
    __quizRecallUrl?: string;
  }
}

const ACCEPTED_MESSAGE_TYPE = 'QUIZ_RECALL_ACCEPTED_SUBMISSION';
const submittedIds = new Set<string>();

function notifyAccepted() {
  window.postMessage({ type: ACCEPTED_MESSAGE_TYPE }, window.location.origin);
}

function inspect(url: unknown, payload: unknown) {
  if (inspectSubmissionResponse(url, payload, submittedIds)) {
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
    if (shouldInspectUrl(url)) {
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
      if (!shouldInspectUrl(url)) {
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
