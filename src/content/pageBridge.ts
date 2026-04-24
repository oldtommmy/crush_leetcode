const BRIDGE_SCRIPT_ID = 'crush-leetcode-page-bridge';
const ACCEPTED_MESSAGE_TYPE = 'QUIZ_RECALL_ACCEPTED_SUBMISSION';

export function installLeetCodeSubmissionBridge(): void {
  if (document.getElementById(BRIDGE_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement('script');
  script.id = BRIDGE_SCRIPT_ID;
  script.src = chrome.runtime.getURL('assets/pageBridgeInjected.js');
  (document.head || document.documentElement).appendChild(script);
  script.addEventListener('load', () => script.remove());
}

export function listenForAcceptedBridge(onAccepted: () => void): () => void {
  let lastAcceptedAt = 0;
  const listener = (event: MessageEvent) => {
    if (event.source !== window || event.data?.type !== ACCEPTED_MESSAGE_TYPE) {
      return;
    }
    const now = Date.now();
    if (now - lastAcceptedAt < 10_000) {
      return;
    }
    lastAcceptedAt = now;
    onAccepted();
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
