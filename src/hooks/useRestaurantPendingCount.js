/**
 * Hook partagé — retourne le nombre de commandes en_attente du restaurant
 * et l'écoute en temps réel via Supabase Realtime.
 *
 * Utilisé dans RestaurantLayout pour alimenter le badge de la nav.
 * Séparé de Orders.jsx (qui gère l'UI de la liste) pour être disponible
 * sur toutes les pages de l'espace restaurant.
 */
import { useState, useEffect } from 'react'
import { supabase } from '@/supabase/client'

export function useRestaurantPendingCount(restaurantId) {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!restaurantId) return

    // ── Charge le compteur initial ──────────────────────
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('statut', 'en_attente')
      .then(({ count }) => setPendingCount(count ?? 0))

    // ── Écoute les changements en temps réel ────────────
    const canal = supabase
      .channel(`pending_count:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          // À chaque changement, on recompte
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId)
            .eq('statut', 'en_attente')
            .then(({ count }) => setPendingCount(count ?? 0))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [restaurantId])

  return pendingCount
}
