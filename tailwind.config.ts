import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  important: '#crush-leetcode-root',
  content: ['./popup.html', './options.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        leet: {
          amber: '#ffa116',
          ink: '#1a1a1a',
          panel: '#ffffff',
          panelDark: '#262626'
        }
      }
    }
  },
  plugins: [typography]
} satisfies Config;
