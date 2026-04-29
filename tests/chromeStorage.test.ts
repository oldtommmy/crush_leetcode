import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_NOTE_MARKDOWN_BYTES, saveNote } from '../src/shared/storage/chromeStorage';

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
});
