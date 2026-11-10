// ------------------------------------------------------------
// Préférences de notification — par appareil (localStorage), pas par
// compte : une tablette de cuisine et le téléphone perso du même
// restaurateur n'ont pas forcément besoin du même volume.
// ------------------------------------------------------------
const CLE = 'zando_notif_prefs_v1'

// Chaque préréglage = une vraie séquence de notes (pas juste 2 tons en
// alternance) + la forme d'onde + éventuellement la durée de chaque note
// (dureeNote, en secondes — 0.28 par défaut si omis). Le rythme et le
// nombre de notes diffèrent d'un préréglage à l'autre, pas seulement la
// hauteur : c'est ce qui les rend vraiment reconnaissables entre eux.
export const PRESETS = {
  // Alarme classique — alternance rapide façon sirène de voiture.
  sirene:    { label: 'Sirène',    forme: 'square',  notes: [880.00, 1108.73] },
  // Sonnette "ding-dong" — deux notes tenues plus longtemps, comme une
  // vraie cloche de porte (tierce descendante, Mi5 → Do5).
  cloche:    { label: 'Cloche',    forme: 'sine',    notes: [659.25, 523.25], dureeNote: 0.5 },
  // Petit arpège joyeux à 4 notes (Do-Mi-Sol-Do) — rythme staccato.
  marimba:   { label: 'Marimba',   forme: 'triangle', notes: [523.25, 659.25, 783.99, 1046.50], dureeNote: 0.2 },
  // Montée à 3 notes façon carillon d'horloge (Sol-Do-Mi).
  carillon:  { label: 'Carillon',  forme: 'sine',    notes: [783.99, 1046.50, 1318.51], dureeNote: 0.3 },
  // Phrase descendante, grave et lente — présente mais discrète.
  douce:     { label: 'Douce',     forme: 'sine',    notes: [440.00, 349.23], dureeNote: 0.55 },
}

const DEFAUTS = {
  sonActif:        true,  // interrupteur son — indépendant du volume
  volume:          0.85,  // 0.15 à 1, utilisé seulement si sonActif
  preset:          'sirene',
  vibrationActive: true,  // interrupteur vibration — indépendant du son
  tts:             false, // lecture à voix haute des notifications importantes
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
