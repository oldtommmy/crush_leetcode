import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onLocationChange } from '../src/content/navigationEvents';
import { installHistoryBridge } from '../src/content/pageBridgeInjected';
import { isAcceptedBridgeMessage, isNavigationBridgeMessage } from '../src/content/pageBridge';

class FakeWindow extends EventTarget {
  location: { href: string; origin: string; pathname: string };
  history: {
    pushState: (state: unknown, title: unknown, url?: string) => void;
    replaceState: (state: unknown, title: unknown, url?: string) => void;
  };
  postMessage = vi.fn();

  constructor(pathname: string) {
    super();
    this.location = { href: `https://leetcode.com${pathname}`, origin: 'https://leetcode.com', pathname };
    const updateLocation = (url?: string) => {
      if (typeof url === 'string') {
        this.location.pathname = new URL(url, this.location.origin).pathname;
        this.location.href = `${this.location.origin}${this.location.pathname}`;
      }
    };
    this.history = {
      pushState: (_state: unknown, _title: unknown, url?: string) => updateLocation(url),
      replaceState: (_state: unknown, _title: unknown, url?: string) => updateLocation(url)
    };
  }
}

let fakeWindow: FakeWindow;

beforeEach(() => {
  vi.useFakeTimers();
  fakeWindow = new FakeWindow('/problems/two-sum/');
  vi.stubGlobal('window', fakeWindow);
  vi.stubGlobal('history', fakeWindow.history);
  vi.stubGlobal('Event', Event);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('onLocationChange', () => {
  it('fires when pushState changes the pathname', () => {
    const onChange = vi.fn();
    const stop = onLocationChange(onChange);

    history.pushState({}, '', '/problems/add-two-numbers/');
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
  });

  it('does not fire when the pathname is unchanged', () => {
    const onChange = vi.fn();
    const stop = onLocationChange(onChange);

    history.pushState({}, '', '/problems/two-sum/');
    expect(onChange).not.toHaveBeenCalled();
    stop();
  });

  it('fires on popstate navigation', () => {
    const onChange = vi.fn();
    const stop = onLocationChange(onChange);

    fakeWindow.location.pathname = '/problems/lru-cache/';
    fakeWindow.dispatchEvent(new Event('popstate'));
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
  });

  it('stops firing after unsubscribe', () => {
    const onChange = vi.fn();
    const stop = onLocationChange(onChange);
    stop();

    history.pushState({}, '', '/problems/merge-intervals/');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reacts to replaceState navigation', () => {
    const onChange = vi.fn();
    const stop = onLocationChange(onChange);

    history.replaceState({}, '', '/problems/group-anagrams/');
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
  });

  it('runs only a bounded set of hydration retries for the navigated pathname', () => {
    const onChange = vi.fn();
    const stop = onLocationChange(onChange, { retryDelaysMs: [10, 20] });

    history.pushState({}, '', '/problems/group-anagrams/');
    vi.advanceTimersByTime(20);

    expect(onChange).toHaveBeenCalledTimes(3);
    stop();
  });
});

describe('bridge message validation', () => {
  it('rejects malformed, cross-channel, and non-path navigation messages', () => {
    expect(
      isNavigationBridgeMessage({
        channel: 'crush-leetcode-page-bridge-v1',
        pathname: '/problems/two-sum/',
        type: 'QUIZ_RECALL_NAVIGATION'
      })
    ).toBe(true);
    expect(
      isNavigationBridgeMessage({
        channel: 'wrong',
        pathname: '/problems/two-sum/',
        type: 'QUIZ_RECALL_NAVIGATION'
      })
    ).toBe(false);
    expect(
      isNavigationBridgeMessage({
        channel: 'crush-leetcode-page-bridge-v1',
        pathname: 'https://attacker.invalid/',
        type: 'QUIZ_RECALL_NAVIGATION'
      })
    ).toBe(false);
    expect(
      isNavigationBridgeMessage({
        channel: 'crush-leetcode-page-bridge-v1',
        extra: true,
        pathname: '/problems/two-sum/',
        type: 'QUIZ_RECALL_NAVIGATION'
      })
    ).toBe(false);
  });

  it('accepts only problem pathnames for accepted-submission messages', () => {
    expect(
      isAcceptedBridgeMessage({
        channel: 'crush-leetcode-page-bridge-v1',
        pathname: '/problems/two-sum/submit/',
        type: 'QUIZ_RECALL_ACCEPTED_SUBMISSION'
      })
    ).toBe(true);
    expect(
      isAcceptedBridgeMessage({
        channel: 'crush-leetcode-page-bridge-v1',
        pathname: '/contest/weekly-contest/',
        type: 'QUIZ_RECALL_ACCEPTED_SUBMISSION'
      })
    ).toBe(false);
  });
});

describe('MAIN-world history bridge', () => {
  it.each(['pushState', 'replaceState'] as const)('signals validated navigation data after %s', (method) => {
    installHistoryBridge();

    history[method]({}, '', '/problems/valid-parentheses/');

    expect(fakeWindow.postMessage).toHaveBeenCalledWith(
      {
        channel: 'crush-leetcode-page-bridge-v1',
        pathname: '/problems/valid-parentheses/',
        type: 'QUIZ_RECALL_NAVIGATION'
      },
      'https://leetcode.com'
    );
  });
});
