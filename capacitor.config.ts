import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zandofood.app',
  appName: 'Zandofood',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0B6E4F',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B6E4F',
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
