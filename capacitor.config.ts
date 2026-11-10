import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zandofood.app',
  appName: 'Zandofood',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      // Masqué manuellement depuis FirstLaunchIntro.jsx, exactement au moment
      // où l'animation Lottie est prête à jouer sa toute première frame — pas
      // de durée fixe ici. Avec un auto-hide par délai, le splash natif
      // masquait l'animation pendant qu'elle tournait déjà en dessous : au
      // moment où il disparaissait, l'animation était déjà bien avancée et on
      // ne voyait que sa fin.
      launchAutoHide: false,
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
    // Cette option Keyboard.resize ne s'applique qu'à iOS (voir la doc du
    // plugin) — elle n'a aucun effet sur Android, qui gère son propre
    // comportement séparément via android:windowSoftInputMode="adjustPan"
    // dans AndroidManifest.xml.
    //
    // resize:'native' — la WebView iOS se redimensionne réellement à
    // l'apparition du clavier (comportement standard WebKit). Avec
    // resize:'none' (essayé précédemment), la WebView ne bougeait jamais :
    // un champ situé dans la moitié basse de l'écran (ex. "Mot de passe" à
    // l'inscription) se retrouvait purement caché sous le clavier, sans
    // aucun scroll — ni natif, ni programmatique — possible pour le révéler.
    Keyboard: {
      resize: 'native',
      // Avec resize:'native', l'espace entre le bas de la WebView
      // redimensionnée et le haut du clavier ("backdrop") est noir par
      // défaut (autoBackdropColor vaut 'off' par défaut). 'dom' le fait
      // correspondre à la couleur de fond réelle de la page affichée.
      autoBackdropColor: 'dom',
    },
  },
}

export default config
