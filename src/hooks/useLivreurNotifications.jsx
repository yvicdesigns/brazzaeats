/**
 * Notifications globales livreur — actives sur toutes les pages livreur.
 *
 * Écoute les nouvelles commandes 'prête' disponibles.
 * Son + vibration + Browser Notification + toast → lien vers /livreur/disponible
 *
 * Évite le doublon si la page active est déjà /livreur/disponible
 * (Available.jsx gère le son dans ce cas).
 */
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/supabase/client'
import { sons, resumeAudio } from '@/utils/notificationSound'

export function useLivreurNotifications() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const pathnameRef = useRef(location.pathname)

  // Demande permission notifications navigateur au premier clic
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const demander = () => Notification.requestPermission()
      document.addEventListener('click', demander, { once: true })
      return () => document.removeEventListener('click', demander)
    }
  }, [])

  useEffect(() => { pathnameRef.current = location.pathname }, [location.pathname])

  useEffect(() => {
    const activerAudio = () => resumeAudio()
    document.addEventListener('click', activerAudio, { once: true })

    const canal = supabase
      .channel('livreur_notif_global')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          // On ne s'intéresse qu'aux commandes qui viennent de passer à 'prête'
          const estPreteNow  = payload.new?.statut === 'prête'
          const etaitPreteOld = payload.old?.statut === 'prête'
          const sansLivreur  = !payload.new?.livreur_id

          if (!estPreteNow || etaitPreteOld || !sansLivreur) return

          const surPageDisponible = pathnameRef.current === '/livreur/disponible'

          if (!surPageDisponible) {
            sons.commandePrete()
            if (navigator.vibrate) navigator.vibrate([150, 80, 150])
          }

          if ('Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification('Zandofood — Nouvelle livraison 🛵', {
              body: 'Une commande est prête à récupérer. Soyez le premier !',
              icon: '/icon-192.png',
              badge: '/icon-72.png',
              tag: `livraison-${payload.new.id}`,
              requireInteraction: false,
            })
            notif.onclick = () => {
              window.focus()
              navigate('/livreur/disponible')
              notif.close()
            }
          }

          if (!surPageDisponible) {
            toast(
              t => (
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛵</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">Livraison disponible !</p>
                    <p className="text-xs text-gray-500">Une commande attend un livreur.</p>
                  </div>
                  <button
                    onClick={() => { navigate('/livreur/disponible'); toast.dismiss(t.id) }}
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
  }, [navigate])
}
