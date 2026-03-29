// Placeholders de chargement animés (pulse) — évite le layout shift pendant les fetches

/**
 * Bloc générique avec animation pulse.
 * @param {{ className?: string }} props
 */
export function SkeletonBlock({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
  )
}

/**
 * Skeleton d'une carte restaurant (logo + textes).
 */
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card">
      {/* Image */}
      <div className="animate-pulse bg-gray-200 h-40 w-full" />
      <div className="p-3 space-y-2">
        {/* Nom */}
        <div className="animate-pulse bg-gray-200 rounded-lg h-4 w-3/4" />
        {/* Sous-titre */}
        <div className="animate-pulse bg-gray-200 rounded-lg h-3 w-1/2" />
        {/* Tags */}
        <div className="flex gap-2 pt-1">
          <div className="animate-pulse bg-gray-200 rounded-full h-5 w-14" />
          <div className="animate-pulse bg-gray-200 rounded-full h-5 w-10" />
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton d'un avatar circulaire.
 * @param {{ taille?: number }} props — taille en pixels (défaut 40)
 */
export function SkeletonAvatar({ taille = 40 }) {
  return (
    <div
      className="animate-pulse bg-gray-200 rounded-full shrink-0"
      style={{ width: taille, height: taille }}
    />
  )
}

/**
 * Skeleton d'une ligne de texte.
 * @param {{ largeur?: string }} props — classe Tailwind de largeur (défaut 'w-full')
 */
export function SkeletonText({ largeur = 'w-full' }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg h-3.5 ${largeur}`} />
}

/**
 * Skeleton d'une ligne de commande (avatar + deux lignes de texte).
 */
export function SkeletonLigneCommande() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <SkeletonAvatar taille={40} />
      <div className="flex-1 space-y-2">
        <SkeletonText largeur="w-1/2" />
        <SkeletonText largeur="w-1/3" />
      </div>
      <SkeletonBlock className="h-6 w-16" />
    </div>
  )
}

// Export par défaut = SkeletonBlock pour les cas simples
export default SkeletonBlock
