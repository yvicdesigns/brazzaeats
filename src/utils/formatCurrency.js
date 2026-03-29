// Formateur monétaire pour le Franc CFA (XAF)
// Utilise l'API Intl native — pas de dépendance externe

/**
 * Formate un montant entier en FCFA avec séparateur de milliers.
 * @param {number} montant — Montant en FCFA (entier)
 * @returns {string} Ex : formatCurrency(2500) → "2 500 FCFA"
 */
export function formatCurrency(montant) {
  if (montant === null || montant === undefined || Number.isNaN(montant)) {
    return '— FCFA'
  }

  // Intl.NumberFormat avec la locale fr-FR produit "2 500" (espace insécable)
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(montant)

  return `${formatted} FCFA`
}

/**
 * Formate un montant en version courte pour les badges et labels compacts.
 * @param {number} montant
 * @returns {string} Ex : formatCurrencyShort(1500000) → "1,5M FCFA"
 */
export function formatCurrencyShort(montant) {
  if (montant === null || montant === undefined || Number.isNaN(montant)) {
    return '— FCFA'
  }

  if (montant >= 1_000_000) {
    const millions = (montant / 1_000_000).toFixed(1).replace('.', ',')
    return `${millions}M FCFA`
  }

  if (montant >= 1_000) {
    const milliers = (montant / 1_000).toFixed(0)
    return `${milliers}k FCFA`
  }

  return formatCurrency(montant)
}

/**
 * Calcule et formate un pourcentage d'un montant.
 * @param {number} montant — Montant de base
 * @param {number} taux — Taux en % (ex : 10 pour 10%)
 * @returns {string} Ex : formatCommission(5000, 10) → "500 FCFA"
 */
export function formatCommission(montant, taux) {
  return formatCurrency(Math.round((montant * taux) / 100))
}
