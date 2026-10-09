/**
 * Notifications globales restaurant — actives sur toutes les pages.
 *
 * Ce hook est monté dans RestaurantLayout (une seule fois) et gère :
 *   1. Alarme sonore en boucle (voir notificationSound.demarrerAlarme) tant
 *      qu'au moins une commande n'a pas été explicitement acceptée ou
 *      refusée — plus de son "à moitié" qui s'arrête tout seul : avant, le
 *      son était même totalement absent quand le restaurant se trouvait sur
 *      la page Commandes (chaque composant pensait que l'autre s'en
 *      chargeait). C'est corrigé : ce hook est l'unique responsable du son,
 *      quelle que soit la page affichée.
 *   2. File d'attente des commandes non accusées — RestaurantLayout affiche
 *      un plein écran (AlarmeNouvelleCommande) tant que la file n'est pas vide.
 *   3. Wake Lock — empêche l'écran de s'éteindre tant que l'alarme sonne.
 *   4. Browser Notification — best-effort si l'onglet est en arrière-plan.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/supabase/client'
import { demarrerAlarme, arreterAlarme, resumeAudio } from '@/utils/notificationSound'
import { updateOrderStatus } from '@/services/orderService'

export function useRestaurantNotifications(restaurantId) {
  const navigate = useNavigate()
  const [file,    setFile]    = useState([]) // commandes en attente d'accusé de réception
  const [enCours, setEnCours] = useState(null) // 'accepter' | 'refuser' | null
  const wakeLockRef = useRef(null)

  // ── Wake Lock : garde l'écran allumé tant que l'alarme sonne ─────
  useEffect(() => {
    let annule = false
    async function gerer() {
      if (file.length > 0 && !wakeLockRef.current && 'wakeLock' in navigator) {
        try {
          const lock = await navigator.wakeLock.request('screen')
          if (!annule) wakeLockRef.current = lock
          else lock.release().catch(() => {})
        } catch {
          // Non bloquant — refusé par le navigateur ou API absente
        }
      }
      if (file.length === 0 && wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
    }
    gerer()
    return () => { annule = true }
  }, [file.length])

  // ── Démarre/arrête l'alarme selon la file ────────────────────────
  useEffect(() => {
    if (file.length > 0) demarrerAlarme('Nouvelle commande')
    else arreterAlarme()
  }, [file.length])

  // ── Nettoyage complet au démontage (changement de compte…) ──────
  useEffect(() => () => {
    arreterAlarme()
    wakeLockRef.current?.release().catch(() => {})
  }, [])

  // ── Demande de permission notifications navigateur ─────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const demander = () => Notification.requestPermission()
      document.addEventListener('click', demander, { once: true })
      return () => document.removeEventListener('click', demander)
    }
  }, [])

  // ── Souscription aux nouvelles commandes ───────────────
  useEffect(() => {
    if (!restaurantId) return

    const activerAudio = () => resumeAudio()
    document.addEventListener('click', activerAudio, { once: true })

    const canal = supabase
      .channel(`notif_global:${restaurantId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}` },
        async (payload) => {
          const ordreId = payload.new?.id
          if (!ordreId) return

          // Récupérer la commande complète (items, client) pour l'alarme plein écran
          const { data: cmdComplete } = await supabase
            .from('orders')
            .select(`
              *,
              client:profiles!orders_client_id_fkey(nom, telephone),
              order_items(id, quantite, prix_unitaire, sous_total, menu_item:menu_items(nom, temps_preparation))
            `)
            .eq('id', ordreId)
            .single()

          const nouvelleCmd = cmdComplete ?? payload.new
          setFile(prev => prev.some(c => c.id === ordreId) ? prev : [...prev, nouvelleCmd])

          // Browser Notification (Notification API) — best-effort si onglet en arrière-plan
          if ('Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification('Zandofood — Nouvelle commande 🍽️', {
              body: 'Un client vient de passer une commande. Répondez rapidement !',
              icon: '/icon-192.png',
              badge: '/icon-72.png',
              tag: `commande-${ordreId}`,
              requireInteraction: true,
            })
            notif.onclick = () => {
              window.focus()
              navigate('/restaurant/commandes')
              notif.close()
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
      document.removeEventListener('click', activerAudio)
    }
  }, [restaurantId, navigate])

  // ── Accepter / refuser la commande affichée par l'alarme ─────────
  // orderId est explicitement fourni par le bouton cliqué (lié à la
  // commande affichée à ce moment précis) plutôt que déduit de file[0] au
  // moment de l'exécution : si le clic finit par se déclencher deux fois
  // pour une raison quelconque, le deuxième appel retrouve la même
  // commande déjà retirée de la file et ne fait rien — au lieu de retomber
  // sur file[0] qui, entre-temps, désigne une AUTRE commande, et de la
  // résoudre par erreur sans qu'aucun humain n'ait cliqué dessus.
  const resoudreEnCoursRef = useRef(false)
  const resoudre = useCallback(async (orderId, statut, action) => {
    if (resoudreEnCoursRef.current) return
    const commande = file.find(c => c.id === orderId)
    if (!commande) return
    resoudreEnCoursRef.current = true
    setEnCours(action)
    // Acceptation via l'alarme plein écran : pas d'étape d'ajustement (garder
    // le geste rapide), on fige donc directement le délai par défaut calculé
    // sur les articles — contrairement au bouton "Accepter" du détail de
    // commande, qui permet d'ajuster ce délai avant de valider.
    const champsSupplementaires = statut === 'acceptée'
      ? { temps_preparation_minutes: Math.max(
            ...(commande.order_items ?? []).map(oi => oi.menu_item?.temps_preparation ?? 15),
            15
          ) }
      : {}
    const { error } = await updateOrderStatus(commande.id, statut, champsSupplementaires)
    resoudreEnCoursRef.current = false
    setEnCours(null)
    if (error) { toast.error('Erreur : ' + error); return }
    setFile(prev => prev.filter(c => c.id !== commande.id))
  }, [file])

  return {
    commandeAlarme: file[0] ?? null,
    nbEnAttente:    file.length,
    enCours,
    accepter: (orderId) => resoudre(orderId, 'acceptée', 'accepter'),
    refuser:  (orderId) => resoudre(orderId, 'annulée', 'refuser'),
  }
}
