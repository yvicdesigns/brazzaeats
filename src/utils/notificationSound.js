// Notifications sonores via l'API Web Audio — aucun fichier .mp3 externe requis.
// Les sons sont synthétisés à la volée avec des oscillateurs.
import { Capacitor } from '@capacitor/core'
import { Haptics } from '@capacitor/haptics'
import { getPrefs, getPreset } from '@/utils/notificationPrefs'

// ------------------------------------------------------------
// Vibration — navigator.vibrate() n'existe pas sur iOS (WebKit ne l'a
// jamais implémenté, contrairement à Chrome Android) : silencieusement
// ignoré partout dans ce fichier sans la moindre erreur. Sur plateforme
// native, on relaie donc vers le plugin Haptics (Taptic Engine), qui
// fonctionne sur iOS ET Android ; navigator.vibrate reste le repli pour
// le web (PWA desktop/Android hors app native).
// ------------------------------------------------------------
let _vibrationTimers = []

export function arreterVibration() {
  _vibrationTimers.forEach(clearTimeout)
  _vibrationTimers = []
  if (navigator.vibrate) navigator.vibrate(0)
}

/**
 * @param {number[]} pattern — même format que navigator.vibrate() :
 *   durées alternées [vibration, pause, vibration, pause, ...] en ms.
 */
export function vibrer(pattern) {
  arreterVibration()
  if (!getPrefs().vibrationActive) return
  if (Capacitor.isNativePlatform()) {
    let t = 0
    pattern.forEach((duree, i) => {
      const estVibration = i % 2 === 0
      if (estVibration) {
        _vibrationTimers.push(setTimeout(() => Haptics.vibrate({ duration: duree }), t))
      }
      t += duree
    })
  } else if (navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

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
    const prefs = getPrefs()
    if (!prefs.sonActif) return // Son désactivé par l'utilisateur

    const ctx = getAudioContext()
    if (!ctx) return // Navigateur sans support Web Audio

    // Le volume demandé par l'appelant reste la base (équilibre relatif entre
    // les différents sons) — le réglage utilisateur agit comme un multiplicateur.
    volume *= prefs.volume

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
// Alarme — nouvelle commande restaurant
// ------------------------------------------------------------
// Comme un message reçu : on joue le DÉBUT de la sonnerie (~2,5 s), puis on
// coupe. Tant que l'écran « Nouvelle commande » est affiché sans réponse, ce
// court extrait revient toutes les ~10 s, pour ne pas passer inaperçu dans
// une cuisine bruyante, sans sonner en continu. arreterAlarme() coupe tout.
const DUREE_EXTRAIT_MS = 2500
const PAUSE_RAPPEL_MS  = 10000

let _alarmeActive     = false
let _alarmeTimer      = null
let _alarmeMasterGain = null

/**
 * Démarre l'alarme : extrait de sonnerie, pause, extrait… Sans effet si déjà
 * en cours — un seul flux d'alarme à la fois.
 *
 * Volume et préréglage sonore viennent des réglages utilisateur
 * (notificationPrefs) — chaque appareil peut choisir son propre son/volume.
 *
 * @param {string} [annonce] — texte lu à voix haute au déclenchement, si
 *   l'utilisateur a activé la lecture vocale dans ses réglages.
 */
export function demarrerAlarme(annonce) {
  if (_alarmeActive) {
    // Un extrait isolé est en train de jouer : on le transforme en alarme
    // avec rappels, sans le couper.
    _rappel = true
    return
  }
  _demarrer(annonce, true)
}

/**
 * Joue une fois le début de la sonnerie : une commande de plus arrive alors
 * que l'écran est déjà ouvert, ou après l'avoir fermé avec X. Si l'alarme
 * est en pause entre deux rappels, l'extrait est joué tout de suite.
 */
export function jouerExtraitSonnerie() {
  if (_alarmeActive) { _relancer?.(); return }
  _demarrer(null, false)
}

let _rappel   = false
let _relancer = null

function _demarrer(annonce, rappel) {
  _rappel = rappel
  const prefs = getPrefs()

  // Ni son ni vibration à faire boucler : l'annonce vocale (ci-dessous, si
  // activée) suffit à elle seule, inutile de programmer un cycle qui ne
  // ferait jamais rien.
  if (!prefs.sonActif && !prefs.vibrationActive) {
    if (annonce) direNotification(annonce)
    return
  }

  const DUREE_NOTE_DEFAUT = 0.28
  const DUREE_CYCLE_SANS_SON_MS = DUREE_NOTE_DEFAUT * 4 * 1000 // vibration seule

  // Le son est optionnel (prefs.sonActif) — la vibration, elle, est gérée
  // par vibrer() qui se filtre déjà elle-même selon prefs.vibrationActive.
  let ctx = null, preset = null, dureeNote = DUREE_NOTE_DEFAUT
  if (prefs.sonActif) {
    ctx = getAudioContext()
    if (ctx) {
      resumeAudio()
      preset = getPreset(prefs.preset)
      dureeNote = preset.dureeNote ?? DUREE_NOTE_DEFAUT
      _alarmeMasterGain = ctx.createGain()
      _alarmeMasterGain.gain.value = prefs.volume
      _alarmeMasterGain.connect(ctx.destination)
    }
  }

  _alarmeActive = true
  if (annonce) direNotification(annonce)

  function jouerNote(freq, quand) {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(_alarmeMasterGain)
    osc.type = preset.forme
    osc.frequency.setValueAtTime(freq, quand)
    gain.gain.setValueAtTime(0, quand)
    gain.gain.linearRampToValueAtTime(1, quand + 0.015)
    gain.gain.setValueAtTime(1, quand + dureeNote - 0.03)
    gain.gain.linearRampToValueAtTime(0, quand + dureeNote)
    osc.start(quand)
    osc.stop(quand + dureeNote + 0.02)
  }

  // Joue l'extrait (quelques passages du motif du préréglage), puis soit
  // programme le rappel suivant, soit s'arrête.
  let enLecture = false
  _relancer = () => {
    if (enLecture) return // un extrait joue déjà : inutile d'en superposer un autre
    if (_alarmeTimer) clearTimeout(_alarmeTimer)
    extrait()
  }

  function extrait() {
    if (!_alarmeActive) return
    enLecture = true
    const dureeCycleMs = (ctx && preset) ? preset.notes.length * dureeNote * 1000 : DUREE_CYCLE_SANS_SON_MS
    const nbCycles = Math.max(1, Math.round(DUREE_EXTRAIT_MS / dureeCycleMs))
    if (ctx && preset) {
      let t = ctx.currentTime
      for (let i = 0; i < nbCycles; i++) {
        preset.notes.forEach(freq => {
          jouerNote(freq, t)
          t += dureeNote
        })
      }
    }
    vibrer([300, 150, 300, 150, 300])
    const finExtraitMs = nbCycles * dureeCycleMs
    _alarmeTimer = setTimeout(() => {
      enLecture = false
      if (_rappel) {
        _alarmeTimer = setTimeout(extrait, PAUSE_RAPPEL_MS)
      } else {
        _alarmeActive = false
        _alarmeTimer = null
        _alarmeMasterGain = null
        _relancer = null
      }
    }, finExtraitMs + 100)
  }
  extrait()
}

/**
 * Coupe l'alarme immédiatement (fondu de 50 ms pour éviter un clic audible),
 * même si des notes étaient déjà programmées sur l'horloge audio — elles
 * passent toutes par ce gain commun, donc le couper les rend inaudibles.
 */
export function arreterAlarme() {
  _alarmeActive = false
  _rappel = false
  _relancer = null
  if (_alarmeTimer) { clearTimeout(_alarmeTimer); _alarmeTimer = null }
  if (_alarmeMasterGain) {
    try {
      const ctx = getAudioContext()
      _alarmeMasterGain.gain.setValueAtTime(_alarmeMasterGain.gain.value, ctx.currentTime)
      _alarmeMasterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05)
    } catch { /* contexte déjà fermé — rien à faire */ }
    _alarmeMasterGain = null
  }
  arreterVibration()
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
