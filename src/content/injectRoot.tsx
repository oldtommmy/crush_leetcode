import { createRoot, type Root } from 'react-dom/client';

const HOST_ID = 'crush-leetcode-host';
const ROOT_ID = 'crush-leetcode-root';
const STYLE_ID = 'crush-leetcode-style';

function ensureShadowRoot(host: HTMLElement): ShadowRoot {
  return host.shadowRoot ?? host.attachShadow({ mode: 'open' });
}

function ensureStyles(shadowRoot: ShadowRoot): void {
  if (shadowRoot.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('link');
  style.id = STYLE_ID;
  style.rel = 'stylesheet';
  style.href = chrome.runtime.getURL('assets/style.css');
  shadowRoot.appendChild(style);
}

export function ensureInjectedRoot(): { element: HTMLElement; root: Root } {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    document.documentElement.appendChild(host);
  }

  const shadowRoot = ensureShadowRoot(host);
  ensureStyles(shadowRoot);

  let element = shadowRoot.getElementById(ROOT_ID);
  if (!element) {
    element = document.createElement('div');
    element.id = ROOT_ID;
    shadowRoot.appendChild(element);
  }

  const existingRoot = (element as HTMLElement & { __quizRecallRoot?: Root }).__quizRecallRoot;
  if (existingRoot) {
    return { element, root: existingRoot };
  }

  const root = createRoot(element);
  (element as HTMLElement & { __quizRecallRoot?: Root }).__quizRecallRoot = root;
  return { element, root };
}
