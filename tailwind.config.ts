import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  important: '#crush-leetcode-root',
  darkMode: 'class',
  content: ['./popup.html', './options.html', './library.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand)',
          strong: 'var(--brand-strong)',
          soft: 'var(--brand-soft)'
        },
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        elevated: 'var(--elevated)',
        text: {
          DEFAULT: 'var(--text)',
          2: 'var(--text-2)',
          3: 'var(--text-3)'
        },
        border: {
          DEFAULT: 'var(--border)',
          soft: 'var(--border-soft)'
        },
        easy: {
          DEFAULT: 'var(--r-easy)',
          soft: 'var(--r-easy-soft)',
          ink: 'var(--r-easy-ink)'
        },
        good: {
          DEFAULT: 'var(--r-good)',
          soft: 'var(--r-good-soft)',
          ink: 'var(--r-good-ink)'
        },
        hard: {
          DEFAULT: 'var(--r-hard)',
          soft: 'var(--r-hard-soft)',
          ink: 'var(--r-hard-ink)'
        },
        stuck: {
          DEFAULT: 'var(--r-stuck)',
          soft: 'var(--r-stuck-soft)',
          ink: 'var(--r-stuck-ink)'
        },
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
        success: 'var(--success)',
        info: 'var(--info)'
      },
      borderRadius: {
        // NOTE: keys must avoid Tailwind's built-in logical/directional radius
        // prefixes (s/e/t/r/b/l). Using bare `s`/`l` collided with core
        // `rounded-s`/`rounded-l`, which silently overrode full-corner radius.
        xs: 'var(--r-xs)',
        sm: 'var(--r-s)',
        m: 'var(--r-m)',
        lg: 'var(--r-l)',
        xl: 'var(--r-xl)'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        brand: 'var(--shadow-brand)'
      },
      backgroundImage: {
        strength: 'var(--strength-grad)'
      },
      ringColor: {
        brand: 'var(--brand-ring)'
      },
      transitionTimingFunction: {
        spring: 'var(--ease-spring)',
        standard: 'var(--ease-standard)'
      }
    }
  },
  plugins: [typography]
} satisfies Config;
