import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/supabase/client'

/**
 * useRealtime — Abonnement Supabase Realtime sur une table PostgreSQL.
 *
 * Met à jour automatiquement l'état local lors de INSERT / UPDATE / DELETE
 * dans la table ciblée, optionnellement filtrée.
 *
 * @param {string}   table    — Nom de la table à écouter (ex: 'orders')
 * @param {string}   [filter] — Filtre PostgREST (ex: 'restaurant_id=eq.uuid')
 * @param {Function} [onEvent] — Callback optionnel appelé à chaque changement
 *                               avec le payload brut Supabase
 *
 * @returns {{ rows, error, status, refetch }}
 *   rows    — Tableau des lignes de la table (initialement vide)
 *   error   — Message d'erreur ou null
 *   status  — 'connecting' | 'subscribed' | 'error' | 'closed'
 *   refetch — Fonction pour relancer une requête initiale manuelle
 *
 * Exemple d'utilisation :
 *   const { rows } = useRealtime('orders', `restaurant_id=eq.${id}`)
 */
export function useRealtime(table, filter = null, onEvent = null) {
  const [rows,   setRows]   = useState([])
  const [error,  setError]  = useState(null)
  const [status, setStatus] = useState('connecting')

  // Ref pour garder la référence stable du callback sans redéclencher l'effet
  const onEventRef = useRef(onEvent)
  useEffect(() => { onEventRef.current = onEvent }, [onEvent])

  // ── Chargement initial ──────────────────────────────────
  const refetch = useCallback(async () => {
    try {
      let query = supabase.from(table).select('*').order('created_at', { ascending: false })

      // Applique le filtre si fourni : "colonne=eq.valeur"
      if (filter) {
        const [colonne, condition] = filter.split('=')
        const [operateur, valeur]  = condition.split('.')
        // On reconstruit le filtre via la méthode .filter() générique
        query = query.filter(colonne, operateur, valeur)
      }

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      setRows(data ?? [])
    } catch (err) {
      setError(err.message)
    }
  }, [table, filter])

  // ── Abonnement Realtime ─────────────────────────────────
  useEffect(() => {
    setStatus('connecting')
    setError(null)

    // Charge les données existantes au montage
    refetch()

    // Crée un canal unique par table + filtre
    const canalNom = filter ? `${table}:${filter}` : table
    let canal = supabase.channel(canalNom)

    canal = canal.on(
      'postgres_changes',
      {
        event:  '*',              // INSERT | UPDATE | DELETE
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      (payload) => {
        // Appel du callback externe si fourni
        if (onEventRef.current) {
          onEventRef.current(payload)
        }

        // Mise à jour optimiste du state local
        setRows((prev) => {
          switch (payload.eventType) {
            case 'INSERT':
              // Évite les doublons (idempotence)
              if (prev.some((r) => r.id === payload.new.id)) return prev
              return [payload.new, ...prev]

            case 'UPDATE':
              return prev.map((r) =>
                r.id === payload.new.id ? { ...r, ...payload.new } : r
              )

            case 'DELETE':
              return prev.filter((r) => r.id !== payload.old.id)

            default:
              return prev
          }
        })
      }
    )

    canal.subscribe((etat) => {
      if (etat === 'SUBSCRIBED') {
        setStatus('subscribed')
      } else if (etat === 'CHANNEL_ERROR' || etat === 'TIMED_OUT') {
        setStatus('error')
        setError(`Erreur de connexion au canal temps réel (${canalNom})`)
      } else if (etat === 'CLOSED') {
        setStatus('closed')
      }
    })

    // Nettoyage au démontage ou si table/filter changent
    return () => {
      supabase.removeChannel(canal)
      setStatus('closed')
    }
  }, [table, filter, refetch])

  return { rows, error, status, refetch }
}

/**
 * useRealtimeRow — Variante pour écouter UNE SEULE ligne par son id.
 *
 * Utile pour la page Tracking : surveille une commande précise.
 *
 * @param {string} table  — Nom de la table
 * @param {string} rowId  — UUID de la ligne à surveiller
 * @returns {{ row, error, loading }}
 */
export function useRealtimeRow(table, rowId) {
  const [row,     setRow]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!rowId) return

    // Chargement initial de la ligne
    async function charger() {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from(table)
          .select('*')
          .eq('id', rowId)
          .single()
        if (fetchError) throw fetchError
        setRow(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    charger()

    // Abonnement aux changements de cette ligne uniquement
    const canal = supabase
      .channel(`${table}:id=eq.${rowId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter: `id=eq.${rowId}` },
        (payload) => {
          setRow((prev) => ({ ...prev, ...payload.new }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [table, rowId])

  return { row, error, loading }
}
