import { supabase } from '@/supabase/client'

/**
 * Récupère tous les messages d'une commande, triés par date.
 */
export async function getMessages(orderId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(nom)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (err) {
    return { data: [], error: err.message }
  }
}

/**
 * Envoie un message.
 * @param {string} orderId
 * @param {string} senderId
 * @param {'client'|'restaurant'} senderRole
 * @param {string} contenu
 */
export async function sendMessage(orderId, senderId, senderRole, contenu) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({ order_id: orderId, sender_id: senderId, sender_role: senderRole, contenu })
      .select('*, sender:profiles!messages_sender_id_fkey(nom)')
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

/**
 * Marque comme lus tous les messages non lus pour un rôle donné sur une commande.
 * @param {string} orderId
 * @param {'client'|'restaurant'} destinataireRole — rôle qui lit (on marque les messages de l'autre)
 */
export async function markMessagesAsRead(orderId, destinataireRole) {
  const autreRole = destinataireRole === 'client' ? 'restaurant' : 'client'
  try {
    const { error } = await supabase
      .from('messages')
      .update({ lu: true })
      .eq('order_id', orderId)
      .eq('sender_role', autreRole)
      .eq('lu', false)
    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err.message }
  }
}

/**
 * Compte les messages non lus côté restaurant (tous envoyés par des clients).
 * Deux requêtes : d'abord les order_ids du restaurant, puis le compte.
 */
export async function getUnreadCountForRestaurant(restaurantId) {
  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('restaurant_id', restaurantId)

    if (!orders?.length) return { count: 0, error: null }

    const orderIds = orders.map(o => o.id)
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_role', 'client')
      .eq('lu', false)
      .in('order_id', orderIds)
    if (error) throw error
    return { count: count ?? 0, error: null }
  } catch (err) {
    return { count: 0, error: err.message }
  }
}
