// ------------------------------------------------------------
// Cache mémoire très simple (module-level, perdu au rechargement complet
// de l'app) — pensé pour le pattern "stale-while-revalidate" : on affiche
// immédiatement la dernière donnée connue pendant qu'on revalide en fond,
// plutôt que de ré-afficher un écran de chargement à chaque navigation
// vers un onglet déjà visité.
// ------------------------------------------------------------
const _cache = new Map()

export function lireCache(cle) {
  return _cache.get(cle)?.data
}

export function ecrireCache(cle, data) {
  _cache.set(cle, { data, horodatage: Date.now() })
}

/**
 * @returns {boolean} true si rien en cache, ou si plus vieux que maxAgeMs
 */
export function estPerime(cle, maxAgeMs) {
  const entree = _cache.get(cle)
  if (!entree) return true
  return Date.now() - entree.horodatage > maxAgeMs
}
