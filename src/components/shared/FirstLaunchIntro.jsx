// Anime le logo à chaque démarrage complet de l'app (JS rechargé depuis
// zéro) — c'est-à-dire chaque fois que l'utilisateur rouvre l'app après
// l'avoir fermée pour de bon (pas juste mise en arrière-plan : dans ce cas
// le WebView reste en mémoire et ce composant ne se remonte pas, donc
// l'animation ne rejoue pas, ce qui est le comportement voulu).
//
// Le splash natif (fond blanc, voir capacitor.config.ts : launchAutoHide
// false) reste affiché tant qu'on ne le masque pas nous-mêmes ici — et on ne
// le fait qu'au moment précis où l'animation Lottie est prête à jouer sa
// première frame (évènement "ready"), pas avant. Avec un auto-hide par
// simple délai, le splash natif masquait le début de l'animation : le JS
// chargeait et Lottie démarrait pendant que le splash était encore affiché
// par-dessus, donc quand il disparaissait l'animation était déjà bien
// avancée et on n'en voyait que la fin.
import { useEffect, useRef, useState } from 'react'
import { SplashScreen } from '@capacitor/splash-screen'
import { Lottie } from 'lottie-react'
import splashAnimation from '@/assets/zando_food_splash.json'

export default function FirstLaunchIntro({ children }) {
  const [afficherIntro, setAfficherIntro] = useState(true)
  const lottieRef = useRef(null)
  const splashMasque = useRef(false)

  useEffect(() => {
    if (!afficherIntro) return
    // Filet de sécurité si l'évènement onComplete de Lottie ne se déclenche
    // pas (ex. onglet en arrière-plan) — la durée réelle de l'animation est
    // de 204 frames à 60 i/s, soit environ 3,4 s.
    const delai = setTimeout(() => terminerIntro(), 4500)
    return () => clearTimeout(delai)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [afficherIntro])

  function masquerSplashNatif() {
    if (splashMasque.current) return
    splashMasque.current = true
    try {
      SplashScreen.hide()
    } catch {
      // Non-bloquant (ex. plateforme web) — l'overlay Lottie couvre déjà
      // tout l'écran, donc rien n'est visible entre-temps de toute façon.
    }
  }

  function demarrerAnimation() {
    masquerSplashNatif()
    lottieRef.current?.play()
  }

  function terminerIntro() {
    masquerSplashNatif()
    setAfficherIntro(false)
  }

  if (!afficherIntro) return children

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <Lottie
        src={splashAnimation}
        loop={false}
        autoplay={false}
        lottieRef={lottieRef}
        subscriptions={{ ready: demarrerAnimation, complete: terminerIntro }}
        className="w-full h-full"
      />
    </div>
  )
}
