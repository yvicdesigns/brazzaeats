/**
 * Notifications globales client — actives sur toutes les pages.
 *
 * Écoute les changements de statut des commandes du client connecté.
 * Son + vibration + Browser Notification + toast → lien vers /suivi/:id
 *
 * Évite le doublon si la page de suivi de CETTE commande est déjà ouverte
 * (Tracking.jsx affiche déjà la progression en direct dans ce cas).
 */
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { sons, resumeAudio } from '@/utils/notificationSound'

const MESSAGES = {
  acceptée:       { emoji: '✅', titre: 'Commande acceptée !',    corps: 'Le restaurant prépare votre commande.' },
  en_préparation: { emoji: '👨‍🍳', titre: 'En préparation',        corps: 'Votre commande est en cours de préparation.' },
  prête:          { emoji: '🎉', titre: 'Commande prête !',       corps: 'Votre commande va bientôt partir.' },
  en_livraison:   { emoji: '🛵', titre: 'En route vers vous !',   corps: 'Un livreur a récupéré votre commande.' },
  livrée:         { emoji: '🏠', titre: 'Commande livrée !',      corps: 'Bon appétit ! N’oubliez pas de laisser un avis.' },
  annulée:        { emoji: '❌', titre: 'Commande annulée',       corps: 'Contactez le support si besoin.' },
}

export function useClientOrderNotifications() {
  const { user }  = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()
  const pathnameRef = useRef(location.pathname)

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const demander = () => Notification.requestPermission()
      document.addEventListener('click', demander, { once: true })
      return () => document.removeEventListener('click', demander)
    }
  }, [])

  useEffect(() => { pathnameRef.current = location.pathname }, [location.pathname])

  useEffect(() => {
    if (!user?.id) return

    const activerAudio = () => resumeAudio()
    document.addEventListener('click', activerAudio, { once: true })

    const canal = supabase
      .channel(`client_notif_global:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `client_id=eq.${user.id}` },
        (payload) => {
          const statut = payload.new?.statut
          if (!statut || statut === payload.old?.statut) return

          const msg = MESSAGES[statut]
          if (!msg) return

          const orderId = payload.new.id
          const surPageSuivi = pathnameRef.current === `/suivi/${orderId}`
          if (surPageSuivi) return

          sons.confirmation()
          if (navigator.vibrate) navigator.vibrate([150, 80, 150])

          if ('Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification(`Zandofood — ${msg.titre}`, {
              body: msg.corps,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-192x192.png',
              tag: `commande-${orderId}`,
              requireInteraction: false,
            })
            notif.onclick = () => {
              window.focus()
              navigate(`/suivi/${orderId}`)
              notif.close()
            }
          }

          toast(
            t => (
              <div className="flex items-center gap-3">
                <span className="text-2xl" role="img" aria-label={msg.titre}>{msg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{msg.titre}</p>
                  <p className="text-xs text-gray-500">{msg.corps}</p>
                </div>
                <button
                  onClick={() => { navigate(`/suivi/${orderId}`); toast.dismiss(t.id) }}
                  className="shrink-0 bg-brand-500 text-white text-xs font-bold px-3 py-1.5
                             rounded-lg hover:bg-brand-600 transition-colors"
                >
                  Voir
                </button>
              </div>
            ),
            { duration: 8000, style: { maxWidth: '360px' } }
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
      document.removeEventListener('click', activerAudio)
    }
  }, [user?.id, navigate])
}
