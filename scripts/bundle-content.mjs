import { build } from 'esbuild';

await build({
  entryPoints: ['src/content/index.tsx'],
  outfile: 'dist/assets/content.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome114'],
  jsx: 'automatic',
  minify: true,
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
  legalComments: 'none'
});
