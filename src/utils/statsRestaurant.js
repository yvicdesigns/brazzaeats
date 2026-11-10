// Calcul des indicateurs du tableau de bord restaurant, à partir des commandes brutes.
// Chiffre d'affaires = prix des plats remises déduites : montant_total − frais_livraison
// (les frais de livraison reviennent au livreur, pas au restaurant).

const JOUR_MS = 24 * 60 * 60 * 1000

export const PERIODES = {
  jour:    { label: "Aujourd'hui", jours: 1 },
  semaine: { label: '7 jours',     jours: 7 },
  mois:    { label: '30 jours',    jours: 30 },
}

export function caCommande(c) {
  return Math.max(0, (c.montant_total ?? 0) - (c.frais_livraison ?? 0))
}

function debutJour(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Bornes [début, fin[ de la période et de la période précédente de même durée. */
export function bornesPeriode(periode, maintenant = new Date()) {
  const jours = PERIODES[periode]?.jours ?? 7
  const fin = new Date(debutJour(maintenant).getTime() + JOUR_MS)
  const debut = new Date(fin.getTime() - jours * JOUR_MS)
  const debutPrecedent = new Date(debut.getTime() - jours * JOUR_MS)
  return { debut, fin, debutPrecedent }
}

function dans(c, debut, fin) {
  const t = new Date(c.created_at).getTime()
  return t >= debut.getTime() && t < fin.getTime()
}

/** Variation en % entre deux valeurs, null si rien à comparer. */
export function variation(actuel, precedent) {
  if (!precedent) return null
  return Math.round(((actuel - precedent) / precedent) * 100)
}

export function calculerStats(commandes, periode, maintenant = new Date()) {
  const { debut, fin, debutPrecedent } = bornesPeriode(periode, maintenant)
  const livrees = (cs) => cs.filter(c => c.statut === 'livrée')

  const courantes   = commandes.filter(c => dans(c, debut, fin))
  const precedentes = commandes.filter(c => dans(c, debutPrecedent, debut))
  const livreesCourantes   = livrees(courantes)
  const livreesPrecedentes = livrees(precedentes)

  const ca          = livreesCourantes.reduce((s, c) => s + caCommande(c), 0)
  const caPrecedent = livreesPrecedentes.reduce((s, c) => s + caCommande(c), 0)
  const nb          = livreesCourantes.length
  const nbPrecedent = livreesPrecedentes.length
  const panier          = nb ? Math.round(ca / nb) : 0
  const panierPrecedent = nbPrecedent ? Math.round(caPrecedent / nbPrecedent) : 0

  const annulees = courantes.filter(c => c.statut === 'annulée').length
  const terminees = nb + annulees
  const delais = courantes.map(c => c.temps_preparation_minutes).filter(v => v != null)

  // CA par jour (7 barres pour 1 ou 7 jours, 30 pour 30 jours)
  const nbBarres = Math.max(7, PERIODES[periode]?.jours ?? 7)
  const finBarres = fin.getTime()
  const parJour = Array.from({ length: nbBarres }, (_, i) => {
    const d = new Date(finBarres - (nbBarres - i) * JOUR_MS)
    return { date: d, ca: 0, estAujourdhui: i === nbBarres - 1 }
  })
  for (const c of livrees(commandes)) {
    const idx = Math.floor((debutJour(c.created_at).getTime() - parJour[0].date.getTime()) / JOUR_MS)
    if (idx >= 0 && idx < nbBarres) parJour[idx].ca += caCommande(c)
  }

  const parPlat = new Map()
  for (const c of livreesCourantes) {
    for (const oi of c.order_items ?? []) {
      const nom = oi.menu_item?.nom ?? '—'
      const p = parPlat.get(nom) ?? { nom, quantite: 0, ca: 0 }
      p.quantite += oi.quantite ?? 0
      p.ca += oi.sous_total ?? 0
      parPlat.set(nom, p)
    }
  }
  const topPlats = [...parPlat.values()].sort((a, b) => b.quantite - a.quantite).slice(0, 5)

  return {
    ca,             variationCa:     variation(ca, caPrecedent),
    nbLivrees: nb,  variationNb:     variation(nb, nbPrecedent),
    panierMoyen: panier, variationPanier: variation(panier, panierPrecedent),
    annulees,
    tauxReussite: terminees ? Math.round((nb / terminees) * 100) : null,
    delaiMoyen:   delais.length ? Math.round(delais.reduce((s, v) => s + v, 0) / delais.length) : null,
    parJour,
    topPlats,
  }
}

/** Nombre de commandes par étape du service (toutes dates confondues). */
export function compterEtapes(commandesActives) {
  const n = (statuts) => commandesActives.filter(c => statuts.includes(c.statut)).length
  return {
    nouvelles: n(['en_attente']),
    cuisine:   n(['acceptée', 'en_préparation']),
    pretes:    n(['prête']),
    livraison: n(['en_livraison']),
  }
}
