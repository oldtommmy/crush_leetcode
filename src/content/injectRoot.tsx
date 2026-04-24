import { createRoot, type Root } from 'react-dom/client';

const ROOT_ID = 'crush-leetcode-root';

export function ensureInjectedRoot(): { element: HTMLElement; root: Root } {
  let element = document.getElementById(ROOT_ID);
  if (!element) {
    element = document.createElement('div');
    element.id = ROOT_ID;
    document.documentElement.appendChild(element);
  }

  const existingRoot = (element as HTMLElement & { __quizRecallRoot?: Root }).__quizRecallRoot;
  if (existingRoot) {
    return { element, root: existingRoot };
  }

  const root = createRoot(element);
  (element as HTMLElement & { __quizRecallRoot?: Root }).__quizRecallRoot = root;
  return { element, root };
}
