import { describe, expect, it, vi } from 'vitest';
import { createSingleFlight } from '../src/background/singleFlight';

describe('single flight', () => {
  it('joins concurrent calls and allows a later execution after settlement', async () => {
    let resolve: ((value: number) => void) | undefined;
    const task = vi.fn(() => new Promise<number>((done) => {
      resolve = done;
    }));
    const run = createSingleFlight(task);

    const first = run();
    const second = run();
    expect(task).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);

    resolve?.(7);
    await expect(Promise.all([first, second])).resolves.toEqual([7, 7]);

    const third = run();
    expect(task).toHaveBeenCalledTimes(2);
    resolve?.(9);
    await expect(third).resolves.toBe(9);
  });

  it('releases the slot after a rejection', async () => {
    const task = vi.fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce('ok');
    const run = createSingleFlight(task);

    await expect(run()).rejects.toThrow('failed');
    await expect(run()).resolves.toBe('ok');
    expect(task).toHaveBeenCalledTimes(2);
  });
});
