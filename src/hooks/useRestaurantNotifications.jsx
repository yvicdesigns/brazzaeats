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
import { demarrerAlarme, arreterAlarme, resumeAudio, jouerExtraitSonnerie } from '@/utils/notificationSound'
import { updateOrderStatus } from '@/services/orderService'
import { updateMenuItem } from '@/services/menuService'
import { enfiler, estErreurReseau } from '@/utils/offlineQueue'

export function useRestaurantNotifications(restaurantId) {
  const navigate = useNavigate()
  const [file,    setFile]    = useState([]) // commandes en attente d'accusé de réception
  const [masquees, setMasquees] = useState(() => new Set()) // fermées avec X : restent dans « Nouvelles »
  const [enCours, setEnCours] = useState(null) // 'accepter' | 'refuser' | null
  const wakeLockRef = useRef(null)

  // Commandes que l'écran plein doit encore présenter (hors celles fermées avec X)
  const aPresenter = file.filter(c => !masquees.has(c.id))
  const nbAPresenter = aPresenter.length
  const nbAPresenterRef = useRef(0)
  nbAPresenterRef.current = nbAPresenter

  // ── Wake Lock : garde l'écran allumé tant que l'alarme sonne ─────
  useEffect(() => {
    let annule = false
    async function gerer() {
      if (nbAPresenter > 0 && !wakeLockRef.current && 'wakeLock' in navigator) {
        try {
          const lock = await navigator.wakeLock.request('screen')
          if (!annule) wakeLockRef.current = lock
          else lock.release().catch(() => {})
        } catch {
          // Non bloquant — refusé par le navigateur ou API absente
        }
      }
      if (nbAPresenter === 0 && wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
    }
    gerer()
    return () => { annule = true }
  }, [nbAPresenter])

  // ── Démarre/arrête l'alarme selon les commandes à présenter ──────
  useEffect(() => {
    if (nbAPresenter > 0) demarrerAlarme('Nouvelle commande')
    else arreterAlarme()
  }, [nbAPresenter])

  // Les commandes sorties de la file n'ont plus à être retenues comme fermées
  useEffect(() => {
    setMasquees(prev => {
      const restantes = [...prev].filter(id => file.some(c => c.id === id))
      return restantes.length === prev.size ? prev : new Set(restantes)
    })
  }, [file])

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
          // Une vente comptoir est créée directement « acceptée » par le restaurant lui-même
          if (payload.new.statut !== 'en_attente') return

          // Récupérer la commande complète (items, client) pour l'alarme plein écran
          const { data: cmdComplete } = await supabase
            .from('orders')
            .select(`
              *,
              client:profiles!orders_client_id_fkey(nom, telephone),
              order_items(id, quantite, prix_unitaire, sous_total, menu_item:menu_items(id, nom, temps_preparation))
            `)
            .eq('id', ordreId)
            .single()

          const nouvelleCmd = cmdComplete ?? payload.new
          // L'écran est déjà ouvert sur une autre commande : un extrait de
          // sonnerie signale celle-ci (comme un message), sans attendre le rappel.
          if (nbAPresenterRef.current > 0) jouerExtraitSonnerie()
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
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          // Acceptée sur un autre appareil, ou annulée : plus rien à sonner pour elle
          if (payload.new?.statut && payload.new.statut !== 'en_attente') {
            setFile(prev => prev.filter(c => c.id !== payload.new.id))
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
  const resoudre = useCallback(async (orderId, statut, action, { tempsPreparation, motif, platEnRupture } = {}) => {
    if (resoudreEnCoursRef.current) return
    const commande = file.find(c => c.id === orderId)
    if (!commande) return
    resoudreEnCoursRef.current = true
    setEnCours(action)
    const champsSupplementaires = statut === 'acceptée'
      ? { temps_preparation_minutes: tempsPreparation ?? tempsPreparationParDefaut(commande) }
      : motif ? { motif_refus: motif } : {}
    if (platEnRupture) updateMenuItem(platEnRupture, { disponible: false })
    const { error } = await updateOrderStatus(commande.id, statut, champsSupplementaires)
    resoudreEnCoursRef.current = false
    setEnCours(null)

    // Même logique que changerStatut dans restaurant/Orders.jsx : une coupure
    // réseau à ce moment précis ne doit pas laisser le restaurant bloqué sur
    // l'alarme plein écran — l'action est rejouée automatiquement.
    if (error && estErreurReseau(error)) {
      enfiler('updateOrderStatus', { orderId: commande.id, statut, champsSupplementaires })
      toast.success('Hors-ligne — sera synchronisé automatiquement 📡')
      setFile(prev => prev.filter(c => c.id !== commande.id))
      return
    }

    if (error) { toast.error('Erreur : ' + error); return }
    setFile(prev => prev.filter(c => c.id !== commande.id))
  }, [file])

  // X : ferme l'écran pour toutes les commandes affichées. Elles restent
  // « en attente », donc visibles dans la colonne « Nouvelles ».
  const fermer = useCallback(() => {
    setMasquees(prev => new Set([...prev, ...file.map(c => c.id)]))
  }, [file])

  return {
    commandeAlarme: aPresenter[0] ?? null,
    nbEnAttente:    nbAPresenter,
    nbTotalEnAttente: file.length,
    enCours,
    fermer,
    accepter: (orderId, tempsPreparation) => resoudre(orderId, 'acceptée', 'accepter', { tempsPreparation }),
    refuser:  (orderId, motif, platEnRupture) => resoudre(orderId, 'annulée', 'refuser', { motif, platEnRupture }),
  }
}

export function tempsPreparationParDefaut(commande) {
  return Math.max(
    ...(commande?.order_items ?? []).map(oi => oi.menu_item?.temps_preparation ?? 15),
    15
  )
}
