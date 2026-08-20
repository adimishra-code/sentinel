/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors - professional enterprise SaaS
        brand: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0c1e33',
        },
        // Status colors for critical/high/medium/low
        status: {
          critical: {
            50: '#fef0f0',
            100: '#fcdcdc',
            200: '#f9b5b5',
            300: '#f48282',
            400: '#ed5353',
            500: '#e53535',  // Main critical
            600: '#d02424',
            700: '#b01c1c',
            800: '#901919',
            900: '#751818',
          },
          high: {
            50: '#fff4ed',
            100: '#ffe8cc',
            200: '#ffd199',
            300: '#ffb366',
            400: '#ff9033',
            500: '#ff7000',  // Main high
            600: '#e65c00',
            700: '#cc4d00',
            800: '#b34000',
            900: '#993600',
          },
          medium: {
            50: '#fffde7',
            100: '#fff9c4',
            200: '#fff59d',
            300: '#fff176',
            400: '#ffee58',
            500: '#ffeb3b',  // Main medium
            600: '#fdd835',
            700: '#fbc02d',
            800: '#f9a825',
            900: '#f57f17',
          },
          low: {
            50: '#e8f5e9',
            100: '#c8e6c9',
            200: '#a5d6a7',
            300: '#81c784',
            400: '#66bb6a',
            500: '#4caf50',  // Main low
            600: '#43a047',
            700: '#388e3c',
            800: '#2e7d32',
            900: '#1b5e20',
          },
          info: {
            50: '#e3f2fd',
            100: '#bbdefb',
            200: '#90caf9',
            300: '#64b5f6',
            400: '#42a5f5',
            500: '#2196f3',  // Main info
            600: '#1e88e5',
            700: '#1976d2',
            800: '#1565c0',
            900: '#0d47a1',
          },
        },
        // Neutral grays
        neutral: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Surface colors
        surface: {
          primary: '#ffffff',
          secondary: '#fafafa',
          tertiary: '#f5f5f5',
          inverted: '#171717',
        },
        // Border colors
        border: {
          light: '#e5e5e5',
          medium: '#d4d4d4',
          dark: '#a3a3a3',
          focus: '#2196f3',
          error: '#e53535',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'display-sm': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'heading-xl': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'heading-lg': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'heading-md': ['1.125rem', { lineHeight: '1.4' }],
        'heading-sm': ['1rem', { lineHeight: '1.4' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body-md': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'body-xs': ['0.75rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
        'overline': ['0.625rem', { lineHeight: '1.4', letterSpacing: '0.08em', textTransform: 'uppercase' }],
      },
      spacing: {
        '0': '0',
        '1': '0.25rem',   // 4px
        '2': '0.5rem',    // 8px
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '5': '1.25rem',   // 20px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '10': '2.5rem',   // 40px
        '12': '3rem',     // 48px
        '16': '4rem',     // 64px
        '20': '5rem',     // 80px
        '24': '6rem',     // 96px,
      },
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',   // 4px
        'md': '0.375rem',  // 6px
        'lg': '0.5rem',    // 8px
        'xl': '0.75rem',   // 12px
        '2xl': '1rem',     // 16px
        'full': '9999px',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'focus': '0 0 0 3px rgb(33 150 243 / 0.4)',
        'focus-error': '0 0 0 3px rgb(229 53 53 / 0.4)',
      },
      transitionDuration: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
      },
      transitionTimingFunction: {
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      zIndex: {
        'hide': '-1',
        'base': '0',
        'dropdown': '100',
        'sticky': '200',
        'overlay': '300',
        'modal': '400',
        'popover': '500',
        'tooltip': '600',
        'toast': '700',
      },
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};