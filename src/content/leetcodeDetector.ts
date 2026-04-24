import { getProblemIdentity } from '../shared/leetcode/problemIdentity';
import { isProblemPage } from '../shared/leetcode/url';
import type { ProblemIdentity } from '../shared/types';

export function detectCurrentProblem(): ProblemIdentity | undefined {
  if (!isProblemPage()) {
    return undefined;
  }
  return getProblemIdentity();
}
