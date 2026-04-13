/**
 * Notifications globales restaurant — actives sur toutes les pages.
 *
 * Ce hook est monté dans RestaurantLayout (une seule fois) et gère :
 *   1. Son (Web Audio) — nouvelle commande
 *   2. Vibration mobile
 *   3. Browser Notification (Notification API) — visible même onglet en arrière-plan
 *   4. Toast flash avec lien vers /restaurant/commandes
 *
 * Pour éviter le doublon sonore avec Orders.jsx (qui a sa propre subscription),
 * ce hook saute le son si la page active est déjà /restaurant/commandes —
 * Orders.jsx s'en charge dans ce cas.
 */
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/supabase/client'
import { sons, resumeAudio } from '@/utils/notificationSound'

export function useRestaurantNotifications(restaurantId) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const derniereNotifId = useRef(null)
  const pathnameRef = useRef(location.pathname)

  // ── Demande de permission notifications navigateur ─────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const demander = () => Notification.requestPermission()
      document.addEventListener('click', demander, { once: true })
      return () => document.removeEventListener('click', demander)
    }
  }, [])

  // ── Sync pathname ref ─────────────────────────────────
  useEffect(() => { pathnameRef.current = location.pathname }, [location.pathname])

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
        (payload) => {
          const ordreId = payload.new?.id
          if (ordreId && ordreId === derniereNotifId.current) return
          derniereNotifId.current = ordreId

          const surPageCommandes = pathnameRef.current === '/restaurant/commandes'

          // Son + vibration (Orders.jsx gère déjà ça sur la page commandes)
          if (!surPageCommandes) {
            sons.nouvelleCommande()
            if (navigator.vibrate) navigator.vibrate([200, 100, 200])
          }

          // Browser Notification (Notification API)
          if ('Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification('Zandofood — Nouvelle commande \uD83C\uDF7D\uFE0F', {
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

          // Toast flash (toutes les pages sauf commandes)
          if (!surPageCommandes) {
            toast(
              t => (
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label="commande">🍽️</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">Nouvelle commande !</p>
                    <p className="text-xs text-gray-500">Répondez rapidement.</p>
                  </div>
                  <button
                    onClick={() => { navigate('/restaurant/commandes'); toast.dismiss(t.id) }}
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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
      document.removeEventListener('click', activerAudio)
    }
  }, [restaurantId, navigate])
}
