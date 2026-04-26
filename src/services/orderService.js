import { supabase } from '@/supabase/client'
import { incrementPromoUsage, incrementPlatformPromoUsage } from '@/services/promotionService'

/**
 * Crée une commande complète avec ses lignes.
 * Effectue deux insertions séquentielles (orders → order_items).
 * En cas d'échec de la 2ème, la commande est supprimée (rollback manuel).
 *
 * @param {{ clientId, restaurantId, items, type, modePaiement,
 *           adresseLivraison, notes, fraisLivraison, remise }} params
 */
export async function createOrder({
  clientId,
  restaurantId,
  items = [],           // [{ menu_item_id, nom, quantite, prix_unitaire }]
  type            = 'livraison',
  modePaiement    = 'cash',
  adresseLivraison = null,
  notes           = null,
  fraisLivraison  = 1000,
  remise          = 0,
  soldeUtilise    = 0,  // montant du solde Zandofood utilisé
  promoId         = null,
  promoNbActuel   = 0,
  promoSource     = 'restaurant', // 'restaurant' | 'platform'
  promoCode       = null,
  livraisonGratuite = false,
}) {
  try {
    // 1. Récupérer le taux de commission du restaurant
    const { data: resto } = await supabase
      .from('restaurants')
      .select('commission_rate')
      .eq('id', restaurantId)
      .single()

    const commissionRate = resto?.commission_rate ?? 10
    const sousTotal      = items.reduce((acc, i) => acc + i.prix_unitaire * i.quantite, 0)
    const fraisReels     = type === 'retrait' ? 0 : (livraisonGratuite ? 0 : fraisLivraison)
    const montantTotal   = Math.max(0, sousTotal - remise) + fraisReels
    const commission     = Math.round(sousTotal * commissionRate / 100)

    // 2. Insérer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id:         clientId,
        restaurant_id:     restaurantId,
        type,
        statut:            'en_attente',
        montant_total:     montantTotal,
        frais_livraison:   fraisReels,
        commission,
        mode_paiement:     modePaiement,
        adresse_livraison: adresseLivraison,
        notes,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 3. Insérer les lignes de commande
    const orderItems = items.map(i => ({
      order_id:      order.id,
      menu_item_id:  i.menu_item_id,
      quantite:      i.quantite,
      prix_unitaire: i.prix_unitaire,
      sous_total:    i.prix_unitaire * i.quantite,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id)
      throw itemsError
    }

    // 4. Déduire le solde utilisé du profil client (best-effort)
    if (soldeUtilise > 0) {
      supabase.rpc('deduire_solde', { p_client_id: clientId, p_montant: soldeUtilise })
        .catch(() => {})
    }

    // 5. Incrémenter le compteur d'utilisation de la promo (best-effort)
    if (promoSource === 'platform' && promoCode) {
      incrementPlatformPromoUsage(promoCode).catch(() => {})
    } else if (promoId) {
      incrementPromoUsage(promoId, promoNbActuel).catch(() => {})
    }

    return { data: order, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Récupère toutes les commandes d'un client (plus récentes en premier)
 * avec le nom du restaurant et les noms des articles commandés.
 * Inclut l'avis existant s'il y en a un (pour afficher le formulaire ou non).
 */
export async function getOrdersByClient(clientId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(id, nom, logo_url),
        order_items(
          quantite,
          prix_unitaire,
          sous_total,
          menu_item:menu_items(nom)
        ),
        reviews(id, note, commentaire)
      `)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Récupère une commande par son UUID avec tous les détails :
 * restaurant, livreur, articles commandés.
 */
export async function getOrderById(id) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(id, nom, logo_url, adresse),
        order_items(
          quantite,
          prix_unitaire,
          sous_total,
          menu_item:menu_items(nom, image_url, temps_preparation)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    // Récupérer le livreur séparément pour éviter l'ambiguïté de FK
    if (data.livreur_id) {
      const { data: livreur } = await supabase
        .from('profiles')
        .select('nom, telephone')
        .eq('id', data.livreur_id)
        .single()
      data.livreur = livreur ?? null
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Met à jour le statut d'une commande.
 * @param {string} orderId
 * @param {string} statut — valeur de l'enum statut_commande
 */
export async function updateOrderStatus(orderId, statut) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ statut })
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
 * Soumet un avis client pour une commande livrée.
 * La RLS garantit qu'une seule review est possible par commande.
 *
 * @param {{ clientId, restaurantId, orderId, note, commentaire }} params
 */
export async function submitReview({ clientId, restaurantId, orderId, note, commentaire }) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert({ client_id: clientId, restaurant_id: restaurantId, order_id: orderId, note, commentaire })
      .select()
      .single()

    if (error) throw error

    // Recalcul de la note moyenne du restaurant (fallback si le trigger SQL n'existe pas)
    supabase
      .from('reviews')
      .select('note')
      .eq('restaurant_id', restaurantId)
      .eq('masque', false)
      .then(({ data: avis }) => {
        if (!avis || avis.length === 0) return
        const moyenne = Math.round(avis.reduce((s, r) => s + r.note, 0) / avis.length * 10) / 10
        supabase
          .from('restaurants')
          .update({ note_moyenne: moyenne })
          .eq('id', restaurantId)
          .then(() => {}) // fire-and-forget
      })

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}
