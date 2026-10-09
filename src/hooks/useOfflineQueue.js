import { useEffect, useState } from 'react'
import { nbEnAttente, surChangement } from '@/utils/offlineQueue'

/**
 * Expose l'état réseau + la taille de la file d'actions en attente de
 * synchronisation, pour piloter un indicateur discret à l'écran.
 */
export function useOfflineQueue() {
  const [taille, setTaille] = useState(nbEnAttente())
  const [enLigne, setEnLigne] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => {
    const desabonner = surChangement(setTaille)
    const onOnline  = () => setEnLigne(true)
    const onOffline = () => setEnLigne(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      desabonner()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return { taille, enLigne }
}
