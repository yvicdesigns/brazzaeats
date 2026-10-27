// Anime le logo à chaque démarrage complet de l'app (JS rechargé depuis
// zéro) — c'est-à-dire chaque fois que l'utilisateur rouvre l'app après
// l'avoir fermée pour de bon (pas juste mise en arrière-plan : dans ce cas
// le WebView reste en mémoire et ce composant ne se remonte pas, donc
// l'animation ne rejoue pas, ce qui est le comportement voulu). L'écran de
// démarrage natif (statique) continue de s'afficher normalement pendant le
// chargement ; cette animation prend le relais juste après, avant que le
// contenu normal n'apparaisse.
import { useEffect, useState } from 'react'
import { Lottie } from 'lottie-react'
import splashAnimation from '@/assets/zando_food_splash.json'

export default function FirstLaunchIntro({ children }) {
  const [afficherIntro, setAfficherIntro] = useState(true)

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
