import { LunaPreset } from '@lynx-js/luna-tailwind';
import LynxPreset from '@lynx-js/tailwind-preset';
import type { Config } from 'tailwindcss';

/**
 * MotorMarket tokens layered on top of LUNA. Luna already maps the semantic
 * surface/content/primary tokens to CSS variables; this leaf preset only adds
 * what the marketplace needs on top (brand accent, status colours, a larger
 * type scale for prices and headings).
 *
 * The values live in `src/styles/theme.css` (`.mm-light` / `.mm-dark`).
 */
const motorMarketPreset = {
  presets: [],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent)',
          content: 'var(--accent-content)',
          surface: 'var(--accent-surface)',
        },
        success: {
          DEFAULT: 'var(--success)',
          surface: 'var(--success-surface)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          surface: 'var(--danger-surface)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          surface: 'var(--warning-surface)',
        },
        favorite: 'var(--favorite)',
        star: 'var(--star)',
      },
      fontSize: {
        '3xl': ['24px', { lineHeight: '30px' }],
        '4xl': ['28px', { lineHeight: '34px' }],
        '5xl': ['34px', { lineHeight: '40px' }],
      },
    },
  },
} satisfies Partial<Config>;

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  presets: [LynxPreset, LunaPreset, motorMarketPreset],
} satisfies Config;
