import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('content bundle defines', () => {
  it('defines every shared build-time constant used by content scripts', () => {
    const constantsSource = readFileSync('src/shared/constants.ts', 'utf8');
    const bundleScript = readFileSync('scripts/bundle-content.mjs', 'utf8');
    const declaredConstants = [...constantsSource.matchAll(/declare const (__CRUSH_[A-Z0-9_]+__):/g)].map((match) => match[1]);

    expect(declaredConstants.length).toBeGreaterThan(0);
    for (const constant of declaredConstants) {
      expect(bundleScript, `${constant} must be provided to esbuild define`).toContain(constant);
    }
  });

  it('gates destructive debug tooling behind the Vite DEV compile constant', () => {
    const storageSource = readFileSync('src/shared/storage/chromeStorage.ts', 'utf8');
    const optionsSource = readFileSync('src/options/OptionsApp.tsx', 'utf8');
    expect(storageSource).toContain('DEBUG_TOOLS_ENABLED = import.meta.env.DEV');
    expect(storageSource).not.toContain('DEBUG_TOOLS_ENABLED = true');
    expect(optionsSource).toContain('DEBUG_TOOLS_ENABLED && state.metadata.debugMode');
  });
});
