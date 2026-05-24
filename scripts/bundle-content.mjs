import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

for (const file of ['.env.local', '.env']) {
  try {
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index <= 0) return;
        const key = trimmed.slice(0, index).trim();
        const value = trimmed.slice(index + 1).trim();
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      });
  } catch {
    // Optional local env files are not required for generic builds.
  }
}

const define = {
  __CRUSH_ANNOUNCEMENTS_URL__: JSON.stringify(process.env.VITE_CRUSH_ANNOUNCEMENTS_URL || ''),
  __CRUSH_DAILY_COMPLETION_MESSAGES_URL__: JSON.stringify(process.env.VITE_CRUSH_DAILY_COMPLETION_MESSAGES_URL || ''),
  __CRUSH_SUPABASE_URL__: JSON.stringify(process.env.VITE_CRUSH_SUPABASE_URL || ''),
  __CRUSH_SUPABASE_ANON_KEY__: JSON.stringify(process.env.VITE_CRUSH_SUPABASE_ANON_KEY || '')
};

await build({
  entryPoints: ['src/content/index.tsx'],
  outfile: 'dist/assets/content.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome114'],
  jsx: 'automatic',
  minify: true,
  sourcemap: true,
  sourcesContent: true,
  define,
  legalComments: 'none'
});

await build({
  entryPoints: ['src/content/pageBridgeInjected.ts'],
  outfile: 'dist/assets/pageBridgeInjected.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome114'],
  minify: true,
  sourcemap: true,
  sourcesContent: true,
  define,
  legalComments: 'none'
});
