/**
 * Notifications globales livreur — actives sur toutes les pages livreur.
 *
 * Modèle "attribution de course" : dès qu'une commande devient disponible
 * (mode livreurs indépendants uniquement, et seulement si CE livreur n'a pas
 * déjà une course en cours), une alarme sonore en boucle + un compte à
 * rebours de 30 secondes plein écran (voir AlarmeNouvelleLivraison, montée
 * dans LivreurLayout) lui sont proposés. L'alarme s'arrête uniquement sur
 * Accepter, Refuser, ou l'expiration du délai — jamais toute seule avant.
 *
 * Contrairement à l'ancienne version (un simple bip + toast qui s'arrêtait
 * tout seul), on ne risque plus de rater une offre dans le bruit de la
 * circulation. Aucune écriture en base tant que le livreur n'a pas
 * explicitement accepté — refuser ou laisser expirer se contente de retirer
 * l'offre de sa propre file, la commande reste disponible pour les autres.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { demarrerAlarme, arreterAlarme, resumeAudio } from '@/utils/notificationSound'
import { acceptDelivery, getActiveDelivery } from '@/services/livreurService'
import { getPlatformSettings } from '@/services/adminService'

const DUREE_OFFRE_MS = 30000

export function useLivreurNotifications() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [file,               setFile]               = useState([]) // [{ ...commande, expireAt }]
  const [secondesRestantes,  setSecondesRestantes]   = useState(30)
  const [enCours,            setEnCours]             = useState(null) // 'accepter' | 'refuser' | null
  const enCoursRef          = useRef(false)
  const modeIndependantsRef = useRef(true)

  // ── Mode de livraison (pool ouvert vs assignation directe) ───────
  useEffect(() => {
    getPlatformSettings().then(({ data }) => {
      modeIndependantsRef.current = (data?.mode_livraison ?? 'independants') === 'independants'
    })
  }, [])

  // ── Demande de permission notifications navigateur ─────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const demander = () => Notification.requestPermission()
      document.addEventListener('click', demander, { once: true })
      return () => document.removeEventListener('click', demander)
    }
  }, [])

  // ── Démarre/arrête l'alarme selon la file ────────────────────────
  useEffect(() => {
    if (file.length > 0) demarrerAlarme('Nouvelle livraison disponible')
    else arreterAlarme()
  }, [file.length])

  useEffect(() => () => arreterAlarme(), [])

  // ── Compte à rebours de l'offre affichée — expire à 0 ────────────
  useEffect(() => {
    if (file.length === 0) return
    const tick = () => {
      const restant = Math.max(0, Math.ceil((file[0].expireAt - Date.now()) / 1000))
      setSecondesRestantes(restant)
      if (restant <= 0) setFile(prev => prev.slice(1))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [file])

  // ── Souscription aux commandes qui deviennent disponibles ────────
  useEffect(() => {
    if (!user?.id) return

    const activerAudio = () => resumeAudio()
    document.addEventListener('click', activerAudio, { once: true })

    const canal = supabase
      .channel('livreur_notif_global')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        async (payload) => {
          const estPreteNow   = payload.new?.statut === 'prête'
          const etaitPreteOld = payload.old?.statut === 'prête'
          const sansLivreur   = !payload.new?.livreur_id
          if (!estPreteNow || etaitPreteOld || !sansLivreur) return
          if (!modeIndependantsRef.current) return // assignation directe par l'admin — pas de pool

          // Livreur déjà en course → ne pas le déranger avec une offre qu'il ne peut pas prendre
          const { data: active } = await getActiveDelivery(user.id)
          if (active) return

          const { data: cmd } = await supabase
            .from('orders')
            .select('*, restaurant:restaurants(nom, adresse)')
            .eq('id', payload.new.id)
            .single()
          if (!cmd) return

          setFile(prev => {
            if (prev.some(c => c.id === cmd.id)) return prev
            return [...prev, { ...cmd, expireAt: Date.now() + DUREE_OFFRE_MS }]
          })

          if ('Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification('Zandofood — Nouvelle livraison 🛵', {
              body: 'Une commande est prête à récupérer. Vous avez 30 secondes pour répondre.',
              icon: '/icon-192.png',
              badge: '/icon-72.png',
              tag: `livraison-${cmd.id}`,
              requireInteraction: false,
            })
            notif.onclick = () => {
              window.focus()
              navigate('/livreur/disponible')
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
  }, [user?.id, navigate])

  // ── Accepter / refuser l'offre affichée par l'alarme ─────────────
  // orderId est fourni explicitement par le bouton cliqué plutôt que déduit
  // de file[0] au moment de l'exécution — même précaution que côté
  // restaurant, pour ne jamais résoudre par erreur une AUTRE offre que
  // celle réellement cliquée.
  const accepter = useCallback(async (orderId) => {
    if (!user?.id || enCoursRef.current) return
    const commande = file.find(c => c.id === orderId)
    if (!commande) return
    enCoursRef.current = true
    setEnCours('accepter')
    const { error } = await acceptDelivery(orderId, user.id)
    enCoursRef.current = false
    setEnCours(null)
    if (error) {
      toast.error("Cette livraison vient d'être prise par un autre livreur.")
      setFile(prev => prev.filter(c => c.id !== orderId))
      return
    }
    toast.success('Livraison acceptée ! En route 🛵')
    // Occupé désormais — les autres offres en attente ne le concernent plus
    setFile([])
    navigate('/livreur/disponible')
  }, [file, user?.id, navigate])

  const refuser = useCallback((orderId) => {
    setFile(prev => prev.filter(c => c.id !== orderId))
  }, [])

  return {
    commandeAlarme: file[0] ?? null,
    nbEnAttente:    file.length,
    secondesRestantes,
    enCours,
    accepter,
    refuser,
  }
}
