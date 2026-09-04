// Remonte automatiquement la position GPS réelle du livreur pendant une
// livraison active — remplace l'ancien bouton "position simulée".
// Actif uniquement sur natif (web n'a pas d'usage réel en conditions réelles
// de livraison, et la précision GPS y est de toute façon insuffisante).
import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { useAuth } from '@/hooks/useAuth'
import { getActiveDelivery, updatePosition } from '@/services/livreurService'

const INTERVALLE_MS = 6000 // fréquence d'écriture en base — le GPS peut remonter plus souvent

export function useLivreurPositionReporter() {
  const { user, role } = useAuth()
  const watchIdRef = useRef(null)
  const dernierEnvoiRef = useRef(0)

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || role !== 'livreur' || !user?.id) return

    let annule = false
    let orderIdActif = null
    let intervalleVerif = null

    async function demarrerSuivi() {
      const { data } = await getActiveDelivery(user.id)
      if (annule) return

      if (data?.id) {
        if (orderIdActif === data.id) return // déjà en train de suivre cette course
        orderIdActif = data.id
        await arreterWatch()

        try {
          const permission = await Geolocation.checkPermissions()
          if (permission.location !== 'granted') {
            const demande = await Geolocation.requestPermissions()
            if (demande.location !== 'granted') return
          }
        } catch {
          return
        }

        watchIdRef.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000 },
          (position, err) => {
            if (err || !position || !orderIdActif) return
            const maintenant = Date.now()
            if (maintenant - dernierEnvoiRef.current < INTERVALLE_MS) return
            dernierEnvoiRef.current = maintenant
            updatePosition(orderIdActif, {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
          }
        )
      } else if (orderIdActif) {
        // Plus de livraison active (livrée/annulée) — on arrête le GPS.
        orderIdActif = null
        await arreterWatch()
      }
    }

    async function arreterWatch() {
      if (watchIdRef.current) {
        await Geolocation.clearWatch({ id: watchIdRef.current })
        watchIdRef.current = null
      }
    }

    demarrerSuivi()
    // Revérifie régulièrement si une nouvelle course démarre/se termine.
    intervalleVerif = setInterval(demarrerSuivi, 15000)

    return () => {
      annule = true
      clearInterval(intervalleVerif)
      arreterWatch()
    }
  }, [role, user?.id])
}
