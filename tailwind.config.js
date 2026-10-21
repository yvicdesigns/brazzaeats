/** @type {import('tailwindcss').Config} */
export default {
  // Fichiers scannés pour le tree-shaking des classes inutilisées
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      // ── Palette Zandofood — extraite directement du logo (vert, jaune,
      // terracotta), 2026-10-21. 500 = couleur exacte du logo pour chaque
      // teinte ; le reste de la rampe est calculé proportionnellement.
      colors: {
        brand: {
          50:  '#ECFDF3',
          100: '#C9FADF',
          200: '#84F3B5',
          300: '#38EB87',
          400: '#11AC56',
          500: '#085028', // Vert exact du logo (theme_color PWA)
          600: '#074221',
          700: '#053219',
          800: '#042512',
          900: '#031A0D',
          950: '#021209',
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
        // Jaune exact du logo (avis étoiles, badges, alertes douces)
        amber: {
          50:  '#FFFCF3',
          100: '#FEF6DE',
          200: '#FDEAB4',
          300: '#FCDC85',
          400: '#FACC4C',
          500: '#F9BC14', // Jaune exact du logo
          600: '#D79F05',
          700: '#A37804',
          800: '#795903',
          900: '#574002',
          950: '#3A2B01',
        },
        // Terracotta — nouvelle couleur d'accent du logo (2026-10)
        terracotta: {
          50:  '#FDF7F5',
          100: '#FAEAE4',
          200: '#F4CFC1',
          300: '#EDB09A',
          400: '#E48C6B',
          500: '#DC683C', // Terracotta exact du logo
          600: '#C34F23',
          700: '#933C1A',
          800: '#6D2C14',
          900: '#4E200E',
          950: '#341509',
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
