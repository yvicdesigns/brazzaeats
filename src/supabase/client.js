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
    // Désactive le Navigator Lock (cause des conflits avec le HMR de Vite).
    // On remplace par un lock no-op : un seul onglet de dev, donc pas de concurrence.
    lock: (name, acquireTimeout, fn) => fn(),
  },
})
