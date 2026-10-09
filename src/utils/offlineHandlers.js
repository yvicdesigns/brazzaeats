// ------------------------------------------------------------
// Handlers d'actions rejouables par la file hors-ligne (offlineQueue.js).
// Importé une seule fois au démarrage de l'app (main.jsx) pour que les
// handlers soient prêts avant qu'une action ne soit mise en file.
//
// Appelle directement Supabase (pas le service correspondant) pour laisser
// remonter l'erreur BRUTE — c'est elle qui permet à estErreurReseau() de
// distinguer une vraie coupure réseau d'un rejet serveur légitime.
// ------------------------------------------------------------
import { supabase } from '@/supabase/client'
import { enregistrerHandler } from '@/utils/offlineQueue'

enregistrerHandler('markDelivered', async ({ orderId }) => {
  const { error } = await supabase.from('orders').update({ statut: 'livrée' }).eq('id', orderId)
  if (error) throw error
})

enregistrerHandler('updateOrderStatus', async ({ orderId, statut, champsSupplementaires }) => {
  const { error } = await supabase
    .from('orders')
    .update({ statut, ...champsSupplementaires })
    .eq('id', orderId)
  if (error) throw error
})
