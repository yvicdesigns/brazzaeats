import { supabase } from '@/supabase/client'

// ============================================================
// PROMOTIONS — CRUD restaurant + validation client
// ============================================================

/** Liste toutes les promotions d'un restaurant (actives ou non). */
export async function getPromotionsByRestaurant(restaurantId) {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/** Crée une nouvelle promotion. */
export async function createPromotion(restaurantId, donnees) {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .insert({ restaurant_id: restaurantId, ...donnees })
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/** Met à jour une promotion existante. */
export async function updatePromotion(id, donnees) {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .update(donnees)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/** Supprime une promotion. */
export async function deletePromotion(id) {
  try {
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

/**
 * Valide un code promo pour un restaurant + montant donné.
 * Cherche d'abord dans les promos restaurant, puis dans les codes plateforme.
 * @param {string} code
 * @param {string} restaurantId
 * @param {number} sousTotal — montant avant remise (FCFA)
 */
export async function validatePromoCode(code, restaurantId, sousTotal) {
  const codeNorm = code.trim().toUpperCase()
  try {
    const today = new Date().toISOString().slice(0, 10)

    // 1. Chercher dans les promos restaurant
    const { data: restoPromo } = await supabase
      .from('promotions')
      .select('*')
      .eq('code', codeNorm)
      .eq('restaurant_id', restaurantId)
      .eq('actif', true)
      .lte('date_debut', today)
      .gte('date_fin',   today)
      .maybeSingle()

    if (restoPromo) {
      if (restoPromo.usage_limit !== null && restoPromo.usage_limit !== undefined) {
        if ((restoPromo.nb_utilisations ?? 0) >= restoPromo.usage_limit) {
          return { promo: null, remise: 0, error: "Ce code a atteint sa limite d'utilisation" }
        }
      }
      const remise = restoPromo.type === 'pourcentage'
        ? Math.round(sousTotal * restoPromo.valeur / 100)
        : Math.min(restoPromo.valeur, sousTotal)
      return { promo: { ...restoPromo, _source: 'restaurant' }, remise, error: null }
    }

    // 2. Chercher dans les codes plateforme (admin)
    const { data: platPromo, error: platError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', codeNorm)
      .eq('actif', true)
      .maybeSingle()

    if (platError) throw platError

    if (!platPromo) return { promo: null, remise: 0, error: 'Code invalide ou expiré' }

    if (platPromo.date_expiration && new Date(platPromo.date_expiration) < new Date()) {
      return { promo: null, remise: 0, error: 'Code expiré' }
    }
    if (platPromo.max_utilisations !== null && platPromo.utilisations >= platPromo.max_utilisations) {
      return { promo: null, remise: 0, error: "Ce code a atteint sa limite d'utilisation" }
    }
    if (platPromo.min_commande > 0 && sousTotal < platPromo.min_commande) {
      return { promo: null, remise: 0, error: `Commande minimum : ${platPromo.min_commande} FCFA` }
    }

    const remise = platPromo.type === 'pourcentage'
      ? Math.round(sousTotal * platPromo.valeur / 100)
      : platPromo.type === 'livraison_gratuite'
        ? 0  // géré côté checkout sur fraisLivraison
        : Math.min(platPromo.valeur, sousTotal)

    return { promo: { ...platPromo, _source: 'platform' }, remise, error: null }
  } catch (err) {
    return { promo: null, remise: 0, error: err.message }
  }
}

/**
 * Incrémente le compteur d'utilisations d'un code plateforme.
 * Appelé après création réussie d'une commande.
 */
export async function incrementPlatformPromoUsage(code) {
  try {
    await supabase.rpc('utiliser_promo', { p_code: code })
  } catch (_) { /* best-effort */ }
}

/**
 * Incrémente le compteur d'utilisations d'une promotion.
 * Appelé après la création réussie d'une commande avec promo.
 * @param {string} promoId
 * @param {number} nbActuel — valeur actuelle de nb_utilisations
 */
export async function incrementPromoUsage(promoId, nbActuel) {
  try {
    const { error } = await supabase
      .from('promotions')
      .update({ nb_utilisations: (nbActuel ?? 0) + 1 })
      .eq('id', promoId)
    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}
