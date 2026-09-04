// Enregistrement des notifications push natives (APNs/FCM via Firebase).
// Actif uniquement sur iOS/Android natif — sur le web, ce plugin n'existe
// pas (pas de vrai "push" possible hors app installée).
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/supabase/client'

export function usePushNotifications() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) return

    let listeners = []

    async function enregistrer() {
      const permission = await PushNotifications.checkPermissions()
      let statut = permission.receive
      if (statut === 'prompt') {
        const demande = await PushNotifications.requestPermissions()
        statut = demande.receive
      }
      if (statut !== 'granted') return

      await PushNotifications.register()
    }

    const l1 = PushNotifications.addListener('registration', async ({ value: token }) => {
      try {
        await supabase
          .from('push_tokens')
          .upsert(
            { user_id: user.id, token, platform: Capacitor.getPlatform() },
            { onConflict: 'token' }
          )
      } catch {
        // Non-bloquant — l'app fonctionne sans, juste sans push natif.
      }
    })

    // Notification reçue pendant que l'app est ouverte au premier plan —
    // Realtime + les toasts existants s'en chargent déjà visuellement,
    // on ne fait rien de plus ici pour éviter le doublon.
    const l2 = PushNotifications.addListener('pushNotificationReceived', () => {})

    // L'utilisateur a tapé sur la notification (app fermée ou en arrière-plan)
    const l3 = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const route = action.notification?.data?.route
      if (route) navigate(route)
    })

    listeners = [l1, l2, l3]
    enregistrer()

    return () => { listeners.forEach(l => l.remove()) }
  }, [user?.id, navigate])
}
