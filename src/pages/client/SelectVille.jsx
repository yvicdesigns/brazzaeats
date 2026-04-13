import { useState } from 'react'
import { MapPin, Navigation, Loader2 } from 'lucide-react'
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

  function choisirVille(nom) {
    onSelect(nom)
  }

  function utiliserGPS() {
    if (!navigator.geolocation) {
      toast.error('GPS non disponible sur cet appareil')
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
          toast.error('Ville non reconnue. Choisissez manuellement.')
        }
      },
      () => {
        setGpsLoading(false)
        toast.error('Impossible d\'accéder au GPS. Choisissez manuellement.')
      },
      { timeout: 8000 }
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 to-orange-600 flex flex-col">

      {/* Header */}
      <div className="px-6 pt-16 pb-8 text-center text-white">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🍽️</span>
        </div>
        <h1 className="text-3xl font-black mb-2">Zandofood</h1>
        <p className="text-white/80 text-base">Dans quelle ville êtes-vous ?</p>
      </div>

      {/* Card villes */}
      <div className="flex-1 bg-white rounded-t-3xl px-5 pt-6 pb-8">

        {/* GPS */}
        <button
          onClick={utiliserGPS}
          disabled={gpsLoading}
          className="w-full flex items-center gap-3 bg-brand-50 border-2 border-brand-200
                     rounded-2xl px-4 py-3.5 mb-5 hover:bg-brand-100 transition-colors
                     disabled:opacity-60"
        >
          {gpsLoading
            ? <Loader2 className="w-5 h-5 text-brand-500 animate-spin shrink-0" />
            : <Navigation className="w-5 h-5 text-brand-500 shrink-0" />
          }
          <div className="text-left">
            <p className="font-bold text-brand-700 text-sm">
              {gpsLoading ? 'Détection en cours…' : 'Utiliser ma position GPS'}
            </p>
            <p className="text-brand-500 text-xs">Détection automatique de votre ville</p>
          </div>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">ou choisissez</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Liste des villes */}
        <div className="grid grid-cols-2 gap-3">
          {VILLES_CONGO.map(({ nom, emoji }) => (
            <button
              key={nom}
              onClick={() => choisirVille(nom)}
              className="flex items-center gap-3 bg-gray-50 border border-gray-200
                         rounded-2xl px-4 py-3.5 hover:bg-brand-50 hover:border-brand-300
                         active:scale-95 transition-all text-left"
            >
              <span className="text-xl shrink-0">{emoji}</span>
              <span className="font-semibold text-gray-800 text-sm leading-tight">{nom}</span>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Vous pourrez changer de ville à tout moment
        </p>
      </div>
    </div>
  )
}
