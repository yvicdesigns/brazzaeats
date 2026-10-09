// ------------------------------------------------------------
// File d'attente hors-ligne — pour les actions du livreur qui ne doivent
// JAMAIS se perdre à cause d'une coupure réseau (ex: "marquer livré" au
// moment précis où le livreur est chez le client, en zone de mauvaise
// couverture). Persistée en localStorage pour survivre à une fermeture de
// l'app entre la coupure et le retour du réseau.
//
// Ne concerne QUE les actions dont le rejeu tardif est sûr (idempotentes,
// sans risque de course) — surtout pas "accepter une livraison" (une vraie
// course contre les autres livreurs, retenter en aveugle 2 minutes plus
// tard n'aurait aucun sens).
// ------------------------------------------------------------
const CLE_STOCKAGE = 'zando_offline_queue_v1'
const DELAI_BASE_MS = 3000
const DELAI_MAX_MS  = 60000

const handlers = new Map()
const abonnes  = new Set()

let file = chargerFile()
let enTraitement = false

function chargerFile() {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    return brut ? JSON.parse(brut) : []
  } catch {
    return []
  }
}

function sauvegarderFile() {
  try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(file)) } catch { /* stockage indisponible/plein — tant pis */ }
  abonnes.forEach(fn => fn(file.length))
}

/** Enregistre la fonction qui exécute réellement une action d'un type donné. */
export function enregistrerHandler(type, fn) {
  handlers.set(type, fn)
}

/** Ajoute une action à la file et tente une synchro immédiate. */
export function enfiler(type, payload) {
  file.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type, payload,
    tentatives: 0,
    prochainEssai: Date.now(),
  })
  sauvegarderFile()
  traiterFile()
}

/** Nombre d'actions en attente de synchronisation. */
export function nbEnAttente() {
  return file.length
}

/** S'abonne aux changements de taille de la file (pour l'UI) — renvoie la fonction de désabonnement. */
export function surChangement(fn) {
  abonnes.add(fn)
  return () => abonnes.delete(fn)
}

/**
 * Distingue une erreur réseau (à retenter plus tard) d'un vrai rejet
 * serveur (à abandonner — le rejouer indéfiniment ne changerait rien).
 */
export function estErreurReseau(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = (err?.message || String(err ?? '')).toLowerCase()
  return msg.includes('failed to fetch')
    || msg.includes('network')
    || msg.includes('load failed')
    || msg.includes('délai dépassé')
    || msg.includes('timeout')
}

/** Traite la file : exécute les actions dont l'heure est venue. */
export async function traiterFile() {
  if (enTraitement) return
  enTraitement = true
  try {
    const maintenant = Date.now()
    for (const item of [...file]) {
      if (item.prochainEssai > maintenant) continue
      const handler = handlers.get(item.type)
      if (!handler) continue // type inconnu (ancienne version de l'app ?) — laissé de côté, pas perdu

      try {
        await handler(item.payload)
        file = file.filter(f => f.id !== item.id)
        sauvegarderFile()
      } catch (err) {
        if (!estErreurReseau(err)) {
          // Vrai rejet serveur (droits, donnée invalide...) — pas la peine de rejouer indéfiniment
          console.error('[offlineQueue] Action abandonnée (erreur non réseau) :', item.type, err)
          file = file.filter(f => f.id !== item.id)
          sauvegarderFile()
          continue
        }
        item.tentatives += 1
        item.prochainEssai = Date.now() + Math.min(DELAI_BASE_MS * 2 ** item.tentatives, DELAI_MAX_MS)
        sauvegarderFile()
      }
    }
  } finally {
    enTraitement = false
  }
}

// ── Déclenche une resynchro dès que le réseau revient ────────────
if (typeof window !== 'undefined') {
  window.addEventListener('online', traiterFile)
  // Filet de sécurité : l'évènement 'online' n'est pas toujours fiable à
  // 100% dans une WebView native — on revérifie aussi périodiquement.
  setInterval(traiterFile, 15000)
  // Rejoue ce qui a été laissé par une session précédente (app fermée
  // pendant la coupure, crash, etc.)
  traiterFile()
}
