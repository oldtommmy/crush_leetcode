import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onLocationChange } from '../src/content/navigationEvents';

/**
 * C1 regression: navigation is event-driven, not polled. We stub a minimal
 * window + history so this runs in the node test environment (no jsdom).
 */

class FakeWindow extends EventTarget {
  location: { pathname: string };
  history: {
    pushState: (state: unknown, title: unknown, url?: string) => void;
    replaceState: (state: unknown, title: unknown, url?: string) => void;
  };

  constructor(pathname: string) {
    super();
    this.location = { pathname };
    // Base history methods that also update location, mirroring the browser.
    this.history = {
      pushState: (_state: unknown, _title: unknown, url?: string) => {
        if (typeof url === 'string') {
          this.location.pathname = url;
        }
      },
      replaceState: (_state: unknown, _title: unknown, url?: string) => {
        if (typeof url === 'string') {
          this.location.pathname = url;
        }
      }
    };
  }
}

let fakeWindow: FakeWindow;

beforeEach(() => {
  fakeWindow = new FakeWindow('/problems/two-sum/');
  vi.stubGlobal('window', fakeWindow);
  vi.stubGlobal('history', fakeWindow.history);
  vi.stubGlobal('Event', Event);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('onLocationChange (C1)', () => {
  it('fires when pushState changes the pathname', () => {
    const onChange = vi.fn();
    onLocationChange(onChange);

    history.pushState({}, '', '/problems/add-two-numbers/');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not fire when the pathname is unchanged', () => {
    const onChange = vi.fn();
    onLocationChange(onChange);

    // A same-page state push (e.g. tab switch that keeps the URL) must not churn.
    history.pushState({}, '', '/problems/two-sum/');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('fires on popstate navigation', () => {
    const onChange = vi.fn();
    onLocationChange(onChange);

    fakeWindow.location.pathname = '/problems/lru-cache/';
    fakeWindow.dispatchEvent(new Event('popstate'));
    expect(onChange).toHaveBeenCalledTimes(1);
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
    onLocationChange(onChange);

    history.replaceState({}, '', '/problems/group-anagrams/');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
