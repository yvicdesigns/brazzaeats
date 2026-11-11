import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

// Adresse publique du site — les liens partagés et QR codes pointent toujours
// ici, même depuis l'app mobile (où window.location n'est pas zandofood.com).
export const SITE_PUBLIC = 'https://zandofood.com'

/** Lien court et lisible d'un restaurant : https://zandofood.com/r/le-viceto */
export function lienRestaurant(restaurant) {
  if (!restaurant) return SITE_PUBLIC
  return restaurant.slug
    ? `${SITE_PUBLIC}/r/${restaurant.slug}`
    : `${SITE_PUBLIC}/restaurant/${restaurant.id}`
}

export function texteInvitation(restaurant) {
  return `Commandez chez ${restaurant?.nom ?? 'nous'} sur Zandofood 🍽️`
}

/**
 * Feuille de partage du téléphone (WhatsApp, Facebook, Instagram, SMS…).
 * Renvoie false si l'appareil n'en a pas — l'appelant propose alors de copier.
 */
export async function partagerLien({ titre, texte, url }) {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title: titre, text: texte, url, dialogTitle: titre })
      return true
    }
    if (navigator.share) {
      await navigator.share({ title: titre, text: texte, url })
      return true
    }
  } catch (err) {
    // Fermeture de la feuille par l'utilisateur : ce n'est pas une erreur
    if (err?.name === 'AbortError' || /cancel/i.test(err?.message ?? '')) return true
  }
  return false
}

export async function copierTexte(texte) {
  try {
    await navigator.clipboard.writeText(texte)
    return true
  } catch {
    return false
  }
}

export const lienWhatsApp = (texte, url) => `https://wa.me/?text=${encodeURIComponent(`${texte}\n${url}`)}`
export const lienFacebook = (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
