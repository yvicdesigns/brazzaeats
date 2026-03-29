// Badge coloré — mappe automatiquement les valeurs d'enum sur une couleur Tailwind

import { STATUTS_COMMANDE, STATUTS_RESTAURANT } from '@/utils/constants'

/**
 * Badge générique avec couleur explicite.
 *
 * @param {{
 *   label:     string,
 *   couleur?:  string,   // classes Tailwind bg+text (ex: 'bg-green-100 text-green-800')
 *   dot?:      boolean,  // affiche un point coloré à gauche
 *   couleurDot?: string, // classe bg- du point (ex: 'bg-green-500')
 *   className?: string,
 * }} props
 */
export function Badge({ label, couleur = 'bg-gray-100 text-gray-600', dot, couleurDot, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold
                      px-2 py-0.5 rounded-full ${couleur} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${couleurDot ?? 'bg-current'}`} />
      )}
      {label}
    </span>
  )
}

/**
 * Badge pour un statut de commande — couleur déduite automatiquement.
 *
 * @param {{ statut: string, dot?: boolean, className?: string }} props
 */
export function BadgeStatutCommande({ statut, dot = false, className = '' }) {
  const cfg = STATUTS_COMMANDE[statut]
  if (!cfg) return <Badge label={statut} className={className} />

  return (
    <Badge
      label={cfg.label}
      couleur={cfg.couleur}
      dot={dot}
      couleurDot={cfg.couleurDot}
      className={className}
    />
  )
}

/**
 * Badge pour un statut de restaurant — couleur déduite automatiquement.
 *
 * @param {{ statut: string, className?: string }} props
 */
export function BadgeStatutRestaurant({ statut, className = '' }) {
  const cfg = STATUTS_RESTAURANT[statut]
  if (!cfg) return <Badge label={statut} className={className} />

  return <Badge label={cfg.label} couleur={cfg.couleur} className={className} />
}

// Export par défaut = Badge générique
export default Badge
