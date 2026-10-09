// Notifications sonores via l'API Web Audio — aucun fichier .mp3 externe requis.
// Les sons sont synthétisés à la volée avec des oscillateurs.
import { getPrefs, getPreset } from '@/utils/notificationPrefs'

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
 * Lit un texte à voix haute (synthèse vocale) — seulement si l'utilisateur
 * a activé cette option dans ses réglages de notification. Respecte aussi
 * le volume choisi.
 */
export function direNotification(texte) {
  const prefs = getPrefs()
  if (!prefs.tts) return
  if (!('speechSynthesis' in window)) return
  try {
    const utterance = new SpeechSynthesisUtterance(texte)
    utterance.lang   = 'fr-FR'
    utterance.volume = prefs.volume
    utterance.rate   = 1
    window.speechSynthesis.speak(utterance)
  } catch {
    // TTS non critique — échec silencieux
  }
}

/**
 * Joue une séquence sonore de notification.
 * @param {'nouvelle_commande'|'commande_prete'|'confirmation'|'alerte'} type
 * @param {number} volume — 0 à 1 (défaut 0.4)
 * @param {number} repeat — nombre de répétitions de la séquence (défaut 1)
 */
export function playNotificationSound(type = 'nouvelle_commande', volume = 0.4, repeat = 1) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return // Navigateur sans support Web Audio

    // Le volume demandé par l'appelant reste la base (équilibre relatif entre
    // les différents sons) — le réglage utilisateur agit comme un multiplicateur.
    volume *= getPrefs().volume

    const sequence      = SEQUENCES[type] ?? SEQUENCES.nouvelle_commande
    const dureeSequence = sequence.reduce((total, { duree }) => total + duree * 0.85, 0)
    // Pause entre deux répétitions — assez longue pour bien distinguer chaque passage
    const pauseEntreRepets = 0.35

    let tempsActuel = ctx.currentTime

    for (let i = 0; i < repeat; i++) {
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
      tempsActuel += pauseEntreRepets
    }
    void dureeSequence
  } catch (err) {
    // Son non critique — échec silencieux
    console.warn('[Zandofood] Impossible de jouer le son de notification :', err)
  }
}

// ------------------------------------------------------------
// Alarme continue — nouvelle commande restaurant
// ------------------------------------------------------------
// Contrairement à playNotificationSound (une séquence courte, jouée N fois
// puis terminée), cette alarme boucle INDÉFINIMENT jusqu'à arreterAlarme() —
// pensée pour ne jamais passer inaperçue dans le bruit d'une cuisine, et pour
// ne s'arrêter que sur une action explicite (accepter/refuser la commande),
// jamais toute seule.
let _alarmeActive     = false
let _alarmeTimer      = null
let _alarmeMasterGain = null

/**
 * Démarre l'alarme en boucle (deux tons alternés, façon sirène). Sans effet
 * si déjà en cours — un seul flux d'alarme à la fois, même si plusieurs
 * commandes s'accumulent dans la file d'attente.
 *
 * Volume et préréglage sonore viennent des réglages utilisateur
 * (notificationPrefs) — chaque appareil peut choisir son propre son/volume.
 *
 * @param {string} [annonce] — texte lu à voix haute au déclenchement, si
 *   l'utilisateur a activé la lecture vocale dans ses réglages.
 */
export function demarrerAlarme(annonce) {
  if (_alarmeActive) return
  const ctx = getAudioContext()
  if (!ctx) return
  resumeAudio()

  const prefs = getPrefs()
  const { toneA: TONE_A, toneB: TONE_B, forme } = getPreset(prefs.preset)
  const DUREE_NOTE = 0.28

  _alarmeActive = true
  _alarmeMasterGain = ctx.createGain()
  _alarmeMasterGain.gain.value = prefs.volume
  _alarmeMasterGain.connect(ctx.destination)

  if (annonce) direNotification(annonce)

  function jouerNote(freq, quand) {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(_alarmeMasterGain)
    osc.type = forme
    osc.frequency.setValueAtTime(freq, quand)
    gain.gain.setValueAtTime(0, quand)
    gain.gain.linearRampToValueAtTime(1, quand + 0.015)
    gain.gain.setValueAtTime(1, quand + DUREE_NOTE - 0.03)
    gain.gain.linearRampToValueAtTime(0, quand + DUREE_NOTE)
    osc.start(quand)
    osc.stop(quand + DUREE_NOTE + 0.02)
  }

  function cycle() {
    if (!_alarmeActive) return
    const t0 = ctx.currentTime
    jouerNote(TONE_A, t0)
    jouerNote(TONE_B, t0 + DUREE_NOTE)
    jouerNote(TONE_A, t0 + DUREE_NOTE * 2)
    jouerNote(TONE_B, t0 + DUREE_NOTE * 3)
    if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300])
    _alarmeTimer = setTimeout(cycle, DUREE_NOTE * 4 * 1000)
  }
  cycle()
}

/**
 * Coupe l'alarme immédiatement (fondu de 50 ms pour éviter un clic audible),
 * même si des notes étaient déjà programmées sur l'horloge audio — elles
 * passent toutes par ce gain commun, donc le couper les rend inaudibles.
 */
export function arreterAlarme() {
  _alarmeActive = false
  if (_alarmeTimer) { clearTimeout(_alarmeTimer); _alarmeTimer = null }
  if (_alarmeMasterGain) {
    try {
      const ctx = getAudioContext()
      _alarmeMasterGain.gain.setValueAtTime(_alarmeMasterGain.gain.value, ctx.currentTime)
      _alarmeMasterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05)
    } catch { /* contexte déjà fermé — rien à faire */ }
    _alarmeMasterGain = null
  }
  if (navigator.vibrate) navigator.vibrate(0)
}

export function alarmeEnCours() {
  return _alarmeActive
}

/**
 * Raccourcis nommés pour une utilisation lisible dans les composants.
 *
 * commandePrete et confirmation sont répétés plusieurs fois — signal
 * "nouvelle livraison" / "commande arrivée" bien plus difficile à manquer
 * qu'un bip unique très court.
 */
export const sons = {
  nouvelleCommande: () => playNotificationSound('nouvelle_commande', 0.45, 2),
  commandePrete:    () => playNotificationSound('commande_prete',    0.5,  4),
  confirmation:     () => playNotificationSound('confirmation',      0.45, 3),
  alerte:           () => playNotificationSound('alerte',            0.45, 2),
}
