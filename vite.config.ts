import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const announcementsUrl = env.VITE_CRUSH_ANNOUNCEMENTS_URL || '';
  const dailyCompletionMessagesUrl = env.VITE_CRUSH_DAILY_COMPLETION_MESSAGES_URL || '';
  const supabaseUrl = env.VITE_CRUSH_SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_CRUSH_SUPABASE_ANON_KEY || '';

  return {
  plugins: [react()],
  define: {
    __CRUSH_ANNOUNCEMENTS_URL__: JSON.stringify(announcementsUrl),
    __CRUSH_DAILY_COMPLETION_MESSAGES_URL__: JSON.stringify(dailyCompletionMessagesUrl),
    __CRUSH_SUPABASE_URL__: JSON.stringify(supabaseUrl),
    __CRUSH_SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey)
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        options: resolve(__dirname, 'options.html'),
        library: resolve(__dirname, 'library.html'),
        background: resolve(__dirname, 'src/background/serviceWorker.ts'),
        content: resolve(__dirname, 'src/content/index.tsx')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  },
  test: {
    environment: 'node',
    globals: true
  }
  };
});
