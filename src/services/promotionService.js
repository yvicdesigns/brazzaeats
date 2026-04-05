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
 * Vérifie : actif, dans les dates, et limite d'utilisation non atteinte.
 * @param {string} code
 * @param {string} restaurantId
 * @param {number} sousTotal — montant avant remise (FCFA)
 */
export async function validatePromoCode(code, restaurantId, sousTotal) {
  try {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('restaurant_id', restaurantId)
      .eq('actif', true)
      .lte('date_debut', today)
      .gte('date_fin',   today)
      .maybeSingle()

    if (error) throw error
    if (!data) return { promo: null, remise: 0, error: 'Code invalide ou expiré' }

    // Vérification de la limite d'utilisation
    if (data.usage_limit !== null && data.usage_limit !== undefined) {
      const utilisations = data.nb_utilisations ?? 0
      if (utilisations >= data.usage_limit) {
        return { promo: null, remise: 0, error: 'Ce code a atteint sa limite d\'utilisation' }
      }
    }

    const remise = data.type === 'pourcentage'
      ? Math.round(sousTotal * data.valeur / 100)
      : Math.min(data.valeur, sousTotal)

    return { promo: data, remise, error: null }
  } catch (err) {
    return { promo: null, remise: 0, error: err.message }
  }
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
