/**
 * Disponibilités avancées — utilitaires partagés restaurant / client.
 *
 * Structure du champ `horaires` (JSONB sur menu_items) :
 *   null                  → pas de restriction (se fie à item.disponible)
 *   { jours, heure_debut, heure_fin }
 *     jours       : number[]  — 0=Dim 1=Lun … 6=Sam ; vide ou absent = tous les jours
 *     heure_debut : "HH:MM"   — absent = pas de borne basse
 *     heure_fin   : "HH:MM"   — absent = pas de borne haute
 */

export const JOURS_SEMAINE = [
  { val: 1, court: 'Lun', long: 'Lundi'     },
  { val: 2, court: 'Mar', long: 'Mardi'     },
  { val: 3, court: 'Mer', long: 'Mercredi'  },
  { val: 4, court: 'Jeu', long: 'Jeudi'     },
  { val: 5, court: 'Ven', long: 'Vendredi'  },
  { val: 6, court: 'Sam', long: 'Samedi'    },
  { val: 0, court: 'Dim', long: 'Dimanche'  },
]

/** Convertit "HH:MM" en minutes depuis minuit. */
function toMinutes(hhmm) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Retourne true si l'article est commandable en ce moment.
 * Tient compte de item.disponible ET de item.horaires.
 */
export function isItemDisponibleMaintenant(item) {
  if (!item.disponible) return false
  const h = item.horaires
  if (!h) return true

  const now  = new Date()
  const jour = now.getDay()
  const min  = now.getHours() * 60 + now.getMinutes()

  // Vérification des jours
  if (h.jours && h.jours.length > 0 && !h.jours.includes(jour)) return false

  // Vérification de la plage horaire
  const debut = toMinutes(h.heure_debut)
  const fin   = toMinutes(h.heure_fin)
  if (debut !== null && min < debut) return false
  if (fin   !== null && min >= fin)  return false

  return true
}

/**
 * Retourne un label court décrivant la restriction horaire.
 * Ex: "Lun–Ven · 11:00–15:00"  |  "Tous les jours · 18:00–23:00"
 */
export function labelHoraires(horaires) {
  if (!horaires) return null

  const COURTS = { 0:'Dim', 1:'Lun', 2:'Mar', 3:'Mer', 4:'Jeu', 5:'Ven', 6:'Sam' }

  let joursLabel = 'Tous les jours'
  if (horaires.jours && horaires.jours.length > 0 && horaires.jours.length < 7) {
    // Essai de contraction Lun–Ven si consécutifs
    const sorted = [...horaires.jours].sort((a, b) => a - b)
    joursLabel = sorted.map(j => COURTS[j]).join(', ')
  }

  const heuresLabel = (horaires.heure_debut && horaires.heure_fin)
    ? `${horaires.heure_debut}–${horaires.heure_fin}`
    : null

  return heuresLabel ? `${joursLabel} · ${heuresLabel}` : joursLabel
}

/**
 * Retourne le prochain créneau disponible sous forme de texte court.
 * Utilisé pour le badge client "Disponible à partir de Xh".
 */
export function prochainCreneau(horaires) {
  if (!horaires?.heure_debut) return null
  return `à partir de ${horaires.heure_debut}`
}
