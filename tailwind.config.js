/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/react-tailwindcss-datepicker/dist/index.esm.{js,ts}'
  ],
  // Safelisted so the datepicker's runtime-built color classes are never purged
  // (the library concatenates `bg-${primaryColor}-500` etc., invisible to JIT).
  safelist: [
    { pattern: /(bg|text|border|ring)-neutral-(100|200|300|400|500|600|700|800|900)/ },
  ],
  theme: {
    extend: {
      colors: {
        // ---- Original monochrome base (SSOT: DESIGN-cal.md) restored ----
        // Background reverted to clean white per request; accent retained.
        page: '#ffffff',            // main scroll area — back to white
        canvas: '#ffffff',          // elevated white surfaces
        ink: '#111111',             // headlines & primary
        body: '#374151',            // running text
        muted: '#6b7280',           // secondary text
        'muted-soft': '#898989',    // tertiary / captions
        hairline: '#e5e7eb',        // 1px border
        'hairline-soft': '#f3f4f6', // barely-there divider
        surface: {
          soft: '#f8f9fa',          // nav-pill track, soft fills
          card: '#f5f5f5',          // chips, badges, hover, inner boxes
          strong: '#e5e7eb',        // image placeholders, disabled
          dark: '#101010',          // dark-mode floor
          'dark-elevated': '#1a1a1a',
        },
        primary: {
          DEFAULT: '#111111',       // near-black CTA
          active: '#242424',
          disabled: '#e5e7eb',
        },
        // ---- The single scarce accent (kept). Now runtime-themeable via CSS vars. ----
        // Change the active theme in Settings; these read --accent-rgb / --accent-strong.
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          soft: 'rgb(var(--accent-rgb) / 0.08)',
          strong: 'var(--accent-strong)',
        },
      },
      fontFamily: {
        sans: ['Zain', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        // Layered, low-alpha — depth without heaviness
        micro: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
        soft: '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        pill: '0 1px 2px rgba(0,0,0,0.08)',
        lift: '0 8px 28px rgba(0,0,0,0.10)',
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
    },
  },
  plugins: [],
}
