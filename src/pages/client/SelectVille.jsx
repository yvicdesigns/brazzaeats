import { useState } from 'react'
import { MapPin, Navigation, Loader2, Bike, Smartphone, ShoppingBag, ChevronRight } from 'lucide-react'
import { VILLES_CONGO } from '@/utils/constants'
import toast from 'react-hot-toast'

// Correspondance coordonnées GPS → ville Congo
const ZONES = [
  { nom: 'Brazzaville',  lat: -4.26,  lng: 15.28,  rayon: 0.5 },
  { nom: 'Pointe-Noire', lat: -4.77,  lng: 11.86,  rayon: 0.5 },
  { nom: 'Dolisie',      lat: -4.20,  lng: 12.67,  rayon: 0.4 },
  { nom: 'Nkayi',        lat: -4.16,  lng: 13.29,  rayon: 0.3 },
  { nom: 'Impfondo',     lat:  1.62,  lng: 18.06,  rayon: 0.3 },
  { nom: 'Ouesso',       lat:  1.61,  lng: 16.05,  rayon: 0.3 },
  { nom: 'Madingou',     lat: -4.15,  lng: 13.55,  rayon: 0.3 },
  { nom: 'Sibiti',       lat: -3.68,  lng: 13.35,  rayon: 0.3 },
  { nom: 'Gamboma',      lat: -1.87,  lng: 15.85,  rayon: 0.3 },
  { nom: 'Owando',       lat: -0.48,  lng: 15.90,  rayon: 0.3 },
]

// Villes avec une illustration dédiée (les autres gardent l'icône pin verte)
const PHOTOS_VILLES = {
  'Brazzaville': '/branding/brazzaville-thumb.webp',
}

const AVANTAGES = [
  { Icone: Bike,        texte: 'Livraison rapide et suivie' },
  { Icone: Smartphone,  texte: 'Paiement Mobile Money (MTN, Airtel)' },
  { Icone: ShoppingBag, texte: 'Commandez en quelques clics' },
]

function detecterVilleGPS(lat, lng) {
  let plusProche = null
  let distMin = Infinity
  for (const z of ZONES) {
    const dist = Math.sqrt((lat - z.lat) ** 2 + (lng - z.lng) ** 2)
    if (dist < distMin) { distMin = dist; plusProche = z }
  }
  return distMin < 1.5 ? plusProche.nom : null
}

export default function SelectVille({ onSelect }) {
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsMessage,  setGpsMessage]  = useState(null) // { type: 'error'|'info', texte }

  function choisirVille(nom) {
    onSelect(nom)
  }

  function utiliserGPS() {
    setGpsMessage(null)

    if (!navigator.geolocation) {
      setGpsMessage({ type: 'error', texte: "La géolocalisation n'est pas disponible sur cet appareil." })
      return
    }

    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const ville = detecterVilleGPS(coords.latitude, coords.longitude)
        setGpsLoading(false)
        if (ville) {
          toast.success(`Ville détectée : ${ville}`)
          onSelect(ville)
        } else {
          setGpsMessage({ type: 'error', texte: "Votre position ne correspond à aucune ville desservie pour l'instant. Choisissez-la manuellement ci-dessous." })
        }
      },
      (error) => {
        setGpsLoading(false)
        if (error.code === error.PERMISSION_DENIED) {
          setGpsMessage({ type: 'error', texte: "Localisation refusée. Autorisez-la dans les réglages de votre téléphone, ou choisissez votre ville manuellement." })
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsMessage({ type: 'error', texte: "Position indisponible pour le moment. Réessayez ou choisissez votre ville manuellement." })
        } else {
          setGpsMessage({ type: 'error', texte: "La détection a pris trop de temps. Réessayez ou choisissez votre ville manuellement." })
        }
      },
      { timeout: 8000 }
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Hero : logo, livreur, slogan, avantages ──────────── */}
      <div className="relative overflow-hidden px-6 pt-10 pb-6">
        {/* Dégradé jaune décoratif (remplace l'image fournie, qui a un fond
            noir non transparent — un dégradé CSS se fond proprement ici) */}
        <div
          className="absolute -top-16 -right-20 w-72 h-72 rounded-full
                     bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 opacity-60"
          aria-hidden="true"
        />
        {/* Silhouette de Brazzaville en fond, très discrète */}
        <img
          src="/branding/brazzaville-hero.webp"
          alt=""
          aria-hidden="true"
          className="absolute top-6 right-0 w-56 opacity-20 object-cover rounded-2xl pointer-events-none"
        />

        <div className="relative z-10 max-w-[62%]">
          <img src="/logo-zando.svg" alt="Zandofood" className="w-32 mb-3" />
          <h1 className="font-['Unbounded'] font-extrabold text-xl text-gray-900 leading-snug mb-5">
            Vos repas préférés livrés chez vous
          </h1>

          <div className="flex gap-3">
            {AVANTAGES.map(({ Icone, texte }) => (
              <div key={texte} className="flex flex-col items-center text-center gap-1.5 flex-1">
                <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                  <Icone className="w-4 h-4 text-brand-600" />
                </div>
                <span className="text-[10px] font-semibold text-gray-700 leading-tight">{texte}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Livreur, à droite, déborde légèrement en bas pour la dynamique */}
        <img
          src="/branding/livreur.webp"
          alt="Livreur Zandofood"
          className="absolute right-[-14px] bottom-[-10px] w-[168px] drop-shadow-xl select-none pointer-events-none"
        />
      </div>

      {/* ── Carte "Dans quelle ville" ─────────────────────────── */}
      <div className="relative px-5">
        {/* Nourriture, à cheval sur la frontière hero / carte */}
        <img
          src="/branding/nourriture.webp"
          alt=""
          aria-hidden="true"
          className="absolute -top-9 right-6 w-28 drop-shadow-lg select-none pointer-events-none z-10"
        />

        <div className="bg-white rounded-3xl border border-gray-100 shadow-card px-5 pt-6 pb-2">
          <div className="flex items-start gap-3 mb-4 max-w-[78%]">
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="font-['Unbounded'] font-extrabold text-lg text-gray-900 leading-snug">
                Dans quelle ville êtes-vous ?
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Choisissez votre ville pour découvrir les restaurants disponibles.
              </p>
            </div>
          </div>

          {/* GPS */}
          <button
            onClick={utiliserGPS}
            disabled={gpsLoading}
            className="w-full flex items-center gap-3 bg-brand-600 rounded-2xl px-4 py-3.5
                       hover:bg-brand-700 transition-colors disabled:opacity-70"
          >
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              {gpsLoading
                ? <Loader2 className="w-4.5 h-4.5 text-white animate-spin" />
                : <Navigation className="w-4.5 h-4.5 text-white" />
              }
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-white text-sm">
                {gpsLoading ? 'Détection en cours…' : 'Utiliser ma position GPS'}
              </p>
              <p className="text-white/80 text-xs">Détection automatique de votre ville</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70 shrink-0" />
          </button>

          {gpsMessage && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mt-3 leading-relaxed">
              {gpsMessage.texte}
            </p>
          )}
        </div>
      </div>

      {/* ── Liste des villes ──────────────────────────────────── */}
      <div className="flex-1 px-5 pt-5 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">ou choisissez une ville</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {VILLES_CONGO.map(({ nom }) => {
            const photo = PHOTOS_VILLES[nom]
            return (
              <button
                key={nom}
                onClick={() => choisirVille(nom)}
                className="flex items-center gap-3 bg-white border border-gray-200
                           rounded-2xl pl-2 pr-3 py-2 hover:border-brand-300 hover:bg-brand-50/40
                           active:scale-95 transition-all text-left"
              >
                {photo ? (
                  <img src={photo} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-brand-600" />
                  </div>
                )}
                <span className="font-bold text-gray-800 text-sm leading-tight flex-1 min-w-0">{nom}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Vous pourrez changer de ville à tout moment
        </p>
      </div>
    </div>
  )
}
