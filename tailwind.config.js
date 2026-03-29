/** @type {import('tailwindcss').Config} */
export default {
  // Fichiers scannés pour le tree-shaking des classes inutilisées
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      // ── Palette BrazzaEats ─────────────────────────────
      colors: {
        brand: {
          50:  '#fff4ee',
          100: '#ffe6d5',
          200: '#ffc9aa',
          300: '#ffa374',
          400: '#ff723c',
          500: '#E85D26', // Couleur principale (theme_color PWA)
          600: '#d44a14',
          700: '#b03810',
          800: '#8c2e12',
          900: '#712912',
          950: '#3d1208',
        },
        // Couleur secondaire (vert Congo)
        secondary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },

      // ── Typographie ────────────────────────────────────
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },

      // ── Espacements personnalisés ──────────────────────
      spacing: {
        // Hauteur fixe de la BottomNav mobile
        'bottom-nav': '4rem',
        // Hauteur fixe de la Navbar desktop
        'navbar': '4rem',
      },

      // ── Border radius ──────────────────────────────────
      borderRadius: {
        'xl':  '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },

      // ── Ombres portées ─────────────────────────────────
      boxShadow: {
        'card':    '0 2px 12px 0 rgba(0, 0, 0, 0.08)',
        'card-lg': '0 4px 24px 0 rgba(0, 0, 0, 0.12)',
        'bottom':  '0 -2px 12px 0 rgba(0, 0, 0, 0.06)',
      },

      // ── Animations ─────────────────────────────────────
      keyframes: {
        // Shimmer pour les skeletons de chargement
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        // Pulse discret pour les badges "nouveau"
        'ping-slow': {
          '0%, 100%': { transform: 'scale(1)',   opacity: '1' },
          '50%':      { transform: 'scale(1.15)', opacity: '0.7' },
        },
      },
      animation: {
        shimmer:    'shimmer 1.5s infinite linear',
        'ping-slow': 'ping-slow 2s ease-in-out infinite',
      },

      // ── Breakpoints supplémentaires ────────────────────
      screens: {
        // Mobile petit (Tecno, Itel courants à Brazzaville)
        'xs': '360px',
      },
    },
  },

  plugins: [
    // Plugin formulaires pour styliser les <input>, <select> sans effort
    // npm install -D @tailwindcss/forms  (à installer séparément si besoin)
    // require('@tailwindcss/forms'),
  ],
}
