import { createSubmissionBridgeState } from './submissionBridgeState';
import { extractCheckSubmissionId, shouldInspectUrl } from './submissionDetection';

declare global {
  interface Window {
    __quizRecallBridgeInstalled?: boolean;
  }

  interface XMLHttpRequest {
    __quizRecallUrl?: string;
  }
}

const ACCEPTED_MESSAGE_TYPE = 'QUIZ_RECALL_ACCEPTED_SUBMISSION';
const SUBMIT_PATTERNS = [/^Submit$/i, /^提交(?:代码)?$/];
const RUN_PATTERNS = [/^Run$/i, /^运行(?:代码)?$/];
const activeCheckProbeIds = new Set<string>();
const bridgeState = createSubmissionBridgeState({
  currentHref: () => window.location.href,
  currentPathname: () => window.location.pathname
});

function notifyAccepted(pathname?: string) {
  window.postMessage({ type: ACCEPTED_MESSAGE_TYPE, pathname }, window.location.origin);
}

function parseRequestPayload(body: unknown): unknown {
  if (typeof body !== 'string') {
    return body;
  }

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function isActionElement(target: EventTarget | null, patterns: RegExp[]): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const path = typeof target.closest === 'function' ? [target.closest('button, [role="button"], a'), target] : [target];
  return path.filter(Boolean).some((element) => {
    const text = [
      element?.textContent,
      element?.getAttribute('aria-label'),
      element?.getAttribute('data-e2e-locator'),
      element?.getAttribute('title')
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return patterns.some((pattern) => pattern.test(text));
  });
}

function handleActionPointer(event: Event) {
  if (isActionElement(event.target, SUBMIT_PATTERNS)) {
    bridgeState.markSubmitSignal();
    return;
  }

  if (isActionElement(event.target, RUN_PATTERNS)) {
    bridgeState.markRunSignal();
  }
}

function inspect(url: unknown, payload: unknown, requestPayload?: unknown) {
  const acceptedEvent = bridgeState.inspect(url, payload, requestPayload);
  if (acceptedEvent) {
    notifyAccepted(acceptedEvent.pathname);
  }
}

async function probeCheckUrl(fetchImpl: typeof window.fetch, url: string) {
  const checkedId = extractCheckSubmissionId(url);
  if (!checkedId || activeCheckProbeIds.has(checkedId)) {
    return;
  }

  activeCheckProbeIds.add(checkedId);
  try {
    const response = await fetchImpl(url, {
      cache: 'no-store',
      credentials: 'include',
      headers: { accept: 'application/json' }
    });
    const text = await response.text();
    try {
      inspect(url, JSON.parse(text));
    } catch {
      inspect(url, text);
    }
  } catch {
    // The original page request is still the primary signal; this probe is only a fallback.
  } finally {
    window.setTimeout(() => activeCheckProbeIds.delete(checkedId), 500);
  }
}

function installPerformanceCheckObserver(fetchImpl: typeof window.fetch) {
  if (typeof PerformanceObserver === 'undefined') {
    return;
  }

  const handleEntry = (entry: PerformanceResourceTiming | PerformanceEntry) => {
    const url = entry.name;
    if (bridgeState.shouldProbeResourceUrl(url)) {
      void probeCheckUrl(fetchImpl, url);
    }
  };

  try {
    performance.getEntriesByType('resource').forEach(handleEntry);
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(handleEntry);
    });
    observer.observe({ type: 'resource', buffered: true });
  } catch {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(handleEntry);
      });
      observer.observe({ entryTypes: ['resource'] });
    } catch {
      // Some embedded contexts restrict PerformanceObserver; fetch/XHR hooks still cover the common path.
    }
  }
}

async function readFetchRequestPayload(input: RequestInfo | URL, init?: RequestInit): Promise<unknown> {
  if (init?.body) {
    return parseRequestPayload(init.body);
  }

  if (input instanceof Request) {
    try {
      return parseRequestPayload(await input.clone().text());
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function installBridge() {
  if (window.__quizRecallBridgeInstalled) {
    return;
  }
  window.__quizRecallBridgeInstalled = true;
  document.addEventListener('pointerdown', handleActionPointer, true);
  document.addEventListener('click', handleActionPointer, true);

  const originalFetch = window.fetch;
  installPerformanceCheckObserver(originalFetch);
  window.fetch = async function patchedFetch(input, init) {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
    const requestPayload = shouldInspectUrl(url) ? await readFetchRequestPayload(input, init) : undefined;
    const response = await originalFetch.apply(this, [input, init]);
    if (shouldInspectUrl(url)) {
      response
        .clone()
        .json()
        .then((payload) => inspect(url, payload, requestPayload))
        .catch(() => {
          response
            .clone()
            .text()
            .then((payload) => inspect(url, payload, requestPayload))
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
      const requestPayload = parseRequestPayload(body);
      try {
        inspect(url, JSON.parse(this.responseText), requestPayload);
      } catch {
        inspect(url, this.responseText, requestPayload);
      }
    });
    return (originalSend as unknown as (...args: unknown[]) => void).apply(this, arguments as unknown as unknown[]);
  };
}

installBridge();
