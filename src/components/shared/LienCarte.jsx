// Petit lien "Voir sur la carte" — n'apparaît que si l'adresse contient
// des coordonnées GPS (capturées par le client au moment de la commande).
import { LocateFixed } from 'lucide-react'

export default function LienCarte({ adresseLivraison, className = '' }) {
  const { latitude, longitude } = adresseLivraison ?? {}
  if (!latitude || !longitude) return null

  return (
    <a
      href={`https://www.google.com/maps?q=${latitude},${longitude}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-xs font-semibold text-brand-600
                  hover:text-brand-700 underline underline-offset-2 ${className}`}
    >
      <LocateFixed className="w-3 h-3" />
      Voir sur la carte
    </a>
  )
}
