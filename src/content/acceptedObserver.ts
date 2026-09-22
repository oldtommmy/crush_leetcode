const ACCEPTED_PATTERNS = [/^Accepted$/i, /^通过$/];
const SUBMIT_PATTERNS = [/Submit/i, /提交/, /提交代码/];
const RECENT_SUBMIT_WINDOW_MS = 2 * 60 * 1000;
const OBSERVER_DEBOUNCE_MS = 150;
const MAX_MUTATION_RECORDS = 50;
const MAX_RESULT_TEXT_LENGTH = 20_000;
const RESULT_CONTAINER_SELECTOR = [
  '[data-e2e-locator*="submission-result"]',
  '[data-e2e-locator*="result"]',
  '[data-cy*="submission-result"]',
  '[data-testid*="submission-result"]',
  '[role="dialog"] [class*="result"]',
  '[role="dialog"] [class*="Result"]'
].join(', ');

export interface AcceptedDomContext {
  pathname?: string;
}

function elementForNode(node: Node): Element | undefined {
  if (node.nodeType === 1) {
    return node as Element;
  }
  return node.parentElement ?? undefined;
}

function containingResultRoot(element: Element): Element | undefined {
  if (element.matches(RESULT_CONTAINER_SELECTOR)) {
    return element;
  }
  return element.closest(RESULT_CONTAINER_SELECTOR) ?? undefined;
}

function addedResultRoot(element: Element): Element | undefined {
  return containingResultRoot(element) ?? element.querySelector(RESULT_CONTAINER_SELECTOR) ?? undefined;
}

function hasAcceptedText(root: Element): boolean {
  const visibleText = root.textContent ?? '';
  if (visibleText.length > MAX_RESULT_TEXT_LENGTH) {
    return false;
  }
  return visibleText
    .split(/\n+/)
    .some((line) => ACCEPTED_PATTERNS.some((pattern) => pattern.test(line.trim())));
}

export function acceptedResultRoots(records: readonly MutationRecord[]): Element[] {
  const roots = new Set<Element>();

  for (const record of records.slice(0, MAX_MUTATION_RECORDS)) {
    const targetElement = elementForNode(record.target);
    if (targetElement) {
      const targetRoot = containingResultRoot(targetElement);
      if (targetRoot) {
        roots.add(targetRoot);
      }
    }

    record.addedNodes.forEach((node) => {
      const addedElement = elementForNode(node);
      if (!addedElement) {
        return;
      }
      const addedRoot = addedResultRoot(addedElement);
      if (addedRoot) {
        roots.add(addedRoot);
      }
    });
  }

  return [...roots];
}

export function containsAcceptedResultMutation(records: readonly MutationRecord[]): boolean {
  return acceptedResultRoots(records).some(hasAcceptedText);
}

function isSubmitElement(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  const button = target.closest('button, [role="button"], div, span, a');
  const text = [button?.textContent, button?.getAttribute('aria-label'), button?.getAttribute('data-e2e-locator')]
    .filter(Boolean)
    .join(' ')
    .trim();
  return SUBMIT_PATTERNS.some((pattern) => pattern.test(text));
}

export function observeAcceptedSubmission(onAccepted: (context?: AcceptedDomContext) => void): () => void {
  let lastSubmitAt = 0;
  let lastAcceptedAt = 0;
  let lastSubmitPathname: string | undefined;
  let notifyTimer: ReturnType<typeof setTimeout> | undefined;
  const pendingRoots = new Set<Element>();

  const handleClick = (event: MouseEvent) => {
    if (isSubmitElement(event.target)) {
      lastSubmitAt = Date.now();
      lastSubmitPathname = window.location.pathname;
    }
  };

  const maybeNotify = () => {
    notifyTimer = undefined;
    const roots = [...pendingRoots];
    pendingRoots.clear();
    const now = Date.now();
    if (now - lastSubmitAt > RECENT_SUBMIT_WINDOW_MS) {
      return;
    }
    if (now - lastAcceptedAt < 10_000) {
      return;
    }
    if (lastSubmitPathname && window.location.pathname !== lastSubmitPathname) {
      return;
    }
    if (roots.some(hasAcceptedText)) {
      lastAcceptedAt = now;
      onAccepted({ pathname: lastSubmitPathname });
    }
  };

  const handleMutations = (records: MutationRecord[]) => {
    acceptedResultRoots(records).forEach((root) => pendingRoots.add(root));
    if (pendingRoots.size === 0) {
      return;
    }
    if (notifyTimer) {
      clearTimeout(notifyTimer);
    }
    notifyTimer = setTimeout(maybeNotify, OBSERVER_DEBOUNCE_MS);
  };

  const observer = new MutationObserver(handleMutations);
  document.addEventListener('click', handleClick, true);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  return () => {
    if (notifyTimer) {
      clearTimeout(notifyTimer);
    }
    pendingRoots.clear();
    document.removeEventListener('click', handleClick, true);
    observer.disconnect();
  };
}
