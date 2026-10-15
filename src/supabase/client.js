import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Vérification au démarrage pour un message d'erreur explicite
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Zandofood] Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes.\n' +
    'Copiez .env.example en .env.local et renseignez vos clés Supabase.'
  )
}

// Client singleton partagé dans toute l'application
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Désactive le Navigator Lock de Supabase (navigator.locks), y compris en
    // production. Ce verrou coordonne le rafraîchissement de session entre
    // onglets d'un même site, mais il peut rester bloqué indéfiniment — par
    // ex. après qu'un onglet revienne au premier plan (_onVisibilityChanged) —
    // et ne jamais se libérer, ce qui gelait alors TOUTES les requêtes de
    // l'app (y compris le profil) sur un spinner infini. Le risque sans ce
    // verrou (deux onglets qui rafraîchissent leur session au même instant)
    // est minime comparé à ce blocage systématique.
    lock: (name, acquireTimeout, fn) => fn(),
  },
})
