import { supabase } from '@/supabase/client'

// ------------------------------------------------------------
// Messagerie — deux canaux distincts par commande, alignés sur
// le modèle Uber Eats / Glovo / Bolt Food :
//   'livreur'  → client ↔ livreur   (logistique de la course)
//   'support'  → client ↔ Zando     (SAV, litiges)
// Il n'y a plus de canal client ↔ restaurant.
// ------------------------------------------------------------

/**
 * Récupère les messages d'un canal donné pour une commande, triés par date.
 * @param {string} orderId
 * @param {'livreur'|'support'} canal
 */
export async function getMessages(orderId, canal) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(nom)')
      .eq('order_id', orderId)
      .eq('canal', canal)
      .order('created_at', { ascending: true })
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Envoie un message dans un canal donné.
 * @param {string} orderId
 * @param {string} senderId
 * @param {'client'|'livreur'|'admin'} senderRole
 * @param {string} contenu
 * @param {'livreur'|'support'} canal
 */
export async function sendMessage(orderId, senderId, senderRole, contenu, canal) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({ order_id: orderId, sender_id: senderId, sender_role: senderRole, contenu, canal })
      .select('*, sender:profiles!messages_sender_id_fkey(nom)')
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

// Rôle de l'interlocuteur, par canal et par rôle de qui consulte/marque comme lu.
function roleInterlocuteur(canal, monRole) {
  if (canal === 'livreur') return monRole === 'client' ? 'livreur' : 'client'
  // canal 'support'
  return monRole === 'client' ? 'admin' : 'client'
}

/**
 * Liste les conversations de support (canal 'support'), une entrée par
 * commande, triées par dernier message — pour l'inbox admin.
 */
export async function getSupportConversations(limit = 200) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, order_id, contenu, sender_role, lu, created_at,
        order:orders(id, client:profiles!orders_client_id_fkey(nom, telephone))
      `)
      .eq('canal', 'support')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error

    // Une entrée par commande — la première rencontrée est la plus récente
    // (les messages sont déjà triés desc), le nombre de non-lus se calcule
    // en parcourant les messages restants du même order_id.
    const parCommande = new Map()
    for (const m of data ?? []) {
      if (!parCommande.has(m.order_id)) {
        parCommande.set(m.order_id, {
          orderId: m.order_id,
          client: m.order?.client ?? null,
          dernierMessage: m.contenu,
          dernierRole: m.sender_role,
          dernierDate: m.created_at,
          nonLus: 0,
        })
      }
      if (m.sender_role === 'client' && !m.lu) {
        parCommande.get(m.order_id).nonLus += 1
      }
    }

    return { data: [...parCommande.values()], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Liste les conversations du canal 'livreur' pour un livreur donné, une
 * entrée par commande, triées par dernier message — pour son profil.
 */
export async function getLivreurConversations(livreurId, limit = 200) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, order_id, contenu, sender_role, lu, created_at,
        order:orders!inner(id, livreur_id, client:profiles!orders_client_id_fkey(nom, telephone))
      `)
      .eq('canal', 'livreur')
      .eq('order.livreur_id', livreurId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error

    const parCommande = new Map()
    for (const m of data ?? []) {
      if (!parCommande.has(m.order_id)) {
        parCommande.set(m.order_id, {
          orderId: m.order_id,
          client: m.order?.client ?? null,
          dernierMessage: m.contenu,
          dernierRole: m.sender_role,
          dernierDate: m.created_at,
          nonLus: 0,
        })
      }
      if (m.sender_role === 'client' && !m.lu) {
        parCommande.get(m.order_id).nonLus += 1
      }
    }

    return { data: [...parCommande.values()], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Marque comme lus tous les messages non lus d'un canal, envoyés par l'autre partie.
 * @param {string} orderId
 * @param {'livreur'|'support'} canal
 * @param {'client'|'livreur'|'admin'} monRole — rôle de qui lit
 */
export async function markMessagesAsRead(orderId, canal, monRole) {
  const autreRole = roleInterlocuteur(canal, monRole)
  try {
    const { error } = await supabase
      .from('messages')
      .update({ lu: true })
      .eq('order_id', orderId)
      .eq('canal', canal)
      .eq('sender_role', autreRole)
      .eq('lu', false)
    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}
