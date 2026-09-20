import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, setState, updateState } from '../src/shared/storage/chromeStorage';
import { STORAGE_KEY } from '../src/shared/constants';
import { createProblem, createState } from './helpers/stateFactory';

/**
 * A2 regression: writes from different JS contexts (popup / options / library /
 * service worker) share chrome.storage.local but run separate in-memory write
 * queues. updateState must not clobber a concurrent write; it detects the
 * revision change and re-applies against fresh state.
 */

function installStore(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };
  const get = vi.fn(async (key: string) => ({ [key]: store[key] }));
  const set = vi.fn(async (items: Record<string, unknown>) => {
    Object.assign(store, items);
  });
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        QUOTA_BYTES: 10 * 1024 * 1024,
        get,
        set
      }
    }
  });
  return { store, get, set };
}

describe('updateState optimistic concurrency (A2)', () => {
  beforeEach(() => {
    installStore();
  });

  it('bumps a monotonic revision on every write', async () => {
    await setState(createState());
    const first = await getState();
    expect(first.metadata.revision).toBe(1);

    await updateState((state) => state);
    const second = await getState();
    expect(second.metadata.revision).toBe(2);
  });

  it('does not lose a concurrent write that lands mid-update', async () => {
    const problemA = createProblem({
      id: 'leetcode:two-sum',
      titleSlug: 'two-sum',
      title: 'Two Sum',
      url: 'https://leetcode.com/problems/two-sum/'
    });
    const problemB = createProblem({
      id: 'leetcode:add-two-numbers',
      titleSlug: 'add-two-numbers',
      title: 'Add Two Numbers',
      url: 'https://leetcode.com/problems/add-two-numbers/'
    });

    await setState(createState({ problemsById: { [problemA.id]: problemA } }));

    // Simulate another context writing problemB after our updater reads state
    // but before it commits. The updater adds a note to a fresh copy of the
    // (stale) state that does NOT contain problemB.
    let injected = false;
    const result = await updateState((state) => {
      if (!injected) {
        injected = true;
        // Another context commits problemB out-of-band, bumping the revision.
        const other = {
          ...state,
          problemsById: { ...state.problemsById, [problemB.id]: problemB }
        };
        // Write directly to the store to emulate a separate JS context.
        (chrome.storage.local.set as unknown as (items: Record<string, unknown>) => Promise<void>)({
          [STORAGE_KEY]: { ...other, metadata: { ...other.metadata, revision: (other.metadata.revision ?? 0) + 1 } }
        });
      }
      return {
        ...state,
        notesByProblemId: {
          ...state.notesByProblemId,
          [problemA.id]: {
            problemId: problemA.id,
            markdown: 'my note',
            createdAt: '2026-09-18T00:00:00.000Z',
            updatedAt: '2026-09-18T00:00:00.000Z'
          }
        }
      };
    });

    // The retry re-reads fresh state (which now has problemB) and re-applies
    // the note, so BOTH survive.
    expect(Object.keys(result.problemsById).sort()).toEqual([problemB.id, problemA.id].sort());
    expect(result.notesByProblemId[problemA.id]?.markdown).toBe('my note');

    const persisted = await getState();
    expect(Object.keys(persisted.problemsById).sort()).toEqual([problemB.id, problemA.id].sort());
    expect(persisted.notesByProblemId[problemA.id]?.markdown).toBe('my note');
  });
});
