// ── Empêche un appel Supabase de bloquer l'app indéfiniment ──
// Le verrou de session interne de Supabase (ou une connexion réseau restée
// ouverte mais morte) peut rester figé après qu'un onglet revienne au premier
// plan après une mise en veille — sans garde-fou ici, un "loading" local ne
// repasserait jamais à false et la page resterait bloquée sur son spinner
// indéfiniment, sans aucune erreur console.
export function avecDelaiMax(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Délai dépassé')), ms)),
  ])
}
