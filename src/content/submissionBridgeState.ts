import {
  extractCheckSubmissionId,
  extractProblemPathname,
  extractSubmittedId,
  findKnownSubmittedId,
  inspectSubmissionResponse,
  isRunCodeSubmissionId,
  isSubmissionCheckUrl,
  isSubmitRequest,
  isSubmitUrl
} from './submissionDetection';

const CHECK_PROBE_COOLDOWN_MS = 1200;
const RECENT_ACTION_WINDOW_MS = 2 * 60 * 1000;

export interface AcceptedSubmissionEvent {
  pathname?: string;
  submissionId?: string;
}

interface SubmissionBridgeStateOptions {
  checkProbeCooldownMs?: number;
  currentHref: () => string;
  currentPathname: () => string;
  now?: () => number;
  recentActionWindowMs?: number;
}

export interface SubmissionBridgeState {
  inspect(url: unknown, payload: unknown, requestPayload?: unknown): AcceptedSubmissionEvent | undefined;
  markRunSignal(): void;
  markSubmitFromUrl(url: unknown): void;
  markSubmitSignal(pathname?: string): void;
  shouldProbeResourceUrl(url: unknown): boolean;
}

export function createSubmissionBridgeState(options: SubmissionBridgeStateOptions): SubmissionBridgeState {
  const checkProbeCooldownMs = options.checkProbeCooldownMs ?? CHECK_PROBE_COOLDOWN_MS;
  const recentActionWindowMs = options.recentActionWindowMs ?? RECENT_ACTION_WINDOW_MS;
  const now = options.now ?? (() => Date.now());

  const submittedIds = new Set<string>();
  const submittedPathnamesById = new Map<string, string>();
  const checkProbeTimesById = new Map<string, number>();
  let lastSubmitSignalAt = 0;
  let lastRunSignalAt = 0;
  let lastSubmitPathname: string | undefined;

  const currentProblemPathname = () => {
    const pathname = options.currentPathname();
    return /^\/problems\/[^/]+/i.test(pathname) ? pathname : undefined;
  };

  const markSubmitSignal = (pathname = currentProblemPathname()) => {
    lastSubmitSignalAt = now();
    lastSubmitPathname = pathname;
  };

  const markSubmitFromUrl = (url: unknown) => {
    markSubmitSignal(extractProblemPathname(url, options.currentHref()) ?? currentProblemPathname());
  };

  const markRunSignal = () => {
    lastRunSignalAt = now();
  };

  const hasRecentSubmitSignal = () => {
    const currentTime = now();
    return currentTime - lastSubmitSignalAt <= recentActionWindowMs && lastSubmitSignalAt >= lastRunSignalAt;
  };

  const rememberCheckPathname = (url: unknown) => {
    const checkedId = extractCheckSubmissionId(url);
    if (isRunCodeSubmissionId(checkedId)) {
      return;
    }

    const pathname = lastSubmitPathname ?? currentProblemPathname();
    if (checkedId && pathname && !submittedPathnamesById.has(checkedId)) {
      submittedPathnamesById.set(checkedId, pathname);
    }
  };

  const inspect = (url: unknown, payload: unknown, requestPayload?: unknown): AcceptedSubmissionEvent | undefined => {
    if (isSubmitUrl(url)) {
      markSubmitFromUrl(url);
    }

    if (isSubmitRequest(url, requestPayload, payload)) {
      const submittedId = extractSubmittedId(payload);
      const pathname = extractProblemPathname(url, options.currentHref()) ?? lastSubmitPathname ?? currentProblemPathname();
      if (submittedId && pathname) {
        submittedPathnamesById.set(submittedId, pathname);
      }
    }

    if (isSubmissionCheckUrl(url)) {
      rememberCheckPathname(url);
    }

    if (!inspectSubmissionResponse(url, payload, submittedIds, requestPayload, { allowMatchingCheckResult: hasRecentSubmitSignal() })) {
      return undefined;
    }

    const submissionId =
      extractCheckSubmissionId(url) ?? findKnownSubmittedId(payload, submittedIds) ?? findKnownSubmittedId(requestPayload, submittedIds);
    return {
      pathname: submissionId ? submittedPathnamesById.get(submissionId) : undefined,
      submissionId
    };
  };

  const shouldProbeResourceUrl = (url: unknown) => {
    if (isSubmitUrl(url)) {
      markSubmitFromUrl(url);
    }

    const checkedId = extractCheckSubmissionId(url);
    if (!checkedId || isRunCodeSubmissionId(checkedId) || !hasRecentSubmitSignal()) {
      return false;
    }

    const currentTime = now();
    const lastProbeAt = checkProbeTimesById.get(checkedId) ?? 0;
    if (lastProbeAt > 0 && currentTime - lastProbeAt < checkProbeCooldownMs) {
      return false;
    }

    checkProbeTimesById.set(checkedId, currentTime);
    rememberCheckPathname(url);
    return true;
  };

  return {
    inspect,
    markRunSignal,
    markSubmitFromUrl,
    markSubmitSignal,
    shouldProbeResourceUrl
  };
}
