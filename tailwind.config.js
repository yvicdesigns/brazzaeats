/** @type {import('tailwindcss').Config} */
export default {
  // Fichiers scannés pour le tree-shaking des classes inutilisées
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      // ── Palette Zandofood — vert, adoptée depuis la maquette
      // de suivi de livraison (2026-09). Remplace l'ancien orange.
      colors: {
        brand: {
          50:  '#EAF7EF',
          100: '#D3EEDD',
          200: '#A8DDBE',
          300: '#74C79B',
          400: '#3DAB79',
          500: '#12925F', // Couleur principale (theme_color PWA)
          600: '#0B6E4F',
          700: '#0A5940',
          800: '#0A4633',
          900: '#0A3A2B',
          950: '#052017',
        },
        // Accent "en direct" (moto en mouvement, badges live, succès)
        live: {
          50:  '#EEFDF5',
          100: '#D6FBE7',
          300: '#8FF0BC',
          400: '#4FDE8F',
          500: '#2AC479',
          600: '#1EA164',
        },
        // Chaleur locale (avis étoiles, alertes douces) — anciennement "secondary"
        amber: {
          50:  '#FDF6EA',
          100: '#FAEBCE',
          300: '#F0C57D',
          400: '#E8A23D',
          500: '#D98B22',
          600: '#B8721A',
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
