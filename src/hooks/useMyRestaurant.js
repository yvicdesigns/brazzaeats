import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getMyRestaurant } from '@/services/menuService'

/**
 * Hook utilitaire partagé par toutes les pages du dashboard restaurant.
 * Récupère le restaurant appartenant à l'utilisateur connecté.
 *
 * @returns {{ restaurant, loading, error, setRestaurant }}
 *   setRestaurant — permet de mettre à jour localement après un save
 */
export function useMyRestaurant() {
  const { user, loading: authLoading } = useAuth()
  const [restaurant,  setRestaurant]  = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    if (authLoading) return   // Attendre que l'auth soit initialisée
    if (!user) {
      setLoading(false)
      setError('Non authentifié')
      return
    }

    async function charger() {
      setLoading(true)
      const { data, error: err } = await getMyRestaurant(user.id)
      setRestaurant(data)
      setError(err)
      setLoading(false)
    }

    charger()
  }, [user, authLoading])

  return { restaurant, loading, error, setRestaurant }
}
