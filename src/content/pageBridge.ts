import { LOCATION_CHANGE_EVENT } from './navigationEvents';

const BRIDGE_SCRIPT_ID = 'crush-leetcode-page-bridge';
const ACCEPTED_MESSAGE_TYPE = 'QUIZ_RECALL_ACCEPTED_SUBMISSION';
const NAVIGATION_MESSAGE_TYPE = 'QUIZ_RECALL_NAVIGATION';
const BRIDGE_CHANNEL = 'crush-leetcode-page-bridge-v1';

interface AcceptedBridgeMessage {
  channel: typeof BRIDGE_CHANNEL;
  pathname?: string;
  type: typeof ACCEPTED_MESSAGE_TYPE;
}

interface NavigationBridgeMessage {
  channel: typeof BRIDGE_CHANNEL;
  pathname: string;
  type: typeof NAVIGATION_MESSAGE_TYPE;
}

export interface AcceptedSubmissionContext {
  pathname?: string;
}

let navigationListenerInstalled = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key)) && allowedKeys.every((key) => key in value);
}

export function isSafePathname(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048 || !value.startsWith('/')) {
    return false;
  }
  if (/[?#\\\u0000-\u001f\u007f]/.test(value) || value.startsWith('//')) {
    return false;
  }

  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname === value;
  } catch {
    return false;
  }
}

function isProblemPathname(value: unknown): value is string {
  return isSafePathname(value) && /^\/problems\/[a-z0-9][a-z0-9-]*(?:\/[^?#]*)?$/i.test(value);
}

export function isAcceptedBridgeMessage(value: unknown): value is AcceptedBridgeMessage {
  if (!isRecord(value) || !hasOnlyKeys(value, ['channel', 'type', 'pathname'])) {
    return false;
  }
  return (
    value.channel === BRIDGE_CHANNEL &&
    value.type === ACCEPTED_MESSAGE_TYPE &&
    (value.pathname === undefined || isProblemPathname(value.pathname))
  );
}

export function isNavigationBridgeMessage(value: unknown): value is NavigationBridgeMessage {
  if (!isRecord(value) || !hasOnlyKeys(value, ['channel', 'type', 'pathname'])) {
    return false;
  }
  return value.channel === BRIDGE_CHANNEL && value.type === NAVIGATION_MESSAGE_TYPE && isSafePathname(value.pathname);
}

function isTrustedWindowMessage(event: MessageEvent): boolean {
  return event.source === window && event.origin === window.location.origin;
}

function installNavigationMessageListener(): void {
  if (navigationListenerInstalled) {
    return;
  }
  navigationListenerInstalled = true;

  window.addEventListener('message', (event: MessageEvent) => {
    if (!isTrustedWindowMessage(event) || !isNavigationBridgeMessage(event.data)) {
      return;
    }
    if (event.data.pathname !== window.location.pathname) {
      return;
    }
    window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
  });
}

export function installLeetCodeSubmissionBridge(): void {
  installNavigationMessageListener();

  if (document.getElementById(BRIDGE_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement('script');
  script.id = BRIDGE_SCRIPT_ID;
  script.src = chrome.runtime.getURL('assets/pageBridgeInjected.js');
  (document.head || document.documentElement).appendChild(script);
  script.addEventListener('load', () => script.remove());
}

export function listenForAcceptedBridge(onAccepted: (context?: AcceptedSubmissionContext) => void): () => void {
  let lastAcceptedAt = 0;
  const listener = (event: MessageEvent) => {
    if (!isTrustedWindowMessage(event) || !isAcceptedBridgeMessage(event.data)) {
      return;
    }
    const now = Date.now();
    if (now - lastAcceptedAt < 10_000) {
      return;
    }
    lastAcceptedAt = now;
    onAccepted({ pathname: event.data.pathname });
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
