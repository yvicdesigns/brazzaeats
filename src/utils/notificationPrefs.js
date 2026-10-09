// ------------------------------------------------------------
// Préférences de notification — par appareil (localStorage), pas par
// compte : une tablette de cuisine et le téléphone perso du même
// restaurateur n'ont pas forcément besoin du même volume.
// ------------------------------------------------------------
const CLE = 'zando_notif_prefs_v1'

// Chaque préréglage = les deux tons alternés de l'alarme en boucle
// (restaurant/livreur) + la forme d'onde utilisée.
export const PRESETS = {
  sirene:  { label: 'Sirène',   toneA: 880.0,   toneB: 1108.73, forme: 'square'   },
  cloche:  { label: 'Cloche',   toneA: 987.77,  toneB: 1318.51, forme: 'sine'     },
  marimba: { label: 'Marimba',  toneA: 523.25,  toneB: 659.25,  forme: 'triangle' },
}

const DEFAUTS = {
  volume: 0.85,   // 0 à 1
  preset: 'sirene',
  tts: false,     // lecture à voix haute des notifications importantes
}

export function getPrefs() {
  try {
    const brut = localStorage.getItem(CLE)
    return brut ? { ...DEFAUTS, ...JSON.parse(brut) } : { ...DEFAUTS }
  } catch {
    return { ...DEFAUTS }
  }
}

export function setPrefs(partiel) {
  const nouveau = { ...getPrefs(), ...partiel }
  try { localStorage.setItem(CLE, JSON.stringify(nouveau)) } catch { /* stockage indisponible */ }
  return nouveau
}

export function getPreset(nom) {
  return PRESETS[nom] ?? PRESETS.sirene
}
