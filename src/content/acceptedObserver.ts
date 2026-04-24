const ACCEPTED_PATTERNS = [/^Accepted$/i, /^通过$/];
const SUBMIT_PATTERNS = [/Submit/i, /提交/, /提交代码/];
const RECENT_SUBMIT_WINDOW_MS = 2 * 60 * 1000;

function hasAcceptedText(): boolean {
  const visibleText = document.body.innerText;
  return ACCEPTED_PATTERNS.some((pattern) => pattern.test(visibleText)) || /\bAccepted\b/.test(visibleText);
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

export function observeAcceptedSubmission(onAccepted: () => void): () => void {
  let lastSubmitAt = 0;
  let lastAcceptedAt = 0;

  const handleClick = (event: MouseEvent) => {
    if (isSubmitElement(event.target)) {
      lastSubmitAt = Date.now();
    }
  };

  const maybeNotify = () => {
    const now = Date.now();
    if (now - lastSubmitAt > RECENT_SUBMIT_WINDOW_MS) {
      return;
    }
    if (now - lastAcceptedAt < 10_000) {
      return;
    }
    if (hasAcceptedText()) {
      lastAcceptedAt = now;
      onAccepted();
    }
  };

  const observer = new MutationObserver(() => maybeNotify());
  document.addEventListener('click', handleClick, true);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  return () => {
    document.removeEventListener('click', handleClick, true);
    observer.disconnect();
  };
}
