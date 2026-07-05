/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/react-tailwindcss-datepicker/dist/index.esm.{js,ts}'
  ],
  theme: {
    extend: {
      colors: {
        // DESIGN-cal.md — Single Source of Truth tokens
        canvas: '#ffffff',
        ink: '#111111',
        body: '#374151',
        muted: '#6b7280',
        'muted-soft': '#898989',
        hairline: '#e5e7eb',
        'hairline-soft': '#f3f4f6',
        surface: {
          soft: '#f8f9fa',
          card: '#f5f5f5',
          strong: '#e5e7eb',
          dark: '#101010',
          'dark-elevated': '#1a1a1a',
        },
        primary: {
          DEFAULT: '#111111',
          active: '#242424',
          disabled: '#e5e7eb',
        },
      },
      fontFamily: {
        sans: ['Zain', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        // Strict corner scale from DESIGN-cal.md
        md: '8px',   // interactive controls: inputs, selects, buttons
        lg: '12px',  // content blocks, cards, stat tiles
        xl: '16px',  // marquee containers / modal shells
      },
      boxShadow: {
        micro: '0 1px 2px rgba(0,0,0,0.05)',
        soft: '0 4px 12px rgba(0,0,0,0.05)',
        pill: '0 1px 3px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
