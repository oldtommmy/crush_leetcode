import {
  getProblemIdentityResolution,
  type ProblemIdentityResolution
} from '../shared/leetcode/problemIdentity';
import { isProblemPage } from '../shared/leetcode/url';
import type { ProblemIdentity } from '../shared/types';

const PROVISIONAL_RETRY_INTERVAL_MS = 250;
const PROVISIONAL_CACHE_TTL_MS = 5_000;
const MAX_PROVISIONAL_ATTEMPTS = 4;

export interface ProblemIdentityDetectorOptions {
  currentPathname: () => string;
  isProblemPage: () => boolean;
  maxProvisionalAttempts?: number;
  now?: () => number;
  provisionalCacheTtlMs?: number;
  provisionalRetryIntervalMs?: number;
  resolve: () => ProblemIdentityResolution | undefined;
}

export interface ProblemIdentityDetector {
  detect(): ProblemIdentity | undefined;
  invalidate(): void;
}

interface IdentityCacheEntry {
  attempts: number;
  complete: boolean;
  expiresAt: number;
  identity: ProblemIdentity;
  nextRetryAt: number;
  pathname: string;
}

/**
 * Creates a detector whose complete identities are stable for one pathname,
 * while slug-only/Unknown provisional identities are retried and expire. The
 * injected clock and resolver keep retry/cache behavior deterministic in tests.
 */
export function createProblemIdentityDetector(options: ProblemIdentityDetectorOptions): ProblemIdentityDetector {
  const maxProvisionalAttempts = options.maxProvisionalAttempts ?? MAX_PROVISIONAL_ATTEMPTS;
  const now = options.now ?? (() => Date.now());
  const provisionalCacheTtlMs = options.provisionalCacheTtlMs ?? PROVISIONAL_CACHE_TTL_MS;
  const provisionalRetryIntervalMs = options.provisionalRetryIntervalMs ?? PROVISIONAL_RETRY_INTERVAL_MS;
  let cache: IdentityCacheEntry | undefined;

  const invalidate = () => {
    cache = undefined;
  };

  const detect = (): ProblemIdentity | undefined => {
    const pathname = options.currentPathname();
    if (!options.isProblemPage()) {
      invalidate();
      return undefined;
    }

    if (cache?.pathname !== pathname) {
      invalidate();
    }

    const currentTime = now();
    if (cache?.complete) {
      return cache.identity;
    }
    if (
      cache &&
      currentTime < cache.expiresAt &&
      (currentTime < cache.nextRetryAt || cache.attempts >= maxProvisionalAttempts)
    ) {
      return cache.identity;
    }

    const resolution = options.resolve();
    if (!resolution) {
      invalidate();
      return undefined;
    }

    const attempts = cache && currentTime < cache.expiresAt ? cache.attempts + 1 : 1;
    cache = {
      attempts,
      complete: resolution.complete,
      expiresAt: resolution.complete ? Number.POSITIVE_INFINITY : currentTime + provisionalCacheTtlMs,
      identity: resolution.identity,
      nextRetryAt: currentTime + provisionalRetryIntervalMs,
      pathname
    };
    return resolution.identity;
  };

  return { detect, invalidate };
}

const defaultDetector = createProblemIdentityDetector({
  currentPathname: () => window.location.pathname,
  isProblemPage,
  resolve: () => getProblemIdentityResolution()
});

export function invalidateProblemIdentityCache(): void {
  defaultDetector.invalidate();
}

export function detectCurrentProblem(): ProblemIdentity | undefined {
  return defaultDetector.detect();
}
