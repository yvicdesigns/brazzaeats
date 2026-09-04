// Enregistrement des notifications push natives (APNs/FCM via Firebase).
// Actif uniquement sur iOS/Android natif — sur le web, ce plugin n'existe
// pas (pas de vrai "push" possible hors app installée).
import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/supabase/client'

export function usePushNotifications() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Ref pour éviter de dépendre de `navigate` dans l'effet — sa référence
  // n'est pas garantie stable ici, et le mettre en dépendance provoquait
  // un cycle addListener/removeListener en boucle continue.
  const navigateRef = useRef(navigate)
  useEffect(() => { navigateRef.current = navigate }, [navigate])

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) return

    let annule = false
    const handles = []

    async function configurer() {
      // addListener() est asynchrone depuis Capacitor 8 — il faut attendre
      // chaque handle avant de pouvoir le nettoyer correctement.
      handles.push(
        await PushNotifications.addListener('registration', async ({ value: token }) => {
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
      )

      handles.push(
        await PushNotifications.addListener('registrationError', () => {
          // Non-bloquant — voir les logs Xcode/Android Studio en cas de besoin.
        })
      )

      handles.push(
        // Notification reçue pendant que l'app est ouverte au premier plan —
        // Realtime + les toasts existants s'en chargent déjà visuellement.
        await PushNotifications.addListener('pushNotificationReceived', () => {})
      )

      handles.push(
        // L'utilisateur a tapé sur la notification (app fermée ou en arrière-plan)
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const route = action.notification?.data?.route
          if (route) navigateRef.current(route)
        })
      )

      if (annule) {
        handles.forEach(h => h.remove())
        return
      }

      const permission = await PushNotifications.checkPermissions()
      let statut = permission.receive
      if (statut === 'prompt' || statut === 'prompt-with-rationale') {
        const demande = await PushNotifications.requestPermissions()
        statut = demande.receive
      }
      if (statut !== 'granted') return

      await PushNotifications.register()
    }

    configurer()

    return () => {
      annule = true
      handles.forEach(h => h.remove())
    }
  }, [user?.id])
}
