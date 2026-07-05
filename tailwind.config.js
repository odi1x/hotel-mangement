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
        // ---- Warm monochrome base (SSOT: DESIGN-cal.md, warmed) ----
        // Depth model: `page` is a faint warm tint, cards sit on `canvas`
        // (pure white) lifted by a hairline + micro shadow. Cards are now
        // LIGHTER than the page, which is what reads as premium.
        page: '#f7f5f2',            // main scroll area — warm off-white
        canvas: '#ffffff',          // elevated white surfaces: cards, inputs, modals, rails
        ink: '#1c1917',             // warm near-black — headlines & primary
        body: '#44403c',            // warm running text (stone-700)
        muted: '#78716c',           // secondary text (stone-500)
        'muted-soft': '#a8a29e',    // tertiary / captions (stone-400)
        hairline: '#e7e2da',        // warm 1px border
        'hairline-soft': '#f0ebe4', // barely-there divider
        surface: {
          soft: '#f5f2ee',          // nav-pill track, soft fills
          card: '#f2efe9',          // chips, badges, hover, inner boxes
          strong: '#e7e2da',        // image placeholders, disabled
          dark: '#0f0e0d',          // dark-mode floor
          'dark-elevated': '#1a1917',
        },
        primary: {
          DEFAULT: '#1c1917',       // near-black CTA
          active: '#332f2b',
          disabled: '#e7e2da',
        },
        // ---- The single scarce accent. Swap THIS value to rebrand. ----
        // Deep emerald = "money / positive," pairs with warm stone.
        // Alternatives: academy red #b91c1c · navy #1e3a5f · clay #b45309
        accent: {
          DEFAULT: '#0f766e',
          soft: '#0f766e14',        // 8% tint for gentle fills
          strong: '#0b5d56',        // pressed
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
        micro: '0 1px 2px rgba(28,25,23,0.04), 0 1px 3px rgba(28,25,23,0.06)',
        soft: '0 4px 16px rgba(28,25,23,0.08), 0 1px 3px rgba(28,25,23,0.04)',
        pill: '0 1px 2px rgba(28,25,23,0.08)',
        lift: '0 8px 28px rgba(28,25,23,0.10)',
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
    },
  },
  plugins: [],
}
