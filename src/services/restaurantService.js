import { supabase } from '@/supabase/client'

// Correspondance jour JS (0=dimanche) → clé JSONB horaires
const JOURS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/**
 * Vérifie si un restaurant est actuellement ouvert.
 * @param {object} horaires — JSONB { "lundi": { ouverture: "08:00", fermeture: "22:00" } }
 * @returns {boolean}
 */
export function isRestaurantOpen(horaires) {
  if (!horaires) return false

  const maintenant   = new Date()
  const nomJour      = JOURS_FR[maintenant.getDay()]
  const horairesJour = horaires[nomJour]

  if (!horairesJour || horairesJour.ferme) return false

  const { ouverture, fermeture } = horairesJour
  if (!ouverture || !fermeture) return false

  const [hOuv, mOuv] = ouverture.split(':').map(Number)
  const [hFer, mFer] = fermeture.split(':').map(Number)

  const now   = maintenant.getHours() * 60 + maintenant.getMinutes()
  const open  = hOuv * 60 + mOuv
  const close = hFer * 60 + mFer

  // Cas particulier : fermeture après minuit (ex: 23h → 02h)
  if (close < open) return now >= open || now < close
  return now >= open && now < close
}

/**
 * Récupère les restaurants actifs avec filtres optionnels et pagination.
 * Le filtre "ouvert maintenant" est appliqué côté client (horaires en JSONB).
 */
export async function getRestaurants({
  page             = 0,
  limit            = 20,
  noteMin          = 0,
  ouvertMaintenant = false,
  search           = '',
} = {}) {
  try {
    let query = supabase
      .from('restaurants')
      .select('id, nom, description, logo_url, video_apercu_url, adresse, horaires, note_moyenne, statut', { count: 'exact' })
      .eq('statut', 'actif')
      .order('note_moyenne', { ascending: false })

    if (noteMin > 0)     query = query.gte('note_moyenne', noteMin)
    if (search.trim())   query = query.ilike('nom', `%${search.trim()}%`)

    const { data, error, count } = await query.range(page * limit, (page + 1) * limit - 1)
    if (error) throw error

    let results = data ?? []

    // Filtre horaire côté client
    if (ouvertMaintenant) results = results.filter(r => isRestaurantOpen(r.horaires))

    return {
      data:    results,
      count:   ouvertMaintenant ? results.length : (count ?? 0),
      hasMore: ouvertMaintenant ? false : (page + 1) * limit < (count ?? 0),
      error:   null,
    }
  } catch (err) {
    return { data: [], count: 0, hasMore: false, error: err.message }
  }
}

/**
 * Récupère les informations complètes d'un restaurant actif par son UUID.
 */
export async function getRestaurantById(id) {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .eq('statut', 'actif')
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Récupère le menu d'un restaurant groupé par catégories visibles.
 * Seuls les articles disponibles sont retournés.
 * Les catégories sans aucun article disponible sont exclues.
 */
export async function getMenuByRestaurant(restaurantId) {
  try {
    const [{ data: categories, error: catError }, { data: items, error: itemsError }] =
      await Promise.all([
        supabase
          .from('menu_categories')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('visible', true)
          .order('ordre', { ascending: true }),
        supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('disponible', true),
      ])

    if (catError)   throw catError
    if (itemsError) throw itemsError

    // Regroupement items → catégorie parent
    const menu = (categories ?? [])
      .map(cat => ({
        ...cat,
        items: (items ?? []).filter(i => i.categorie_id === cat.id),
      }))
      .filter(cat => cat.items.length > 0)

    return { data: menu, error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Récupère les avis des clients qui ont commandé un plat spécifique.
 * Jointure : order_items → orders → reviews
 */
export async function getItemReviews(menuItemId) {
  try {
    // 1. Trouver tous les order_id qui contiennent ce plat
    const { data: lignes, error: e1 } = await supabase
      .from('order_items')
      .select('order_id')
      .eq('menu_item_id', menuItemId)

    if (e1) throw e1
    if (!lignes || lignes.length === 0) return { data: [], error: null }

    const orderIds = lignes.map(l => l.order_id)

    // 2. Récupérer les avis liés à ces commandes
    const { data, error: e2 } = await supabase
      .from('reviews')
      .select('id, note, commentaire, reponse_restaurant, created_at, client:profiles!reviews_client_id_fkey(nom)')
      .in('order_id', orderIds)
      .eq('masque', false)
      .order('created_at', { ascending: false })
      .limit(15)

    if (e2) throw e2
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/** Récupère les avis publics d'un restaurant (les 20 plus récents). */
export async function getRestaurantReviews(restaurantId) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, note, commentaire, reponse_restaurant, created_at, client:profiles!reviews_client_id_fkey(nom)')
      .eq('restaurant_id', restaurantId)
      .eq('masque', false)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

