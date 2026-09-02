/** @type {import('tailwindcss').Config} */

/* ============================================================================
   Rent Flow — Design Tokens (SSOT)

   Palette philosophy: warm monochrome. The page is a subtly warm off-white
   (#fafaf9) so cards (#ffffff) actually feel elevated. Text, hairlines and
   muted tones share that warm undertone via the "stone" family instead of the
   default cool grays. One scarce accent (emerald by default, runtime-themable
   via CSS vars) is reserved for revenue / active / actionable moments.

   Naming convention:
     - Light-mode tokens use their role name: `ink`, `body`, `muted`, `hairline`.
     - Dark-mode counterparts use a `-dark` suffix: `hairline-dark`,
       `body-dark`. This lets `dark:text-body-dark` replace the hundreds of
       inline `dark:text-[#a1a1aa]` leaks scattered through the app.
     - Never invent a shade inline. If a color is missing here, add it here
       first — then use it.
   ========================================================================== */

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
        /* ---- Backgrounds ---- */
        // Page background — a hair off pure white. This is the whole point:
        // cards on canvas white now feel *elevated* instead of "outlined".
        // If you ever need pure white on the page (screenshots, print, etc.),
        // reach for `bg-canvas` explicitly.
        page:   '#fafaf9',        // subtly warm off-white (stone-50-ish)
        canvas: '#ffffff',        // crisp white for cards & elevated surfaces

        /* ---- Text — light mode ---- */
        ink:          '#111111',  // headlines & primary
        body:         '#374151',  // running text
        muted:        '#57534e',  // secondary text — warmed (stone-600)
        'muted-soft': '#78716c',  // tertiary / captions — warmed (stone-500)

        /* ---- Text — dark-mode variants ---- */
        // These replace the hundreds of `dark:text-[#a1a1aa]` leaks throughout
        // the codebase. Use `dark:text-body-dark` instead.
        'ink-dark':  '#f5f5f4',   // primary text in dark
        'body-dark': '#a1a1aa',   // secondary text in dark (was inline [#a1a1aa])

        /* ---- Hairlines / dividers ---- */
        hairline:              '#e7e5e4', // 1px border — warmed (stone-200)
        'hairline-soft':       '#f5f5f4', // barely-there divider — warmed (stone-100)
        'hairline-dark':       '#242424', // dark-mode border (was inline [#242424])
        'hairline-dark-soft':  '#2e2e2e', // dark-mode soft divider (was inline [#2e2e2e])

        /* ---- Surfaces (chips, hovers, dark-mode floors) ---- */
        surface: {
          soft:            '#f8f9fa',  // nav-pill track, soft fills
          card:            '#f5f5f5',  // chips, badges, hover, inner boxes
          strong:          '#e5e7eb',  // image placeholders, disabled
          dark:            '#101010',  // dark-mode floor
          'dark-elevated': '#1a1a1a',  // dark-mode raised surface
        },

        /* ---- Buttons ---- */
        primary: {
          DEFAULT:  '#111111',      // near-black CTA
          active:   '#242424',
          disabled: '#e5e7eb',
        },

        /* ---- Accent — the single scarce color. Runtime-themable via CSS vars.
                Kept for money / active / action moments only. ---- */
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          soft:    'rgb(var(--accent-rgb) / 0.08)',
          strong:  'var(--accent-strong)',
        },
      },

      fontFamily: {
        sans: ['Zain', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },

      /* ---- Type scale — formalized. Roles (from smallest to largest):
              • 2xs   (10px)  — eyebrows, uppercase micro labels
              • xs    (12px)  — captions, meta text
              • sm    (14px)  — default body / UI
              • base  (16px)  — comfortable body
              • lg    (18px)  — subheadings, callouts
              • xl    (20px)  — section headings
              • 2xl   (24px)  — page headings
              • 3xl   (30px)  — display headings (analytics KPIs, hero numbers)
         Each includes a considered line-height + letter-spacing.  ---- */
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        xs:    ['12px', { lineHeight: '16px' }],
        sm:    ['14px', { lineHeight: '20px' }],
        base:  ['16px', { lineHeight: '24px' }],
        lg:    ['18px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
        xl:    ['20px', { lineHeight: '28px', letterSpacing: '-0.015em' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.025em' }],
        '4xl': ['36px', { lineHeight: '40px', letterSpacing: '-0.03em' }],
      },

      borderRadius: {
        md: '8px',   // inputs, small buttons
        lg: '12px',  // cards, most containers
        xl: '16px',  // modals, hero surfaces
      },

      boxShadow: {
        // Layered, low-alpha — depth without heaviness
        micro: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
        soft:  '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        pill:  '0 1px 2px rgba(0,0,0,0.08)',
        lift:  '0 8px 28px rgba(0,0,0,0.10)',
      },

      letterSpacing: {
        tightest: '-0.03em',
      },
    },
  },
  plugins: [],
}
