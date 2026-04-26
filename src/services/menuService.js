import { supabase } from '@/supabase/client'

// ============================================================
// CATÉGORIES
// ============================================================

/** Récupère toutes les catégories d'un restaurant, triées par ordre. */
export async function getCategories(restaurantId) {
  try {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('ordre', { ascending: true })
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/** Crée une nouvelle catégorie. */
export async function createCategorie(restaurantId, { nom, ordre = 0, visible = true }) {
  try {
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({ restaurant_id: restaurantId, nom, ordre, visible })
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/** Met à jour une catégorie (nom, ordre, visible). */
export async function updateCategorie(id, updates) {
  try {
    const { data, error } = await supabase
      .from('menu_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/** Supprime une catégorie et ses articles (ON DELETE CASCADE dans le schéma). */
export async function deleteCategorie(id) {
  try {
    const { error } = await supabase.from('menu_categories').delete().eq('id', id)
    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

/**
 * Met à jour le champ `ordre` de plusieurs catégories en parallèle.
 * @param {Array<{id: string, ordre: number}>} updates
 */
export async function reorderCategories(updates) {
  try {
    await Promise.all(
      updates.map(({ id, ordre }) =>
        supabase.from('menu_categories').update({ ordre }).eq('id', id)
      )
    )
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

// ============================================================
// ARTICLES DU MENU
// ============================================================

/** Récupère tous les articles d'un restaurant (disponibles + indisponibles). */
export async function getMenuItems(restaurantId) {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('nom', { ascending: true })
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/** Crée un nouvel article. */
export async function createMenuItem({
  restaurantId,
  categorieId,
  nom,
  description = null,
  prix,
  imageUrl     = null,
  disponible   = true,
  tempsPreparation = 15,
  variantes    = null,  // [{ nom: 'Petit', prix: 2000 }, { nom: 'Grand', prix: 3500 }]
}) {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id:     restaurantId,
        categorie_id:      categorieId,
        nom,
        description,
        prix,
        image_url:         imageUrl,
        disponible,
        temps_preparation: tempsPreparation,
        variantes:         variantes && variantes.length > 0 ? variantes : null,
      })
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/** Met à jour un article. */
export async function updateMenuItem(id, updates) {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/** Supprime un article. Attention : les order_items déjà créés sont protégés par RESTRICT. */
export async function deleteMenuItem(id) {
  try {
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

// ============================================================
// UPLOAD IMAGES (Supabase Storage)
// Prérequis : créer les buckets "menu-images" et "restaurant-images"
// dans le dashboard Supabase avec accès public en lecture.
// ============================================================

/**
 * Upload une image d'article et retourne son URL publique.
 * Chemin dans le bucket : {restaurantId}/{timestamp}.{ext}
 */
export async function uploadMenuItemImage(file, restaurantId) {
  try {
    const ext    = file.name.split('.').pop().toLowerCase()
    const chemin = `${restaurantId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(chemin, file, { upsert: true, contentType: file.type })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(chemin)

    return { url: publicUrl, error: null }
  } catch (err) {
    return { url: null, error: err.message }
  }
}

/**
 * Upload le logo d'un restaurant et retourne son URL publique.
 * Chemin : logos/{restaurantId}.{ext} (upsert = remplace l'ancien)
 */
export async function uploadRestaurantLogo(file, restaurantId) {
  try {
    const ext    = file.name.split('.').pop().toLowerCase()
    const chemin = `logos/${restaurantId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('restaurant-images')
      .upload(chemin, file, { upsert: true, contentType: file.type })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(chemin)

    return { url: publicUrl, error: null }
  } catch (err) {
    return { url: null, error: err.message }
  }
}

/**
 * Upload une vidéo de présentation pour un restaurant.
 * Chemin : videos/{restaurantId}.mp4 (upsert)
 * Retourne l'URL publique + progression via onProgress(0-100).
 */
export async function uploadRestaurantVideo(file, restaurantId) {
  try {
    const chemin = `videos/${restaurantId}.mp4`
    const { error: uploadError } = await supabase.storage
      .from('restaurant-images')
      .upload(chemin, file, { upsert: true, contentType: 'video/mp4', duplex: 'half' })
    if (uploadError) throw uploadError
    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-images').getPublicUrl(chemin)
    return { url: publicUrl, error: null }
  } catch (err) {
    return { url: null, error: err.message }
  }
}

export async function uploadRestaurantVideoApercu(file, restaurantId) {
  try {
    const chemin = `previews/${restaurantId}.mp4`
    const { error: uploadError } = await supabase.storage
      .from('restaurant-images')
      .upload(chemin, file, { upsert: true, contentType: 'video/mp4', duplex: 'half' })
    if (uploadError) throw uploadError
    const { data: { publicUrl } } = supabase.storage
      .from('restaurant-images').getPublicUrl(chemin)
    return { url: publicUrl, error: null }
  } catch (err) {
    return { url: null, error: err.message }
  }
}

// ============================================================
// PROFIL RESTAURANT (côté propriétaire)
// ============================================================

/** Récupère le restaurant appartenant à un utilisateur. */
export async function getMyRestaurant(userId) {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', userId)
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/** Met à jour le profil d'un restaurant. */
export async function updateRestaurant(id, updates) {
  try {
    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

// ============================================================
// COMMANDES (lecture enrichie pour le dashboard propriétaire)
// ============================================================

/**
 * Récupère les commandes actives + les 20 dernières terminées d'un restaurant.
 * Inclut les lignes de commande avec le nom de chaque article.
 */
export async function getOrdersByRestaurant(restaurantId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        client:profiles!orders_client_id_fkey(nom, telephone),
        order_items(
          id,
          quantite,
          prix_unitaire,
          sous_total,
          menu_item:menu_items(nom, temps_preparation)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(60)
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

// ============================================================
// AVIS (côté propriétaire)
// ============================================================

/**
 * Récupère les avis d'un restaurant avec le nom du client.
 * Note : le champ `reponse_restaurant` nécessite la migration :
 *   ALTER TABLE reviews ADD COLUMN reponse_restaurant TEXT;
 */
export async function getReviews(restaurantId) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, client:profiles!reviews_client_id_fkey(nom)')
      .eq('restaurant_id', restaurantId)
      .order('masque', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Enregistre la réponse du restaurant à un avis.
 * Nécessite : ALTER TABLE reviews ADD COLUMN reponse_restaurant TEXT;
 */
export async function toggleMasqueReview(reviewId, masque) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .update({ masque })
      .eq('id', reviewId)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

export async function replyToReview(reviewId, reponse) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .update({ reponse_restaurant: reponse })
      .eq('id', reviewId)
      .select()
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

// ============================================================
// KPIs DASHBOARD
// ============================================================

/**
 * Récupère en parallèle toutes les données nécessaires au dashboard.
 * Retourne : caJour, commandesActives, noteMoyenne, commandesSemaine[]
 */
export async function getDashboardData(restaurantId) {
  try {
    const debutJour = new Date()
    debutJour.setHours(0, 0, 0, 0)

    const debutSemaine = new Date()
    debutSemaine.setDate(debutSemaine.getDate() - 6)
    debutSemaine.setHours(0, 0, 0, 0)

    // Lundi de la semaine courante (début de la période de paiement)
    const lundiCourant = new Date()
    lundiCourant.setDate(lundiCourant.getDate() - ((lundiCourant.getDay() + 6) % 7))
    lundiCourant.setHours(0, 0, 0, 0)

    // Prochain lundi (date du versement)
    const prochainLundi = new Date(lundiCourant)
    prochainLundi.setDate(prochainLundi.getDate() + 7)

    const [
      { data: commandesJour },
      { count: nbActives },
      { data: restaurant },
      { data: commandesSemaine },
      { data: commandesSemaineFinancieres },
    ] = await Promise.all([
      // CA du jour : commandes livrées uniquement
      supabase
        .from('orders')
        .select('montant_total, frais_livraison')
        .eq('restaurant_id', restaurantId)
        .eq('statut', 'livrée')
        .gte('created_at', debutJour.toISOString()),

      // Commandes actives (non terminées)
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .in('statut', ['en_attente', 'acceptée', 'en_préparation', 'prête', 'en_livraison']),

      // Note moyenne + commission_rate depuis la table restaurants
      supabase
        .from('restaurants')
        .select('note_moyenne, commission_rate')
        .eq('id', restaurantId)
        .single(),

      // Commandes de la semaine (toutes sauf annulées) — pour le graphique
      supabase
        .from('orders')
        .select('created_at, montant_total, frais_livraison, statut')
        .eq('restaurant_id', restaurantId)
        .neq('statut', 'annulée')
        .gte('created_at', debutSemaine.toISOString()),

      // Commandes livrées depuis lundi — pour le bilan financier hebdomadaire
      supabase
        .from('orders')
        .select('montant_total, commission')
        .eq('restaurant_id', restaurantId)
        .eq('statut', 'livrée')
        .gte('created_at', lundiCourant.toISOString()),
    ])

    const caJour = (commandesJour ?? []).reduce(
      (acc, o) => acc + (o.montant_total ?? 0),
      0
    )

    const caSemaineBrut = (commandesSemaineFinancieres ?? []).reduce(
      (acc, o) => acc + (o.montant_total ?? 0), 0
    )
    const commissionSemaine = (commandesSemaineFinancieres ?? []).reduce(
      (acc, o) => acc + (o.commission ?? 0), 0
    )
    const montantNetSemaine = caSemaineBrut - commissionSemaine

    return {
      data: {
        caJour,
        commandesActives:  nbActives ?? 0,
        noteMoyenne:       restaurant?.note_moyenne ?? 0,
        commissionRate:    restaurant?.commission_rate ?? 10,
        commandesSemaine:  commandesSemaine ?? [],
        // Bilan financier semaine en cours (lundi → aujourd'hui)
        caSemaineBrut,
        commissionSemaine,
        montantNetSemaine,
        prochainVersement: prochainLundi.toISOString(),
        nbCommandesLivrees: (commandesSemaineFinancieres ?? []).length,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

// ============================================================
// HISTORIQUE & REVENUS
// ============================================================

/**
 * Retourne toutes les commandes d'un restaurant sur une période donnée.
 * Inclut le nom du client et le détail des articles.
 *
 * @param {string} restaurantId
 * @param {string} dateDebut — ISO string (début de journée)
 * @param {string} dateFin   — ISO string (fin de journée)
 */
/**
 * Retourne les commandes avec leurs articles pour les analytics.
 * Utilisé pour calculer top plats, heures de pointe, jours de la semaine.
 */
export async function getAnalyticsData(restaurantId, dateDebut, dateFin) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, created_at, statut, montant_total, frais_livraison,
        order_items(quantite, sous_total, menu_item:menu_items(id, nom))
      `)
      .eq('restaurant_id', restaurantId)
      .gte('created_at', dateDebut)
      .lte('created_at', dateFin)
      .neq('statut', 'annulée')
      .order('created_at', { ascending: true })
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

export async function getHistoriqueRevenu(restaurantId, dateDebut, dateFin) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, created_at, statut, montant_total, frais_livraison, type, mode_paiement,
        client:profiles!orders_client_id_fkey(nom)
      `)
      .eq('restaurant_id', restaurantId)
      .gte('created_at', dateDebut)
      .lte('created_at', dateFin)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}
