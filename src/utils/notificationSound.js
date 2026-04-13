// Notifications sonores via l'API Web Audio — aucun fichier .mp3 externe requis.
// Les sons sont synthétisés à la volée avec des oscillateurs.

/**
 * Catalogue des séquences sonores disponibles.
 * Chaque note : { freq (Hz), durée (s), type d'onde }
 */
const SEQUENCES = {
  // Nouvelle commande reçue — arpège montant joyeux
  nouvelle_commande: [
    { freq: 523.25, duree: 0.12, type: 'sine' }, // Do5
    { freq: 659.25, duree: 0.12, type: 'sine' }, // Mi5
    { freq: 783.99, duree: 0.12, type: 'sine' }, // Sol5
    { freq: 1046.5, duree: 0.25, type: 'sine' }, // Do6
  ],

  // Commande prête pour livraison — deux bips courts
  commande_prete: [
    { freq: 880.0,  duree: 0.1,  type: 'square' }, // La5
    { freq: 880.0,  duree: 0.1,  type: 'square' },
    { freq: 1174.7, duree: 0.2,  type: 'square' }, // Ré6
  ],

  // Livreur assigné / commande acceptée — bip de confirmation
  confirmation: [
    { freq: 698.46, duree: 0.15, type: 'sine' }, // Fa5
    { freq: 880.0,  duree: 0.25, type: 'sine' }, // La5
  ],

  // Alerte / erreur — bip grave
  alerte: [
    { freq: 220.0,  duree: 0.2,  type: 'sawtooth' }, // La3
    { freq: 196.0,  duree: 0.3,  type: 'sawtooth' }, // Sol3
  ],
}

// Contexte audio singleton — recréé si suspendu (politique autoplay)
let _audioCtx = null

function getAudioContext() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    _audioCtx = new Ctx()
  }
  return _audioCtx
}

/**
 * Reprend le contexte audio si suspendu par la politique autoplay du navigateur.
 * À appeler depuis un événement utilisateur (clic) avant le premier son.
 */
export async function resumeAudio() {
  const ctx = getAudioContext()
  if (ctx && ctx.state === 'suspended') {
    await ctx.resume()
  }
}

/**
 * Joue une séquence sonore de notification.
 * @param {'nouvelle_commande'|'commande_prete'|'confirmation'|'alerte'} type
 * @param {number} volume — 0 à 1 (défaut 0.4)
 */
export function playNotificationSound(type = 'nouvelle_commande', volume = 0.4) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return // Navigateur sans support Web Audio

    const sequence = SEQUENCES[type] ?? SEQUENCES.nouvelle_commande
    let tempsActuel = ctx.currentTime

    sequence.forEach(({ freq, duree, type: forme }) => {
      const oscillateur = ctx.createOscillator()
      const gainNode    = ctx.createGain()

      // Chaîne : oscillateur → gain → sortie
      oscillateur.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillateur.type = forme
      oscillateur.frequency.setValueAtTime(freq, tempsActuel)

      // Enveloppe : montée rapide puis descente douce (évite les clics)
      gainNode.gain.setValueAtTime(0, tempsActuel)
      gainNode.gain.linearRampToValueAtTime(volume, tempsActuel + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, tempsActuel + duree)

      oscillateur.start(tempsActuel)
      oscillateur.stop(tempsActuel + duree + 0.01)

      // Léger chevauchement pour une séquence fluide
      tempsActuel += duree * 0.85
    })
  } catch (err) {
    // Son non critique — échec silencieux
    console.warn('[Zandofood] Impossible de jouer le son de notification :', err)
  }
}

/**
 * Raccourcis nommés pour une utilisation lisible dans les composants.
 */
export const sons = {
  nouvelleCommande: () => playNotificationSound('nouvelle_commande'),
  commandePrete:    () => playNotificationSound('commande_prete'),
  confirmation:     () => playNotificationSound('confirmation'),
  alerte:           () => playNotificationSound('alerte'),
}
