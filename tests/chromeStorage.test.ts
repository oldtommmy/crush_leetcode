import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getState, MAX_NOTE_MARKDOWN_BYTES, saveNote } from '../src/shared/storage/chromeStorage';
import { STORAGE_KEY } from '../src/shared/constants';

describe('chromeStorage', () => {
  const get = vi.fn();
  const set = vi.fn();

  beforeEach(() => {
    get.mockResolvedValue({});
    set.mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          QUOTA_BYTES: 1024 * 1024,
          get,
          set
        }
      }
    });
  });

  it('rejects oversized notes before writing storage', async () => {
    await expect(saveNote('leetcode:two-sum', 'x'.repeat(MAX_NOTE_MARKDOWN_BYTES + 1))).rejects.toThrow('Note is too large');

    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it('defaults missing and invalid pet sizes to medium during migration', async () => {
    get.mockResolvedValue({
      [STORAGE_KEY]: {
        settings: { petSize: 'giant' }
      }
    });

    expect((await getState()).settings.petSize).toBe('medium');

    get.mockResolvedValue({
      [STORAGE_KEY]: {
        settings: {}
      }
    });
    expect((await getState()).settings.petSize).toBe('medium');
  });
});
