import { getProblemIdentity } from '../shared/leetcode/problemIdentity';
import { isProblemPage } from '../shared/leetcode/url';
import type { ProblemIdentity } from '../shared/types';

// C1: cache the resolved identity per pathname so repeated calls (e.g. after an
// Accepted event) don't re-scan the DOM/scripts for the same problem.
let cachedPathname: string | undefined;
let cachedIdentity: ProblemIdentity | undefined;

export function detectCurrentProblem(): ProblemIdentity | undefined {
  if (!isProblemPage()) {
    cachedPathname = window.location.pathname;
    cachedIdentity = undefined;
    return undefined;
  }

  const pathname = window.location.pathname;
  if (pathname === cachedPathname && cachedIdentity) {
    return cachedIdentity;
  }

  const identity = getProblemIdentity();
  // Only memoize a successful detection; the page may still be hydrating, in
  // which case a later call for the same pathname should retry.
  if (identity) {
    cachedPathname = pathname;
    cachedIdentity = identity;
  }
  return identity;
}
