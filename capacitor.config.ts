import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zandofood.app',
  appName: 'Zandofood',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      // Fond blanc — le nouveau logo (texte vert + jaune) est illisible sur le
      // vert de la marque, le vert se confondant avec le fond. Cohérent avec
      // l'icône de l'app, qui est déjà sur fond blanc.
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#085028',
      overlaysWebView: false,
    },
    // resize:'none' — le WebView ne se redimensionne plus du tout à
    // l'apparition du clavier (le clavier se contente de recouvrir le bas
    // de l'écran). Évite les incohérences observées avec le redimensionnement
    // natif Android (adjustResize), qui pouvait faire disparaître tout le
    // contenu au-dessus du clavier sur certains appareils.
    Keyboard: {
      resize: 'none',
    },
  },
}

export default config
