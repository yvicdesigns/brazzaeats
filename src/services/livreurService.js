import { supabase } from '@/supabase/client'

// ============================================================
// LIVREUR — requêtes Supabase
// ============================================================

/**
 * Récupère les statistiques du livreur :
 * - gains du jour (commandes livrées aujourd'hui × frais_livraison)
 * - gains de la semaine
 * - nombre de livraisons effectuées cette semaine
 *
 * Note : le gain livreur = frais_livraison de la commande.
 * (La commission plateforme est déjà déduite côté orders.)
 */
export async function getLivreurStats(livreurId) {
  try {
    const debutJour = new Date()
    debutJour.setHours(0, 0, 0, 0)

    const debutSemaine = new Date()
    debutSemaine.setDate(debutSemaine.getDate() - 6)
    debutSemaine.setHours(0, 0, 0, 0)

    const [{ data: commandesJour }, { data: commandesSemaine }] = await Promise.all([
      supabase
        .from('orders')
        .select('frais_livraison')
        .eq('livreur_id', livreurId)
        .eq('statut', 'livrée')
        .gte('created_at', debutJour.toISOString()),

      supabase
        .from('orders')
        .select('frais_livraison')
        .eq('livreur_id', livreurId)
        .eq('statut', 'livrée')
        .gte('created_at', debutSemaine.toISOString()),
    ])

    const gainsJour    = (commandesJour    ?? []).reduce((s, o) => s + (o.frais_livraison ?? 0), 0)
    const gainsSemaine = (commandesSemaine ?? []).reduce((s, o) => s + (o.frais_livraison ?? 0), 0)

    return {
      data: {
        gainsJour,
        gainsSemaine,
        livraisonsJour:    commandesJour?.length    ?? 0,
        livraisonsSemaine: commandesSemaine?.length ?? 0,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Récupère toutes les commandes au statut "prête" non encore
 * assignées à un livreur, avec le nom du restaurant et l'adresse.
 */
export async function getAvailableOrders() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        adresse_livraison,
        montant_total,
        frais_livraison,
        created_at,
        restaurant:restaurants(id, nom, adresse)
      `)
      .eq('statut', 'prête')
      .is('livreur_id', null)
      .eq('type', 'livraison')
      .order('created_at', { ascending: true }) // plus ancienne en premier

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Accepte une livraison :
 * 1. Assigne le livreur_id sur la commande
 * 2. Passe le statut à "en_livraison"
 * 3. Crée une entrée dans la table deliveries (si elle existe)
 *
 * Prérequis schéma : orders.livreur_id FK → profiles(id)
 */
export async function acceptDelivery(orderId, livreurId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ statut: 'en_livraison', livreur_id: livreurId })
      .eq('id', orderId)
      .eq('statut', 'prête')       // garde-fou : ne pas écraser une autre prise
      .is('livreur_id', null)      // garde-fou : non déjà assignée
      .select()
      .single()

    if (error) throw error

    // Créer la ligne deliveries pour tracking GPS (best-effort)
    await supabase
      .from('deliveries')
      .insert({ order_id: orderId, livreur_id: livreurId })
      .select()
      .maybeSingle()               // pas d'erreur si la table n'existe pas encore

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Met à jour la position GPS du livreur dans deliveries.position_actuelle.
 * @param {string} orderId
 * @param {{ lat: number, lng: number }} position
 */
export async function updatePosition(orderId, position) {
  try {
    const { error } = await supabase
      .from('deliveries')
      .update({ position_actuelle: position })
      .eq('order_id', orderId)

    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

/**
 * Marque une commande comme livrée.
 */
export async function markDelivered(orderId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ statut: 'livrée' })
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Récupère l'historique complet des livraisons d'un livreur
 * (les plus récentes en premier).
 */
export async function getLivreurHistory(livreurId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        statut,
        montant_total,
        frais_livraison,
        adresse_livraison,
        created_at,
        restaurant:restaurants(nom)
      `)
      .eq('livreur_id', livreurId)
      .in('statut', ['livrée', 'annulée'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Récupère la commande en cours du livreur (statut en_livraison).
 */
export async function getActiveDelivery(livreurId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        statut,
        adresse_livraison,
        montant_total,
        frais_livraison,
        notes,
        restaurant:restaurants(nom, adresse),
        client:profiles!orders_client_id_fkey(nom, telephone)
      `)
      .eq('livreur_id', livreurId)
      .eq('statut', 'en_livraison')
      .maybeSingle()

    if (error) throw error
    return { data: data ?? null, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}
