// Anime le logo une seule fois, à la toute première ouverture de l'app (après
// installation) — ensuite l'app démarre directement, sans rejouer l'animation
// à chaque lancement. L'écran de démarrage natif (statique) continue de
// s'afficher normalement pendant le chargement ; cette animation prend le
// relais juste après, avant que le contenu normal n'apparaisse.
import { useEffect, useState } from 'react'
import { Lottie } from 'lottie-react'
import splashAnimation from '@/assets/zando_food_splash.json'

const CLE_DEJA_VU = 'zando_intro_vue'

export default function FirstLaunchIntro({ children }) {
  const [afficherIntro, setAfficherIntro] = useState(() => {
    try {
      return !localStorage.getItem(CLE_DEJA_VU)
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (!afficherIntro) return
    // Filet de sécurité si l'évènement onComplete de Lottie ne se déclenche
    // pas (ex. onglet en arrière-plan) — la durée réelle de l'animation est
    // de 204 frames à 60 i/s, soit environ 3,4 s.
    const delai = setTimeout(() => terminerIntro(), 4000)
    return () => clearTimeout(delai)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [afficherIntro])

  function terminerIntro() {
    try {
      localStorage.setItem(CLE_DEJA_VU, '1')
    } catch {
      // Non-bloquant — au pire l'animation se rejouera une fois de plus.
    }
    setAfficherIntro(false)
  }

  if (!afficherIntro) return children

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <Lottie
        src={splashAnimation}
        loop={false}
        autoplay
        subscriptions={{ complete: terminerIntro }}
        className="w-full h-full"
      />
    </div>
  )
}
