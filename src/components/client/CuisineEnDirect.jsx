import { useState, useEffect } from 'react'

// Messages qui accompagnent l'attente, du plus tôt au plus tard dans le
// délai annoncé (seuil = proportion du temps de préparation écoulée).
const MESSAGES = [
  { seuil: 0,    texte: 'Votre commande a été transmise au chef 👨‍🍳' },
  { seuil: 0.25, texte: 'La préparation est en cours...' },
  { seuil: 0.6,  texte: 'Ça mijote, presque prêt 🔥' },
  { seuil: 0.9,  texte: 'Emballage en cours 📦' },
  { seuil: 1,    texte: 'Encore un petit instant, le chef finalise...' },
]

function messagePour(progression) {
  let texte = MESSAGES[0].texte
  for (const m of MESSAGES) if (progression >= m.seuil) texte = m.texte
  return texte
}

/**
 * Habille l'attente pendant la préparation d'une commande : photo du plat
 * (déjà uploadée par le restaurant) avec une légère animation "vivante",
 * un message qui évolue selon l'avancement du délai annoncé, et une barre
 * de progression. Purement cosmétique — ne remplace pas la timeline.
 */
export default function CuisineEnDirect({ photoUrl, createdAt, dureeMinutes }) {
  const [maintenant, setMaintenant] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const debut = new Date(createdAt).getTime()
  const dureeMs = Math.max(1, dureeMinutes) * 60_000
  const progression = Math.min(1, Math.max(0, (maintenant - debut) / dureeMs))

  return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-orange-100
                    bg-gradient-to-b from-orange-50 to-white">
      <div className="relative h-40 flex items-center justify-center overflow-hidden bg-orange-100/60">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Votre plat en préparation"
            className="w-full h-full object-cover animate-respire"
          />
        ) : (
          <span className="text-6xl animate-respire" role="img" aria-label="Marmite en préparation">
            🍲
          </span>
        )}
        {/* Effet vapeur — purement décoratif */}
        <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none" aria-hidden="true">
          <span className="vapeur" style={{ left: '38%', animationDelay: '0s' }} />
          <span className="vapeur" style={{ left: '50%', animationDelay: '1.1s' }} />
          <span className="vapeur" style={{ left: '62%', animationDelay: '2.2s' }} />
        </div>
      </div>
      <div className="px-4 py-3 text-center">
        <p className="font-bold text-gray-800 text-sm">{messagePour(progression)}</p>
        <div className="mt-2 h-1.5 bg-orange-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.max(4, progression * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
